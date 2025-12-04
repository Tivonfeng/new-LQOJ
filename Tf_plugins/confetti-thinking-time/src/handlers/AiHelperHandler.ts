import { Handler, ProblemModel } from 'hydrooj';

interface AiHelperRequestArgs {
    problemId?: string;
    code?: string;
    mode?: 'hint' | 'debug' | 'optimize';
    language?: string;
    prompt?: string;
}

// 为了方便演示，这里将 DeepSeek 的 key 硬编码在代码中
// 实际生产环境建议改为读取环境变量或配置文件
const DEEPSEEK_API_KEY = 'sk-9678a906f2b64147ae10f666b50c893a';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

async function callDeepSeek(prompt: string) {
    if (!DEEPSEEK_API_KEY) {
        throw new Error('请先在 AiHelperHandler.ts 中配置正确的 DEEPSEEK_API_KEY。');
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

export class AiHelperHandler extends Handler {
    async post(args: AiHelperRequestArgs) {
        const {
            problemId,
            code,
            mode = 'hint',
            language,
            prompt,
        } = args || {};

        if (!this.user?._id) {
            this.response.body = {
                success: false,
                message: '请先登录后再使用 AI 辅助功能。',
            };
            return;
        }

        if (!problemId) {
            this.response.body = {
                success: false,
                message: '缺少必要参数：problemId。',
            };
            return;
        }

        // debug/optimize 模式强制需要代码；hint 模式可以只看题目
        if ((mode === 'debug' || mode === 'optimize') && !code) {
            this.response.body = {
                success: false,
                message: '调试或优化模式需要提供代码。',
            };
            return;
        }

        // 简单的参数约束，避免过长请求
        if (code && code.length > 100_000) {
            this.response.body = {
                success: false,
                message: '代码过长，请只粘贴与本题相关的核心部分。',
            };
            return;
        }

        // 尝试获取题面描述（包含题目内容与样例 Markdown）
        let problemTitle: string | undefined;
        let problemContentSnippet = '';
        try {
            const domainId = this.domain._id as string;
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
                    // 截断，避免 prompt 过长
                    const limit = 1200;
                    problemContentSnippet = text.length > limit
                        ? `${text.slice(0, limit)}\n...(题面过长，已截断)`
                        : text;
                }
            }
        } catch (e) {
            // 获取题面失败时忽略，不影响 AI 主流程
            console.error('[Confetti AI Helper] 获取题面失败:', e);
        }

        // 构造发给 DeepSeek 的 prompt
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

        lines.push('');
        if (code) {
            lines.push('下面是学生当前的代码:');
            lines.push('```');
            lines.push(code);
            lines.push('```');
            lines.push('');
        }
        lines.push('请按照下面 JSON 结构返回，不要额外添加解释文本：'
            + '{ "analysis": "...", "suggestions": ["..."], "steps": ["..."] }');
        if (mode === 'debug') {
            lines.push(
                '重点从“可能的错误/边界情况/逻辑漏洞”角度分析，禁止直接给出可 AC 的完整代码。',
            );
        } else if (mode === 'optimize') {
            lines.push('重点从时间复杂度、空间复杂度和代码可读性角度给出优化建议。');
        } else {
            lines.push('重点给出适度的解题思路提示，避免一步到位给出最终答案。');
        }

        try {
            const raw = await callDeepSeek(lines.join('\n'));

            // 尝试从模型回复中解析 JSON
            let parsed: any = null;
            try {
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
            } catch {
                // 如果解析失败，用整个回复当成 analysis
                parsed = { analysis: raw, suggestions: [], steps: [] };
            }

            this.response.body = {
                success: true,
                data: {
                    analysis: parsed.analysis || '',
                    suggestions: parsed.suggestions || [],
                    steps: parsed.steps || [],
                },
            };

            // 调用成功后，通过事件机制扣除积分（每次 100 分）
            try {
                const uid = Number(this.user._id);
                const domainId = this.domain._id as string;
                (this.ctx as any).emit('ai/helper-used', {
                    uid,
                    domainId,
                    cost: 100,
                    reason: '使用 AI 辅助解题',
                });
            } catch (scoreErr) {
                // 积分扣除失败不影响 AI 功能本身，只在服务端记录日志
                console.error('[Confetti AI Helper] 扣除积分失败:', scoreErr);
            }
        } catch (e: any) {
            this.response.body = {
                success: false,
                message: `AI 服务调用失败: ${e.message || e.toString()}`,
            };
        }
    }
}
