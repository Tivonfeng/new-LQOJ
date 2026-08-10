# Excalidraw 教师画板插件 (excalidraw-board)

题目页侧栏「画板」按钮（仅题目作者/有编辑权限者可见），点击弹出**全屏浮层**，随时用 Excalidraw 画图给学生讲解。

## 功能

- 题目页侧栏「📐 画板」入口（教师视角）
- 点击弹出全屏浮层，内含完整 Excalidraw 编辑器（手绘/图形/文字/导出 PNG）
- 浮层右上角：全屏按钮（浏览器原生全屏）+ 关闭按钮；ESC 关闭
- 画板内容按 pid 存 localStorage（教师本机草稿，重开自动恢复）
- Excalidraw 通过 **lazy 模块按需加载**（主 entry 零体积污染，点按钮才拉 ~13MB）
- CSS/字体**自托管**（插件路由提供，不依赖外网 CDN、不受静态层扫描限制）

## 架构（零核心改动）

```
题目页 ──点「画板」──▶ 全屏浮层
                          └─ load('ExcalidrawBoard') ──▶ /lazy/{hash}/ExcalidrawBoard.lazy.js（~13MB，按需）
                                                              └─ 渲染 Excalidraw（共享主页面 React 19）
                                  └─ CSS/字体 ──▶ /excalidraw-asset/*（插件路由读 public/，含路径穿越防护）
```

- **lazy 模块**：`frontend/ExcalidrawBoard.lazy.tsx`（builder 打包成独立懒加载文件，不进 entry）
- **React 共享**：federationPlugin 把 react 映射到主页面全局，Excalidraw 不重复打包 React
- **CSS 注入**：运行时 `<link>` 加载 `/excalidraw-asset/index.css`（避免 esbuild 处理 woff2 的 loader 缺失问题）
- **字体**：`window.EXCALIDRAW_ASSET_PATH = '/excalidraw-asset/'`（CSS 相对 url 解析到插件路由）

## 安装与部署

1. 安装依赖（插件本地 node_modules，不影响项目根）：
   ```
   cd Tf_plugins/excalidraw-board && npm install
   ```
   ⚠️ **注意**：本插件依赖已安装完成（插件本地 node_modules），**不要再执行 npm install**——项目根用 yarn 4 管理依赖，npm 在插件目录安装会破坏根 node_modules 的嵌套依赖结构（曾导致 webpack 编译失败）。如需重新安装依赖，先确认根 `node_modules/ajv/node_modules/json-schema-traverse` 完好。
2. `~/.hydro/addon.json` 追加插件绝对路径
3. 重启 hydrooj（builder 打包 lazy 模块；字体/CSS 走插件路由，无需额外复制）

## 常见问题

- **Invalid hook call**：lazy 模块必须用 `React.createElement(ExcalidrawBoard, { pid })` 以组件方式渲染，不能直接调用函数组件
- **画板不显示**：确认登录的账号是该题作者或有编辑权限（学生/未登录不可见）
- **首次打开慢**：lazy 模块 ~13MB 按需下载，缓存后秒开
