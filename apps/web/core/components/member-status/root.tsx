/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Loader } from "lucide-react";
import type { TBaseIssue } from "@plane/types";
import { Avatar } from "@plane/ui";
// services
import { MemberStatusService } from "@/services/member-status.service";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
// utils
import { cn, getFileURL } from "@plane/utils";

// ─── Constants ───────────────────────────────────────────────────────
const ROW_HEIGHT = 44;
const MEMBER_HEADER_HEIGHT = 36;
const MIN_BAR_WIDTH = 8;
const LEFT_SIDEBAR_WIDTH = 280;
const PADDING_DAYS = 7;

// 视图配置
const VIEW_CONFIG = {
  month: { dayWidth: 20, label: "月" },
  week: { dayWidth: 40, label: "周" },
} as const;

type GanttView = keyof typeof VIEW_CONFIG;

const MEMBER_COLORS = [
  "#8B5A2B", "#5B7C99", "#6B8E23", "#B8860B", "#CD853F",
  "#D2691E", "#A0522D", "#7B9EA8", "#9999CC", "#C4A35A",
  "#8FBC8F", "#D4A574", "#A9827E", "#7BA7BC", "#BC8F8F",
  "#DB7093", "#9370DB", "#5F9EA0", "#FF8C69", "#BDB76B",
];

const UNASSIGNED_COLOR = "#9CA3AF";

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];
const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

