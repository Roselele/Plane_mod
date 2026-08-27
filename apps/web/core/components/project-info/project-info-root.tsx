/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { observer } from "mobx-react";
import { Spinner, DropIndicator } from "@plane/ui";
import { useTranslation } from "@plane/i18n";
import { renderFormattedDate } from "@plane/utils";
import type { TProject, TIssue } from "@plane/types";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { attachClosestEdge, extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { RichTextEditorField } from "@/components/editor/rich-text-field";
import { useIndustry } from "@/hooks/store/use-industry";
import { SidebarPropertyListItem } from "@/components/common/layout/sidebar/property-list-item";
import {
  Hash,
  Layers,
  Building2,
  User,
  Building,
  Calendar,
  Users,
  GripVertical,
} from "lucide-react";

// ---- Types ----
type TStateDetails = { id: string; name: string; color: string } | null;
type TIssueWithState = TIssue & {
  stateDetails: TStateDetails;
};

type TIssueUpdateFn = (projectId: string | undefined | null, issueId: string, data: Partial<TIssue>) => Promise<void>;

type TProjectInfoRootProps = {
  project: TProject | undefined;
  issues: TIssueWithState[];
  isLoading: boolean;
  workspaceSlug: string;
  projectId: string;
  updateIssue?: TIssueUpdateFn;
};

// ---- Drag data ----
type TSortDragData = {
  id: string;
  index: number;
};

// ---- Sort order helpers ----
function computeNewSortOrder(items: TIssueWithState[], targetIndex: number, edge: "top" | "bottom" | null): number {
  // Edge "top" means insert before targetIndex, "bottom" means insert after
  const insertBefore = edge !== "bottom";
  const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
  if (items.length === 0) return 65535;
  if (insertIndex === 0) return (items[0].sort_order ?? 65535) / 2;
  if (insertIndex >= items.length) return (items[items.length - 1].sort_order ?? 65535) + 65536;
  const prev = items[insertIndex - 1].sort_order ?? 65535;
  const next = items[insertIndex].sort_order ?? 65535;
  return (prev + next) / 2;
}

// ---- Label helpers ----
const CATEGORY_LABELS: Record<string, string> = {
  standard: "标品", proposal: "立项", capability: "能力", other: "其他",
  project: "项目", demo: "演示", special: "专项",
};
const CATEGORY_STYLE_MAP: Record<string, { backgroundColor: string; color: string }> = {
  "标品": { backgroundColor: "#FCE7EF", color: "#C44A7A" }, // 樱花粉
  "立项": { backgroundColor: "#E0ECF7", color: "#3B6BA8" }, // 雾霾蓝
  "能力": { backgroundColor: "#DFF0E8", color: "#3D8B68" }, // 薄荷绿
  "其他": { backgroundColor: "#ECEAE6", color: "#8A8278" }, // 燕麦灰
  "项目": { backgroundColor: "#EAE6F2", color: "#6B5B9E" }, // 薰衣草紫
  "演示": { backgroundColor: "#F7F0DD", color: "#B8954A" }, // 奶油黄
  "专项": { backgroundColor: "#F5E3D3", color: "#B06D3A" }, // 焦糖橙
};
const DEFAULT_CATEGORY_STYLE = { backgroundColor: "#ECEAE6", color: "#8A8278" };
const SETTLEMENT_LABELS: Record<string, string> = {
  quoting: "报价中", settling: "结算中", progressing: "推进中",
  unquoted: "未报价", settled: "已结算",
};
const PRIORITY_LABELS: Record<string, string> = {
  urgent: "紧急", high: "高", medium: "中", low: "低", none: "无",
};

function displayValue(value: string | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

function displayLabel(mapping: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "—";
  return mapping[value] ?? value;
}

function displayDate(value: string | null | undefined): string {
  if (!value) return "—";
  return renderFormattedDate(value) ?? "—";
}

function displayNumber(value: number | string | null | undefined, suffix = ""): string {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}${suffix}`;
}

function displayMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}`;
}

// ---- Sidebar info row ----
function SidebarInfoRow({ label, value }: { label: string; value: string }) {
  const isEmpty = value === "—";
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-subtle last:border-none">
      <span className="text-caption-sm-regular text-tertiary">{label}</span>
      <span className={`text-body-sm-regular ${isEmpty ? "text-placeholder" : "text-primary"}`}>
        {value}
      </span>
    </div>
  );
}

