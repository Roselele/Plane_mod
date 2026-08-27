# Copyright (c) 2023-present Plane Software, Inc. and contributors.
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Module imports
from .base import BaseSerializer

from plane.db.models import Milestone


class MilestoneSerializer(BaseSerializer):
    class Meta:
        model = Milestone
        fields = "__all__"
        read_only_fields = ["workspace", "project", "created_by", "updated_by", "created_at", "updated_at", "deleted_at"]