// ─── Helpers ─────────────────────────────────────────────────────────
function parseDate(str: string): Date {
  const d = new Date(str);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ─── Types ───────────────────────────────────────────────────────────
interface MemberGroup {
  memberId: string;
  displayName: string;
  color: string;
  issues: TBaseIssue[];
}

// ─── Header data generation ──────────────────────────────────────────

// 月份表头条目
interface MonthHeaderEntry {
  label: string;
  left: number;
  width: number;
}

// 周表头条目（月视图的子行）
interface WeekSubEntry {
  label: string;
  left: number;
  width: number;
  isToday: boolean;
}

// 日表头条目（周视图的子行）
interface DaySubEntry {
  date: Date;
  dayNum: number;
  weekday: string;
  left: number;
  width: number;
  isToday: boolean;
  isWeekend: boolean;
}

// 背景列条目（用于交替/周末高亮）
interface BgColumnEntry {
  left: number;
  width: number;
  isWeekend: boolean;
  isToday: boolean;
}

// ─── Main Component ──────────────────────────────────────────────────
export const MemberStatusRoot = observer(function MemberStatusRoot() {
  const { workspaceSlug } = useParams() as { workspaceSlug: string };
  const memberStatusService = useMemo(() => new MemberStatusService(), []);
  const { getUserDetails, workspace: workspaceMemberStore } = useMember();
  const { getProjectById } = useProject();

  // state
  const [issues, setIssues] = useState<TBaseIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hiddenMembers, setHiddenMembers] = useState<Set<string>>(new Set());
  const [view, setView] = useState<GanttView>("month");

  // refs
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayWidth = VIEW_CONFIG[view].dayWidth;

  // fetch data
  useEffect(() => {
    if (!workspaceSlug) return;
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          workspaceMemberStore.fetchWorkspaceMembers(workspaceSlug),
          (async () => {
            const data = await memberStatusService.getAllWorkspaceIssues(workspaceSlug);
            if (!cancelled) setIssues(data);
          })(),
        ]);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "加载数据失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [workspaceSlug, memberStatusService, workspaceMemberStore]);

  // dated issues
  const datedIssues = useMemo(
    () => issues.filter((i) => i.start_date && i.target_date),
    [issues]
  );

  // group by assignee
  const memberGroups = useMemo(() => {
    const groupMap = new Map<string, TBaseIssue[]>();
    for (const issue of datedIssues) {
      const assignees = issue.assignee_ids?.length > 0 ? issue.assignee_ids : ["__unassigned__"];
      for (const memberId of assignees) {
        if (!groupMap.has(memberId)) groupMap.set(memberId, []);
        groupMap.get(memberId)!.push(issue);
      }
    }
    const workspaceMemberIds = workspaceMemberStore.getWorkspaceMemberIds(workspaceSlug) ?? [];
    const memberIds = Array.from(groupMap.keys()).sort((a, b) => {
      if (a === "__unassigned__") return 1;
      if (b === "__unassigned__") return -1;
      const aName = getUserDetails(a)?.display_name ?? a;
      const bName = getUserDetails(b)?.display_name ?? b;
      return aName.localeCompare(bName);
    });
    return memberIds
      .filter((id) => !hiddenMembers.has(id))
      .map((memberId, index) => {
        const memberIssues = groupMap.get(memberId)!;
        memberIssues.sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1));
        let displayName: string;
        let color: string;
        if (memberId === "__unassigned__") {
          displayName = "未分配";
          color = UNASSIGNED_COLOR;
        } else {
          const userDetails = getUserDetails(memberId);
          displayName = userDetails?.display_name ?? "未知成员";
          const wIndex = workspaceMemberIds.indexOf(memberId);
          color = wIndex >= 0 ? getMemberColor(wIndex) : UNASSIGNED_COLOR;
        }
        return { memberId, displayName, color, issues: memberIssues } as MemberGroup;
      });
  }, [datedIssues, hiddenMembers, getUserDetails, workspaceMemberStore, workspaceSlug]);

  // date range
  const dateRange = useMemo(() => {
    if (datedIssues.length === 0) return null;
    let minDate = parseDate(datedIssues[0].start_date!);
    let maxDate = parseDate(datedIssues[0].target_date!);
    for (const issue of datedIssues) {
      const s = parseDate(issue.start_date!);
      const e = parseDate(issue.target_date!);
      if (s < minDate) minDate = s;
      if (e > maxDate) maxDate = e;
    }
    minDate = addDays(minDate, -PADDING_DAYS);
    maxDate = addDays(maxDate, PADDING_DAYS);
    return { start: minDate, end: maxDate };
  }, [datedIssues]);

  const totalDays = dateRange ? daysBetween(dateRange.start, dateRange.end) + 1 : 0;
  const timelineWidth = totalDays * dayWidth;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayPos = dateRange ? daysBetween(dateRange.start, today) * dayWidth : 0;

  // ─── Month view headers: months + weeks ───
  const monthHeaders = useMemo<MonthHeaderEntry[]>(() => {
    if (!dateRange) return [];
    const entries: MonthHeaderEntry[] = [];
    let current = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), 1);
    while (current <= dateRange.end) {
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const startClamped = current < dateRange.start ? dateRange.start : current;
      const endClamped = monthEnd > dateRange.end ? dateRange.end : monthEnd;
      const left = daysBetween(dateRange.start, startClamped) * dayWidth;
      const width = (daysBetween(startClamped, endClamped) + 1) * dayWidth;
      entries.push({
        label: `${current.getFullYear()}年 ${MONTH_LABELS[current.getMonth()]}`,
        left,
        width,
      });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return entries;
  }, [dateRange, dayWidth]);

  const weekSubEntries = useMemo<WeekSubEntry[]>(() => {
    if (!dateRange) return [];
    const entries: WeekSubEntry[] = [];
    // Align to week start (Sunday)
    let current = new Date(dateRange.start);
    const day = current.getDay();
    current = addDays(current, -day);
    while (current <= dateRange.end) {
      const weekEnd = addDays(current, 6);
      const startClamped = current < dateRange.start ? dateRange.start : current;
      const endClamped = weekEnd > dateRange.end ? dateRange.end : weekEnd;
      const left = daysBetween(dateRange.start, startClamped) * dayWidth;
      const width = (daysBetween(startClamped, endClamped) + 1) * dayWidth;
      const isToday = today >= current && today <= weekEnd;
      entries.push({
        label: `${startClamped.getDate()}-${endClamped.getDate()}`,
        left,
        width,
        isToday,
      });
      current = addDays(current, 7);
    }
    return entries;
  }, [dateRange, dayWidth, today]);

  // ─── Week view headers: months + days ───
  const weekViewMonthHeaders = useMemo<MonthHeaderEntry[]>(() => monthHeaders, [monthHeaders]);

  const daySubEntries = useMemo<DaySubEntry[]>(() => {
    if (!dateRange) return [];
    const entries: DaySubEntry[] = [];
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(dateRange.start, i);
      const left = i * dayWidth;
      const weekday = date.getDay();
      entries.push({
        date,
        dayNum: date.getDate(),
        weekday: WEEKDAY_LABELS[weekday],
        left,
        width: dayWidth,
        isToday: isSameDay(date, today),
        isWeekend: weekday === 0 || weekday === 6,
      });
    }
    return entries;
  }, [dateRange, dayWidth, totalDays, today]);

  // ─── Background columns ───
  const bgColumns = useMemo<BgColumnEntry[]>(() => {
    if (view === "week") {
      return daySubEntries.map((d) => ({
        left: d.left,
        width: d.width,
        isWeekend: d.isWeekend,
        isToday: d.isToday,
      }));
    }
    // month view: use weeks
    return weekSubEntries.map((w) => ({
      left: w.left,
      width: w.width,
      isWeekend: false,
      isToday: w.isToday,
    }));
  }, [view, daySubEntries, weekSubEntries]);

  // ─── Member filter entries (for filter bar) ───
  const allMemberEntries = useMemo(() => {
    const groupMap = new Map<string, TBaseIssue[]>();
    for (const issue of datedIssues) {
      const assignees = issue.assignee_ids?.length > 0 ? issue.assignee_ids : ["__unassigned__"];
      for (const memberId of assignees) {
        if (!groupMap.has(memberId)) groupMap.set(memberId, []);
        groupMap.get(memberId)!.push(issue);
      }
    }
    const workspaceMemberIds = workspaceMemberStore.getWorkspaceMemberIds(workspaceSlug) ?? [];
    return Array.from(groupMap.keys())
      .sort((a, b) => {
        if (a === "__unassigned__") return 1;
        if (b === "__unassigned__") return -1;
        const aName = getUserDetails(a)?.display_name ?? a;
        const bName = getUserDetails(b)?.display_name ?? b;
        return aName.localeCompare(bName);
      })
      .map((memberId) => {
        const wIndex = workspaceMemberIds.indexOf(memberId);
        return {
          memberId,
          displayName:
            memberId === "__unassigned__"
              ? "未分配"
              : getUserDetails(memberId)?.display_name ?? "未知成员",
          color: memberId === "__unassigned__" ? UNASSIGNED_COLOR : getMemberColor(wIndex >= 0 ? wIndex : 0),
          count: groupMap.get(memberId)!.length,
          isHidden: hiddenMembers.has(memberId),
        };
      });
  }, [datedIssues, hiddenMembers, getUserDetails, workspaceMemberStore, workspaceSlug]);

  // ─── Actions ───
  const toggleMember = (memberId: string) => {
    setHiddenMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const scrollToToday = useCallback(() => {
    if (!scrollRef.current || !dateRange) return;
    const containerWidth = scrollRef.current.clientWidth;
    const scrollTo = todayPos - containerWidth / 2 + dayWidth / 2;
    scrollRef.current.scrollTo({ left: Math.max(0, scrollTo), behavior: "smooth" });
  }, [todayPos, dayWidth, dateRange]);

  // Auto-scroll to today on mount and view change
  useEffect(() => {
    if (!loading && dateRange) {
      const timer = setTimeout(() => scrollToToday(), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, dateRange, view, scrollToToday]);

  // ─── Render ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader className="size-5 animate-spin text-secondary" />
        <span className="ml-2 text-sm text-secondary">加载成员状态数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-sm text-danger-primary">{error}</span>
      </div>
    );
  }

  if (datedIssues.length === 0) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-subtle px-5">
          <div className="flex items-center gap-2 text-xs text-tertiary">
            <span>0 个任务</span>
            <span>·</span>
            <span>0 个成员</span>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-secondary">暂无包含起止日期的任务数据</span>
        </div>
      </div>
    );
  }

  // Calculate row positions for each member group
  type RowLayout = { memberId: string; displayName: string; color: string; offsetY: number; issueRows: { issue: TBaseIssue; rowOffsetY: number }[] };
  const rowLayout: RowLayout[] = [];
  let currentY = 0;
  for (const group of memberGroups) {
    const groupStartY = currentY;
    currentY += MEMBER_HEADER_HEIGHT;
    const issueRows: { issue: TBaseIssue; rowOffsetY: number }[] = [];
    for (const issue of group.issues) {
      issueRows.push({ issue, rowOffsetY: currentY });
      currentY += ROW_HEIGHT;
    }
    rowLayout.push({
      memberId: group.memberId,
      displayName: group.displayName,
      color: group.color,
      offsetY: groupStartY,
      issueRows,
    });
  }
  const totalContentHeight = currentY;
  const headerHeight = 48; // 28px month row + 20px sub row

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-subtle px-5 py-2">
        <div className="flex items-center gap-1.5">
          <span className="mr-2 text-11 text-tertiary">
            {datedIssues.length} 个任务 · {allMemberEntries.length} 个成员
          </span>
          {/* Member filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {allMemberEntries.map((entry) => (
              <button
                key={entry.memberId}
                onClick={() => toggleMember(entry.memberId)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-11 transition-colors",
                  entry.isHidden
                    ? "border-subtle bg-transparent text-tertiary opacity-50"
                    : "border-transparent text-secondary hover:opacity-80"
                )}
                style={!entry.isHidden ? { backgroundColor: entry.color + "22" } : undefined}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.displayName}</span>
                <span className="text-tertiary">({entry.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center rounded-md bg-layer-transparent p-0.5">
            {(Object.keys(VIEW_CONFIG) as GanttView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-2.5 py-1 text-11 font-medium transition-colors",
                  view === v
                    ? "bg-layer-transparent-selected text-primary"
                    : "text-tertiary hover:text-secondary"
                )}
              >
                {VIEW_CONFIG[v].label}
              </button>
            ))}
          </div>

          {/* Today button */}
          <button
            onClick={scrollToToday}
            className="rounded-md bg-layer-transparent px-2.5 py-1 text-11 font-medium text-secondary hover:bg-layer-transparent-hover"
          >
            今天
          </button>
        </div>
      </div>

      {/* ── Gantt Body: single scroll container ── */}
      <div
        ref={scrollRef}
        className="vertical-scrollbar horizontal-scrollbar relative flex-1 scrollbar-lg overflow-auto"
      >
        {/* Inner wrapper: total width = sidebar + timeline */}
        <div className="relative" style={{ width: LEFT_SIDEBAR_WIDTH + timelineWidth, minHeight: "100%" }}>
          {/* ── Left sidebar (sticky, overlays on top) ── */}
          <div
            className="sticky left-0 z-30 bg-surface-1 border-r border-subtle"
            style={{ width: LEFT_SIDEBAR_WIDTH, height: totalContentHeight + headerHeight }}
          >
            {/* Header spacer matching timeline header height */}
            <div
              className="sticky top-0 z-10 bg-surface-1 border-b border-subtle"
              style={{ height: headerHeight }}
            >
              <div className="flex items-center px-3 text-11 font-medium text-tertiary" style={{ height: 28 }}>
                成员
              </div>
              <div className="flex items-center px-3 text-10 text-placeholder" style={{ height: 20 }}>
                {view === "month" ? "周" : "日"}
              </div>
            </div>

            {/* Member rows */}
            {memberGroups.map((group) => {
              const memberDetails = group.memberId !== "__unassigned__" ? getUserDetails(group.memberId) : null;
              return (
              <div key={group.memberId}>
                <div
                  className="flex items-center gap-2 border-b border-subtle px-3"
                  style={{ height: MEMBER_HEADER_HEIGHT }}
                >
                  {memberDetails ? (
                    <Avatar
                      name={memberDetails.display_name}
                      src={getFileURL(memberDetails.avatar_url)}
                      size="sm"
                      showTooltip={false}
                    />
                  ) : (
                    <span
                      className="flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white"
                      style={{ backgroundColor: group.color }}
                    >
                      ?
                    </span>
                  )}
                  <span className="truncate text-13 font-medium">{group.displayName}</span>
                  <span className="ml-auto shrink-0 text-11 text-tertiary">{group.issues.length}</span>
                </div>
                {group.issues.map((_, i) => (
                  <div key={i} className="border-b border-subtle/30" style={{ height: ROW_HEIGHT }} />
                ))}
              </div>
              );
            })}
          </div>

          {/* ── Timeline area (offset by sidebar width) ── */}
          <div
            className="absolute top-0"
            style={{ left: LEFT_SIDEBAR_WIDTH, width: timelineWidth }}
          >
            {/* ── Sticky header ── */}
            <div
              className="sticky top-0 z-10 bg-surface-1"
              style={{ height: headerHeight }}
            >
              {/* Row 1: Month labels (28px) */}
              <div className="relative border-b border-subtle" style={{ height: 28 }}>
                {monthHeaders.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 flex h-full items-center border-l border-subtle px-2 text-11 font-medium text-secondary"
                    style={{ left: m.left, width: m.width }}
                  >
                    <span className="truncate">{m.label}</span>
                  </div>
                ))}
              </div>

              {/* Row 2: Week or Day labels (20px) */}
              <div className="relative" style={{ height: 20 }}>
                {view === "month"
                  ? weekSubEntries.map((w, i) => (
                      <div
                        key={i}
                        className={cn(
                          "absolute top-0 flex h-full items-center border-l border-subtle px-1 text-10 text-placeholder",
                          w.isToday && "bg-accent-primary/20"
                        )}
                        style={{ left: w.left, width: w.width }}
                      >
                        {w.label}
                      </div>
                    ))
                  : daySubEntries.map((d, i) => (
                      <div
                        key={i}
                        className={cn(
                          "absolute top-0 flex h-full items-center border-l border-subtle px-1 text-10 text-placeholder",
                          d.isToday && "bg-accent-primary/20"
                        )}
                        style={{ left: d.left, width: d.width }}
                      >
                        {d.isWeekend ? (
                          <span className="text-tertiary">{d.dayNum}</span>
                        ) : (
                          <>
                            <span className="mr-0.5 text-placeholder">{d.weekday}</span>
                            <span className="text-tertiary">{d.dayNum}</span>
                          </>
                        )}
                      </div>
                    ))
                }
              </div>
            </div>

            {/* ── Background columns ── */}
            <div className="absolute" style={{ top: headerHeight, left: 0, width: timelineWidth, height: totalContentHeight }}>
              {bgColumns.map((col, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute top-0 h-full border-l border-subtle/30",
                    col.isWeekend && "bg-surface-2",
                    col.isToday && "bg-accent-primary/10"
                  )}
                  style={{ left: col.left, width: col.width }}
                />
              ))}
            </div>

            {/* ── Today vertical line ── */}
            {todayPos >= 0 && todayPos <= timelineWidth && (
              <div
                className="absolute z-5 border-l-2 border-danger-primary/40"
                style={{ top: 0, height: totalContentHeight + headerHeight, left: todayPos }}
              >
                <span className="sticky top-12 ml-1 rounded-sm bg-danger-primary/80 px-1 text-9 font-medium text-white">
                  今天
                </span>
              </div>
            )}

            {/* ── Member rows with issue bars ── */}
            {rowLayout.map((row) => (
              <div key={row.memberId}>
                {/* Member separator row (matches left sidebar member header) */}
                <div
                  className="relative border-b border-subtle bg-layer-transparent-hover/50"
                  style={{ height: MEMBER_HEADER_HEIGHT }}
                />

                {/* Issue bars */}
                {row.issueRows.map(({ issue, rowOffsetY: _ }) => {
                  const start = parseDate(issue.start_date!);
                  const end = parseDate(issue.target_date!);
                  const offsetDays = dateRange ? daysBetween(dateRange.start, start) : 0;
                  const durationDays = daysBetween(start, end) + 1;
                  const left = offsetDays * dayWidth;
                  const width = Math.max(durationDays * dayWidth - 2, MIN_BAR_WIDTH);
                  const project = issue.project_id ? getProjectById(issue.project_id) : null;

                  return (
                    <div
                      key={issue.id}
                      className="relative border-b border-subtle/30"
                      style={{ height: ROW_HEIGHT }}
                    >
                      <a
                        href={`/${workspaceSlug}/projects/${issue.project_id}/issues/${issue.id}`}
                        className="absolute top-1.5 flex items-center overflow-hidden rounded-sm px-2 text-13 text-white transition-opacity hover:opacity-80"
                        style={{
                          left: left + 1,
                          width,
                          height: ROW_HEIGHT - 12,
                          backgroundColor: row.color,
                        }}
                        title={`${issue.name}${project ? ` [${project.identifier}]` : ""} (${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")} → ${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")})`}
                      >
                        <span className="truncate">{issue.name}</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Bottom spacer */}
            <div style={{ height: 20 }} />
          </div>
        </div>
      </div>
    </div>
  );
});
