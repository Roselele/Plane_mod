/**
 * 可复用富文本编辑器字段组件
 * 基于 LiteTextEditor，自动处理 workspaceId 查找、文件上传、只读模式切换。
 * 支持三种使用场景：
 *   1. 表单模式（onChange 回调，无提交按钮）
 *   2. 侧边栏模式（onSave 回调，带提交按钮）
 *   3. 只读显示模式（editable={false}）
 */

import { useCallback, useEffect, useRef } from "react";
// plane imports
import type { EditorRefApi } from "@plane/editor";
import { EFileAssetType } from "@plane/types";
// components
import { LiteTextEditor } from "@/components/editor/lite-text";
// hooks
import { useEditorAsset } from "@/hooks/store/use-editor-asset";
import { useWorkspace } from "@/hooks/store/use-workspace";

/** 将纯文本包装为 HTML，兼容旧版 TextArea 数据 */
function ensureHtml(value: string | null | undefined): string {
  if (!value || value.trim() === "") return "<p></p>";
  if (value.trim().startsWith("<")) return value;
  return `<p>${value.replace(/\n/g, "<br/>")}</p>`;
}

/** 判断两个 HTML 字符串是否等价（忽略空段落差异） */
function isHtmlEqual(a: string, b: string): boolean {
  const normalize = (s: string) => s.replace(/<p>\s*<\/p>/gi, "").trim();
  return normalize(a) === normalize(b);
}

interface RichTextEditorFieldProps {
  /** 编辑器唯一 ID */
  id: string;
  /** HTML 或纯文本内容 */
  value: string | null | undefined;
  /** 实时变更回调（如 react-hook-form Controller） */
  onChange?: (html: string) => void;
  /** 提交回调（侧边栏模式，由工具栏提交按钮触发） */
  onSave?: (html: string) => void;
  /** 是否可编辑 */
  editable: boolean;
  /** 工作空间 slug */
  workspaceSlug: string;
  /** 项目 ID */
  projectId?: string;
  /** 文件上传关联实体 ID（默认用 projectId） */
  entityId?: string;
  /** 文件上传实体类型（默认 PROJECT_DESCRIPTION） */
  entityType?: EFileAssetType;
  /** 占位提示文本 */
  placeholder?: string;
  /** 编辑器容器 className */
  containerClassName?: string;
  /** 父包装 className */
  parentClassName?: string;
  /** 工具栏变体（默认 "full"） */
  variant?: "full" | "lite";
  /** 初始是否显示工具栏（默认 false — 聚焦后显示） */
  showToolbarInitially?: boolean;
  /** Issue ID（用于 @提及搜索） */
  issueId?: string;
  /** 提交中状态 */
  isSubmitting?: boolean;
}

export function RichTextEditorField(props: RichTextEditorFieldProps) {
  const {
    id,
    value,
    onChange,
    onSave,
    editable,
    workspaceSlug,
    projectId,
    entityId,
    entityType = EFileAssetType.PROJECT_DESCRIPTION,
    placeholder = "请输入...",
    containerClassName,
    parentClassName,
    variant = "full",
    showToolbarInitially = false,
    issueId,
    isSubmitting = false,
  } = props;

  const { getWorkspaceBySlug } = useWorkspace();
  const workspaceId = getWorkspaceBySlug(workspaceSlug)?.id ?? "";
  const { uploadEditorAsset, duplicateEditorAsset } = useEditorAsset();

  // 内部 ref，确保 LiteTextEditor 的 handleEditorReady 能正确获取 editorRef
  const editorRef = useRef<EditorRefApi | null>(null);

  // 追踪最新 HTML，供 onSave 回调使用
  const latestHtmlRef = useRef(ensureHtml(value));
  // 追踪初始 HTML，用于失焦时判断内容是否变化
  const initialHtmlRef = useRef(ensureHtml(value));

  // 外部 value 变化时同步 refs（如切换到另一个 issue）
  useEffect(() => {
    const html = ensureHtml(value);
    latestHtmlRef.current = html;
    initialHtmlRef.current = html;
  }, [value]);

  const uploadFile = useCallback(
    async (blockId: string, file: File) => {
      const { asset_id } = await uploadEditorAsset({
        blockId,
        data: {
          entity_identifier: entityId ?? projectId ?? "",
          entity_type: entityType,
        },
        file,
        projectId,
        workspaceSlug,
      });
      return asset_id;
    },
    [entityId, projectId, workspaceSlug, entityType, uploadEditorAsset]
  );

  const duplicateFile = useCallback(
    async (assetId: string) => {
      const { asset_id } = await duplicateEditorAsset({
        assetId,
        entityId: entityId ?? projectId,
        entityType,
        projectId,
        workspaceSlug,
      });
      return asset_id;
    },
    [entityId, projectId, workspaceSlug, entityType, duplicateEditorAsset]
  );

  const htmlValue = ensureHtml(value);

  if (editable) {
    return (
      <div
        onBlur={(e) => {
          // 失焦时自动保存：只在内容有变化且提供了 onSave 时触发
          // e.relatedTarget 是新获得焦点的元素，如果仍在本组件内则不保存
          const related = e.relatedTarget as Node | null;
          if (related && e.currentTarget.contains(related)) return;
          if (onSave && !isHtmlEqual(latestHtmlRef.current, initialHtmlRef.current)) {
            initialHtmlRef.current = latestHtmlRef.current;
            onSave(latestHtmlRef.current);
          }
        }}
      >
        <LiteTextEditor
          ref={editorRef}
          editable
          id={id}
          initialValue={htmlValue}
          workspaceSlug={workspaceSlug}
          workspaceId={workspaceId}
          projectId={projectId}
          issue_id={issueId}
          uploadFile={uploadFile}
          duplicateFile={duplicateFile}
          onChange={(_json: object, html: string) => {
            latestHtmlRef.current = html;
            onChange?.(html);
          }}
          onEnterKeyPress={() => {
            if (onSave && !isHtmlEqual(latestHtmlRef.current, initialHtmlRef.current)) {
              initialHtmlRef.current = latestHtmlRef.current;
              onSave(latestHtmlRef.current);
            }
          }}
          placeholder={placeholder}
          containerClassName={containerClassName}
          parentClassName={parentClassName}
          variant={variant}
          showToolbarInitially={showToolbarInitially}
          showSubmitButton={!!onSave}
          submitButtonText="保存"
          showAccessSpecifier={false}
          isSubmitting={isSubmitting}
          disabledExtensions={["enter-key"]}
        />
      </div>
    );
  }

  return (
    <LiteTextEditor
      ref={editorRef}
      editable={false}
      id={id}
      initialValue={htmlValue}
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      projectId={projectId}
      issue_id={issueId}
      containerClassName={containerClassName ?? "!py-1"}
      parentClassName={parentClassName ?? "border-none"}
    />
  );
}
