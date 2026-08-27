/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export interface IMilestone {
  id: string;
  project: string;
  workspace: string;
  name: string;
  description: string | null;
  target_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export type TPartialMilestone = Partial<IMilestone>;
