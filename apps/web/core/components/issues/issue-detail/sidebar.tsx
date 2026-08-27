/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
// i18n
import { useTranslation } from "@plane/i18n";
// ui
import {
  CycleIcon,
  StatePropertyIcon,
  ModuleIcon,
  MembersPropertyIcon,
  PriorityPropertyIcon,
  StartDatePropertyIcon,
  DueDatePropertyIcon,
  LabelPropertyIcon,
  UserCirclePropertyIcon,
  EstimatePropertyIcon,
  ParentPropertyIcon,
} from "@plane/propel/icons";
import { Target, TrendingUp, Package, AlertTriangle, Flag, Layers, FileText, StickyNote, Users } from "lucide-react";
import { CustomSelect, Avatar } from "@plane/ui";
import { EFileAssetType } from "@plane/types";
import { cn, getDate, getFileURL, renderFormattedPayloadDate, shouldHighlightIssueDueDate } from "@plane/utils";
// components
import { DateDropdown } from "@/components/dropdowns/date";
import { EstimateDropdown } from "@/components/dropdowns/estimate";
import { ButtonAvatars } from "@/components/dropdowns/member/avatar";
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
import { PriorityDropdown } from "@/components/dropdowns/priority";
import { StateDropdown } from "@/components/dropdowns/state/dropdown";
// hooks
import { useProjectEstimates } from "@/hooks/store/estimates";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useMember } from "@/hooks/store/use-member";
import { useMilestone } from "@/hooks/store/use-milestone";
import { useProject } from "@/hooks/store/use-project";
import { useProjectState } from "@/hooks/store/use-project-state";
// components
import { IssueParentSelectRoot } from "@/components/issues/parent-select-root";
import { SidebarPropertyListItem } from "@/components/common/layout/sidebar/property-list-item";
import { IssueCycleSelect } from "./cycle-select";
import { IssueLabel } from "./label";
import { IssueModuleSelect } from "./module-select";
import { RichTextEditorField } from "@/components/editor/rich-text-field";
import { MilestoneField } from "./milestone-field";
import type { TIssueOperations } from "./root";

// ─── InlineTextInput: 行内编辑文本/数字，失焦提交 ───
const InlineTextInput = ({
  value,
  onSave,
  disabled,
  placeholder,
  type = "text",
  multiline = false,
  step,
}: {
  value: string | number | null | undefined;
  onSave: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: "text" | "number";
  multiline?: boolean;
  step?: string;
}) => {
  const [localValue, setLocalValue] = useState(
    value !== null && value !== undefined ? String(value) : ""
  );

  useEffect(() => {
    setLocalValue(value !== null && value !== undefined ? String(value) : "");
  }, [value]);

  const handleBlur = () => {
    const original = value !== null && value !== undefined ? String(value) : "";
    if (localValue !== original) {
      onSave(localValue === "" ? null : localValue);
    }
  };

  const baseClassName =
    "w-full h-7.5 bg-transparent text-body-xs-regular text-secondary outline-none placeholder:text-placeholder focus:bg-layer-transparent-hover rounded px-1 -mx-1";

  if (multiline) {
    return (
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        rows={2}
        className="w-full min-h-7.5 bg-transparent text-body-xs-medium text-secondary outline-none placeholder:text-placeholder focus:bg-layer-transparent-hover rounded px-1 -mx-1 resize-none py-1"
      />
    );
  }

  return (
    <input
      type={type}
      step={step}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      disabled={disabled}
      placeholder={placeholder}
      className={baseClassName}
    />
  );
};

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  issueOperations: TIssueOperations;
  isEditable: boolean;
};

