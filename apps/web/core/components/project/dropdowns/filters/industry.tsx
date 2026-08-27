/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { FilterHeader, FilterOption } from "@/components/issues/issue-layouts/filters";
import { useIndustry } from "@/hooks/store/use-industry";

type Props = {
  appliedFilters: string[] | null;
  handleUpdate: (val: string) => void;
  searchQuery: string;
  workspaceSlug: string;
};

export const FilterIndustry = observer(function FilterIndustry(props: Props) {
  const { appliedFilters, handleUpdate, searchQuery, workspaceSlug } = props;
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const { workspaceIndustries, fetchIndustries, fetched } = useIndustry();

  // Fetch industries if not yet loaded
  if (workspaceSlug && !fetched) {
    fetchIndustries(workspaceSlug);
  }

  const appliedFiltersCount = appliedFilters?.length ?? 0;
  const industries = workspaceIndustries ?? [];
  const filteredOptions = industries.filter((ind) =>
    ind.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <FilterHeader
        title={`行业${appliedFiltersCount > 0 ? ` (${appliedFiltersCount})` : ""}`}
        isPreviewEnabled={previewEnabled}
        handleIsPreviewEnabled={() => setPreviewEnabled(!previewEnabled)}
      />
      {previewEnabled && (
        <div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((ind) => (
              <FilterOption
                key={ind.id}
                isChecked={appliedFilters?.includes(ind.id) ? true : false}
                onClick={() => handleUpdate(ind.id)}
                title={ind.name}
              />
            ))
          ) : (
            <p className="text-11 text-placeholder italic">No matches found</p>
          )}
        </div>
      )}
    </>
  );
});
