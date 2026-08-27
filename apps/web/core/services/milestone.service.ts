/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { IMilestone } from "@plane/types";
// services
import { APIService } from "@/services/api.service";

export class MilestoneService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getMilestones(workspaceSlug: string, projectId: string): Promise<IMilestone[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/milestones/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createMilestone(workspaceSlug: string, projectId: string, data: Partial<IMilestone>): Promise<IMilestone> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/milestones/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getMilestone(workspaceSlug: string, projectId: string, milestoneId: string): Promise<IMilestone> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/milestones/${milestoneId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async updateMilestone(
    workspaceSlug: string,
    projectId: string,
    milestoneId: string,
    data: Partial<IMilestone>
  ): Promise<IMilestone> {
    return this.patch(`/api/workspaces/${workspaceSlug}/projects/${projectId}/milestones/${milestoneId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteMilestone(workspaceSlug: string, projectId: string, milestoneId: string): Promise<any> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/milestones/${milestoneId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
