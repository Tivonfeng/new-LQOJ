# LQOJ Git 工作流规范

本文档定义 new-LQOJ（Hydro fork）的标准 git 工作流：分支模型、提交规范、版本号规则、发布与回滚流程。

## 1. 分支模型

```
upstream/master ──定期 merge──► tf_dev（主开发分支）
                                    │  发布时
                                    ▼
                                master（发布分支）──push──► CI 自动部署
                                    │
                                    └── git tag v1.x.y
```

| 分支 | 用途 | 规则 |
|---|---|---|
| `tf_dev` | 主开发分支 | 日常提交、feature 分支合并、上游同步都在这进行 |
| `master` | 发布分支 | 只接受发布 merge；push 触发 `sync-tf-plugins.yml` 自动部署 |
| `feature/*` | 较大功能 | 从 `tf_dev` 切出，完成后 merge 回 `tf_dev`（可选，小改动可直接提交） |
| `hotfix/*` | 紧急修复 | 从 `master` 切出，修复后 merge 回 `master`（触发部署）和 `tf_dev` |
| `upstream/*` | 上游跟踪 | 只读，仅用于同步 |

> ⚠️ 严禁直接 push `master` 提交代码——master 上的每次变更都会触发生产部署。

## 2. 日常开发流程

```bash
git checkout tf_dev
git pull origin tf_dev

# 开发（小改动直接提交）
git add <files>
git commit -m "feat(typing): 增加 xxx 功能"   # 提交信息会被 commitlint 校验
git push origin tf_dev
```

feature 分支流程（较大功能）：

```bash
git checkout -b feature/xxx tf_dev
# ... 开发并提交 ...
git checkout tf_dev && git merge feature/xxx && git push origin tf_dev
```

## 3. 提交规范（Conventional Commits）

格式：`type(scope): 描述`，描述允许中文。

```bash
feat(core): 新增签到功能
fix(typing): 修复跑毒机制 bug
refactor(score-system): 重构积分结算逻辑
```

| type | 含义 | CHANGELOG 分组 |
|---|---|---|
| `feat` | 新功能 | 新功能 |
| `fix` | 修复 | 修复 |
| `perf` | 性能优化 | 性能优化 |
| `refactor` | 重构 | 重构 |
| `docs` / `style` / `test` / `build` / `ci` / `chore` / `revert` | 其他 | 不进入 CHANGELOG |

- `scope` 沿用 Hydro 习惯：`core` / `ui` / `judge` / `typing` / `training` / `score-system` 等
- 破坏性变更：`feat(core)!: xxx`（`!` 标记），会进入 CHANGELOG「破坏性变更」分组
- 上游同步的 merge 提交自动跳过校验，无需遵守本规范

**本地强制**：`.husky/commit-msg` 钩子（husky）在每次 commit 时运行 commitlint；
**CI 强制**：`.github/workflows/commitlint.yml` 在 PR 时校验全部提交。

## 4. 版本号规则

LQOJ 使用**独立 semver 版本线**（与上游 Hydro 版本解耦）：

- 版本锚点：根 `package.json` 的 `version` 字段；发布标签 `v1.2.0`
- `packages/hydrooj` 等子包版本跟随上游合并自然更新，**不要手动改**
- Tf_plugins 内插件版本（均为 1.0.0）随主版本发布，不单独 bump

| 变更类型 | 版本示例 | 触发条件 |
|---|---|---|
| major | v2.0.0 | 破坏性变更（提交带 `!` 标记） |
| minor | v1.2.0 | 新功能（feat） |
| patch | v1.2.1 | 修复（fix）/ 重构 |
| prerelease | v1.3.0-beta.1 | 预发布（可选） |

CHANGELOG 只记录 **fork 自己的提交**：release 脚本用 `--first-parent` 收集提交，
上游 merge 进来的内容在 second parent 上，天然被过滤。

## 5. 发布流程

### 5.1 日常小版本发布

```bash
# 1. 在 tf_dev 上完成开发并 push
git push origin tf_dev

# 2. 运行发布脚本（自动生成 CHANGELOG + bump 版本 + 打 tag）
yarn release v1.2.0          # 正式执行
yarn release v1.2.0 --dry-run  # 先预览

# 3. 推送并发布
git push origin tf_dev
git checkout master
git merge tf_dev
git push origin master --tags   # 触发 CI 自动部署
git checkout tf_dev
```

### 5.2 首次发布（仓库没有 LQOJ 标签时）

用 `--from` 指定基线提交（上游最后一个 tag 位置 `d46de632`，即 5.0.0-beta.0）：

```bash
yarn release v1.0.0 --from d46de632
```

脚本会自动在 CHANGELOG 头部注明「基于上游 Hydro 5.0.4」基线，请按实际合并的上游版本修正。

### 5.3 release 脚本做了什么

1. 校验工作区干净、版本号合法、标签未占用
2. 收集 `--first-parent` 链上的 conventional 提交，按 feat/fix/perf/refactor/breaking 分组
3. 生成 `CHANGELOG.md` 段落
4. 更新根 `package.json` version → 提交 `chore(release): v1.2.0` → 打 annotated tag `v1.2.0`
5. 输出推送与合并 master 的指引

## 6. 部署与回滚

### 部署触发

`sync-tf-plugins.yml`：push 到 `master` 且 `Tf_plugins/**` 有变更时自动执行（也可手动 workflow_dispatch）：

1. **备份**：同步前将远端插件目录复制为 `<path>.bak.<时间戳>`，保留最近 5 份
2. **同步**：rsync/scp 全量同步 `Tf_plugins/` 到服务器
3. **版本标记**：同步后写入 `<path>/../VERSION` 文件（内容：`tag commit-sha 时间`）

> 注：部署只同步插件目录。核心代码（`packages/`）的发布不在本流程内（未接 Docker CI）。

### 回滚

```bash
# 在服务器上，先查看可用备份
ls -dt /path/to/Tf_plugins.bak.*
cat /path/to/VERSION        # 查看当前线上版本

# 回滚到指定备份
mv Tf_plugins Tf_plugins.rollback_$(date +%Y%m%d_%H%M%S)
mv Tf_plugins.bak.<时间戳> Tf_plugins
```

## 7. 上游同步流程

```bash
git checkout tf_dev
git fetch upstream
git merge upstream/master        # 保持 merge 方式，勿用 rebase（保证 CHANGELOG 过滤干净）
# 解决冲突后
git push origin tf_dev
```

- 上游的版本 bump 提交（如 `bump version`）会随 merge 自动更新子包版本
- 若上游修改了 `build.yml` / `package.json` 等共同文件，解决冲突时保留本 fork 的定制（如 `prepare`/`release` scripts）

## 8. 工具与文件清单

| 文件 | 作用 |
|---|---|
| `.husky/commit-msg` | 本地提交校验钩子（跳过 merge/revert） |
| `commitlint.config.cjs` | commitlint 规则（header ≤100，不强制 subject 大小写） |
| `scripts/release.js` | 发布脚本（`yarn release vX.Y.Z`） |
| `CHANGELOG.md` | 版本变更记录（由 release 脚本生成） |
| `.github/workflows/commitlint.yml` | CI 提交校验（PR + push） |
| `.github/workflows/sync-tf-plugins.yml` | 部署（备份 + 同步 + 版本标记） |
