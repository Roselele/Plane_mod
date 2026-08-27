---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '91d243d3-1d65-431e-a841-cad2e9c71f73'
  PropagateID: '91d243d3-1d65-431e-a841-cad2e9c71f73'
  ReservedCode1: 'a5c1f501-f21b-4c6a-a515-a672000123d5'
  ReservedCode2: 'a5c1f501-f21b-4c6a-a515-a672000123d5'
---

# Plane UI 风格参考文档

> 本文档汇总 Plane v4 的设计系统规范，供定制开发新页面时统一参考。

---

## 目录

1. [架构总览](#1-架构总览)
2. [设计 Token 体系](#2-设计-token-体系)
3. [Typography 排版 Token](#3-typography-排版-token)
4. [UI 组件库](#4-ui-组件库)
5. [图标体系](#5-图标体系)
6. [布局规范](#6-布局规范)
7. [富文本编辑器](#7-富文本编辑器)
8. [Header 与面包屑规范](#8-header-与面包屑规范)
9. [设置页面完整模板](#9-设置页面完整模板)
10. [关键文件索引](#10-关键文件索引)

---

## 1. 架构总览

Plane v4 使用 **Tailwind CSS v4** 的 CSS-first 配置模式（无 `tailwind.config.js`），所有设计 Token 定义在 CSS 变量中。

| 包名 | 路径 | 定位 |
|------|------|------|
| `@plane/ui` | `packages/ui` | 旧版组件库（Button/Badge/Card/Modal/Breadcrumbs/Loader/Input 等） |
| `@plane/propel` | `packages/propel` | 新版组件库（Button/Dialog/Tooltip/EmptyState 等），逐步替代旧版 |
| `@plane/tailwind-config` | `packages/tailwind-config` | 统一 Tailwind v4 配置（变量、动画、PostCSS） |
| `@plane/editor` | `packages/editor` | TipTap 富文本编辑器包 |

**主题切换**：通过 `data-theme` 属性切换，支持 4 种主题：`light` / `dark` / `dark-contrast` / `light-contrast`。所有颜色使用 OKLCH 色彩空间定义。

---

## 2. 设计 Token 体系

### 2.1 三层背景架构（Canvas → Surface → Layer）

```
Canvas（全应用唯一，bg-canvas）
  └── Surface（顶层容器，bg-surface-1 / bg-surface-2）
      └── Layer 1（bg-layer-1）
          └── Layer 2（bg-layer-2）
              └── Layer 3（bg-layer-3）
```

**关键规则**：
- `surface-N` 配套使用 `layer-N`（surface-1 对 layer-1）
- hover 必须匹配：`bg-layer-1 hover:bg-layer-1-hover`
- 还有 `-active`、`-selected` 状态变体
- `bg-layer-transparent`（透明层）用于背景透明但有 hover 需求的元素

### 2.2 背景色 Token

| Tailwind 类名 | 用途 |
|--------------|------|
| `bg-canvas` | 应用根背景 |
| `bg-surface-1` | 主表面（卡片基础背景） |
| `bg-surface-2` | 次表面 |
| `bg-layer-1` / `bg-layer-1-hover` / `bg-layer-1-active` / `bg-layer-1-selected` | 第一层（卡片、列表项） |
| `bg-layer-2` / `-hover` / `-active` / `-selected` | 第二层（嵌套卡片、输入框） |
| `bg-layer-3` / `-hover` / `-active` / `-selected` | 第三层 |
| `bg-layer-transparent` / `-hover` / `-active` / `-selected` | 透明层（侧边栏菜单项） |
| `bg-layer-disabled` | 禁用态背景 |
| `bg-accent-primary` / `-hover` / `-active` | 主题强调色（主按钮背景） |
| `bg-accent-subtle` / `-hover` / `-active` | 主题浅色背景 |
| `bg-success-primary` / `bg-success-subtle` | 成功色 |
| `bg-warning-primary` / `bg-warning-subtle` | 警告色 |
| `bg-danger-primary` / `-hover` / `-active` | 危险色实底 |
| `bg-danger-subtle` / `-hover` / `-active` | 危险色浅底 |
| `bg-danger-transparent` / `-hover` / `-active` | 危险色透明 |
| `bg-backdrop` | 模态遮罩 |

### 2.3 文本色 Token

| Tailwind 类名 | 用途 |
|--------------|------|
| `text-primary` | 主文本（标题、重要内容） |
| `text-secondary` | 次要文本（描述） |
| `text-tertiary` | 第三级文本（标签、元数据） |
| `text-placeholder` | 占位文本 |
| `text-disabled` | 禁用态文本 |
| `text-accent-primary` / `text-accent-secondary` | 主题强调色文本 |
| `text-on-color` / `text-on-color-disabled` | 彩色背景上的文本 |
| `text-inverse` | 反色文本 |
| `text-success-primary` / `text-success-secondary` | 成功色文本 |
| `text-warning-primary` / `text-warning-secondary` | 警告色文本 |
| `text-danger-primary` / `text-danger-secondary` | 危险色文本 |
| `text-link-primary` / `text-link-primary-hover` | 链接色 |

### 2.4 边框色 Token

| Tailwind 类名 | 用途 |
|--------------|------|
| `border-subtle` / `border-subtle-1` | 淡边框（分隔线、卡片边框） |
| `border-strong` / `border-strong-1` | 强边框（hover 态） |
| `border-inverse` | 反色边框 |
| `border-disabled` | 禁用态边框 |
| `border-accent-strong` / `border-accent-subtle` | 主题色边框 |
| `border-danger-strong` / `border-danger-subtle` | 危险色边框 |

### 2.5 图标色 Token（独立于文本色）

`text-icon-primary`、`text-icon-secondary`、`text-icon-tertiary`、`text-icon-accent-primary`、`text-icon-danger-primary`、`text-icon-disabled` 等。

图标默认色用 `text-icon-secondary`，hover 时 `text-icon-primary` 或 `text-primary`。

### 2.6 Label 色 Token（标签系统，8 种色相）

每种色相含 7 个变体：`-bg`、`-bg-strong`、`-hover`、`-icon`、`-text`、`-border`、`-focus`

色相列表：`label-indigo-*`、`label-emerald-*`、`label-grey-*`、`label-crimson-*`、`label-yellow-*`、`label-orange-*`、`label-pink-*`、`label-purple-*`

### 2.7 全局尺寸 Token

| Token | 值 | 说明 |
|-------|---|------|
| `--height-header` | `3.25rem` | Header 高度 |
| `--padding-page-x` / `--padding-page-y` | `1.35rem` | 页面内边距 |
| `--border-width-sm/md/lg/xl` | `1px / 1.5px / 2px / 2.5px` | 边框宽度 |

### 2.8 阴影系统

| Token | 用途 |
|-------|------|
| `shadow-raised-100` | 微浮起（低层） |
| `shadow-raised-200` | 浮起（模态面板） |
| `shadow-raised-300` | 高浮起 |
| `shadow-overlay-100` | 微覆盖 |
| `shadow-overlay-200` | 覆盖（tooltip） |

---

## 3. Typography 排版 Token

### 3.1 字体族

| Token | 字体 |
|-------|------|
| `--font-heading` | "Inter Variable", system-ui, sans-serif |
| `--font-body` | "Inter Variable", system-ui, sans-serif |
| `--font-code` | "IBM Plex Mono", monospace |

### 3.2 语义排版 Token（直接当 Tailwind 类名用）

每个 Token 包含字号 + 行高 + 字间距 + 字重。

#### 标题（line-height: 1.2）

| 类名 | 字号 | 可选字重 |
|------|------|---------|
| `text-h1-regular/medium/semibold/bold` | 32px | 400/500/600/700 |
| `text-h2-regular/medium/semibold/bold` | 28px | 400/500/600/700 |
| `text-h3-regular/medium/semibold/bold` | 24px | 400/500/600/700 |
| `text-h4-regular/medium/semibold/bold` | 20px | 400/500/600/700 |
| `text-h5-regular/medium/semibold/bold` | 18px | 400/500/600/700 |
| `text-h6-regular/medium/semibold/bold` | 16px | 400/500/600/700 |

#### 正文（line-height: 1.4）

| 类名 | 字号 | 可选字重 |
|------|------|---------|
| `text-body-md-regular/medium/semibold/bold` | 16px | 400/500/600/700 |
| `text-body-sm-regular/medium/semibold/bold` | 14px | 400/500/600/700 |
| `text-body-xs-regular/medium/semibold/bold` | 13px | 400/500/600/700 |

#### 标签/说明（line-height: 1.1 或 1）

| 类名 | 字号 | 可选字重 |
|------|------|---------|
| `text-caption-md-regular/medium/semibold/bold` | 12px | 400/500/600/700 |
| `text-caption-sm-regular/medium/semibold/bold` | 11px | 400/500/600/700 |
| `text-caption-xs-regular/medium/semibold/bold` | 10px | 400/500/600/700 |

### 3.3 纯字号 Token（不带预设字重/行高）

可直接用 `text-11`、`text-13`、`text-14` 等，配合 `font-medium`、`font-semibold` 等字重类使用。

| Token | px |
|-------|----|
| `text-9` | 9px |
| `text-10` | 10px |
| `text-11` | 11px |
| `text-12` | 12px |
| `text-13` | 13px |
| `text-14` | 14px |
| `text-16` | 16px |
| `text-18` | 18px |

> **约定**：列表项标题用 `text-13 font-medium text-primary`，描述用 `text-11 text-tertiary`。

---

## 4. UI 组件库

### 4.1 Button

#### 旧版 `@plane/ui`（仍广泛使用）

```tsx
import { Button } from "@plane/ui";

<Button variant="primary" size="lg" onClick={...}>
  <PlusIcon className="h-3.5 w-3.5" />
  添加
</Button>
```

| Variant | 用途 | 样式 |
|---------|------|------|
| `primary` | 主操作 | `bg-accent-primary text-on-color` |
| `neutral-primary` | 次操作 | `bg-surface-1 border border-subtle text-secondary` |
| `outline-primary` | 轮廓 | `bg-transparent border border-accent-strong text-accent-primary` |
| `danger` | 危险操作 | `bg-danger-primary text-on-color` |
| `link-neutral` | 链接式 | `text-tertiary hover:text-secondary` |

尺寸：`sm`(px-3 py-1.5 text-11) / `md`(px-4 py-1.5 text-13) / `lg`(px-5 py-2 text-13)

#### 新版 `@plane/propel`（推荐）

```tsx
import { Button } from "@plane/propel/button";

<Button variant="primary" size="lg">添加</Button>
```

| Variant | 用途 |
|---------|------|
| `primary` | 主操作 |
| `secondary` | 次操作（`border border-strong bg-layer-2`） |
| `tertiary` | 第三级（`bg-layer-3`） |
| `ghost` | 幽灵按钮（`bg-layer-transparent`） |
| `error-fill` | 危险实底 |
| `error-outline` | 危险轮廓 |
| `link` | 链接式 |

尺寸：`sm`(h-5) / `base`(h-6) / `lg`(h-7) / `xl`(h-8)

### 4.2 Input / TextArea

```tsx
import { Input, TextArea } from "@plane/ui";

<Input
  id="name"
  value={value}
  onChange={onChange}
  placeholder="请输入"
  className="w-full"
  mode="primary"        // primary | transparent | true-transparent
  inputSize="sm"        // xs | sm | md
  hasError={false}
/>

<TextArea
  id="description"
  className="min-h-[80px] w-full resize-none text-13"
  placeholder="请输入"
/>
```

默认样式：`rounded-md border-subtle-1 bg-layer-2 text-13`

### 4.3 设置页组件

#### SettingsContentWrapper（布局容器）

```tsx
import { SettingsContentWrapper } from "@/core/components/settings/content-wrapper";

<SettingsContentWrapper header={<MyHeader />}>
  {/* children */}
</SettingsContentWrapper>
```

容器样式：`mx-auto w-full max-w-225 px-page-x @min-[58.95rem]:px-0 py-9`
- `max-w-225` = 900px
- 自动注入 AppHeader + ScrollArea

#### SettingsHeading（标题+描述+控件）

```tsx
import { SettingsHeading } from "@/core/components/settings/heading";

<SettingsHeading
  title="里程碑"                    // text-h3-medium text-primary
  description="管理项目关键节点"      // text-body-xs-regular text-tertiary
  control={<Button variant="primary" size="lg">添加</Button>}
  variant="h3"                     // h3 | h4 | h6
/>
```

#### PageHead（仅设置 document.title）

```tsx
import { PageHead } from "@/core/components/core/page-title";
<PageHead title="里程碑 - Plane" />
```

### 4.4 Loader

```tsx
import { Loader } from "@plane/ui";

<Loader className="space-y-3">
  <Loader.Item height="46px" />
  <Loader.Item height="46px" />
</Loader>
```

### 4.5 EmptyStateCompact

```tsx
import { EmptyStateCompact } from "@plane/propel/empty-state";

<EmptyStateCompact
  assetKey="label"
  assetClassName="size-20"
  title="暂无数据"
  description="点击添加按钮创建"
  actions={[{ label: "添加", onClick: handleAdd }]}
  align="start"              // start | center
  rootClassName="py-20"
/>
```

### 4.6 CustomSelect

```tsx
import { CustomSelect } from "@plane/ui";

<CustomSelect
  value={selectedValue}
  onChange={handleChange}
  options={[{ value: "a", label: "选项A" }, { value: "b", label: "选项B" }]}
  label="选择类型"
/>
```

### 4.7 Badge

```tsx
import { Badge } from "@plane/ui";

<Badge variant="primary" size="md">标签名</Badge>
```

Variant 选项：`primary | accent-primary | outline-primary | neutral | success | warning | destructive`
Size 选项：`sm | md | lg | xl`

### 4.8 Card

```tsx
import { Card } from "@plane/ui";

<Card variant="with-shadow" spacing="lg" direction="column">
  {/* content */}
</Card>
```

默认样式：`bg-surface-1 rounded-lg border-[0.5px] border-subtle`

### 4.9 Modal / Dialog

**旧版 Modal**：
```tsx
import { ModalCore } from "@plane/ui";

<ModalCore isOpen={isOpen} handleClose={onClose} width="MD" position="CENTER">
  {/* content */}
</ModalCore>
```

**新版 Dialog（推荐）**：
```tsx
import { Dialog } from "@plane/propel/dialog";

<Dialog open={isOpen} onOpenChange={setOpen}>
  <Dialog.Panel width={EDialogWidth.XXL} position="center">
    <Dialog.Title>标题</Dialog.Title>
  </Dialog.Panel>
</Dialog>
```

### 4.10 Tooltip

**新版（推荐）**：
```tsx
import { Tooltip } from "@plane/propel/tooltip";
<Tooltip tooltipContent="提示文本" position="top">
  <childElement />
</Tooltip>
```

---

## 5. 图标体系

Plane 使用双图标系统：

### lucide-react（通用图标，应用代码层广泛使用）

```tsx
import { CalendarRange, Settings, UserPlus } from "lucide-react";
<Settings className="h-4 w-4 text-icon-secondary" />
```

### @plane/propel/icons（自定义/领域图标）

```tsx
import { EditIcon, TrashIcon, PlusIcon } from "@plane/propel/icons";
<EditIcon className="h-5 w-5" />
```

**选择规则**：通用 UI 图标用 lucide-react；操作/状态/品牌图标用 propel/icons。

---

## 6. 布局规范

### 6.1 设置页面标准布局

```
SettingsContentWrapper (header={...})
  ├── PageHead (仅 document.title)
  ├── SettingsHeading (title + description + control)
  └── 内容区 (mt-6 space-y-3)
       ├── 表单卡片: rounded-sm border border-subtle bg-surface-1 p-3.5
       └── 列表项: rounded-sm border border-subtle bg-surface-1 px-3.5 py-3
```

核心参数：
- **最大宽度**：`max-w-225`（900px）
- **水平内边距**：`px-page-x`（1.35rem），桌面 `@min-[58.95rem]:px-0`
- **垂直内边距**：`py-9`（2.25rem）

### 6.2 列表项标准样式

**带边框卡片式**：
```tsx
<div className="group flex items-center justify-between gap-2 rounded-sm border border-subtle bg-surface-1 px-3.5 py-3">
  <div className="flex items-center gap-2">
    <h6 className="text-13 font-medium text-primary">{name}</h6>
    <span className="text-11 text-tertiary">{date}</span>
  </div>
  <div className="flex items-center gap-2">
    <EditIcon className="hidden h-5 w-5 text-icon-secondary hover:bg-layer-1 hover:text-primary group-hover:flex" />
    <TrashIcon className="hidden h-5 w-5 text-icon-secondary hover:bg-layer-1 hover:text-primary group-hover:flex" />
  </div>
</div>
```

**语义 Layer 式（AGENTS.md 推荐）**：
```tsx
<div className="bg-layer-1 hover:bg-layer-1-hover rounded-md p-3">
  {/* content */}
</div>
```

### 6.3 SectionCard 模式（信息页用）

```tsx
<div className="rounded-lg border border-subtle bg-layer-1 overflow-hidden">
  <div className="flex items-center gap-2 border-b border-subtle px-5 py-3">
    <h2 className="text-body-sm-medium text-primary">{title}</h2>
  </div>
  <div className="px-5 py-4">{children}</div>
</div>
```

### 6.4 InfoField 模式（键值对）

```tsx
<div className="flex flex-col gap-1">
  <span className="text-caption-md-regular text-tertiary">{label}</span>
  <span className="text-body-sm-regular text-primary">{value}</span>
</div>
```

### 6.5 hover 交互模式

| 场景 | 样式 |
|------|------|
| 列表项/卡片 | `bg-layer-1 hover:bg-layer-1-hover` |
| 侧边栏菜单项 | `hover:bg-layer-transparent-hover`（不加 base bg） |
| 操作按钮（列表内） | `hover:bg-layer-1 hover:text-primary` |
| 卡片链接 | `hover:border-strong`（边框 subtle → strong） |
| hover 显示操作 | `className="hidden group-hover:flex"` |

### 6.6 表单内联卡片

```tsx
<div className="rounded-sm border border-subtle bg-surface-1 p-3.5">
  <div className="space-y-2">
    <Input className="w-full" />
    <TextArea className="min-h-14 w-full resize-none text-13" />
    <div className="flex items-center gap-2">
      <Button variant="primary" size="lg">保存</Button>
      <Button variant="neutral-primary" size="lg">取消</Button>
    </div>
  </div>
</div>
```

### 6.7 Header 布局

| Variant | 样式 | 用途 |
|---------|------|------|
| `PRIMARY` | `bg-surface-1 z-[18]` | 顶层应用 header |
| `SECONDARY` | `border-b border-subtle bg-surface-1 min-h-[52px]` | 二级 header |
| `TERNARY` | `border-b border-subtle bg-surface-1 py-2` | 三级 header |

### 6.8 滚动条

全局隐藏滚动条，需滚动的容器加 `vertical-scrollbar` / `horizontal-scrollbar` 类。

---

## 7. 富文本编辑器

### 7.1 技术栈

TipTap（ProseMirror）+ Yjs/Hocuspocus（协作）+ tiptap-markdown

### 7.2 四种编辑器

| 编辑器 | 导出 | 用途 |
|--------|------|------|
| `RichTextEditorWithRef` | `@plane/editor` | 富文本（工作项描述、长文本） |
| `LiteTextEditorWithRef` | `@plane/editor` | 轻量文本（评论、便签、短文本） |
| `DocumentEditorWithRef` | `@plane/editor` | 文档（非协作） |
| `CollaborativeDocumentEditorWithRef` | `@plane/editor` | 协作文档（Pages） |

### 7.3 Web 层包装组件

| 包装组件 | 路径 | 说明 |
|---------|------|------|
| `RichTextEditor` | `apps/web/core/components/editor/rich-text/editor.tsx` | 注入 mention/fileHandler/flagging |
| `LiteTextEditor` | `apps/web/core/components/editor/lite-text/editor.tsx` | 加工具栏、提交按钮 |
| `DescriptionInput` | `apps/web/core/components/editor/rich-text/description-input/root.tsx` | 带 debounce 自动保存 |

### 7.4 存储格式

| 场景 | 主格式 | 辅助格式 |
|------|--------|---------|
| 工作项描述 | HTML（`description_html`） | JSON、纯文本、Yjs 二进制 |
| 评论 | HTML（`comment_html`） | JSON、纯文本 |
| Pages | Yjs 二进制 | HTML 快照 |

`onChange` 同时回传 JSON 和 HTML，由消费方决定保存哪个。

### 7.5 编辑模式使用示例

```tsx
import { RichTextEditor } from "@/core/components/editor/rich-text/editor";

<Controller name="description_html" control={control}
  render={({ field: { value, onChange } }) => (
    <RichTextEditor
      editable
      id="my-editor"
      initialValue={value ?? ""}
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      projectId={projectId}
      onChange={(_json, html) => onChange(html)}
      placeholder="请输入..."
      searchMentionCallback={async (payload) => { /* mention 搜索 */ }}
      uploadFile={async (blockId, file) => { /* 图片上传 */ }}
      duplicateFile={async (assetId) => { /* 资源复制 */ }}
    />
  )}
/>
```

### 7.6 只读显示模式

Plane 没有独立只读渲染器，复用同一编辑器传入 `editable={false}`：

```tsx
<LiteTextEditor
  editable={false}
  id={entityId}
  initialValue={htmlContent ?? ""}
  workspaceSlug={workspaceSlug}
  workspaceId={workspaceId}
  containerClassName="!py-1"
  parentClassName="border-none"
/>
```

### 7.7 编辑器功能列表

粗体/斜体/下划线/删除线、H1-H6、有序/无序列表/待办列表、引用、代码块（语法高亮）、表格、图片（上传+拖拽）、分割线、链接、@提及、/斜杠命令、文字/背景色、对齐、emoji、callout 提示框、Markdown 支持。

可禁用扩展：`"ai" | "collaboration-cursor" | "issue-embed" | "slash-commands" | "enter-key" | "image"`

---

## 8. Header 与面包屑规范

### 8.1 所有页面必须使用标准 AppHeader

workspace 级页面：`Breadcrumbs` + `BreadcrumbLink`
项目级页面：`CommonProjectBreadcrumbs` + `BreadcrumbLink`

### 8.2 面包屑示例

```tsx
import { Breadcrumbs } from "@plane/ui";
import { CommonProjectBreadcrumbs } from "@/core/components/breadcrumbs/project-breadcrumbs";

<Breadcrumbs>
  <CommonProjectBreadcrumbs projectId={projectId} />
  <Breadcrumbs.Item>
    <Breadcrumbs.ItemWrapper type="text" label="成员状态">
      <Breadcrumbs.Icon><CalendarRange className="h-3.5 w-3.5" /></Breadcrumbs.Icon>
      <Breadcrumbs.Label>成员状态</Breadcrumbs.Label>
    </Breadcrumbs.ItemWrapper>
  </Breadcrumbs.Item>
</Breadcrumbs>
```

---

## 9. 设置页面完整模板

以下是一个完整的 CRUD 设置页面模板，可直接复制修改使用：

```tsx
"use client";

import { useState } from "react";
import { observer } from "mobx-react-lite";
// ... 其他 import

const Page = observer(() => {
  // ... state, hooks, handlers

  return (
    <SettingsContentWrapper header={<Header />}>
      <PageHead title="页面标题 - Plane" />
      <SettingsHeading
        title="页面标题"
        description="页面描述"
        control={<Button variant="primary" size="lg" onClick={handleAdd}>添加</Button>}
      />
      <div className="mt-6">
        {isLoading ? (
          <Loader className="space-y-3">
            <Loader.Item height="46px" />
            <Loader.Item height="46px" />
          </Loader>
        ) : items.length === 0 ? (
          <EmptyStateCompact
            title="暂无数据"
            description="点击添加按钮创建"
            actions={[{ label: "添加", onClick: handleAdd }]}
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id}
                className="group flex items-center justify-between gap-2 rounded-sm border border-subtle bg-surface-1 px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <h6 className="text-13 font-medium text-primary">{item.name}</h6>
                </div>
                <div className="flex items-center gap-2">
                  <EditIcon className="hidden h-5 w-5 text-icon-secondary hover:bg-layer-1 hover:text-primary group-hover:flex"
                    onClick={() => handleEdit(item)} />
                  <TrashIcon className="hidden h-5 w-5 text-icon-secondary hover:bg-layer-1 hover:text-primary group-hover:flex"
                    onClick={() => handleDelete(item)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SettingsContentWrapper>
  );
});

export default Page;
```

---

## 10. 关键文件索引

### Token 定义
- `packages/tailwind-config/variables.css` — 全部 CSS 变量（1300+ 行）
- `packages/tailwind-config/index.css` — 主 CSS 入口
- `packages/tailwind-config/AGENTS.md` — Canvas/Surface/Layer 设计哲学指南
- `packages/tailwind-config/animations.css` — 动画定义

### 组件库
- `packages/ui/src/` — 旧版组件（Button/Badge/Card/Input/Modal/Breadcrumbs/Loader 等）
- `packages/propel/src/` — 新版组件（Button/Dialog/Tooltip/EmptyState 等）
- `apps/web/core/components/settings/content-wrapper.tsx` — SettingsContentWrapper
- `apps/web/core/components/settings/heading.tsx` — SettingsHeading
- `apps/web/core/components/core/page-title.tsx` — PageHead

### 富文本编辑器
- `packages/editor/src/` — TipTap 编辑器包
- `apps/web/core/components/editor/rich-text/editor.tsx` — RichTextEditor Web 包装
- `apps/web/core/components/editor/lite-text/editor.tsx` — LiteTextEditor Web 包装
- `apps/web/core/components/editor/rich-text/description-input/root.tsx` — DescriptionInput（自动保存）

### 真实页面示例
- `apps/web/app/(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/milestones/page.tsx` — 里程碑页（CRUD 模板）
- `apps/web/app/(all)/[workspaceSlug]/(settings)/settings/projects/[projectId]/industries/page.tsx` — 行业标签页
- `apps/web/core/components/project-info/project-info-root.tsx` — Info 信息页
- `apps/web/core/components/project/form.tsx` — 项目设置表单
- `apps/web/core/components/issues/issue-modal/components/description-editor.tsx` — 富文本编辑器使用示例

> AI生成