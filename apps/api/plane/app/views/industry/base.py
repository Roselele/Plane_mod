# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework.response import Response
from rest_framework import status

# Module imports
from ..base import BaseViewSet
from plane.app.permissions import WorkspaceEntityPermission
from plane.app.serializers import IndustrySerializer
from plane.db.models import Industry, Workspace
from plane.utils.cache import invalidate_cache


class IndustryViewSet(BaseViewSet):
    permission_classes = [WorkspaceEntityPermission]
    model = Industry
    serializer_class = IndustrySerializer

    def get_queryset(self):
        return self.model.objects.filter(workspace__slug=self.workspace_slug)

    def create(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        industry = Industry.objects.create(
            **serializer.validated_data,
            workspace=workspace,
            created_by=request.user,
            updated_by=request.user,
        )
        serializer = self.serializer_class(industry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, slug, pk):
        industry = Industry.objects.get(pk=pk, workspace__slug=slug)
        serializer = self.serializer_class(industry, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(updated_by=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, slug, pk):
        industry = Industry.objects.get(pk=pk, workspace__slug=slug)
        industry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
