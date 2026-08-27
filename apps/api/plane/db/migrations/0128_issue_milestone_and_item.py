from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0127_alter_lanes_count_to_float"),
    ]

    operations = [
        migrations.CreateModel(
            name="IssueMilestoneItem",
            fields=[
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Created At"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Updated At"),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_created_by",
                        to="db.user",
                        verbose_name="Created By",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_updated_by",
                        to="db.user",
                        verbose_name="Updated By",
                    ),
                ),
                (
                    "id",
                    models.UUIDField(
                        primary_key=True,
                        serialize=False,
                        default=None,
                        editable=False,
                    ),
                ),
                (
                    "deleted_at",
                    models.DateTimeField(null=True, verbose_name="Deleted At"),
                ),
                (
                    "content",
                    models.TextField(verbose_name="内容"),
                ),
                (
                    "target_date",
                    models.DateField(blank=True, null=True, verbose_name="日期"),
                ),
                ("sort_order", models.FloatField(default=65535)),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="project_%(class)s",
                        to="db.project",
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="workspace_%(class)s",
                        to="db.workspace",
                    ),
                ),
                (
                    "issue",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="issue_milestone_items",
                        to="db.issue",
                        verbose_name="工作项",
                    ),
                ),
            ],
            options={
                "verbose_name": "Issue Milestone Item",
                "verbose_name_plural": "Issue Milestone Items",
                "db_table": "issue_milestone_items",
                "ordering": ("sort_order",),
            },
        ),
    ]