export const IssueDetailsSidebar = observer(function IssueDetailsSidebar(props: Props) {
  const { t } = useTranslation();
  const { workspaceSlug, projectId, issueId, issueOperations, isEditable } = props;
  // store hooks
  const { getProjectById } = useProject();
  const { areEstimateEnabledByProjectId } = useProjectEstimates();
  const {
    issue: { getIssueById },
  } = useIssueDetail();
  const {
    getUserDetails,
    workspace: { workspaceMemberIds, fetchWorkspaceMembers },
  } = useMember();
  const { getStateById } = useProjectState();
  const { getProjectMilestones, getMilestoneById, fetchMilestones, createMilestone, deleteMilestone } = useMilestone();

  // fetch milestones for this project (must be before any early return per React Hooks rules)
  useEffect(() => {
    if (workspaceSlug && projectId) {
      fetchMilestones(workspaceSlug, projectId);
    }
  }, [workspaceSlug, projectId, fetchMilestones]);

  // fetch workspace members so the assignee dropdown can include non-project members
  useEffect(() => {
    if (workspaceSlug) {
      fetchWorkspaceMembers(workspaceSlug.toString());
    }
  }, [workspaceSlug, fetchWorkspaceMembers]);

  const issue = getIssueById(issueId);
  if (!issue) return <></>;

  // 层级判断
  const isSubReq = !issue.parent_id;
  const parentIssue = issue.parent_id ? getIssueById(issue.parent_id) : null;
  // 阶层 = parent 是开了 has_phases 的子需求
  const isPhase = !!issue.parent_id && !!parentIssue?.has_phases && !parentIssue.parent_id;
  // 工作项 = parent 是阶段（parent 有 parent_id），或者 parent 是没开 has_phases 的子需求
  const isWorkItem = !!issue.parent_id && !isPhase;
  // 子需求是否开了多阶段
  const isSubReqWithPhases = isSubReq && !!issue.has_phases;
  const isSubReqWithoutPhases = isSubReq && !issue.has_phases;
  // 执行类字段是否显示：子需求无阶段 OR 阶段
  const showExecutionFields = isSubReqWithoutPhases || isPhase;
  // 商务字段是否显示：子需求（无论是否多阶段）
  const showBusinessFields = isSubReq;

  const milestones = getProjectMilestones(projectId);
  const milestoneDetails = issue.milestone ? getMilestoneById(issue.milestone) : null;

  const createdByDetails = getUserDetails(issue.created_by);

  // derived values
  const projectDetails = getProjectById(issue.project_id);
  const stateDetails = getStateById(issue.state_id);

  const minDate = issue.start_date ? getDate(issue.start_date) : null;
  minDate?.setDate(minDate.getDate());

  const maxDate = issue.target_date ? getDate(issue.target_date) : null;
  maxDate?.setDate(maxDate.getDate());

  return (
    <>
      <div className="flex h-full w-full flex-col items-center divide-y-2 divide-subtle-1 overflow-hidden">
        <div className="h-full w-full overflow-y-auto px-6">
          <h5 className="mt-5 text-body-xs-medium">{t("common.properties")}</h5>
          <div className={`mt-4 mb-2 space-y-2.5 truncate ${!isEditable ? "opacity-60" : ""}`}>
            <SidebarPropertyListItem icon={StatePropertyIcon} label={t("common.state")}>
              <StateDropdown
                value={issue?.state_id}
                onChange={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { state_id: val })}
                projectId={projectId?.toString() ?? ""}
                disabled={!isEditable}
                buttonVariant="transparent-with-text"
                className="group w-full grow"
                buttonContainerClassName="w-full text-left h-7.5"
                buttonClassName="text-body-xs-regular"
                dropdownArrow
                dropdownArrowClassName="h-3.5 w-3.5 hidden group-hover:inline"
              />
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={MembersPropertyIcon} label={t("common.assignees")}>
              <MemberDropdown
                value={issue?.assignee_ids ?? undefined}
                onChange={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { assignee_ids: val })}
                disabled={!isEditable}
                projectId={projectId?.toString() ?? ""}
                memberIds={workspaceMemberIds ?? undefined}
                placeholder={t("issue.add.assignee")}
                multiple
                buttonVariant={issue?.assignee_ids?.length > 1 ? "transparent-without-text" : "transparent-with-text"}
                className="group w-full grow"
                buttonContainerClassName="w-full text-left h-7.5"
                buttonClassName={`text-body-xs-regular justify-between ${issue?.assignee_ids?.length > 0 ? "" : "text-placeholder"}`}
                hideIcon={issue.assignee_ids?.length === 0}
                dropdownArrow
                dropdownArrowClassName="h-3.5 w-3.5 hidden group-hover:inline"
              />
            </SidebarPropertyListItem>

            {/* 分工：按负责人维度，每个负责人可标注 产品 / 研发 / 无 */}
            {issue.assignee_ids?.length > 0 && (
              <SidebarPropertyListItem icon={Users} label="分工">
                <div className="flex w-full flex-col gap-1">
                  {issue.assignee_ids.map((userId) => {
                    const userDetails = getUserDetails(userId);
                    return (
                      <div key={userId} className="flex w-full items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Avatar name={userDetails?.display_name} src={getFileURL(userDetails?.avatar_url ?? "")} size="sm" />
                          <span className="truncate text-body-xs-regular">
                            {userDetails?.display_name ?? userId}
                          </span>
                        </span>
                        <CustomSelect
                          value={issue.assignee_roles?.[userId] ?? ""}
                          onChange={(val: string) => {
                            const nextRoles = { ...(issue.assignee_roles ?? {}), [userId]: val || null };
                            issueOperations.update(workspaceSlug, projectId, issueId, {
                              assignee_ids: issue.assignee_ids,
                              assignee_roles: nextRoles,
                            });
                          }}
                          label={
                            <span className="text-body-xs-regular">
                              {issue.assignee_roles?.[userId] || <span className="text-placeholder">无</span>}
                            </span>
                          }
                          className="w-20 shrink-0"
                          buttonClassName="!border-transparent !bg-transparent text-body-xs-regular hover:!bg-layer-transparent-hover !w-full !px-2 !py-1 !h-7.5"
                          disabled={!isEditable}
                        >
                          <CustomSelect.Option value="">
                            <span className="text-placeholder">无</span>
                          </CustomSelect.Option>
                          <CustomSelect.Option value="产品"><span>产品</span></CustomSelect.Option>
                          <CustomSelect.Option value="研发"><span>研发</span></CustomSelect.Option>
                        </CustomSelect>
                      </div>
                    );
                  })}
                </div>
              </SidebarPropertyListItem>
            )}

            <SidebarPropertyListItem icon={PriorityPropertyIcon} label={t("common.priority")}>
              <PriorityDropdown
                value={issue?.priority}
                onChange={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { priority: val })}
                disabled={!isEditable}
                buttonVariant="transparent-with-text"
                className="h-7.5 w-full grow rounded-sm"
                buttonContainerClassName="size-full text-left"
                buttonClassName="size-full px-2 py-0.5 whitespace-nowrap [&_svg]:size-3.5"
              />
            </SidebarPropertyListItem>

            {createdByDetails && (
              <SidebarPropertyListItem icon={UserCirclePropertyIcon} label={t("common.created_by")}>
                <div className="flex gap-2 px-2">
                  <ButtonAvatars showTooltip userIds={createdByDetails.id} />
                  <span className="grow truncate text-body-xs-regular leading-5">{createdByDetails?.display_name}</span>
                </div>
              </SidebarPropertyListItem>
            )}

            <SidebarPropertyListItem icon={StartDatePropertyIcon} label={t("common.order_by.start_date")}>
              <DateDropdown
                placeholder={t("issue.add.start_date")}
                value={issue.start_date}
                onChange={(val) =>
                  issueOperations.update(workspaceSlug, projectId, issueId, {
                    start_date: val ? renderFormattedPayloadDate(val) : null,
                  })
                }
                maxDate={maxDate ?? undefined}
                disabled={!isEditable}
                buttonVariant="transparent-with-text"
                className="group w-full grow"
                buttonContainerClassName="w-full text-left h-7.5"
                buttonClassName={`text-body-xs-regular ${issue?.start_date ? "" : "text-placeholder"}`}
                hideIcon
                clearIconClassName="h-3 w-3 hidden group-hover:inline"
              />
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={DueDatePropertyIcon} label={t("common.order_by.due_date")}>
              <div className="flex w-full items-center gap-2">
                <DateDropdown
                  placeholder={t("issue.add.due_date")}
                  value={issue.target_date}
                  onChange={(val) =>
                    issueOperations.update(workspaceSlug, projectId, issueId, {
                      target_date: val ? renderFormattedPayloadDate(val) : null,
                    })
                  }
                  minDate={minDate ?? undefined}
                  disabled={!isEditable}
                  buttonVariant="transparent-with-text"
                  className="group w-full grow"
                  buttonContainerClassName="w-full text-left h-7.5"
                  buttonClassName={cn("text-body-xs-regular", {
                    "text-placeholder": !issue.target_date,
                    "text-danger-primary": shouldHighlightIssueDueDate(issue.target_date, stateDetails?.group),
                  })}
                  hideIcon
                  clearIconClassName="h-3 w-3 hidden group-hover:inline text-primary"
                />
              </div>
            </SidebarPropertyListItem>

            {projectId && areEstimateEnabledByProjectId(projectId) && (
              <SidebarPropertyListItem icon={EstimatePropertyIcon} label={t("common.estimate")}>
                <EstimateDropdown
                  value={issue?.estimate_point ?? undefined}
                  onChange={(val: string | undefined) =>
                    issueOperations.update(workspaceSlug, projectId, issueId, { estimate_point: val })
                  }
                  projectId={projectId}
                  disabled={!isEditable}
                  buttonVariant="transparent-with-text"
                  className="group w-full grow"
                  buttonContainerClassName="w-full text-left h-7.5"
                  buttonClassName={`text-body-xs-regular ${issue?.estimate_point !== null ? "" : "text-placeholder"}`}
                  placeholder={t("common.none")}
                  hideIcon
                  dropdownArrow
                  dropdownArrowClassName="h-3.5 w-3.5 hidden group-hover:inline"
                />
              </SidebarPropertyListItem>
            )}

            {projectDetails?.module_view && (
              <SidebarPropertyListItem icon={ModuleIcon} label={t("common.modules")}>
                <IssueModuleSelect
                  className="w-full grow"
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  issueId={issueId}
                  issueOperations={issueOperations}
                  disabled={!isEditable}
                />
              </SidebarPropertyListItem>
            )}

            {projectDetails?.cycle_view && (
              <SidebarPropertyListItem icon={CycleIcon} label={t("common.cycle")} appendElement={null}>
                <IssueCycleSelect
                  className="h-7.5 w-full grow"
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  issueId={issueId}
                  issueOperations={issueOperations}
                  disabled={!isEditable}
                />
              </SidebarPropertyListItem>
            )}

            <SidebarPropertyListItem icon={ParentPropertyIcon} label={t("common.parent")}>
              <IssueParentSelectRoot
                className="h-7.5 w-full grow"
                workspaceSlug={workspaceSlug}
                projectId={projectId}
                issueId={issueId}
                issueOperations={issueOperations}
                disabled={!isEditable}
              />
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={LabelPropertyIcon} label={t("common.labels")}>
              <IssueLabel
                workspaceSlug={workspaceSlug}
                projectId={projectId}
                issueId={issueId}
                disabled={!isEditable}
              />
            </SidebarPropertyListItem>

            {/* Part 2: 执行类字段 — 子需求(无多阶段) 或 阶段 显示 */}
            {showExecutionFields && (
              <>
              {/* 子需求是否多阶段开关 — 仅子需求显示 */}
              {isSubReq && (
                <SidebarPropertyListItem icon={Layers} label="是否多阶段">
                  <CustomSelect
                    value={issue.has_phases ? "true" : "false"}
                    onChange={(val: string) =>
                      issueOperations.update(workspaceSlug, projectId, issueId, { has_phases: val === "true" })
                    }
                    label={
                      <span className="text-body-xs-regular">{issue.has_phases ? "是" : "否"}</span>
                    }
                    className="w-full grow"
                    buttonClassName="!border-transparent !bg-transparent text-body-xs-regular hover:!bg-layer-transparent-hover !w-full !px-2 !py-1 !h-7.5"
                    disabled={!isEditable}
                  >
                    <CustomSelect.Option value="false"><span>否</span></CustomSelect.Option>
                    <CustomSelect.Option value="true"><span>是</span></CustomSelect.Option>
                  </CustomSelect>
                </SidebarPropertyListItem>
              )}
              <SidebarPropertyListItem icon={Target} label="工作分类">
                <CustomSelect
                  value={issue.work_category}
                  onChange={(val: string) =>
                    issueOperations.update(workspaceSlug, projectId, issueId, { work_category: val || null })
                  }
                  label={
                    issue.work_category ? (
                      <span className="text-body-xs-regular">{issue.work_category}</span>
                    ) : (
                      <span className="text-body-xs-regular text-placeholder">无</span>
                    )
                  }
                  className="w-full grow"
                  buttonClassName="!border-transparent !bg-transparent text-body-xs-regular hover:!bg-layer-transparent-hover !w-full !px-2 !py-1 !h-7.5"
                  disabled={!isEditable}
                >
                  <CustomSelect.Option value="">
                    <span className="text-placeholder">无</span>
                  </CustomSelect.Option>
                  {["保存量", "建能力", "求拓展"].map((opt) => (
                    <CustomSelect.Option key={opt} value={opt}>
                      <span>{opt}</span>
                    </CustomSelect.Option>
                  ))}
                </CustomSelect>
              </SidebarPropertyListItem>

              <SidebarPropertyListItem icon={Target} label="OKR">
                <CustomSelect
                  value={issue.okr}
                  onChange={(val: string) =>
                    issueOperations.update(workspaceSlug, projectId, issueId, { okr: val || null })
                  }
                  label={
                    issue.okr ? (
                      <span className="text-body-xs-regular">{issue.okr}</span>
                    ) : (
                      <span className="text-body-xs-regular text-placeholder">无</span>
                    )
                  }
                  className="w-full grow"
                  buttonClassName="!border-transparent !bg-transparent text-body-xs-regular hover:!bg-layer-transparent-hover !w-full !px-2 !py-1 !h-7.5"
                  disabled={!isEditable}
                >
                  <CustomSelect.Option value="">
                    <span className="text-placeholder">无</span>
                  </CustomSelect.Option>
                  {["一季度", "二季度", "三季度", "四季度"].map((opt) => (
                    <CustomSelect.Option key={opt} value={opt}>
                      <span>{opt}</span>
                    </CustomSelect.Option>
                  ))}
                </CustomSelect>
              </SidebarPropertyListItem>

              <SidebarPropertyListItem icon={Target} label="阶段目标">
                <RichTextEditorField
                  id={`phase_goal_${issueId}`}
                  value={issue.phase_goal}
                  onSave={(html) => issueOperations.update(workspaceSlug, projectId, issueId, { phase_goal: html })}
                  editable={isEditable}
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  entityId={issueId}
                  entityType={EFileAssetType.ISSUE_DESCRIPTION}
                  issueId={issueId}
                  placeholder="输入阶段目标"
                  parentClassName="!p-0 !border-none"
                  containerClassName="!py-1 !px-1"
                />
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={TrendingUp} label="完成百分比">
              <div className="flex w-full items-center gap-1">
                <InlineTextInput
                  type="number"
                  value={issue.progress}
                  onSave={(val) =>
                    issueOperations.update(workspaceSlug, projectId, issueId, {
                      progress: val === null ? null : Number(val),
                    })
                  }
                  disabled={!isEditable}
                  placeholder="0"
                />
                <span className="shrink-0 text-body-xs-regular text-tertiary">%</span>
              </div>
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={Package} label="版本名称">
              <InlineTextInput
                value={issue.version_name}
                onSave={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { version_name: val })}
                disabled={!isEditable}
                placeholder="输入版本名称"
              />
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={AlertTriangle} label="风险">
              <InlineTextInput
                value={issue.risk}
                onSave={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { risk: val })}
                disabled={!isEditable}
                placeholder="输入风险信息"
                multiline
              />
            </SidebarPropertyListItem>

              <MilestoneField
                workspaceSlug={workspaceSlug}
                projectId={projectId}
                issueId={issueId}
                disabled={!isEditable}
                textClass="text-body-xs-regular"
              />

              {isPhase && (
                <SidebarPropertyListItem icon={FileText} label="任务日志">
                  <RichTextEditorField
                    id={`task_log_${issueId}`}
                    value={issue.task_log}
                    onSave={(html) => issueOperations.update(workspaceSlug, projectId, issueId, { task_log: html })}
                    editable={isEditable}
                    workspaceSlug={workspaceSlug}
                    projectId={projectId}
                    entityId={issueId}
                    entityType={EFileAssetType.ISSUE_DESCRIPTION}
                    issueId={issueId}
                    placeholder="输入任务日志"
                    parentClassName="!p-0 !border-none"
                    containerClassName="!py-1 !px-1"
                  />
                </SidebarPropertyListItem>
              )}
            </>
            )}

            {/* Part 3: 子需求级商务信息 — 仅子需求显示 */}
            {(isSubReq) && (
            <>
            <SidebarPropertyListItem icon={AlertTriangle} label="是否私有化">
              <CustomSelect
                value={issue.is_privatized}
                onChange={(val: string) =>
                  issueOperations.update(workspaceSlug, projectId, issueId, { is_privatized: val || null })
                }
                label={
                  issue.is_privatized ? (
                    <span className="text-body-xs-regular">{issue.is_privatized}</span>
                  ) : (
                    <span className="text-body-xs-regular text-placeholder">无</span>
                  )
                }
                className="w-full grow"
                buttonClassName="!border-transparent !bg-transparent text-body-xs-regular hover:!bg-layer-transparent-hover !w-full !px-2 !py-1 !h-7.5"
                disabled={!isEditable}
              >
                <CustomSelect.Option value="">
                  <span className="text-placeholder">无</span>
                </CustomSelect.Option>
                <CustomSelect.Option value="是"><span>是</span></CustomSelect.Option>
                <CustomSelect.Option value="否"><span>否</span></CustomSelect.Option>
              </CustomSelect>
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={Package} label="路数（万路）">
              <InlineTextInput
                value={issue.lanes_count}
                onSave={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { lanes_count: val === null ? null : parseFloat(val) })}
                disabled={!isEditable}
                placeholder="输入路数"
                type="number"
                step="any"
              />
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={Package} label="预估收入（万元）">
              <InlineTextInput
                value={issue.estimated_revenue}
                onSave={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { estimated_revenue: val === null ? null : parseFloat(val) })}
                disabled={!isEditable}
                placeholder="输入预估收入"
                type="number"
                step="any"
              />
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={Package} label="预估利润（万元）">
              <InlineTextInput
                value={issue.estimated_profit}
                onSave={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { estimated_profit: val === null ? null : parseFloat(val) })}
                disabled={!isEditable}
                placeholder="输入预估利润"
                type="number"
                step="any"
              />
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={AlertTriangle} label="结算情况">
              <CustomSelect
                value={issue.settlement_status}
                onChange={(val: string) =>
                  issueOperations.update(workspaceSlug, projectId, issueId, { settlement_status: val || null })
                }
                label={
                  issue.settlement_status ? (
                    <span className="text-body-xs-regular">{issue.settlement_status}</span>
                  ) : (
                    <span className="text-body-xs-regular text-placeholder">无</span>
                  )
                }
                className="w-full grow"
                buttonClassName="!border-transparent !bg-transparent text-body-xs-regular hover:!bg-layer-transparent-hover !w-full !px-2 !py-1 !h-7.5"
                disabled={!isEditable}
              >
                <CustomSelect.Option value="">
                  <span className="text-placeholder">无</span>
                </CustomSelect.Option>
                {["报价中", "结算中", "推进中", "未报价", "已结算"].map((opt) => (
                  <CustomSelect.Option key={opt} value={opt}>
                    <span>{opt}</span>
                  </CustomSelect.Option>
                ))}
              </CustomSelect>
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={Target} label="需求背景">
              <RichTextEditorField
                id={`demand_background_${issueId}`}
                value={issue.demand_background}
                onSave={(html) => issueOperations.update(workspaceSlug, projectId, issueId, { demand_background: html })}
                editable={isEditable}
                workspaceSlug={workspaceSlug}
                projectId={projectId}
                entityId={issueId}
                entityType={EFileAssetType.ISSUE_DESCRIPTION}
                issueId={issueId}
