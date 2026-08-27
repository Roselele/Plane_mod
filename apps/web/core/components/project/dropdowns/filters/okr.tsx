/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import { FilterHeader, FilterOption } from "@/components/issues/issue-layouts/filters";

const OKR_OPTIONS = ["一季度", "二季度", "三季度", "四季度"];

type Props = {
  appliedFilters: string[] | null;
  handleUpdate: (val: string) => void;
  searchQuery: string;
};

export const FilterOkr = observer(function FilterOkr(props: Props) {
  const { appliedFilters, handleUpdate, searchQuery } = props;
  const [previewEnabled, setPreviewEnabled] = useState(true);

  const appliedFiltersCount = appliedFilters?.length ?? 0;
  const filteredOptions = OKR_OPTIONS.filter((a) =>
    a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <FilterHeader
        title={`OKR${appliedFiltersCount > 0 ? ` (${appliedFiltersCount})` : ""}`}
        isPreviewEnabled={previewEnabled}
        handleIsPreviewEnabled={() => setPreviewEnabled(!previewEnabled)}
      />
      {previewEnabled && (
        <div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((okr) => (
              <FilterOption
                key={okr}
                isChecked={appliedFilters?.includes(okr) ? true : false}
                onClick={() => handleUpdate(okr)}
                title={okr}
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
