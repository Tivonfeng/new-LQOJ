// LQOJ 提交规范配置（Conventional Commits）
// 格式: type(scope): 描述，描述允许中文
// 例: feat(core): 新增 xxx / fix(typing): 修复跑毒机制 bug
module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // 放宽 header 长度限制（中文场景）
        'header-max-length': [2, 'always', 100],
        // 不强制 subject 大小写（中英混合，如 "feat: add X" 与 "feat: 新增 X" 均合法）
        'subject-case': [0],
    },
};
