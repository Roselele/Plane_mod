# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework.response import Response
from rest_framework import status

# Module imports
from ..base import BaseViewSet
from plane.app.permissions import ProjectEntityPermission
from plane.app.serializers import MilestoneSerializer
from plane.db.models import Milestone, Project
from plane.utils.cache import invalidate_cache


class MilestoneViewSet(BaseViewSet):
    permission_classes = [ProjectEntityPermission]
    model = Milestone
    serializer_class = MilestoneSerializer

    def get_queryset(self):
        return self.model.objects.filter(
            workspace__slug=self.workspace_slug,
            project_id=self.project_id,
        )

    def create(self, request, slug, project_id):
        project = Project.objects.get(pk=project_id, workspace__slug=slug)
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        milestone = Milestone.objects.create(
            **serializer.validated_data,
            project=project,
            workspace=project.workspace,
            created_by=request.user,
            updated_by=request.user,
        )
        serializer = self.serializer_class(milestone)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, slug, project_id, pk):
        milestone = Milestone.objects.get(pk=pk, project_id=project_id, workspace__slug=slug)
        serializer = self.serializer_class(milestone, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(updated_by=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, slug, project_id, pk):
        milestone = Milestone.objects.get(pk=pk, project_id=project_id, workspace__slug=slug)
        milestone.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
