/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { IIndustry } from "@plane/types";
// services
import { APIService } from "@/services/api.service";

export class IndustryService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getIndustries(workspaceSlug: string): Promise<IIndustry[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/industries/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createIndustry(workspaceSlug: string, data: Partial<IIndustry>): Promise<IIndustry> {
    return this.post(`/api/workspaces/${workspaceSlug}/industries/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getIndustry(workspaceSlug: string, industryId: string): Promise<IIndustry> {
    return this.get(`/api/workspaces/${workspaceSlug}/industries/${industryId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async updateIndustry(workspaceSlug: string, industryId: string, data: Partial<IIndustry>): Promise<IIndustry> {
    return this.patch(`/api/workspaces/${workspaceSlug}/industries/${industryId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteIndustry(workspaceSlug: string, industryId: string): Promise<any> {
    return this.delete(`/api/workspaces/${workspaceSlug}/industries/${industryId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
