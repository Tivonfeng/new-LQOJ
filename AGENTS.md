# AGENTS.md — new-LQOJ 项目约定（AI 协作必读）

new-LQOJ 是 Hydro OJ 的深度定制 fork（Tivonfeng），yarn 4 workspace monorepo。
本文件是给 AI 编码代理的协作约定；完整 git 规范见 [docs/git-workflow.md](docs/git-workflow.md)。

## 硬约束

- **核心零改动**：`packages/` 等核心代码尽量不改，新功能以 `Tf_plugins/` 下的插件形式实现（经 `~/.hydro/addon.json` 注册）
- 不要手动改 `packages/**` 的版本号（跟随上游 merge 自动更新）

## Git 流程（提交会被强制校验）

- **提交格式**：Conventional Commits `type(scope): 描述`（描述可中文）。本地 husky + CI commitlint 双重强制，非法消息会被拒绝
  - 合法示例：`feat(typing): 增加 xxx`、`fix(core): 修复 xxx`、`chore(release): v1.0.0`
  - type 枚举：feat / fix / perf / refactor / docs / style / test / build / ci / chore / revert
  - 上游 merge 提交自动跳过校验
- **分支**：`tf_dev` 日常开发（直接提交或 feature/* 并入）；`master` 发布分支——**严禁直接提交代码**，push master 会触发生产部署
- **版本号**：LQOJ 独立 semver（`v1.x.y`，锚点 = 根 package.json version），与上游 Hydro 版本解耦
- **发布**：`yarn release vX.Y.Z`（自动生成 CHANGELOG + bump 版本 + 打 tag）→ `git push origin tf_dev` → merge 到 master → `git push origin master --tags`（触发自动部署）
- **上游同步**：`git fetch upstream && git merge upstream/master`（保持 merge 方式，勿用 rebase）

## 其他

- 部署仅同步 `Tf_plugins/`（sync-tf-plugins.yml：远端备份 + rsync + 版本标记）；回滚用服务器上的 `<path>.bak.<时间戳>` 目录
- 开发环境：Node 22、yarn 4；改动后用 `yarn lint:ci`、`yarn build` 检查