placeholder="输入需求背景"
                  parentClassName="!p-0 !border-none"
                  containerClassName="!py-1 !px-1"
                />
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={Target} label="重点信息备注">
              <RichTextEditorField
                id={`key_notes_${issueId}`}
                value={issue.key_notes}
                onSave={(html) => issueOperations.update(workspaceSlug, projectId, issueId, { key_notes: html })}
                editable={isEditable}
                workspaceSlug={workspaceSlug}
                projectId={projectId}
                entityId={issueId}
                entityType={EFileAssetType.ISSUE_DESCRIPTION}
                issueId={issueId}
placeholder="输入重点信息备注"
                  parentClassName="!p-0 !border-none"
                  containerClassName="!py-1 !px-1"
                />
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={Target} label="结论情况">
              <RichTextEditorField
                id={`conclusion_${issueId}`}
                value={issue.conclusion}
                onSave={(html) => issueOperations.update(workspaceSlug, projectId, issueId, { conclusion: html })}
                editable={isEditable}
                workspaceSlug={workspaceSlug}
                projectId={projectId}
                entityId={issueId}
                entityType={EFileAssetType.ISSUE_DESCRIPTION}
                issueId={issueId}
placeholder="输入结论情况"
                  parentClassName="!p-0 !border-none"
                  containerClassName="!py-1 !px-1"
                />
            </SidebarPropertyListItem>
            </>
            )}

            {/* Part 4: 工作项级字段 — 仅工作项显示 */}
            {isWorkItem && (
            <>
              <SidebarPropertyListItem icon={Package} label="输出物">
                <InlineTextInput
                  value={issue.deliverables}
                  onSave={(val) => issueOperations.update(workspaceSlug, projectId, issueId, { deliverables: val })}
                  disabled={!isEditable}
                  placeholder="输入输出物"
                  multiline
                />
              </SidebarPropertyListItem>

              <SidebarPropertyListItem icon={StickyNote} label="备注">
                <RichTextEditorField
                  id={`remark_${issueId}`}
                  value={issue.remark}
                  onSave={(html) => issueOperations.update(workspaceSlug, projectId, issueId, { remark: html })}
                  editable={isEditable}
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  entityId={issueId}
                  entityType={EFileAssetType.ISSUE_DESCRIPTION}
                  issueId={issueId}
                  placeholder="输入备注"
                  parentClassName="!p-0 !border-none"
                  containerClassName="!py-1 !px-1"
                />
              </SidebarPropertyListItem>
            </>
            )}
          </div>
        </div>
      </div>
    </>
  );
});