// ---- Rich text info field (read-only display with label) ----
function RichTextInfoField({
  label,
  value,
  workspaceSlug,
  projectId,
  id,
}: {
  label: string;
  value: string | null | undefined;
  workspaceSlug: string;
  projectId: string;
  id: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption-md-regular text-tertiary">{label}</span>
      <RichTextEditorField
        id={id}
        value={value}
        editable={false}
        workspaceSlug={workspaceSlug}
        projectId={projectId}
      />
    </div>
  );
}

// ---- Work item card (third level) ----
function WorkItemCard({
  issue,
  projectIdentifier,
  stateDetails,
  workspaceSlug,
  projectId,
}: {
  issue: TIssueWithState;
  projectIdentifier: string;
  stateDetails: TStateDetails;
  workspaceSlug: string;
  projectId: string;
}) {
  const { t } = useTranslation();
  const issueHref = `/${workspaceSlug}/projects/${projectId}/issues/${issue.id}`;
  return (
    <Link
      href={issueHref}
      className="block rounded-lg border border-subtle bg-layer-2 px-4 py-3 transition-all duration-300 hover:border-strong hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {stateDetails && (
            <span
              className="inline-block size-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: stateDetails.color }}
            />
          )}
          <span className="text-11 font-medium text-tertiary">
            {projectIdentifier}-{issue.sequence_id}
          </span>
          {stateDetails && (
            <span className="text-11 text-tertiary">{stateDetails.name}</span>
          )}
        </div>
      </div>
      <p className="mt-1.5 line-clamp-2 text-body-sm-medium text-primary">{issue.name}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-11 text-tertiary">
        {issue.start_date && (
          <span>{t("project_settings.custom_fields.start_label")} {displayDate(issue.start_date)}</span>
        )}
        {issue.target_date && (
          <span>{t("project_settings.custom_fields.target_label")} {displayDate(issue.target_date)}</span>
        )}
      </div>
    </Link>
  );
}

