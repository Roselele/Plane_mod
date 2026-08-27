/**
 * MilestoneField — 工作项级里程碑条目组件
 * 每个工作项直接管理自己的里程碑条目列表（内容+日期）
 * 直接调用 IssueMilestoneService API，不依赖 MobX store
 */

import { useState, useEffect, useCallback } from "react";
import { Flag, Plus, Trash2, Calendar } from "lucide-react";
import { SidebarPropertyListItem } from "@/components/common/layout/sidebar/property-list-item";
import { IssueMilestoneService } from "@/services/issue-milestone.service";
import type { IIssueMilestoneItem } from "@plane/types";

const issueMilestoneService = new IssueMilestoneService();

interface TMilestoneFieldProps {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  disabled: boolean;
  textClass: string;
}

export const MilestoneField = ({
  workspaceSlug,
  projectId,
  issueId,
  disabled,
  textClass,
}: TMilestoneFieldProps) => {
  const [items, setItems] = useState<IIssueMilestoneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newDate, setNewDate] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await issueMilestoneService.getIssueMilestoneItems(workspaceSlug, projectId, issueId);
      setItems(data);
    } catch (e) {
      console.error("获取里程碑条目失败:", e);
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, projectId, issueId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddItem = async () => {
    const content = newContent.trim();
    if (!content) return;
    try {
      const created = await issueMilestoneService.createIssueMilestoneItem(
        workspaceSlug, projectId, issueId,
        { content, target_date: newDate || null }
      );
      setItems((prev) => [...prev, created]);
      setNewContent("");
      setNewDate("");
    } catch (e) {
      console.error("创建条目失败:", e);
    }
  };

  const handleUpdateItem = async (itemId: string, data: Partial<IIssueMilestoneItem>) => {
    try {
      const updated = await issueMilestoneService.updateIssueMilestoneItem(workspaceSlug, projectId, issueId, itemId, data);
      setItems((prev) => prev.map((it) => (it.id === itemId ? updated : it)));
    } catch (e) {
      console.error("更新条目失败:", e);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await issueMilestoneService.deleteIssueMilestoneItem(workspaceSlug, projectId, issueId, itemId);
      setItems((prev) => prev.filter((it) => it.id !== itemId));
    } catch (e) {
      console.error("删除条目失败:", e);
    }
  };

  return (
    <SidebarPropertyListItem icon={Flag} label="里程碑">
      <div className="w-full flex flex-col gap-1">
        {loading ? (
          <span className={`${textClass} text-placeholder`}>加载中...</span>
        ) : items.length === 0 && !disabled ? (
          <span className={`${textClass} text-placeholder`}>暂无里程碑条目</span>
        ) : items.length === 0 ? (
          <span className={`${textClass} text-placeholder`}>无</span>
        ) : (
          items.map((item) => (
            <MilestoneItemRow
              key={item.id}
              item={item}
              disabled={disabled}
              onUpdate={(data) => handleUpdateItem(item.id, data)}
              onDelete={() => handleDeleteItem(item.id)}
            />
          ))
        )}

        {/* Add new item */}
        {!disabled && (
          <div className="flex items-center gap-1 pt-1">
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleAddItem(); }
              }}
              placeholder="内容..."
              className="flex-1 min-w-0 h-7 rounded border border-custom-border-200 bg-transparent px-1.5 text-xs outline-none focus:border-custom-primary-100"
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-7 rounded border border-custom-border-200 bg-transparent px-1 text-xs outline-none focus:border-custom-primary-100"
            />
            <button
              type="button"
              onClick={handleAddItem}
              disabled={!newContent.trim()}
              className="flex items-center justify-center h-7 w-7 rounded border border-custom-border-200 hover:bg-custom-background-80 disabled:opacity-50"
              title="添加条目"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </SidebarPropertyListItem>
  );
};

// ---- Milestone Item Row (content + date, inline editable) ----

interface MilestoneItemRowProps {
  item: IIssueMilestoneItem;
  disabled: boolean;
  onUpdate: (data: Partial<IIssueMilestoneItem>) => void;
  onDelete: () => void;
}

function MilestoneItemRow({ item, disabled, onUpdate, onDelete }: MilestoneItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(item.content);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (trimmed && trimmed !== item.content) {
      onUpdate({ content: trimmed });
    } else {
      setContent(item.content);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1 group h-7.5">
      <Calendar className="h-3 w-3 shrink-0 text-tertiary" />
      {editing ? (
        <input
          type="text"
          value={content}
          autoFocus
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
            if (e.key === "Escape") { setContent(item.content); setEditing(false); }
          }}
          className="flex-1 min-w-0 text-xs bg-transparent outline-none border-b border-custom-primary-100"
        />
      ) : (
        <span
          className="flex-1 min-w-0 truncate text-xs text-primary cursor-pointer"
          onDoubleClick={() => !disabled && setEditing(true)}
          title={item.content}
        >
          {item.content}
        </span>
      )}
      {item.target_date && (
        <span className="text-[10px] text-tertiary shrink-0">{item.target_date}</span>
      )}
      {!disabled && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity shrink-0"
          title="删除条目"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}
