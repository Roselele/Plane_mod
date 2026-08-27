/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { runInAction } from "mobx";
import { EIssuesStoreType } from "@plane/types";
// hooks
import { useIssues } from "@/hooks/store/use-issues";
import { useIssuesActions } from "@/hooks/use-issues-actions";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
import { ProjectInfoRoot } from "@/components/project-info/project-info-root";

function ProjectInfoPage() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug?.toString();
  const projectId = params?.projectId?.toString();
  // store hooks
  const { fetchProjectDetails, getProjectById } = useProject();
  const { issues, issuesFilter, issueMap } = useIssues(EIssuesStoreType.PROJECT);
  const { fetchIssues, updateIssue } = useIssuesActions(EIssuesStoreType.PROJECT);
  const { fetchProjectStates, getStateById } = useProjectState();

  // Fetch project details
  useSWR(
    workspaceSlug && projectId ? `PROJECT_INFO_DETAILS_${workspaceSlug}_${projectId}` : null,
    async () => {
      if (workspaceSlug && projectId) {
        await fetchProjectDetails(workspaceSlug, projectId);
      }
    },
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  // Fetch display filters (required before fetching issues)
  useSWR(
    workspaceSlug && projectId ? `PROJECT_INFO_FILTERS_${workspaceSlug}_${projectId}` : null,
    async () => {
      if (workspaceSlug && projectId) {
        await issuesFilter?.fetchFilters(workspaceSlug, projectId);
      }
    },
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  const displayFilters = issuesFilter?.issueFilters?.displayFilters;
  const group_by = displayFilters?.group_by ?? null;

  // Fetch issues once filters are loaded
  // The project info page needs the full issue hierarchy (sub-requirements → phases →
  // work items), so it must always fetch sub-issues regardless of the user's "show sub
  // issues" toggle on the work items list page. We force sub_issue=true in the store
  // *without* persisting to the backend, so the list page preference is not affected.
  useEffect(() => {
    if (!displayFilters || !projectId) return;
    runInAction(() => {
      const storeFilters = issuesFilter?.filters?.[projectId]?.displayFilters;
      if (storeFilters) {
        storeFilters.sub_issue = true;
      }
    });
    fetchIssues("init-loader", { canGroup: true, perPageCount: 100 });
  }, [fetchIssues, displayFilters, group_by, issuesFilter, projectId]);

  // Fetch project states for state name/color resolution
  useSWR(
    workspaceSlug && projectId ? `PROJECT_INFO_STATES_${workspaceSlug}_${projectId}` : null,
    async () => {
      if (workspaceSlug && projectId) {
        await fetchProjectStates(workspaceSlug, projectId);
      }
    },
    { revalidateIfStale: false, revalidateOnFocus: false, revalidateOnReconnect: false }
  );

  const project = getProjectById(projectId ?? "");

  // Collect issues from all groups
  const groupedIssueIds = issues?.groupedIssueIds;
  const allIssues: typeof issueMap[string][] = [];
  if (groupedIssueIds) {
    for (const key of Object.keys(groupedIssueIds)) {
      const ids = groupedIssueIds[key] as string[];
      if (ids) {
        for (const id of ids) {
          const issue = issueMap[id];
          if (issue && !allIssues.find((i) => i.id === issue.id)) {
            allIssues.push(issue);
          }
        }
      }
    }
  }

  // Resolve state for each issue
  const issuesWithState = allIssues.map((issue) => ({
    ...issue,
    stateDetails: issue.state_id ? getStateById(issue.state_id) ?? null : null,
  }));

  const isLoading = issues?.getIssueLoader() === "init-loader";

  if (!workspaceSlug || !projectId) return null;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <ProjectInfoRoot
        project={project}
        issues={issuesWithState}
        isLoading={isLoading}
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        updateIssue={updateIssue}
      />
    </div>
  );
}

export default observer(ProjectInfoPage);
