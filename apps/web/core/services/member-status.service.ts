/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { TBaseIssue } from "@plane/types";
// services
import { APIService } from "@/services/api.service";

export class MemberStatusService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  /**
   * Fetch all workspace issues (paginated, cursor-based).
   * Filters out issues without start_date/target_date on the client side.
   * Does NOT use expand=issue_relation to avoid the missing issues-detail/ route.
   */
  async getAllWorkspaceIssues(workspaceSlug: string): Promise<TBaseIssue[]> {
    try {
      let allIssues: TBaseIssue[] = [];
      let cursor: string | undefined = undefined;
      let hasMore = true;
      let maxPages = 50; // safety limit

      while (hasMore && maxPages > 0) {
        const params: Record<string, any> = {
          per_page: 100,
        };
        if (cursor) params.cursor = cursor;

        const response = await this.get(`/api/workspaces/${workspaceSlug}/issues/`, { params });
        const data = response?.data;

        if (data?.results && Array.isArray(data.results)) {
          allIssues = allIssues.concat(data.results as TBaseIssue[]);
        }

        hasMore = data?.next_page_results ?? false;
        cursor = data?.next_cursor;
        maxPages--;
      }

      return allIssues;
    } catch (error: any) {
      throw error?.response?.data ?? error;
    }
  }
}
