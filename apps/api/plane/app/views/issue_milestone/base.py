from rest_framework import status
from rest_framework.response import Response

from ..base import BaseViewSet
from plane.app.permissions import ProjectEntityPermission
from plane.app.serializers import IssueMilestoneItemSerializer
from plane.db.models import IssueMilestoneItem, Issue


class IssueMilestoneViewSet(BaseViewSet):
    """工作项级里程碑条目 CRUD — 每个工作项直接管理自己的条目列表"""
    permission_classes = [ProjectEntityPermission]
    model = IssueMilestoneItem
    serializer_class = IssueMilestoneItemSerializer

    def get_queryset(self):
        return self.model.objects.filter(
            workspace__slug=self.workspace_slug,
            project_id=self.project_id,
            issue_id=self.kwargs.get("issue_id"),
        )

    def create(self, request, slug, project_id, issue_id):
        issue = Issue.objects.get(pk=issue_id, project_id=project_id, workspace__slug=slug)
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        item = IssueMilestoneItem.objects.create(
            **serializer.validated_data,
            issue=issue,
            project_id=project_id,
            workspace=issue.workspace,
            created_by=request.user,
            updated_by=request.user,
        )
        serializer = self.serializer_class(item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, slug, project_id, issue_id, pk):
        item = IssueMilestoneItem.objects.get(
            pk=pk, issue_id=issue_id, project_id=project_id, workspace__slug=slug
        )
        serializer = self.serializer_class(item, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(updated_by=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, slug, project_id, issue_id, pk):
        item = IssueMilestoneItem.objects.get(
            pk=pk, issue_id=issue_id, project_id=project_id, workspace__slug=slug
        )
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
