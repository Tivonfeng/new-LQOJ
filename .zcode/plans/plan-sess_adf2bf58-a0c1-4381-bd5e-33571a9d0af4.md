# Community Toolkit React 改造方案（Hydro 标准模式）

## 核心思路

用 Hydro 标准的 React 插件模式（`frontend/*.page.tsx` + esbuild 运行时编译），模板直接继承 `layout/html5.html` 而非 `layout/basic.html`，这样：
- ✅ 有 `data-page` 属性，`NamedPage` 能正常匹配
- ✅ 加载 `entry.js` + `hydro-xxx.js`（React、Ant Design、插件的 .page.tsx 全自动）
- ✅ 不带 OJ 的导航栏、侧边栏、页脚
- ✅ 公开访问（`noCheckPermView = true`）
- ✅ 不需要独立编译步骤，esbuild 在 Hydro 启动时自动编译

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `templates/community_toolkit.html` | **新建** | 极简模板，继承 html5.html，只有 React 挂载点 |
| `frontend/community-toolkit.page.tsx` | **新建** | React 主组件（路由 + 所有视图） |
| `frontend/community-toolkit.page.css` | **新建** | 样式 |
| `src/handlers/community-toolkit-handler.ts` | **修改** | Handler 改为用模板渲染 |
| `index.ts` | **修改** | 路由名与 page_name 对齐 |
| `public/community/index.html` | **删除** | 不再需要纯 JS 版本 |
| `public/community/share-test.html` | **删除** | 不再需要 |

## 1. 模板 `templates/community_toolkit.html`

```html
{% set page_name = "community_toolkit" %}
{% extends "layout/html5.html" %}

{% block body %}
<div id="community-toolkit-app"></div>
<script>
  window.__CT_COURSES_BASE__ = '/community-toolkit/courses';
  window.__CT_FILES_BASE__ = '/community-toolkit/files';
  window.__CT_SHARE_API__ = '/wechat/share';
  window.__CT_LOGO_URL__ = '/wechat/static/logo.png';
</script>
{% endblock %}
```

- 继承 `layout/html5.html`（不继承 `basic.html`），只有 HTML 骨架 + JS bundle 加载
- `{% set page_name = "community_toolkit" %}` 确保 NamedPage 匹配
- 数据通过 fetch API 获取（课程 JSON），不通过模板注入

## 2. Handler 修改

```typescript
export class CommunityToolkitHandler extends Handler {
    noCheckPermView = true;
    async get() {
        this.response.template = 'community_toolkit.html';
        this.response.body = {};
    }
}
```

其他 Handler（CourseDataHandler、FileHandler、ImageHandler）保持不变。

## 3. React 组件 `frontend/community-toolkit.page.tsx`

```tsx
import './community-toolkit.page.css';
import { addPage, NamedPage } from '@hydrooj/ui-default';
import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// 课程列表页组件
const CourseList: React.FC = () => { ... };

// 课程详情页组件（含 Tab 切换）
const CourseDetail: React.FC<{ courseId: string }> = () => { ... };

// 通用子组件
const TemplateCard = ({ template, onCopy }) => { ... };
const DataTable = ({ section }) => { ... };
const Checklist = ({ section }) => { ... };
const Timeline = ({ section }) => { ... };
const TabBar = ({ active, onChange }) => { ... };

// 工具函数
async function copyText(text: string): Promise<boolean> { ... }
function showToast(msg: string): void { ... }

// 注册页面
addPage(new NamedPage(['community_toolkit'], async () => {
    const mountPoint = document.getElementById('community-toolkit-app');
    if (mountPoint) {
        createRoot(mountPoint).render(<App />);
    }
}));
```

### 前端路由

用 `useState` 管理（不用 react-router，跟其他插件一致）：
- `view` 状态：`'list'` 或 `'detail'`
- `courseId` 状态：当前查看的课程 ID
- 用 `location.hash` 支持直接分享链接（`#/course/ai-public-1`）

### 数据获取

- 课程列表：`fetch('/community-toolkit/courses/index.json')`
- 课程详情：`fetch('/community-toolkit/courses/{courseId}.json')`
- 微信分享：`fetch('/wechat/share?url=...')`

### UI 组件

用 Ant Design（跟 typing-speed-system、score-system 一致），组件：
- `Card` - 卡片容器
- `Tag` - 课程标签（公益/付费/客户类型）
- `Button` - 复制/下载按钮
- `Input.Search` - 课程搜索（可选）
- `Empty` - 空状态
- `Skeleton` - 加载骨架屏
- `message` / `Modal` - 提示和复制兜底弹窗

### 功能复用

所有现有功能完整迁移到 React：
- 课程列表 + 筛选（全部/公益/付费）
- 课程详情 5 个 Tab（首页/招募/准备/执行/宣传）
- 文案折叠/展开 + 一键复制（三层兜底）
- 文件下载（微信适配）
- 拍照指南表格
- 相册入口
- 微信 JSSDK 分享
- 关于区域 + 联系电话

## 4. index.ts 路由

```typescript
// 路由名与 page_name 一行
ctx.Route('community_toolkit', '/community-toolkit', CommunityToolkitHandler);
ctx.Route('community_toolkit_course_data', '/community-toolkit/courses/:filename', CommunityToolkitCourseDataHandler);
ctx.Route('community_toolkit_files', '/community-toolkit/files/:filename', CommunityToolkitFileHandler);
ctx.Route('community_toolkit_images', '/community-toolkit/images/:filename', CommunityToolkitImageHandler);
```

## 5. 实施步骤

1. 创建 `templates/community_toolkit.html` 极简模板
2. 创建 `frontend/community-toolkit.page.tsx` React 组件（所有视图 + 交互）
3. 创建 `frontend/community-toolkit.page.css` 样式
4. 修改 `community-toolkit-handler.ts`（用模板渲染）
5. 修改 `index.ts`（对齐路由名）
6. 删除旧的 `index.html` 和 `share-test.html`
7. TypeScript 编译检查
