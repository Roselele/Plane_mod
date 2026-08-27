/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, computed, observable, makeObservable, runInAction } from "mobx";
// types
import type { IMilestone } from "@plane/types";
// services
import { MilestoneService } from "@/services/milestone.service";
// store
import type { CoreRootStore } from "./root.store";

export interface IMilestoneStore {
  // observables
  loader: boolean;
  fetchedMap: Record<string, boolean>;
  milestoneMap: Record<string, IMilestone>;
  // computed
  projectMilestoneIds: string[] | null;
  // computed actions
  getMilestoneById: (milestoneId: string) => IMilestone | null;
  getProjectMilestones: (projectId: string) => IMilestone[] | null;
  getProjectMilestoneIds: (projectId: string) => string[] | null;
  // actions
  fetchMilestones: (workspaceSlug: string, projectId: string) => Promise<IMilestone[]>;
  createMilestone: (workspaceSlug: string, projectId: string, data: Partial<IMilestone>) => Promise<IMilestone>;
  updateMilestone: (
    workspaceSlug: string,
    projectId: string,
    milestoneId: string,
    data: Partial<IMilestone>
  ) => Promise<IMilestone>;
  deleteMilestone: (workspaceSlug: string, projectId: string, milestoneId: string) => Promise<void>;
}

export class MilestoneStore implements IMilestoneStore {
  // observables
  loader: boolean = false;
  fetchedMap: Record<string, boolean> = {};
  milestoneMap: Record<string, IMilestone> = {};
  // root store
  rootStore;
  // services
  milestoneService;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      // observables
      loader: observable.ref,
      fetchedMap: observable,
      milestoneMap: observable,
      // computed
      projectMilestoneIds: computed,
      // actions
      fetchMilestones: action,
      createMilestone: action,
      updateMilestone: action,
      deleteMilestone: action,
    });
    this.rootStore = _rootStore;
    this.milestoneService = new MilestoneService();
  }

  // computed
  get projectMilestoneIds(): string[] | null {
    // This returns milestones for the "current" project context via route params
    // Components should prefer getProjectMilestoneIds(projectId) for explicit scoping
    const milestones = Object.values(this.milestoneMap);
    if (!milestones || milestones.length === 0) return null;
    return milestones
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => m.id);
  }

  // computed actions
  getMilestoneById = (milestoneId: string): IMilestone | null => {
    return this.milestoneMap[milestoneId] ?? null;
  };

  getProjectMilestones = (projectId: string): IMilestone[] | null => {
    const milestones = Object.values(this.milestoneMap).filter((m) => m.project === projectId);
    if (!milestones || milestones.length === 0) return null;
    return milestones.sort((a, b) => a.sort_order - b.sort_order);
  };

  getProjectMilestoneIds = (projectId: string): string[] | null => {
    const milestones = this.getProjectMilestones(projectId);
    if (!milestones) return null;
    return milestones.map((m) => m.id);
  };

  // actions
  fetchMilestones = async (workspaceSlug: string, projectId: string): Promise<IMilestone[]> => {
    try {
      this.loader = true;
      const response = await this.milestoneService.getMilestones(workspaceSlug, projectId);
      runInAction(() => {
        // Remove old milestones for this project before setting new ones
        Object.keys(this.milestoneMap).forEach((key) => {
          if (this.milestoneMap[key].project === projectId) {
            delete this.milestoneMap[key];
          }
        });
        response.forEach((milestone) => {
          this.milestoneMap[milestone.id] = milestone;
        });
        this.fetchedMap[projectId] = true;
        this.loader = false;
      });
      return response;
    } catch (error) {
      this.loader = false;
      throw error;
    }
  };

  createMilestone = async (
    workspaceSlug: string,
    projectId: string,
    data: Partial<IMilestone>
  ): Promise<IMilestone> => {
    const response = await this.milestoneService.createMilestone(workspaceSlug, projectId, data);
    runInAction(() => {
      this.milestoneMap[response.id] = response;
    });
    return response;
  };

  updateMilestone = async (
    workspaceSlug: string,
    projectId: string,
    milestoneId: string,
    data: Partial<IMilestone>
  ): Promise<IMilestone> => {
    const response = await this.milestoneService.updateMilestone(workspaceSlug, projectId, milestoneId, data);
    runInAction(() => {
      this.milestoneMap[milestoneId] = response;
    });
    return response;
  };

  deleteMilestone = async (workspaceSlug: string, projectId: string, milestoneId: string): Promise<void> => {
    await this.milestoneService.deleteMilestone(workspaceSlug, projectId, milestoneId);
    runInAction(() => {
      delete this.milestoneMap[milestoneId];
      });
  };
}
