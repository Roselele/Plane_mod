# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""
Shared logic for GitLab / GitHub incoming webhooks.

Both platforms push events (push / MR-PR / comment) that contain commit
messages or descriptions referencing Plane issues.  This module provides:

  - Regex patterns and ``find_references``   — extract #42 / PLN-42 from text
  - ``resolve_issue``                        — map a reference to a Plane Issue
  - ``create_issue_link``                    — create an IssueLink (with dedup)
  - ``process_references``                   — end-to-end pipeline used by both views
"""

import re
import logging

# Django imports
from django.db import transaction

# Module imports
from plane.db.models import Issue, IssueLink, Project
from plane.bgtasks.work_item_link_task import DEFAULT_FAVICON
from plane.utils.exception_logger import log_exception

logger = logging.getLogger("plane.api")

# ---------------------------------------------------------------------------
# Regex patterns for issue references (commit messages, MR/PR descriptions)
# ---------------------------------------------------------------------------

# PLN-42 / PROJECT1-42  →  project identifier (starts with uppercase, may
#                          contain digits, max 12 chars) + dash + sequence number
IDENTIFIER_PATTERN = re.compile(
    r"(?:^|\s)([A-Z][A-Z0-9]{0,11})-(\d+)\b", re.MULTILINE
)

# #42  →  hash + sequence number (searches all projects in workspace)
SEQ_PATTERN = re.compile(
    r"(?:^|\s)#(\d+)\b", re.MULTILINE
)

# ---------------------------------------------------------------------------
# Regex patterns for branch name references (more permissive)
# ---------------------------------------------------------------------------

# project1-1/fix  →  identifier (case-insensitive) + dash + seq, after start or /
_BRANCH_IDENTIFIER_RE = re.compile(
    r"(?:^|[/\s])([A-Za-z][A-Za-z0-9]{0,11})-(\d+)(?=[/\s\-_.]|$)"
)

# 1/fix or 1-fix  →  bare seq number at start or after / (avoids false matches)
_BRANCH_SEQ_RE = re.compile(
    r"(?:^|/)(\d+)(?=[/\-]|$)"
)


def find_references(text):
    """
    Find all Plane issue references in *text*.

    Returns a deduplicated list of dicts:
        {"raw": "PLN-42", "type": "identifier", "identifier": "PLN", "sequence_id": 42}
        {"raw": "#42",    "type": "sequence",    "sequence_id": 42}
    """
    results = []
    seen = set()

    # 1. Match identifier patterns first (PLN-42)
    for m in IDENTIFIER_PATTERN.finditer(text):
        identifier = m.group(1)
        seq_id = int(m.group(2))
        key = f"{identifier}-{seq_id}"
        if key not in seen:
            seen.add(key)
            results.append({
                "raw": m.group(0).strip(),
                "type": "identifier",
                "identifier": identifier.upper(),
                "sequence_id": seq_id,
            })

    # 2. Match bare sequence patterns (#42)
    for m in SEQ_PATTERN.finditer(text):
        seq_id = int(m.group(1))
        key = f"#{seq_id}"
        if key not in seen:
            seen.add(key)
            results.append({
                "raw": m.group(0).strip(),
                "type": "sequence",
                "sequence_id": seq_id,
            })

    return results


def _strip_ref_prefix(ref):
    """Extract the bare branch/tag name from a Git ref string."""
    if not ref:
        return ""
    for prefix in ("refs/heads/", "refs/tags/"):
        if ref.startswith(prefix):
            return ref[len(prefix):]
    return ref


def find_branch_references(ref):
    """
    Find Plane issue references embedded in a Git branch name.

    Supports case-insensitive identifier matching (project1-1/fix → PROJECT1-1)
    and bare sequence numbers at branch start or after a slash (1/fix → #1).

    Returns the same dict format as find_references(), with an extra
    'branch' key containing the full branch name.
    """
    branch = _strip_ref_prefix(ref)
    if not branch:
        return []

    results = []
    seen = set()

    # 1. Identifier match (case-insensitive) — e.g. project1-1/fix-login
    for m in _BRANCH_IDENTIFIER_RE.finditer(branch):
        identifier = m.group(1).upper()
        seq_id = int(m.group(2))
        key = f"{identifier}-{seq_id}"
        if key not in seen:
            seen.add(key)
            results.append({
                "raw": f"{identifier}-{seq_id}",
                "type": "identifier",
                "identifier": identifier,
                "sequence_id": seq_id,
                "branch": branch,
            })

    # 2. Bare sequence number — e.g. 1/fix-login, feature/1-fix-login
    for m in _BRANCH_SEQ_RE.finditer(branch):
        seq_id = int(m.group(1))
        key = f"#{seq_id}"
        if key not in seen:
            seen.add(key)
            results.append({
                "raw": f"#{seq_id}",
                "type": "sequence",
                "sequence_id": seq_id,
                "branch": branch,
            })

    return results


def merge_references(*ref_lists):
    """Merge multiple reference lists, deduplicating by raw string."""
    seen = set()
    merged = []
    for refs in ref_lists:
        for ref in refs:
            if ref["raw"] not in seen:
                seen.add(ref["raw"])
                merged.append(dict(ref))  # copy so callers can safely add keys
    return merged


def resolve_issue(ref, workspace):
    """
    Resolve a reference to a Plane Issue.

    - "identifier" type (PLN-42): find Project by identifier, then Issue by sequence_id
    - "sequence" type (#42): search all projects in workspace
    """
    if ref["type"] == "identifier":
        try:
            project = Project.objects.get(
                identifier=ref["identifier"],
                workspace=workspace,
            )
            return Issue.objects.get(
                project=project,
                sequence_id=ref["sequence_id"],
            )
        except (Project.DoesNotExist, Issue.DoesNotExist):
            return None

    elif ref["type"] == "sequence":
        return (
            Issue.objects.filter(
                project__workspace=workspace,
                sequence_id=ref["sequence_id"],
            ).first()
        )

    return None


def create_issue_link(ref, issue, workspace, event_type, source):
    """Create a single IssueLink with dedup.  Returns a result dict."""
    issue_label = f"{issue.project.identifier}-{issue.sequence_id}"

    # Dedup: IssueLink has url+issue uniqueness
    if IssueLink.objects.filter(
        url=ref["url"], issue_id=issue.id
    ).exists():
        return {
            "reference": ref["raw"],
            "issue": issue_label,
            "status": "already_linked",
        }

    metadata = {
        "title": ref["title"],
        "favicon": f"data:image/svg+xml;base64,{DEFAULT_FAVICON}",
        "url": ref["url"],
        "favicon_url": None,
        "source": source,          # "gitlab" or "github"
        "event_type": event_type,
        "repo": ref.get("repo", ""),
        "sha": ref.get("sha", ""),
        "author": ref.get("author", ""),
        "branch": ref.get("branch", ""),  # branch name if linked via branch
    }

    try:
        with transaction.atomic():
            IssueLink.objects.create(
                title=ref["title"],
                url=ref["url"],
                issue=issue,
                project=issue.project,
                workspace=workspace,
                metadata=metadata,
            )
    except Exception as e:
        log_exception(e)
        return {
            "reference": ref["raw"],
            "issue": issue_label,
            "status": "error",
            "error": str(e),
        }

    return {
        "reference": ref["raw"],
        "issue": issue_label,
        "status": "linked",
        "url": ref["url"],
    }


def process_references(references, workspace, event_type, source):
    """Run the full pipeline: resolve → create link.  Returns (results, linked, skipped)."""
    results = []
    for ref in references:
        issue = resolve_issue(ref, workspace)
        if issue is None:
            results.append({
                "reference": ref["raw"],
                "status": "issue_not_found",
            })
        else:
            results.append(
                create_issue_link(ref, issue, workspace, event_type, source)
            )

    linked = sum(1 for r in results if r["status"] == "linked")
    skipped = sum(1 for r in results if r["status"] != "linked")
    return results, linked, skipped
