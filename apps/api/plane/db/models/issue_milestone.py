from django.db import models
from .project import ProjectBaseModel


class IssueMilestoneItem(ProjectBaseModel):
    """工作项级里程碑条目 — 每个工作项直接管理自己的里程碑条目（内容+日期）"""
    issue = models.ForeignKey(
        "db.Issue",
        on_delete=models.CASCADE,
        related_name="issue_milestone_items",
        verbose_name="工作项",
    )
    content = models.TextField(verbose_name="内容")
    target_date = models.DateField(null=True, blank=True, verbose_name="日期")
    sort_order = models.FloatField(default=65535)

    class Meta:
        verbose_name = "Issue Milestone Item"
        verbose_name_plural = "Issue Milestone Items"
        db_table = "issue_milestone_items"
        ordering = ("sort_order",)

    def __str__(self):
        return f"{self.content[:30]} <{self.issue.identifier}>"
