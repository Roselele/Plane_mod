import { API_BASE_URL } from "@plane/constants";
import type { IIssueMilestoneItem, TPartialIssueMilestoneItem } from "@plane/types";
import { APIService } from "@/services/api.service";

export class IssueMilestoneService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getIssueMilestoneItems(workspaceSlug: string, projectId: string, issueId: string): Promise<IIssueMilestoneItem[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/issue-milestones/`)
      .then((response) => response?.data)
      .catch((error) => { throw error?.response?.data; });
  }

  async createIssueMilestoneItem(workspaceSlug: string, projectId: string, issueId: string, data: TPartialIssueMilestoneItem): Promise<IIssueMilestoneItem> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/issue-milestones/`, data)
      .then((response) => response?.data)
      .catch((error) => { throw error?.response?.data; });
  }

  async updateIssueMilestoneItem(workspaceSlug: string, projectId: string, issueId: string, itemId: string, data: TPartialIssueMilestoneItem): Promise<IIssueMilestoneItem> {
    return this.patch(`/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/issue-milestones/${itemId}/`, data)
      .then((response) => response?.data)
      .catch((error) => { throw error?.response?.data; });
  }

  async deleteIssueMilestoneItem(workspaceSlug: string, projectId: string, issueId: string, itemId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/issue-milestones/${itemId}/`)
      .then((response) => response?.data)
      .catch((error) => { throw error?.response?.data; });
  }
}
