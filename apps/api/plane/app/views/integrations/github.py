# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""
GitHub Incoming Webhook Endpoint

Receives push / pull_request / issue_comment events from GitHub,
parses commit messages, PR titles/descriptions and comments for Plane
issue references (#42 or PLN-42 format), and automatically creates
IssueLinks.

Configuration:
  Set GITHUB_WEBHOOK_SECRET in .env.  GitHub uses HMAC-SHA256 to sign
  the payload body with this secret; the signature is sent in the
  X-Hub-Signature-256 header.  If the env var is not set, accepts all
  requests (dev mode).

URL:
  POST /api/workspaces/<slug>/integrations/github/webhook/
"""

import os
import hmac
import hashlib
import logging

# Third party imports
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

# Module imports
from plane.db.models import Workspace
from .base import find_references, find_branch_references, merge_references, process_references

logger = logging.getLogger("plane.api")


class GithubWebhookEndpoint(APIView):
    authentication_classes = []
    permission_classes = []

    SOURCE = "github"

    def post(self, request, slug):
        # 1. --- Verify HMAC signature ---
        configured_secret = os.environ.get("GITHUB_WEBHOOK_SECRET", "")

        if configured_secret:
            signature_header = request.headers.get("X-Hub-Signature-256", "")
            if not signature_header:
                return Response(
                    {"error": "Missing X-Hub-Signature-256 header"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # request.body is bytes; compute HMAC
            mac = hmac.new(
                key=configured_secret.encode("utf-8"),
                msg=request.body,
                digestmod=hashlib.sha256,
            )
            expected_sig = "sha256=" + mac.hexdigest()

            if not hmac.compare_digest(expected_sig, signature_header):
                logger.warning(
                    "GitHub webhook rejected: invalid signature for workspace %s",
                    slug,
                )
                return Response(
                    {"error": "Invalid signature"},
                    status=status.HTTP_403_FORBIDDEN,
                )
        else:
            logger.warning(
                "GITHUB_WEBHOOK_SECRET not configured — accepting all "
                "webhook requests for workspace %s (dev mode)", slug,
            )

        # 2. --- Verify workspace exists ---
        try:
            workspace = Workspace.objects.get(slug=slug)
        except Workspace.DoesNotExist:
            return Response(
                {"error": "Workspace not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 3. --- Determine event type from header ---
        # GitHub identifies events via the X-GitHub-Event header
        event_type = request.headers.get("X-GitHub-Event", "")

        # GitHub "ping" event — sent when webhook is first configured
        if event_type == "ping":
            return Response(
                {"message": "pong", "event": event_type},
                status=status.HTTP_200_OK,
            )

        # 4. --- Extract issue references ---
        references = self._extract_references(request.data, event_type)

        repo_name = request.data.get("repository", {}).get("name", "")
        logger.info(
            "GitHub webhook: event=%s, refs=%s, repo=%s",
            event_type,
            [r["raw"] for r in references],
            repo_name,
        )

        if not references:
            return Response(
                {"message": "No issue references found", "event": event_type},
                status=status.HTTP_200_OK,
            )

        # 5. --- Resolve + create links ---
        results, linked, skipped = process_references(
            references, workspace, event_type, self.SOURCE
        )

        logger.info(
            "GitHub webhook processed for %s: event=%s, linked=%d, skipped=%d",
            slug, event_type, linked, skipped,
        )

        return Response(
            {
                "message": "Webhook processed",
                "event": event_type,
                "linked": linked,
                "skipped": skipped,
                "results": results,
            },
            status=status.HTTP_200_OK,
        )

    # ------------------------------------------------------------------
    # GitHub payload parsing
    # ------------------------------------------------------------------
    def _extract_references(self, payload, event_type):
        references = []
        repo_info = payload.get("repository", {})
        repo_name = repo_info.get("name", "")

        if event_type == "push":
            references = self._extract_from_push(payload, repo_name)
        elif event_type == "pull_request":
            references = self._extract_from_pull_request(payload, repo_name)
        elif event_type == "issue_comment":
            references = self._extract_from_comment(payload, repo_name)

        return references

    def _extract_from_push(self, payload, repo_name):
        """GitHub push event: payload.commits[] with id/message/url/author"""
        refs = []
        # Branch name references — apply to ALL commits in this push
        branch_refs = find_branch_references(payload.get("ref", ""))

        for commit in payload.get("commits", []):
            message = commit.get("message", "")

            # GitHub commit URL is in payload.repository.html_url + /commit/SHA
            sha = commit.get("id", "")
            repo_url = payload.get("repository", {}).get("html_url", "")
            url = f"{repo_url}/commit/{sha}" if repo_url and sha else ""
            author = commit.get("author", {}).get("name", "") or \
                     commit.get("author", {}).get("username", "")
            title = message.split("\n")[0].strip()[:255] if message else "GitHub commit"

            # Merge commit-message refs with branch-name refs (deduplicated)
            commit_refs = find_references(message) if message else []
            all_refs = merge_references(commit_refs, branch_refs)

            for match in all_refs:
                refs.append({
                    **match,
                    "url": url, "title": title,
                    "repo": repo_name, "sha": sha[:7] if sha else "",
                    "author": author,
                })
        return refs

    def _extract_from_pull_request(self, payload, repo_name):
        """GitHub PR event: payload.pull_request with title/body/html_url"""
        refs = []
        pr = payload.get("pull_request", {})
        title = pr.get("title", "")
        body = pr.get("body", "") or ""
        url = pr.get("html_url", "")
        author = payload.get("sender", {}).get("login", "")

        combined_text = f"{title}\n{body}"
        link_title = title[:255] if title else "GitHub Pull Request"

        # Also parse head branch name (e.g. project1-1/fix-login)
        head_branch = pr.get("head", {}).get("ref", "")
        branch_refs = find_branch_references(head_branch)
        text_refs = find_references(combined_text)
        all_refs = merge_references(text_refs, branch_refs)

        for match in all_refs:
            refs.append({
                **match,
                "url": url, "title": link_title,
                "repo": repo_name, "sha": "",
                "author": author,
            })
        return refs

    def _extract_from_comment(self, payload, repo_name):
        """GitHub issue_comment event: payload.comment with body/html_url"""
        refs = []
        comment = payload.get("comment", {})
        body = comment.get("body", "")
        url = comment.get("html_url", "")
        author = payload.get("sender", {}).get("login", "")

        if not body:
            return refs

        title = body.split("\n")[0].strip()[:255] or "GitHub comment"

        for match in find_references(body):
            refs.append({
                **match,
                "url": url, "title": title,
                "repo": repo_name, "sha": "",
                "author": author,
            })
        return refs
