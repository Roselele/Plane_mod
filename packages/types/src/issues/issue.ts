/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TIssuePriorities } from "../issues";
import type { TStateGroups } from "../state";
import type { TIssuePublicComment } from "./activity/issue_comment";
import type { TIssueAttachment } from "./issue_attachment";
import type { TIssueLink } from "./issue_link";
import type { TIssueReaction, IIssuePublicReaction, IPublicVote } from "./issue_reaction";
import type { TIssueRelationTypes } from "./issue_relation";

export enum EIssueLayoutTypes {
  LIST = "list",
  KANBAN = "kanban",
  CALENDAR = "calendar",
  GANTT = "gantt_chart",
  SPREADSHEET = "spreadsheet",
}

export enum EIssueServiceType {
  ISSUES = "issues",
  EPICS = "epics",
  WORK_ITEMS = "work-items",
}

export enum EIssuesStoreType {
  GLOBAL = "GLOBAL",
  PROFILE = "PROFILE",
  TEAM = "TEAM",
  PROJECT = "PROJECT",
  CYCLE = "CYCLE",
  MODULE = "MODULE",
  TEAM_VIEW = "TEAM_VIEW",
  PROJECT_VIEW = "PROJECT_VIEW",
  ARCHIVED = "ARCHIVED",
  DEFAULT = "DEFAULT",
  WORKSPACE_DRAFT = "WORKSPACE_DRAFT",
  EPIC = "EPIC",
  TEAM_PROJECT_WORK_ITEMS = "TEAM_PROJECT_WORK_ITEMS",
}

export type TBaseIssue = {
  id: string;
  sequence_id: number;
  name: string;
  sort_order: number;

  state_id: string | null;
  priority: TIssuePriorities | null;
  label_ids: string[];
  assignee_ids: string[];
  assignee_roles?: Record<string, string | null>;
  estimate_point: string | null;

  sub_issues_count: number;
  attachment_count: number;
  link_count: number;

  project_id: string | null;
  parent_id: string | null;
  cycle_id: string | null;
  module_ids: string[] | null;
  type_id: string | null;

  created_at: string;
  updated_at: string;
  start_date: string | null;
  target_date: string | null;
  completed_at: string | null;
  archived_at: string | null;

  created_by: string;
  updated_by: string;

  is_draft: boolean;
  is_epic?: boolean;
  is_intake?: boolean;
  is_hidden?: boolean;

  // === Part 2: 子需求级字段 ===
  work_category?: string | null;
  okr?: string | null;
  phase_goal?: string | null;
  progress?: number | null;
  version_name?: string | null;
  risk?: string | null;
  milestone?: string | null;

  // === Part 3: 子需求级商务信息（可选） ===
  demand_background?: string | null;
  key_notes?: string | null;
  conclusion?: string | null;
  is_privatized?: string | null;
  lanes_count?: number | null;
  estimated_revenue?: number | string | null;
  estimated_profit?: number | string | null;
  settlement_status?: string | null;

  // === Part 4: 工作项级字段（仅子工作项显示） ===
  deliverables?: string | null;
  remark?: string | null;

  // === Part 4.5: 阶段级字段（仅阶段工作项显示） ===
  task_log?: string | null;

  // === Part 5: 是否多阶段（仅子需求级使用） ===
  has_phases?: boolean;
};

type IssueRelation = {
  id: string;
  name: string;
  project_id: string;
  relation_type: TIssueRelationTypes;
  sequence_id: number;
};

export type TIssue = TBaseIssue & {
  description_html?: string;
  is_subscribed?: boolean;
  parent?: Partial<TBaseIssue>;
  issue_reactions?: TIssueReaction[];
  issue_attachments?: TIssueAttachment[];
  issue_link?: TIssueLink[];
  issue_relation?: IssueRelation[];
  issue_related?: IssueRelation[];
  // tempId is used for optimistic updates. It is not a part of the API response.
  tempId?: string;
  // sourceIssueId is used to store the original issue id when creating a copy of an issue. Used in cloning property values. It is not a part of the API response.
  sourceIssueId?: string;
  state__group?: TStateGroups | null;
};

export type TIssueMap = {
  [issue_id: string]: TIssue;
};

export type TIssueResponseResults =
  | TBaseIssue[]
  | {
      [key: string]: {
        results:
          | TBaseIssue[]
          | {
              [key: string]: {
                results: TBaseIssue[];
                total_results: number;
              };
            };
        total_results: number;
      };
    };

export type TIssuesResponse = {
  grouped_by: string;
  next_cursor: string;
  prev_cursor: string;
  next_page_results: boolean;
  prev_page_results: boolean;
  total_count: number;
  count: number;
  total_pages: number;
  extra_stats: null;
  results: TIssueResponseResults;
  total_results: number;
};

export type TBulkIssueProperties = Pick<
  TIssue,
  | "state_id"
  | "priority"
  | "label_ids"
  | "assignee_ids"
  | "start_date"
  | "target_date"
  | "module_ids"
  | "cycle_id"
  | "estimate_point"
>;

export type TBulkOperationsPayload = {
  issue_ids: string[];
  properties: Partial<TBulkIssueProperties>;
};

export type TWorkItemWidgets = "sub-work-items" | "relations" | "links" | "attachments";

export type TIssueServiceType = EIssueServiceType.ISSUES | EIssueServiceType.EPICS | EIssueServiceType.WORK_ITEMS;

export interface IPublicIssue extends Pick<
  TIssue,
  | "description_html"
  | "created_at"
  | "updated_at"
  | "created_by"
  | "id"
  | "name"
  | "priority"
  | "state_id"
  | "project_id"
  | "sequence_id"
  | "sort_order"
  | "start_date"
  | "target_date"
  | "cycle_id"
  | "module_ids"
  | "label_ids"
  | "assignee_ids"
  | "attachment_count"
  | "sub_issues_count"
  | "link_count"
  | "estimate_point"
> {
  comments: TIssuePublicComment[];
  reaction_items: IIssuePublicReaction[];
  vote_items: IPublicVote[];
}

type TPublicIssueResponseResults =
  | IPublicIssue[]
  | {
      [key: string]: {
        results:
          | IPublicIssue[]
          | {
              [key: string]: {
                results: IPublicIssue[];
                total_results: number;
              };
            };
        total_results: number;
      };
    };

export type TPublicIssuesResponse = {
  grouped_by: string;
  next_cursor: string;
  prev_cursor: string;
  next_page_results: boolean;
  prev_page_results: boolean;
  total_count: number;
  count: number;
  total_pages: number;
  extra_stats: null;
  results: TPublicIssueResponseResults;
};

export interface IWorkItemPeekOverview {
  embedIssue?: boolean;
  embedRemoveCurrentNotification?: () => void;
  is_draft?: boolean;
  storeType?: EIssuesStoreType;
}
