# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import models

from .base import BaseModel


class Industry(BaseModel):
    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="industries",
    )
    name = models.CharField(max_length=255, verbose_name="行业名称")
    description = models.TextField(blank=True, null=True, verbose_name="行业描述")

    class Meta:
        verbose_name = "Industry"
        verbose_name_plural = "Industries"
        db_table = "industries"
        ordering = ("name",)
        unique_together = ["name", "workspace", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "workspace"],
                condition=models.Q(deleted_at__isnull=True),
                name="industry_unique_name_workspace_when_deleted_at_null",
            )
        ]

    def __str__(self):
        return f"{self.name} <{self.workspace.name}>"
