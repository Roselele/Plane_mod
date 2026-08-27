# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.urls import path

from plane.app.views.integrations.gitlab import GitlabWebhookEndpoint
from plane.app.views.integrations.github import GithubWebhookEndpoint

urlpatterns = [
    path(
        "workspaces/<str:slug>/integrations/gitlab/webhook/",
        GitlabWebhookEndpoint.as_view(),
        name="gitlab-webhook",
    ),
    path(
        "workspaces/<str:slug>/integrations/github/webhook/",
        GithubWebhookEndpoint.as_view(),
        name="github-webhook",
    ),
]
