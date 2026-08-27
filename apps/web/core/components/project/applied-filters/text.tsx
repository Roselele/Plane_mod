/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { CloseIcon } from "@plane/propel/icons";

type Props = {
  handleRemove: (val: string) => void;
  values: string[];
  editable: boolean | undefined;
  labels?: Record<string, string>;
};

export const AppliedTextFilters = observer(function AppliedTextFilters(props: Props) {
  const { handleRemove, values, editable, labels } = props;

  return (
    <>
      {values.map((val) => (
        <div key={val} className="flex items-center gap-1 rounded-sm bg-layer-1 px-1.5 py-1 text-11">
          {labels?.[val] ?? val}
          {editable && (
            <button
              type="button"
              className="grid place-items-center text-tertiary hover:text-secondary"
              onClick={() => handleRemove(val)}
            >
              <CloseIcon height={10} width={10} strokeWidth={2} />
            </button>
          )}
        </div>
      ))}
    </>
  );
});
