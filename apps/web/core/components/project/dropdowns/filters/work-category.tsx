/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { FilterHeader, FilterOption } from "@/components/issues/issue-layouts/filters";

const WORK_CATEGORY_OPTIONS = ["保存量", "建能力", "求拓展"];

type Props = {
  appliedFilters: string[] | null;
  handleUpdate: (val: string) => void;
  searchQuery: string;
};

export const FilterWorkCategory = observer(function FilterWorkCategory(props: Props) {
  const { appliedFilters, handleUpdate, searchQuery } = props;
  const [previewEnabled, setPreviewEnabled] = useState(true);

  const appliedFiltersCount = appliedFilters?.length ?? 0;
  const filteredOptions = WORK_CATEGORY_OPTIONS.filter((a) =>
    a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <FilterHeader
        title={`工作分类${appliedFiltersCount > 0 ? ` (${appliedFiltersCount})` : ""}`}
        isPreviewEnabled={previewEnabled}
        handleIsPreviewEnabled={() => setPreviewEnabled(!previewEnabled)}
      />
      {previewEnabled && (
        <div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((wc) => (
              <FilterOption
                key={wc}
                isChecked={appliedFilters?.includes(wc) ? true : false}
                onClick={() => handleUpdate(wc)}
                title={wc}
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
