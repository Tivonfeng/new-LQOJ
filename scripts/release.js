#!/usr/bin/env node
/**
 * LQOJ 发布脚本
 *
 * 用法:
 *   node scripts/release.js v1.2.0 [--from <sha>] [--dry-run]
 *
 * 流程:
 *   1. 校验工作区干净、目标版本合法且未被占用
 *   2. 用 --first-parent 收集 fork 自有提交（上游 merge 的内容在 second parent，
 *      天然被过滤，CHANGELOG 只含本 fork 的改动）
 *   3. 生成 CHANGELOG.md 段落（feat/fix/perf/refactor/breaking 分组）
 *   4. 更新根 package.json 的 version 字段
 *   5. 提交 "chore(release): vX.Y.Z" 并打 annotated tag
 *   6. 输出推送与合并 master 的指引
 *
 * 首次发布时仓库可能没有 LQOJ 标签，用 --from 指定基线提交
 * （例如上游标签位置: --from d46de632）。
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md');

const TYPES = {
    feat: '新功能',
    fix: '修复',
    perf: '性能优化',
    refactor: '重构',
};

function run(cmd, args, opts = {}) {
    const result = execFileSync(cmd, args, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        ...opts,
    });
    return result.trim();
}

function tryRun(cmd, args) {
    try {
        return run(cmd, args);
    } catch (e) {
        return null;
    }
}

function fail(msg) {
    console.error(`\n✖ ${msg}`);
    process.exit(1);
}

// ---------- 参数解析 ----------
const argv = process.argv.slice(2);
let versionArg = null;
let fromArg = null;
let dryRun = false;
for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--from' && i + 1 < argv.length) { fromArg = argv[i + 1]; i++; continue; }
    if (arg.startsWith('--from=')) { fromArg = arg.slice(7); continue; }
    if (arg === '--dry-run') { dryRun = true; continue; }
    if (!arg.startsWith('--')) versionArg = arg;
}
if (!versionArg) fail('缺少版本号参数。用法: node scripts/release.js v1.2.0 [--from <sha>] [--dry-run]');

const version = versionArg.replace(/^v/, '');
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
    fail(`版本号格式不合法: ${versionArg}（应为 vX.Y.Z 形式）`);
}
const tag = `v${version}`;

// ---------- 前置校验 ----------
// dry-run 是预览模式，不要求工作区干净（真实发布前会再校验一次）
if (!dryRun) {
    const status = run('git', ['status', '--porcelain']);
    if (status) fail(`工作区不干净，请先提交或暂存全部改动:\n${status}`);
}

const branch = tryRun('git', ['branch', '--show-current']) || '(detached)';
if (branch === 'master') console.log('⚠  当前在 master 分支：发布提交应产生在 tf_dev 上，稍后 merge 到 master');

if (tryRun('git', ['tag', '-l', tag])) fail(`标签 ${tag} 已存在，请检查版本号`);

// ---------- 确定提交范围 ----------
const prevTag = tryRun('git', ['describe', '--tags', '--abbrev=0']);
let range;
if (fromArg) {
    range = `${fromArg}..HEAD`;
} else if (prevTag) {
    range = `${prevTag}..HEAD`;
} else {
    fail('仓库没有任何标签，首次发布请用 --from 指定基线提交（如 --from d46de632，上游 5.0.0-beta.0 位置）');
}

// ---------- 收集 fork 自有提交（first-parent 过滤上游 merge） ----------
const logRaw = tryRun('git', ['log', '--first-parent', '--no-merges', '--format=%H%x00%s%x00%b%x00', range]);
if (!logRaw) fail(`提交范围 ${range} 内没有提交，请检查 --from 基线`);

const remoteUrl = tryRun('git', ['remote', 'get-url', 'origin']) || '';
const githubMatch = remoteUrl.match(/github\.com[/:]([^/]+\/[^/.]+?)(\.git)?$/);
const commitUrl = (sha) => (githubMatch ? `https://github.com/${githubMatch[1]}/commit/${sha}` : null);

const groups = { feat: [], fix: [], perf: [], refactor: [], breaking: [] };
const entries = logRaw.split('\x00\n').filter(Boolean);
let total = 0;

for (const entry of entries) {
    const parts = entry.split('\x00');
    const sha = parts[0];
    const subject = parts[1] || '';
    const body = parts[2] || '';
    const m = subject.match(/^([a-z]+)(\(([^)]+)\))?(!)?: (.*)$/s);
    if (!m) continue;
    const [, type, , scope, bang, desc] = m;
    if (!TYPES[type]) continue;
    total++;
    const link = commitUrl(sha);
    const bullet = `${scope ? `**${scope}**: ` : ''}${desc}${link ? ` ([${sha.slice(0, 7)}](${link}))` : ` (${sha.slice(0, 7)})`}`;
    if (bang || /BREAKING[- ]CHANGE/i.test(body)) groups.breaking.push(bullet);
    else groups[type].push(bullet);
}

if (total === 0) fail(`提交范围 ${range} 内没有符合 conventional 规范的 feat/fix/perf/refactor 提交，无法生成 CHANGELOG`);
console.log(`✓ 收集到 ${total} 条 fork 自有提交（范围: ${range}，当前分支: ${branch}）`);
for (const [key, items] of Object.entries(groups)) {
    if (items.length) console.log(`  ${TYPES[key] || '破坏性变更'}: ${items.length} 条`);
}

// ---------- 生成 CHANGELOG 段落 ----------
const date = new Date().toISOString().slice(0, 10);
const lines = [`## [${tag}] - ${date}`, ''];
const groupOrder = ['breaking', 'feat', 'fix', 'perf', 'refactor'];
for (const key of groupOrder) {
    const items = groups[key];
    if (!items.length) continue;
    lines.push(`### ${TYPES[key] || '破坏性变更'}`, '');
    for (const item of items) lines.push(`- ${item}`);
    lines.push('');
}

let changelog;
if (fs.existsSync(CHANGELOG_PATH)) {
    changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');
    const insertAt = changelog.indexOf('\n## ');
    if (insertAt === -1) {
        changelog += `\n${lines.join('\n')}`;
    } else {
        changelog = changelog.slice(0, insertAt + 1) + `${lines.join('\n')}\n` + changelog.slice(insertAt + 1);
    }
} else {
    changelog = `# Changelog\n\n本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。\n\n` +
        (fromArg || !prevTag ? `> 首个 LQOJ 版本基线，基于上游 Hydro 5.0.4（请按实际合并的上游版本修正此说明）。\n\n` : '') +
        `${lines.join('\n')}\n`;
}

// ---------- 更新根 package.json 版本 ----------
const pkgRaw = fs.readFileSync(PKG_PATH, 'utf8');
const currentVersion = (pkgRaw.match(/"version"\s*:\s*"([^"]*)"/) || [])[1];
if (!currentVersion) fail('package.json 中未找到 version 字段');
// 首次发布（显式 --from 基线）时允许版本相同：根 package.json 自带 1.0.0 恰好等于首个目标版本，
// 此时只打 tag、不更新 version 字段
if (currentVersion === version && !fromArg) fail(`package.json 当前版本已是 ${version}，无需发布（请检查版本号）`);
const newPkgRaw = currentVersion === version ? pkgRaw : pkgRaw.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${version}"`);

// ---------- 落地 ----------
if (dryRun) {
    console.log('\n[dry-run] 以下内容将被执行，未做任何修改:\n');
    console.log('  CHANGELOG.md 新增段落:\n');
    console.log(lines.map((l) => `    ${l}`).join('\n'));
    console.log(`\n  package.json version: ${currentVersion} -> ${version}${currentVersion === version ? ' (不变)' : ''}`);
    console.log(`  git commit: chore(release): ${tag}`);
    console.log(`  git tag: ${tag}`);
    process.exit(0);
}

fs.writeFileSync(CHANGELOG_PATH, changelog);
fs.writeFileSync(PKG_PATH, newPkgRaw);
run('git', ['add', 'package.json', 'CHANGELOG.md']);
run('git', ['commit', '-m', `chore(release): ${tag}`]);
run('git', ['tag', '-a', tag, '-m', `Release ${tag}`]);

console.log(`\n✓ 发布提交与标签 ${tag} 已创建（${branch} 分支）`);
console.log('\n下一步:');
console.log('  git push origin ' + branch);
console.log('  git checkout master');
console.log(`  git merge ${branch}`);
console.log('  git push origin master --tags    # 触发 CI 自动部署');
console.log('\n注: push master 会触发 sync-tf-plugins.yml 自动同步插件并写入版本标记。');
