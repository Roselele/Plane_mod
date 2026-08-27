/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { action, computed, observable, makeObservable, runInAction } from "mobx";
// types
import type { IIndustry } from "@plane/types";
// services
import { IndustryService } from "@/services/industry.service";
// store
import type { CoreRootStore } from "./root.store";

export interface IIndustryStore {
  // observables
  loader: boolean;
  fetched: boolean;
  industryMap: Record<string, IIndustry>;
  // computed
  workspaceIndustries: IIndustry[] | null;
  // computed actions
  getIndustryById: (industryId: string) => IIndustry | null;
  // actions
  fetchIndustries: (workspaceSlug: string) => Promise<IIndustry[]>;
  createIndustry: (workspaceSlug: string, data: Partial<IIndustry>) => Promise<IIndustry>;
  updateIndustry: (workspaceSlug: string, industryId: string, data: Partial<IIndustry>) => Promise<IIndustry>;
  deleteIndustry: (workspaceSlug: string, industryId: string) => Promise<void>;
}

export class IndustryStore implements IIndustryStore {
  // observables
  loader: boolean = false;
  fetched: boolean = false;
  industryMap: Record<string, IIndustry> = {};
  // root store
  rootStore;
  // services
  industryService;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      // observables
      loader: observable.ref,
      fetched: observable.ref,
      industryMap: observable,
      // computed
      workspaceIndustries: computed,
      // actions
      fetchIndustries: action,
      createIndustry: action,
      updateIndustry: action,
      deleteIndustry: action,
    });
    this.rootStore = _rootStore;
    this.industryService = new IndustryService();
  }

  // computed
  get workspaceIndustries(): IIndustry[] | null {
    const industries = Object.values(this.industryMap);
    if (!industries || industries.length === 0) return null;
    return industries.sort((a, b) => a.name.localeCompare(b.name));
  }

  // computed actions
  getIndustryById = (industryId: string): IIndustry | null => {
    return this.industryMap[industryId] ?? null;
  };

  // actions
  fetchIndustries = async (workspaceSlug: string): Promise<IIndustry[]> => {
    try {
      this.loader = true;
      const response = await this.industryService.getIndustries(workspaceSlug);
      runInAction(() => {
        this.industryMap = {};
        response.forEach((industry) => {
          this.industryMap[industry.id] = industry;
        });
        this.fetched = true;
        this.loader = false;
      });
      return response;
    } catch (error) {
      this.loader = false;
      throw error;
    }
  };

  createIndustry = async (workspaceSlug: string, data: Partial<IIndustry>): Promise<IIndustry> => {
    const response = await this.industryService.createIndustry(workspaceSlug, data);
    runInAction(() => {
      this.industryMap[response.id] = response;
    });
    return response;
  };

  updateIndustry = async (
    workspaceSlug: string,
    industryId: string,
    data: Partial<IIndustry>
  ): Promise<IIndustry> => {
    const response = await this.industryService.updateIndustry(workspaceSlug, industryId, data);
    runInAction(() => {
      this.industryMap[industryId] = response;
    });
    return response;
  };

  deleteIndustry = async (workspaceSlug: string, industryId: string): Promise<void> => {
    await this.industryService.deleteIndustry(workspaceSlug, industryId);
    runInAction(() => {
      delete this.industryMap[industryId];
    });
  };
}
