# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""
GitLab Incoming Webhook Endpoint

Receives push / merge_request / note events from GitLab,
parses commit messages and MR descriptions for Plane issue references
(#42 or PLN-42 format), and automatically creates IssueLinks.

Configuration:
  Set GITLAB_WEBHOOK_SECRET in .env to require X-Gitlab-Token header
  verification. If not set, accepts all requests (dev mode).

URL:
  POST /api/workspaces/<slug>/integrations/gitlab/webhook/
"""

import os
import logging

# Third party imports
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

# Module imports
from plane.db.models import Workspace
from .base import find_references, find_branch_references, merge_references, process_references

logger = logging.getLogger("plane.api")


class GitlabWebhookEndpoint(APIView):
    authentication_classes = []
    permission_classes = []

    SOURCE = "gitlab"

    def post(self, request, slug):
        # 1. --- Verify webhook secret token ---
        configured_secret = os.environ.get("GITLAB_WEBHOOK_SECRET", "")
        received_token = request.headers.get("X-Gitlab-Token", "")

        if configured_secret:
            if received_token != configured_secret:
                logger.warning(
                    "GitLab webhook rejected: invalid X-Gitlab-Token for workspace %s",
                    slug,
                )
                return Response(
                    {"error": "Invalid webhook token"},
                    status=status.HTTP_403_FORBIDDEN,
                )
        else:
            logger.warning(
                "GITLAB_WEBHOOK_SECRET not configured — accepting all "
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

        # 3. --- Determine event type ---
        event_type = request.data.get("object_kind", "")

        if event_type in ("ping", "test"):
            return Response(
                {"message": "pong", "event": event_type},
                status=status.HTTP_200_OK,
            )

        # 4. --- Extract issue references ---
        references = self._extract_references(request.data, event_type)

        logger.info(
            "GitLab webhook: event=%s, refs=%s, project=%s, commits=%d",
            event_type,
            [r["raw"] for r in references],
            request.data.get("project", {}).get("name", ""),
            len(request.data.get("commits", [])),
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
            "GitLab webhook processed for %s: event=%s, linked=%d, skipped=%d",
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
    # GitLab payload parsing
    # ------------------------------------------------------------------
    def _extract_references(self, payload, event_type):
        references = []
        project_info = payload.get("project", {})
        repo_name = project_info.get("name", "")

        if event_type == "push":
            references = self._extract_from_push(payload, repo_name)
        elif event_type == "merge_request":
            references = self._extract_from_merge_request(payload, repo_name)
        elif event_type == "note":
            references = self._extract_from_note(payload, repo_name)

        return references

    def _extract_from_push(self, payload, repo_name):
        refs = []
        # Branch name references — apply to ALL commits in this push
        branch_refs = find_branch_references(payload.get("ref", ""))

        for commit in payload.get("commits", []):
            message = commit.get("message", "")

            url = commit.get("url", "")
            sha = commit.get("id", "")[:7] if commit.get("id") else ""
            author = commit.get("author", {}).get("name", "")
            title = message.split("\n")[0].strip()[:255] or "GitLab commit"

            # Merge commit-message refs with branch-name refs (deduplicated)
            commit_refs = find_references(message) if message else []
            all_refs = merge_references(commit_refs, branch_refs)

            for match in all_refs:
                refs.append({
                    **match,
                    "url": url, "title": title,
                    "repo": repo_name, "sha": sha, "author": author,
                })
        return refs

    def _extract_from_merge_request(self, payload, repo_name):
        refs = []
        mr = payload.get("object_attributes", {})
        title = mr.get("title", "")
        description = mr.get("description", "")
        url = mr.get("url", "")
        author = payload.get("user", {}).get("name", "")

        combined_text = f"{title}\n{description}"
        link_title = title[:255] if title else "GitLab Merge Request"

        # Also parse source branch name (e.g. project1-1/fix-login)
        branch_refs = find_branch_references(mr.get("source_branch", ""))
        text_refs = find_references(combined_text)
        all_refs = merge_references(text_refs, branch_refs)

        for match in all_refs:
            refs.append({
                **match,
                "url": url, "title": link_title,
                "repo": repo_name, "sha": "", "author": author,
            })
        return refs

    def _extract_from_note(self, payload, repo_name):
        refs = []
        note_attrs = payload.get("object_attributes", {})
        body = note_attrs.get("note", "")
        url = note_attrs.get("url", "")
        author = payload.get("user", {}).get("name", "")

        if not body:
            return refs

        title = body.split("\n")[0].strip()[:255] or "GitLab comment"

        for match in find_references(body):
            refs.append({
                **match,
                "url": url, "title": title,
                "repo": repo_name, "sha": "", "author": author,
            })
        return refs
