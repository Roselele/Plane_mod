from rest_framework import serializers
from .base import BaseSerializer
from plane.db.models import IssueMilestoneItem


class IssueMilestoneItemSerializer(BaseSerializer):
    class Meta:
        model = IssueMilestoneItem
        fields = "__all__"
        read_only_fields = [
            "workspace",
            "project",
            "issue",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "deleted_at",
        ]