// ---- Phase card (phase within a sub-requirement) ----
function PhaseCard({
  phase,
  phaseIndex,
  phaseWorkItems,
  projectIdentifier,
  workspaceSlug,
  projectId,
  isExpanded,
  onToggle,
  onReorder,
}: {
  phase: TIssueWithState;
  phaseIndex: number;
  phaseWorkItems: TIssueWithState[];
  projectIdentifier: string;
  workspaceSlug: string;
  projectId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onReorder: (sourceId: string, targetIndex: number, edge: "top" | "bottom") => void;
}) {
  const phaseState = phase.stateDetails;
  const phaseHref = `/${workspaceSlug}/projects/${projectId}/issues/${phase.id}`;

  // DnD state for phase card
  const phaseDragRef = useRef<HTMLDivElement | null>(null);
  const [isPhaseDragging, setIsPhaseDragging] = useState(false);
  const [isPhaseDraggedOver, setIsPhaseDraggedOver] = useState(false);
  const [phaseClosestEdge, setPhaseClosestEdge] = useState<string | null>(null);

  useEffect(() => {
    const element = phaseDragRef.current;
    if (!element) return;
    const dragData: TSortDragData = { id: phase.id, index: phaseIndex };
    return combine(
      draggable({
        element,
        getInitialData: () => dragData,
        onDragStart: () => setIsPhaseDragging(true),
        onDrop: () => setIsPhaseDragging(false),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => (source.data as TSortDragData).id !== phase.id,
        getData: ({ input, element }) =>
          attachClosestEdge(dragData, { input, element, allowedEdges: ["top", "bottom"] }),
        onDragEnter: (args) => {
          setIsPhaseDraggedOver(true);
          setPhaseClosestEdge(extractClosestEdge(args.self.data));
        },
        onDragLeave: () => {
          setIsPhaseDraggedOver(false);
          setPhaseClosestEdge(null);
        },
        onDrop: (data) => {
          setIsPhaseDraggedOver(false);
          setPhaseClosestEdge(null);
          const sourceData = data.source.data as TSortDragData;
          if (sourceData.id === phase.id) return;
          const edge = extractClosestEdge(data.self.data) || "top";
          onReorder(sourceData.id, phaseIndex, edge as "top" | "bottom");
        },
      })
    );
  }, [phase.id, phaseIndex, onReorder]);

  return (
    <>
      <DropIndicator isVisible={isPhaseDraggedOver && phaseClosestEdge === "top"} />
      <div
        ref={phaseDragRef}
        className={`rounded-lg border border-subtle bg-layer-1 overflow-hidden ${isPhaseDragging ? "opacity-50" : "opacity-100"}`}
      >
        {/* Phase header */}
        <div
          className="flex items-center justify-between border-b border-subtle px-4 py-2.5 cursor-pointer hover:bg-layer-transparent-hover transition-colors"
          onClick={onToggle}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="size-3.5 flex-shrink-0 cursor-grab text-tertiary opacity-0 transition-opacity hover:opacity-100 active:cursor-grabbing" />
            <span className="text-11 text-tertiary select-none transition-transform duration-200" style={{ display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "none" }}>▶</span>
            {phaseState && (
              <span className="inline-block size-2 flex-shrink-0 rounded-full" style={{ backgroundColor: phaseState.color }} />
            )}
            <span className="text-11 font-medium text-tertiary">{projectIdentifier}-{phase.sequence_id}</span>
            {phaseState && <span className="text-11 text-tertiary">{phaseState.name}</span>}
            <span className="text-body-sm-medium text-primary truncate">{phase.name}</span>
            {phase.progress !== null && phase.progress !== undefined && (
              <span className="text-11 font-medium text-tertiary">{phase.progress}%</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-11 text-tertiary">{phaseWorkItems.length} 工作项</span>
            <Link href={phaseHref} onClick={(e) => e.stopPropagation()} className="text-11 text-custom-primary-200 hover:underline">详情</Link>
          </div>
        </div>
        {/* Phase meta info */}
        {isExpanded && (
          <>
            <div className="grid grid-cols-2 gap-3 border-b border-subtle px-4 py-3 lg:grid-cols-4">
              {phase.work_category && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">工作分类</span>
                  <span className="text-body-sm-regular text-primary">{displayValue(phase.work_category)}</span>
                </div>
              )}
              {phase.okr && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">OKR</span>
                  <span className="text-body-sm-regular text-primary">{displayValue(phase.okr)}</span>
                </div>
              )}
              {phase.progress !== null && phase.progress !== undefined && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">完成百分比</span>
                  <span className="text-body-sm-regular text-primary">{displayNumber(phase.progress, "%")}</span>
                </div>
              )}
              {phase.version_name && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">版本名称</span>
                  <span className="text-body-sm-regular text-primary">{displayValue(phase.version_name)}</span>
                </div>
              )}
              {phase.priority && phase.priority !== "none" && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">优先级</span>
                  <span className="text-body-sm-regular text-primary">{displayLabel(PRIORITY_LABELS, phase.priority)}</span>
                </div>
              )}
              {phase.start_date && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">开始日期</span>
                  <span className="text-body-sm-regular text-primary">{displayDate(phase.start_date)}</span>
                </div>
              )}
              {phase.target_date && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">目标日期</span>
                  <span className="text-body-sm-regular text-primary">{displayDate(phase.target_date)}</span>
                </div>
              )}
            </div>
            {phase.phase_goal && (
              <div className="border-b border-subtle px-4 py-2">
                <RichTextInfoField
                  label="阶段目标"
                  value={phase.phase_goal}
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  id={`phase_goal_${phase.id}`}
                />
              </div>
            )}
            {phase.risk && (
              <div className="border-b border-subtle px-4 py-2">
                <span className="text-caption-sm-regular text-tertiary">风险</span>
                <p className="mt-0.5 text-body-sm-regular text-rose-500">{phase.risk}</p>
              </div>
            )}
          </>
        )}
        {/* Phase work items */}
        {isExpanded && (
          <div className="px-4 py-3">
            {phaseWorkItems.length === 0 ? (
              <p className="text-body-sm-regular text-tertiary text-center py-4">暂无工作项</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {phaseWorkItems.map((wi) => (
                  <WorkItemCard
                    key={wi.id}
                    issue={wi}
                    projectIdentifier={projectIdentifier}
                    stateDetails={wi.stateDetails}
                    workspaceSlug={workspaceSlug}
                    projectId={projectId}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <DropIndicator isVisible={isPhaseDraggedOver && phaseClosestEdge === "bottom"} />
    </>
  );
}

// ---- Sub-requirement card (second level) ----
function SubRequirementCard({
  subReq,
  workItems,
  phasesForSubReq,
  workItemsByParent,
  projectIdentifier,
  workspaceSlug,
  projectId,
  isExpanded,
  onToggle,
  subReqIndex,
  totalSubReqs,
  onReorderSubReq,
  onReorderPhase,
}: {
  subReq: TIssueWithState;
  workItems: TIssueWithState[];
  phasesForSubReq: TIssueWithState[];
  workItemsByParent: Record<string, TIssueWithState[]>;
  projectIdentifier: string;
  workspaceSlug: string;
  projectId: string;
  isExpanded: boolean;
  onToggle: () => void;
  subReqIndex: number;
  totalSubReqs: number;
  onReorderSubReq: (sourceId: string, targetIndex: number, edge: "top" | "bottom") => void;
  onReorderPhase: (parentId: string, sourceId: string, targetIndex: number, edge: "top" | "bottom") => void;
}) {
  const { t } = useTranslation();
  const subReqHref = `/${workspaceSlug}/projects/${projectId}/issues/${subReq.id}`;
  const stateDetails = subReq.stateDetails;
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  // DnD state for sub-requirement card
  const subReqDragRef = useRef<HTMLDivElement | null>(null);
  const [isSubReqDragging, setIsSubReqDragging] = useState(false);
  const [isSubReqDraggedOver, setIsSubReqDraggedOver] = useState(false);
  const [subReqClosestEdge, setSubReqClosestEdge] = useState<string | null>(null);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  // Sub-requirement drag and drop
  useEffect(() => {
    const element = subReqDragRef.current;
    if (!element) return;
    const dragData: TSortDragData = { id: subReq.id, index: subReqIndex };
    return combine(
      draggable({
        element,
        getInitialData: () => dragData,
        onDragStart: () => setIsSubReqDragging(true),
        onDrop: () => setIsSubReqDragging(false),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => (source.data as TSortDragData).id !== subReq.id,
        getData: ({ input, element }) =>
          attachClosestEdge(dragData, { input, element, allowedEdges: ["top", "bottom"] }),
        onDragEnter: (args) => {
          setIsSubReqDraggedOver(true);
          setSubReqClosestEdge(extractClosestEdge(args.self.data));
        },
        onDragLeave: () => {
          setIsSubReqDraggedOver(false);
          setSubReqClosestEdge(null);
        },
        onDrop: (data) => {
          setIsSubReqDraggedOver(false);
          setSubReqClosestEdge(null);
          const sourceData = data.source.data as TSortDragData;
          if (sourceData.id === subReq.id) return;
          const edge = extractClosestEdge(data.self.data) || "top";
          onReorderSubReq(sourceData.id, subReqIndex, edge as "top" | "bottom");
        },
      })
    );
  }, [subReq.id, subReqIndex, onReorderSubReq]);

  return (
    <div
      ref={subReqDragRef}
      className={`group rounded-lg border border-subtle bg-layer-1 overflow-hidden transition-shadow hover:shadow-sm ${isSubReqDragging ? "opacity-50" : "opacity-100"}`}
    >
      {/* Drop indicators for sub-requirement reordering */}
      <DropIndicator isVisible={isSubReqDraggedOver && subReqClosestEdge === "top"} />
      {/* Header — clickable to expand/collapse */}
      <div
        className="flex items-center justify-between border-b border-subtle px-5 py-3 cursor-pointer hover:bg-layer-transparent-hover transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {/* Drag handle for sub-requirement reordering */}
          <GripVertical
            className="size-4 flex-shrink-0 cursor-grab text-tertiary opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          />
          <span className="text-11 text-tertiary select-none transition-transform duration-200" style={{ display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "none" }}>▶</span>
          {stateDetails && (
            <span
              className="inline-block size-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: stateDetails.color }}
            />
          )}
          <span className="text-11 font-medium text-tertiary">
            {projectIdentifier}-{subReq.sequence_id}
          </span>
          {stateDetails && (
            <span className="text-11 text-tertiary">{stateDetails.name}</span>
          )}
          {subReq.progress !== null && subReq.progress !== undefined && (
            <span className="text-11 font-medium text-tertiary">{subReq.progress}%</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {subReq.has_phases ? (
            <span className="text-11 text-tertiary">
              {(phasesForSubReq.length)} 个阶段，{(phasesForSubReq.reduce((sum, ph) => sum + (workItemsByParent[ph.id]?.length ?? 0), 0))} 个工作项
            </span>
          ) : (
            <span className="text-11 text-tertiary">
              {t("project_settings.custom_fields.work_items_count", { count: workItems.length })}
            </span>
          )}
          <Link
            href={subReqHref}
            onClick={(e) => e.stopPropagation()}
            className="text-11 text-custom-primary-200 hover:underline"
          >
            详情
          </Link>
        </div>
      </div>

      {/* Sub-requirement name */}
      <div className="px-5 py-3 border-b border-subtle">
        <p className="text-body-sm-medium text-primary">{subReq.name}</p>
        {/* 多阶段标记 */}
        {subReq.has_phases && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded bg-blue-500/10 px-2 py-0.5 text-11 font-medium text-blue-600">多阶段</span>
          </div>
        )}
      </div>

      {/* Sub-requirement business fields (if any) */}
      {(subReq.demand_background || subReq.key_notes || subReq.conclusion ||
        subReq.is_privatized || subReq.lanes_count || subReq.estimated_revenue ||
        subReq.estimated_profit || subReq.settlement_status) && (
        <div className="px-5 py-3 border-b border-subtle">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {subReq.is_privatized && (
              <div className="flex flex-col gap-0.5">
                <span className="text-caption-sm-regular text-tertiary">是否私有化</span>
                <span className="text-body-sm-regular text-primary">{displayValue(subReq.is_privatized)}</span>
              </div>
            )}
            {subReq.lanes_count !== null && subReq.lanes_count !== undefined && (
              <div className="flex flex-col gap-0.5">
                <span className="text-caption-sm-regular text-tertiary">路数（万路）</span>
                <span className="text-body-sm-regular text-primary">{displayNumber(subReq.lanes_count)}</span>
              </div>
            )}
            {subReq.estimated_revenue !== null && subReq.estimated_revenue !== undefined && (
              <div className="flex flex-col gap-0.5">
                <span className="text-caption-sm-regular text-tertiary">预估收入（万元）</span>
                <span className="text-body-sm-regular text-primary">{displayMoney(subReq.estimated_revenue)}</span>
              </div>
            )}
            {subReq.estimated_profit !== null && subReq.estimated_profit !== undefined && (
              <div className="flex flex-col gap-0.5">
                <span className="text-caption-sm-regular text-tertiary">预估利润（万元）</span>
                <span className="text-body-sm-regular text-primary">{displayMoney(subReq.estimated_profit)}</span>
              </div>
            )}
            {subReq.settlement_status && (
              <div className="flex flex-col gap-0.5">
                <span className="text-caption-sm-regular text-tertiary">结算情况</span>
                <span className="text-body-sm-regular text-primary">{displayLabel(SETTLEMENT_LABELS, subReq.settlement_status)}</span>
              </div>
            )}
          </div>
          {(subReq.demand_background || subReq.key_notes || subReq.conclusion) && (
            <div className="mt-3 flex flex-col gap-3">
              {subReq.demand_background && (
                <RichTextInfoField
                  label="需求背景"
                  value={subReq.demand_background}
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  id={`sub_demand_background_${subReq.id}`}
                />
              )}
              {subReq.key_notes && (
                <RichTextInfoField
                  label="重点信息备注"
                  value={subReq.key_notes}
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  id={`sub_key_notes_${subReq.id}`}
                />
              )}
              {subReq.conclusion && (
                <RichTextInfoField
                  label="结论情况"
                  value={subReq.conclusion}
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  id={`sub_conclusion_${subReq.id}`}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Sub-requirement execution fields (only for non-phases sub-req) — displayed below business fields */}
      {!subReq.has_phases && (subReq.work_category || subReq.okr || subReq.progress !== null || subReq.version_name || subReq.priority || subReq.start_date || subReq.target_date || subReq.phase_goal || subReq.risk) && (
        <div className="px-5 py-3 border-b border-subtle">
          {/* 执行字段网格 */}
          {(subReq.work_category || subReq.okr || subReq.progress !== null || subReq.version_name || subReq.priority || subReq.start_date || subReq.target_date) && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {subReq.work_category && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">工作分类</span>
                  <span className="text-body-sm-regular text-primary">{displayValue(subReq.work_category)}</span>
                </div>
              )}
              {subReq.okr && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">OKR</span>
                  <span className="text-body-sm-regular text-primary">{displayValue(subReq.okr)}</span>
                </div>
              )}
              {subReq.progress !== null && subReq.progress !== undefined && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">完成百分比</span>
                  <span className="text-body-sm-regular text-primary">{displayNumber(subReq.progress, "%")}</span>
                </div>
              )}
              {subReq.version_name && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">版本名称</span>
                  <span className="text-body-sm-regular text-primary">{displayValue(subReq.version_name)}</span>
                </div>
              )}
              {subReq.priority && subReq.priority !== "none" && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">优先级</span>
                  <span className="text-body-sm-regular text-primary">{displayLabel(PRIORITY_LABELS, subReq.priority)}</span>
                </div>
              )}
              {subReq.start_date && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">开始日期</span>
                  <span className="text-body-sm-regular text-primary">{displayDate(subReq.start_date)}</span>
                </div>
              )}
              {subReq.target_date && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption-sm-regular text-tertiary">目标日期</span>
                  <span className="text-body-sm-regular text-primary">{displayDate(subReq.target_date)}</span>
                </div>
              )}
            </div>
          )}
          {/* 阶段目标（富文本） */}
          {subReq.phase_goal && (
            <div className="mt-3">
              <RichTextInfoField
                label="阶段目标"
                value={subReq.phase_goal}
                workspaceSlug={workspaceSlug}
                projectId={projectId}
                id={`sub_phase_goal_${subReq.id}`}
              />
            </div>
          )}
          {/* 风险 */}
          {subReq.risk && (
            <div className="mt-3">
              <span className="text-caption-sm-regular text-tertiary">风险</span>
              <p className="mt-0.5 text-body-sm-regular text-rose-500">{subReq.risk}</p>
            </div>
          )}
        </div>
      )}

      {/* Work items (third level) or phases → work items (fourth level) */}
      {isExpanded && (
        <div className="px-5 py-4">
          {subReq.has_phases ? (
            /* 多阶段模式：阶段 → 工作项 */
            phasesForSubReq.length === 0 ? (
              <p className="text-body-sm-regular text-tertiary text-center py-6">
                暂无阶段
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {phasesForSubReq.map((phase, phaseIdx) => (
                  <PhaseCard
                    key={phase.id}
                    phase={phase}
                    phaseIndex={phaseIdx}
                    phaseWorkItems={workItemsByParent[phase.id] ?? []}
                    projectIdentifier={projectIdentifier}
                    workspaceSlug={workspaceSlug}
                    projectId={projectId}
                    isExpanded={expandedPhases.has(phase.id)}
                    onToggle={() => togglePhase(phase.id)}
                    onReorder={(sourceId, targetIndex, edge) => onReorderPhase(subReq.id, sourceId, targetIndex, edge)}
                  />
                ))}
              </div>
            )
          ) : (
            /* 无多阶段模式：直接显示工作项 */
            workItems.length === 0 ? (
              <p className="text-body-sm-regular text-tertiary text-center py-6">
                暂无工作项
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {workItems.map((wi) => (
                  <WorkItemCard
                    key={wi.id}
                    issue={wi}
                    projectIdentifier={projectIdentifier}
                    stateDetails={wi.stateDetails}
                    workspaceSlug={workspaceSlug}
                    projectId={projectId}
                  />
                ))}
              </div>
            )
          )}
        </div>
      )}
      {/* Drop indicator for bottom edge of sub-requirement */}
      <DropIndicator isVisible={isSubReqDraggedOver && subReqClosestEdge === "bottom"} />
    </div>
  );
}

// ---- Main component ----
export const ProjectInfoRoot = observer(function ProjectInfoRoot({
  project,
  issues,
  isLoading,
  workspaceSlug,
  projectId,
  updateIssue,
}: TProjectInfoRootProps) {
  const { t } = useTranslation();
  const { getIndustryById, fetchIndustries, fetched: industryFetched } = useIndustry();
  const [expandedSubReqs, setExpandedSubReqs] = useState<Set<string>>(new Set());
  const hasInitialized = useRef(false);
  // Local state for sub-requirement ordering (allows immediate visual reorder before API completes)
  const [subReqOrder, setSubReqOrder] = useState<Record<string, number> | null>(null);
  // Local state for phase ordering per parent
  const [phaseOrders, setPhaseOrders] = useState<Record<string, Record<string, number>> | null>(null);
  // Ref for the scrollable left column container (enables auto-scroll during drag)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Ensure industries are loaded for resolving industry name
  useEffect(() => {
    if (workspaceSlug && !industryFetched) {
      fetchIndustries(workspaceSlug);
    }
  }, [workspaceSlug, industryFetched, fetchIndustries]);

  if (!project) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Resolve industry name from ID
  const industryDetail = project.industry ? getIndustryById(project.industry) : null;
  const industryName = industryDetail?.name ?? null;

  // Separate issues by level: sub-requirements (no parent) → phases → work items
  const subRequirements = issues
    .filter((i) => !i.parent_id)
    .sort((a, b) => {
      const aOrder = subReqOrder?.[a.id] ?? a.sort_order ?? 65535;
      const bOrder = subReqOrder?.[b.id] ?? b.sort_order ?? 65535;
      return aOrder - bOrder;
    });

  // 阶段 = parent 是开了 has_phases 的子需求
  const phases = issues.filter((i) => {
    if (!i.parent_id) return false;
    const parent = issues.find((p) => p.id === i.parent_id);
    return parent?.has_phases === true && !parent.parent_id;
  });

  // 工作项 = parent 是阶段（parent 有 parent_id），或 parent 是没开 has_phases 的子需求
  const workItems = issues.filter((i) => {
    if (!i.parent_id) return false;
    const parent = issues.find((p) => p.id === i.parent_id);
    if (!parent) return false;
    // parent 是阶段
    if (parent.parent_id) return true;
    // parent 是子需求但没开多阶段
    if (!parent.has_phases) return true;
    return false;
  });

  // Group phases by sub-requirement parent (sorted by sort_order)
  const phasesByParent: Record<string, TIssueWithState[]> = {};
  for (const ph of phases) {
    const parentId = ph.parent_id as string;
    if (!phasesByParent[parentId]) phasesByParent[parentId] = [];
    phasesByParent[parentId].push(ph);
  }
  // Sort each group by sort_order (or local override)
  for (const parentId of Object.keys(phasesByParent)) {
    phasesByParent[parentId].sort((a, b) => {
      const local = phaseOrders?.[parentId];
      const aOrder = local?.[a.id] ?? a.sort_order ?? 65535;
      const bOrder = local?.[b.id] ?? b.sort_order ?? 65535;
      return aOrder - bOrder;
    });
  }

  // Group work items by their parent_id (could be a sub-req or a phase)
  const workItemsByParent: Record<string, TIssueWithState[]> = {};
  for (const wi of workItems) {
    const parentId = wi.parent_id as string;
    if (!workItemsByParent[parentId]) workItemsByParent[parentId] = [];
    workItemsByParent[parentId].push(wi);
  }

  // Enable auto-scroll for the left column when dragging sub-requirements or phases
  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;
    return combine(
      autoScrollForElements({
        element,
        getAllowedAxis: () => "vertical",
      })
    );
  }, [scrollContainerRef]);

  // Toggle expansion
  const toggleExpand = (subReqId: string) => {
    setExpandedSubReqs((prev) => {
      const next = new Set(prev);
      if (next.has(subReqId)) {
        next.delete(subReqId);
      } else {
        next.add(subReqId);
      }
      return next;
    });
  };

  // Auto-expand first sub-requirement only on initial load
  if (!hasInitialized.current && subRequirements.length > 0 && !isLoading) {
    hasInitialized.current = true;
    setExpandedSubReqs(new Set([subRequirements[0].id]));
  }

  // ---- Reorder handlers ----
  const handleReorderSubReq = useCallback(
    (sourceId: string, targetIndex: number, edge: "top" | "bottom") => {
      // Build the current ordered list
      const currentList = [...subRequirements];
      // Remove source from its current position
      const sourceIdx = currentList.findIndex((s) => s.id === sourceId);
      if (sourceIdx === -1) return;
      const [moved] = currentList.splice(sourceIdx, 1);
      // Calculate insertion index
      const insertBefore = edge !== "bottom";
      let insertIdx = targetIndex;
      if (sourceIdx < targetIndex) insertIdx--;
      if (!insertBefore) insertIdx++;
      if (insertIdx < 0) insertIdx = 0;
      if (insertIdx > currentList.length) insertIdx = currentList.length;
      currentList.splice(insertIdx, 0, moved);
      // Compute new sort_orders: assign evenly spaced values
      const newOrder: Record<string, number> = {};
      const step = 65536;
      currentList.forEach((item, idx) => {
        newOrder[item.id] = (idx + 1) * step;
      });
      // Update local state immediately for visual feedback
      setSubReqOrder(newOrder);
      // Persist the moved item's new sort_order
      if (!updateIssue) return;
      const newSortOrder = newOrder[sourceId];
      updateIssue(projectId, sourceId, { sort_order: newSortOrder });
    },
    [subRequirements, projectId, updateIssue]
  );

  const handleReorderPhase = useCallback(
    (parentId: string, sourceId: string, targetIndex: number, edge: "top" | "bottom") => {
      const currentList = [...(phasesByParent[parentId] ?? [])];
      const sourceIdx = currentList.findIndex((s) => s.id === sourceId);
      if (sourceIdx === -1) return;
      const [moved] = currentList.splice(sourceIdx, 1);
      const insertBefore = edge !== "bottom";
      let insertIdx = targetIndex;
      if (sourceIdx < targetIndex) insertIdx--;
      if (!insertBefore) insertIdx++;
      if (insertIdx < 0) insertIdx = 0;
      if (insertIdx > currentList.length) insertIdx = currentList.length;
      currentList.splice(insertIdx, 0, moved);
      const newOrder: Record<string, number> = {};
      const step = 65536;
      currentList.forEach((item, idx) => {
        newOrder[item.id] = (idx + 1) * step;
      });
      // Update local state
      setPhaseOrders((prev) => ({
        ...prev,
        [parentId]: { ...prev?.[parentId], ...newOrder },
      }));
      // Persist
      if (!updateIssue) return;
      const newSortOrder = newOrder[sourceId];
      updateIssue(projectId, sourceId, { sort_order: newSortOrder });
    },
    [phasesByParent, projectId, updateIssue]
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* === Left column (wide) — sub-requirements & work items === */}
      <div ref={scrollContainerRef} className="h-full min-w-0 flex-1 overflow-y-auto border-r border-subtle">
        <div className="px-6 py-6 @lg:px-9">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : subRequirements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-body-sm-regular text-tertiary">
                暂无子需求。在 Issues 中创建顶层 Issue 作为子需求，再为其添加子 Issue 作为工作项。
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {subRequirements.map((subReq, subReqIdx) => (
                <SubRequirementCard
                  key={subReq.id}
                  subReq={subReq}
                  workItems={workItemsByParent[subReq.id] ?? []}
                  phasesForSubReq={phasesByParent[subReq.id] ?? []}
                  workItemsByParent={workItemsByParent}
                  projectIdentifier={project.identifier}
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  isExpanded={expandedSubReqs.has(subReq.id)}
                  onToggle={() => toggleExpand(subReq.id)}
                  subReqIndex={subReqIdx}
                  totalSubReqs={subRequirements.length}
                  onReorderSubReq={handleReorderSubReq}
                  onReorderPhase={handleReorderPhase}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* === Right column (fixed) — basic info & demand info (sidebar property list style) === */}
      <div className="h-full flex-shrink-0 overflow-y-auto bg-surface-1 lg:w-[340px] xl:w-[380px]">
        <div className="h-full w-full overflow-y-auto px-6">
          {/* Project name */}
          <h5 className="mt-5 text-body-xs-medium">{t("common.properties")}</h5>

          <div className="mt-4 mb-2 space-y-2.5">
            <SidebarPropertyListItem icon={Hash} label="项目名称">
              <span className="flex h-7.5 items-center text-body-xs-medium text-primary">{displayValue(project.name)}</span>
            </SidebarPropertyListItem>

            {project.description ? (
              <SidebarPropertyListItem icon={Layers} label={t("common.description")}>
                <span className="flex h-7.5 items-center text-body-xs-regular text-secondary line-clamp-2">{project.description}</span>
              </SidebarPropertyListItem>
            ) : null}

            <SidebarPropertyListItem icon={Hash} label="项目标识符">
              <span className="flex h-7.5 items-center text-body-xs-regular text-primary">{displayValue(project.identifier)}</span>
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={Layers} label={t("project_settings.custom_fields.category")}>
              <span
                className="flex h-7.5 items-center rounded px-2 text-body-xs-regular font-medium"
                style={(project.category && CATEGORY_STYLE_MAP[project.category]) ?? DEFAULT_CATEGORY_STYLE}
              >
                {displayLabel(CATEGORY_LABELS, project.category)}
              </span>
            </SidebarPropertyListItem>

            <SidebarPropertyListItem icon={Building2} label={t("project_settings.custom_fields.industry")}>
              <span className="flex h-7.5 items-center text-body-xs-regular text-primary">{displayValue(industryName)}</span>
            </SidebarPropertyListItem>
          </div>

          {/* Demand info section */}
          <div className="mt-6">
            <h5 className="text-body-xs-medium">需求信息</h5>
            <div className="mt-4 mb-2 space-y-2.5">
              <SidebarPropertyListItem icon={User} label={t("project_settings.custom_fields.demand_proposer")}>
                <span className="flex h-7.5 items-center text-body-xs-regular text-primary">{displayValue(project.demand_proposer)}</span>
              </SidebarPropertyListItem>

              <SidebarPropertyListItem icon={Building} label={t("project_settings.custom_fields.source_department")}>
                <span className="flex h-7.5 items-center text-body-xs-regular text-primary">{displayValue(project.source_department)}</span>
              </SidebarPropertyListItem>

              <SidebarPropertyListItem icon={Calendar} label={t("project_settings.custom_fields.demand_date")}>
                <span className="flex h-7.5 items-center text-body-xs-regular text-primary">{displayDate(project.demand_date)}</span>
              </SidebarPropertyListItem>

              <SidebarPropertyListItem icon={Users} label={t("project_settings.custom_fields.client_name")}>
                <span className="flex h-7.5 items-center text-body-xs-regular text-primary">{displayValue(project.client_name)}</span>
              </SidebarPropertyListItem>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
