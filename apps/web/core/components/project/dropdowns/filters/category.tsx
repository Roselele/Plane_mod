/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { FilterHeader, FilterOption } from "@/components/issues/issue-layouts/filters";

const CATEGORY_OPTIONS = ["标品", "立项", "能力", "其他", "项目", "演示", "专项"];

type Props = {
  appliedFilters: string[] | null;
  handleUpdate: (val: string) => void;
  searchQuery: string;
};

export const FilterCategory = observer(function FilterCategory(props: Props) {
  const { appliedFilters, handleUpdate, searchQuery } = props;
  const [previewEnabled, setPreviewEnabled] = useState(true);

  const appliedFiltersCount = appliedFilters?.length ?? 0;
  const filteredOptions = CATEGORY_OPTIONS.filter((a) =>
    a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <FilterHeader
        title={`类别${appliedFiltersCount > 0 ? ` (${appliedFiltersCount})` : ""}`}
        isPreviewEnabled={previewEnabled}
        handleIsPreviewEnabled={() => setPreviewEnabled(!previewEnabled)}
      />
      {previewEnabled && (
        <div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((cat) => (
              <FilterOption
                key={cat}
                isChecked={appliedFilters?.includes(cat) ? true : false}
                onClick={() => handleUpdate(cat)}
                title={cat}
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
