/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Plus } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { TProject } from "@plane/types";
import { CustomSelect, Input } from "@plane/ui";
// hooks
import { useIndustry } from "@/hooks/store/use-industry";

// === 固定选项常量（与 form.tsx 保持一致）===
const CATEGORY_CHOICES = ["标品", "立项", "能力", "其他", "项目", "演示", "专项"];

function renderSelectOptions(options: string[]) {
  return options.map((opt) => (
    <CustomSelect.Option key={opt} value={opt}>
      <div className="flex items-center gap-2">
        <span>{opt}</span>
      </div>
    </CustomSelect.Option>
  ));
}

type Props = {
  workspaceSlug: string;
};

function ProjectCustomAttributes(props: Props) {
  const { workspaceSlug } = props;
  const {
    formState: { errors },
    control,
  } = useFormContext<TProject>();
  const { t } = useTranslation();
  const { fetchIndustries, workspaceIndustries, fetched, createIndustry } = useIndustry();
  const [newIndustryName, setNewIndustryName] = useState("");
  const [isCreatingIndustry, setIsCreatingIndustry] = useState(false);

  useEffect(() => {
    if (workspaceSlug && !fetched) {
      fetchIndustries(workspaceSlug);
    }
  }, [workspaceSlug, fetched, fetchIndustries]);

  const industries = workspaceIndustries ?? [];

  return (
    <div className="space-y-3">
      {/* 第一行：类别 | 行业 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-11 font-medium text-secondary">{t("project_settings.custom_fields.category")} *</label>
          <Controller
            control={control}
            name="category"
            rules={{ required: t("project_settings.custom_fields.validation.required_category") }}
            render={({ field: { value, onChange } }) => (
              <CustomSelect
                value={value}
                onChange={onChange}
                label={value ?? <span className="text-placeholder">{t("project_settings.custom_fields.select_placeholder")}</span>}
                buttonClassName="!border-subtle !shadow-none font-medium rounded-md h-8"
                input
              >
                {renderSelectOptions(CATEGORY_CHOICES)}
              </CustomSelect>
            )}
          />
          <span className="text-11 text-danger-primary">{errors?.category?.message}</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-11 font-medium text-secondary">{t("project_settings.custom_fields.industry")} *</label>
          <Controller
            control={control}
            name="industry"
            rules={{ required: t("project_settings.custom_fields.validation.required_industry") }}
            render={({ field: { value, onChange } }) => {
              const selected = industries.find((i) => i.id === value);
              const handleCreateIndustry = async () => {
                const name = newIndustryName.trim();
                if (!name) return;
                setIsCreatingIndustry(true);
                try {
                  const created = await createIndustry(workspaceSlug, { name });
                  setToast({ type: TOAST_TYPE.SUCCESS, title: t("project_settings.industries.toast_created_title"), message: t("project_settings.industries.toast_created_message", { name }) });
                  onChange(created.id);
                  setNewIndustryName("");
                } catch {
                  setToast({ type: TOAST_TYPE.ERROR, title: t("project_settings.industries.toast_error_title"), message: t("project_settings.industries.toast_error_message") });
                } finally {
                  setIsCreatingIndustry(false);
                }
              };
              return (
                <CustomSelect
                  value={value}
                  onChange={onChange}
                  label={
                    selected ? (
                      selected.name
                    ) : (
                      <span className="text-placeholder">{t("project_settings.custom_fields.select_placeholder")}</span>
                    )
                  }
                  buttonClassName="!border-subtle !shadow-none font-medium rounded-md h-8"
                  input
                  optionsClassName="min-w-56"
                >
                  {industries.map((ind) => (
                    <CustomSelect.Option key={ind.id} value={ind.id}>
                      <span>{ind.name}</span>
                    </CustomSelect.Option>
                  ))}
                  <>
                    <div className="my-1.5 border-t border-subtle" />
                    <div className="flex items-center gap-1.5 px-1 py-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={newIndustryName}
                        onChange={(e) => setNewIndustryName(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter" && newIndustryName.trim()) {
                            e.preventDefault();
                            handleCreateIndustry();
                          }
                        }}
                        placeholder={t("project_settings.custom_fields.new_industry_placeholder")}
                        className="w-full rounded border border-subtle bg-transparent px-2 py-1 text-11 outline-none focus:border-accent-primary"
                      />
                      <button
                        type="button"
                        onClick={handleCreateIndustry}
                        disabled={!newIndustryName.trim() || isCreatingIndustry}
                        className="flex flex-shrink-0 items-center gap-0.5 rounded bg-accent-primary px-2 py-1 text-11 text-white hover:bg-accent-primary/80 disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                        {t("project_settings.custom_fields.add_button")}
                      </button>
                    </div>
                  </>
                </CustomSelect>
              );
            }}
          />
          <span className="text-11 text-danger-primary">{errors?.industry?.message}</span>
        </div>
      </div>

      {/* 第二行：需求提出人 | 来源部门 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-11 font-medium text-secondary">{t("project_settings.custom_fields.demand_proposer")} *</label>
          <Controller
            control={control}
            name="demand_proposer"
            rules={{ required: t("project_settings.custom_fields.validation.required_demand_proposer") }}
            render={({ field: { value, onChange } }) => (
              <Input
                type="text"
                value={value ?? ""}
                onChange={onChange}
                hasError={Boolean(errors.demand_proposer)}
                placeholder={t("project_settings.custom_fields.input_placeholder")}
                className="w-full font-medium"
              />
            )}
          />
          <span className="text-11 text-danger-primary">{errors?.demand_proposer?.message}</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-11 font-medium text-secondary">{t("project_settings.custom_fields.source_department")} *</label>
          <Controller
            control={control}
            name="source_department"
            rules={{ required: t("project_settings.custom_fields.validation.required_source_department") }}
            render={({ field: { value, onChange } }) => (
              <Input
                type="text"
                value={value ?? ""}
                onChange={onChange}
                hasError={Boolean(errors.source_department)}
                placeholder={t("project_settings.custom_fields.input_placeholder")}
                className="w-full font-medium"
              />
            )}
          />
          <span className="text-11 text-danger-primary">{errors?.source_department?.message}</span>
        </div>
      </div>

      {/* 第四行：需求提出时间 | 客户名称 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-11 font-medium text-secondary">{t("project_settings.custom_fields.demand_date")} *</label>
          <Controller
            control={control}
            name="demand_date"
            rules={{ required: t("project_settings.custom_fields.validation.required_demand_date") }}
            render={({ field: { value, onChange } }) => (
              <input
                type="date"
                value={value ?? ""}
                onChange={onChange}
                className="w-full rounded-md border border-custom-border-200 bg-transparent px-3 py-2 font-medium text-sm outline-none focus:border-blue-400"
              />
            )}
          />
          <span className="text-11 text-danger-primary">{errors?.demand_date?.message}</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-11 font-medium text-secondary">{t("project_settings.custom_fields.client_name")} *</label>
          <Controller
            control={control}
            name="client_name"
            rules={{ required: t("project_settings.custom_fields.validation.required_client_name") }}
            render={({ field: { value, onChange } }) => (
              <Input
                type="text"
                value={value ?? ""}
                onChange={onChange}
                hasError={Boolean(errors.client_name)}
                placeholder={t("project_settings.custom_fields.input_placeholder")}
                className="w-full font-medium"
              />
            )}
          />
          <span className="text-11 text-danger-primary">{errors?.client_name?.message}</span>
        </div>
      </div>
    </div>
  );
}

export default ProjectCustomAttributes;
