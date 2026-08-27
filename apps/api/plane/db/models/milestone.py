# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import models

from .project import ProjectBaseModel


class Milestone(ProjectBaseModel):
    name = models.CharField(max_length=255, verbose_name="里程碑名称")
    description = models.TextField(blank=True, null=True, verbose_name="里程碑描述")
    target_date = models.DateField(null=True, blank=True, verbose_name="目标日期")
    sort_order = models.FloatField(default=65535)

    class Meta:
        verbose_name = "Milestone"
        verbose_name_plural = "Milestones"
        db_table = "milestones"
        ordering = ("sort_order",)

    def __str__(self):
        return f"{self.name} <{self.project.name}>"
