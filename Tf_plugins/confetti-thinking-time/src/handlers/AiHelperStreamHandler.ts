import { ConnectionHandler, ProblemModel } from 'hydrooj';

const DEEPSEEK_API_KEY = 'sk-9678a906f2b64147ae10f666b50c893a';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

async function callDeepSeek(prompt: string) {
    if (!DEEPSEEK_API_KEY) {
        throw new Error('请先在 AiHelperStreamHandler.ts 中配置正确的 DEEPSEEK_API_KEY。');
    }

    const resp = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content:
                        '你是一个在线评测平台的助教，只能给解题思路、错误分析和优化建议，禁止直接给出完整可 AC 的最终代码。',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
        }),
    });

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`DeepSeek API 错误: ${resp.status} ${text}`);
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    return content as string;
}

async function buildPromptText(
    domainId: string,
    args: {
        problemId: string;
        code?: string;
        mode: 'hint' | 'debug' | 'optimize';
        language?: string;
        prompt?: string;
    },
) {
    const {
        problemId, code, mode, language, prompt,
    } = args;

    let problemTitle: string | undefined;
    let problemContentSnippet = '';
    try {
        const pdoc = await ProblemModel.get(domainId, problemId as any);
        if (pdoc) {
            problemTitle = (pdoc as any).title;
            const rawContent = (pdoc as any).content;
            let text = '';
            if (typeof rawContent === 'string') {
                text = rawContent;
            } else if (rawContent && typeof rawContent === 'object') {
                const keys = Object.keys(rawContent);
                const prefer = language && keys.includes(language) ? language : keys[0];
                text = (rawContent as any)[prefer] || '';
            }
            if (text) {
                const limit = 1200;
                problemContentSnippet = text.length > limit
                    ? `${text.slice(0, limit)}\n...(题面过长，已截断)`
                    : text;
            }
        }
    } catch (e) {
        // 获取题面失败时忽略
        console.error('[Confetti AI Helper Stream] 获取题面失败:', e);
    }

    const lines: string[] = [];
    lines.push(`题目编号: ${problemId}`);
    if (problemTitle) {
        lines.push(`题目标题: ${problemTitle}`);
    }
    lines.push(`代码语言: ${language || '未指定'}`);
    lines.push(`当前模式: ${mode}`);
    if (prompt) {
        lines.push(`学生补充说明: ${prompt}`);
    }
    lines.push('');
    if (problemContentSnippet) {
        lines.push('');
        lines.push('题目描述（可能包含样例与说明，已做适度截断）:');
        lines.push(problemContentSnippet);
    }
    if (code) {
        lines.push('');
        lines.push('下面是学生当前的代码:');
        lines.push('```');
        lines.push(code);
        lines.push('```');
    }
    lines.push('');
    lines.push(
        '请按照下面 JSON 结构返回，不要额外添加解释文本：'
        + '{ "analysis": "...", "suggestions": ["..."], "steps": ["..."] }',
    );
    if (mode === 'debug') {
        lines.push(
            '重点从“可能的错误/边界情况/逻辑漏洞”角度分析，禁止直接给出可 AC 的完整代码。',
        );
    } else if (mode === 'optimize') {
        lines.push('重点从时间复杂度、空间复杂度和代码可读性角度给出优化建议。');
    } else {
        lines.push('重点给出适度的解题思路提示，避免一步到位给出最终答案。');
    }

    return lines.join('\n');
}

export class AiHelperStreamHandler extends ConnectionHandler {
    async prepare() {
        // 必须登录
        if (!this.user?._id) {
            this.send(JSON.stringify({ type: 'error', message: '请先登录后再使用 AI 辅助功能。' }));
            this.close(4001, 'Unauthorized');
        }
    }

    // 客户端建立连接后立即发送一条欢迎消息（可选）
    async open() {
        this.send(JSON.stringify({ type: 'ready' }));
    }

    // 前端通过 WebSocket 发送配置（problemId/mode/prompt/codeLang 等）
    async onmessage(message: string) {
        try {
            const data = JSON.parse(message || '{}');
            const {
                problemId,
                code,
                mode = 'hint',
                language,
                prompt,
            } = data || {};

            if (!problemId) {
                this.send(JSON.stringify({ type: 'error', message: '缺少必要参数：problemId。' }));
                this.close(4002, 'bad_request');
                return;
            }

            if ((mode === 'debug' || mode === 'optimize') && !code) {
                this.send(JSON.stringify({ type: 'error', message: '调试或优化模式需要提供代码。' }));
                this.close(4002, 'bad_request');
                return;
            }

            // 构造 prompt（包含题面/样例/代码等）
            const promptText = await buildPromptText(this.domain._id as string, {
                problemId,
                code,
                mode,
                language,
                prompt,
            });

            // 调用 DeepSeek，按块转发给前端（伪流式，将整体回答拆成小片段）
            const raw = await callDeepSeek(promptText);
            const parts = raw.split(/(?<=[。！？\n])/);
            for (const part of parts) {
                const content = part.trim();
                if (!content) continue;
                this.send(JSON.stringify({ type: 'delta', content }));
            }

            this.send(JSON.stringify({ type: 'done' }));
            this.close(4000, 'completed');
        } catch (e: any) {
            this.send(JSON.stringify({
                type: 'error',
                message: `AI 流式服务调用失败: ${e.message || e.toString()}`,
            }));
            this.close(4003, 'error');
        }
    }
}
