# 客观题答案解析插件 (objective-analysis)

提交客观题后，在**做题页**每题控件下方与**记录页**结果表格下方展示「我的答案 / 正确答案 / 解析」，对错高亮（对绿 / 错红 / 多选漏选黄）。

## 功能

- 做题页：提交后返回题目，每题内联显示你的答案、正确答案、解析（支持 Markdown 基础语法）
- 记录页：结果表格下方展示全部题目的答案与解析
- 作者编辑：在原题目编辑页（`/p/:pid/edit`）**内联**出现「解析管理」区块（不离开原页面），按题填写解析；题目详情页有「解析管理」按钮直达
- 可见性：未提交/未登录用户不可见；比赛（contest）进行中不可见；作业与练习提交后可见

## 架构（零核心改动）

```
题目详情页/记录页 ──GET──▶ 插件 API ──▶ config.yaml（标准答案，判分同源）
        ▲                              └──▶ 插件集合（解析，独立存储）
        │
原编辑页内联编辑器 ──POST──▶ 插件集合（仅写集合，不触碰 config.yaml）
```

- **标准答案**：仍从 testdata `config.yaml` 读取（与判分同源，核心 `parseConfig` 不会下发）
- **解析**：存插件自建集合 `objective.analysis`（domainId+pid 唯一索引），与核心配置编辑器完全解耦——不受其保存过滤/schema 校验影响，无需自愈
- 旧数据兼容：若 config.yaml 中残留旧 `analysis` 键，首次读取时自动迁移到集合

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/objective-analysis/:pid?rid=&tid=&domainId=` | 展示数据（答案/解析/我的答案/每题判分） |
| GET | `/objective-analysis/r/:rid?domainId=` | 记录页展示数据 |
| POST | `/objective-analysis/:pid` | 保存解析（作者），body `{ analysis: JSON字符串, domainId? }` |

## 部署（远程服务器）

`~/.hydro/addon.json` 是每台机器各自的本地文件，部署到远程需：

1. 同步插件目录（git 同步 `Tf_plugins/objective-analysis/`）
2. 在远程 `~/.hydro/addon.json` 追加插件绝对路径：
   `"/部署路径/Tf_plugins/objective-analysis"`
3. 重启远程 hydrooj（addon 列表启动时才读取，热更新不生效）

## 多域说明

- 插件路由为全局路由，默认取「默认域」；题目在非默认域时，前端请求/保存会显式携带 `domainId`，服务端用 query/body 的 `domainId` 覆盖默认域
- 题目详情页/编辑页的链接使用核心 `url()`/`url_prefix` 生成，自动带 `/d/{domain}/` 前缀
- 远程部署后自测：`GET /objective-analysis/{pid}?domainId={题目所在域}`，已提交应返回 answers/analysis 等完整数据

## 注意

- 解析文本为作者可信输入，前端渲染前做 HTML 转义
- 不要在核心「题目配置」编辑器（Monaco YAML）里手写 `analysis` 键：保存时会被过滤丢弃，且 schema 校验会提示 `must NOT have additional properties`（该提示不影响保存）；解析请使用原编辑页的「解析管理」内联区块
