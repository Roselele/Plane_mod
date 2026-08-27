export interface IIssueMilestoneItem {
  id: string;
  issue: string;
  project: string;
  workspace: string;
  content: string;
  target_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  deleted_at: string | null;
}

export type TPartialIssueMilestoneItem = Partial<Omit<IIssueMilestoneItem, "issue">>;
