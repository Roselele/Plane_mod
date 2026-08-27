# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third Party imports
from rest_framework.response import Response
from rest_framework import status

# Module imports
from .. import BaseViewSet
from plane.app.serializers import IssueHiddenSerializer
from plane.app.permissions import ProjectLitePermission
from plane.db.models import IssueHidden


class IssueHiddenViewSet(BaseViewSet):
    serializer_class = IssueHiddenSerializer
    model = IssueHidden

    permission_classes = [ProjectLitePermission]

    def get_permissions(self):
        return super(IssueHiddenViewSet, self).get_permissions()

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(issue_id=self.kwargs.get("issue_id"))
            .filter(user=self.request.user)
        )

    def hide(self, request, slug, project_id, issue_id):
        """Hide an issue for the current user (idempotent)."""
        existing, created = IssueHidden.objects.get_or_create(
            issue_id=issue_id,
            user_id=request.user.id,
            project_id=project_id,
            defaults={"workspace_id": request.user.workspace_id} if hasattr(request.user, "workspace_id") else {},
        )
        serializer = IssueHiddenSerializer(existing)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def unhide(self, request, slug, project_id, issue_id):
        """Unhide an issue for the current user."""
        try:
            hidden = IssueHidden.objects.get(
                project_id=project_id,
                user=request.user,
                workspace__slug=slug,
                issue=issue_id,
            )
            hidden.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except IssueHidden.DoesNotExist:
            return Response(
                {"message": "Issue is not hidden for this user."},
                status=status.HTTP_404_NOT_FOUND,
            )

    def hidden_status(self, request, slug, project_id, issue_id):
        """Check if an issue is hidden for the current user."""
        is_hidden = IssueHidden.objects.filter(
            issue=issue_id,
            user=request.user,
            workspace__slug=slug,
            project=project_id,
        ).exists()
        return Response({"hidden": is_hidden}, status=status.HTTP_200_OK)
