import { ConnectionHandler, ProblemModel } from 'hydrooj';

const DEEPSEEK_API_KEY = 'sk-9678a906f2b64147ae10f666b50c893a';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

/**
 * 调用 DeepSeek 流式 API
 * 返回一个异步生成器，逐块产生内容
 */
async function* callDeepSeekStream(prompt: string): AsyncGenerator<string, void, unknown> {
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
            stream: true, // 启用流式响应
        }),
    });

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`DeepSeek API 错误: ${resp.status} ${text}`);
    }

    if (!resp.body) {
        throw new Error('响应体为空');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        let chunkIndex = 0;
        let contentChunkCount = 0;
        console.log('[DeepSeek Stream] 开始读取流式响应...');

        while (true) {
            // eslint-disable-next-line no-await-in-loop
            const { done, value } = await reader.read();
            if (done) {
                console.log(`[DeepSeek Stream] 流读取完成，共 ${chunkIndex} 个原始块，${contentChunkCount} 个内容块`);
                break;
            }

            chunkIndex++;
            const decoded = decoder.decode(value, { stream: true });
            buffer += decoded;

            // 立即处理所有完整的行
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留最后一个不完整的行

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // 处理 SSE 格式：data: {...} 或 data: [DONE]
                if (!trimmed.startsWith('data: ')) {
                    // 可能是其他类型的行（如注释），跳过
                    continue;
                }

                const data = trimmed.slice(6); // 移除 'data: ' 前缀
                if (data === '[DONE]') {
                    console.log('[DeepSeek Stream] 收到 [DONE]');
                    return;
                }

                try {
                    const json = JSON.parse(data);
                    const content = json.choices?.[0]?.delta?.content || '';
                    if (content) {
                        contentChunkCount++;
                        // 立即 yield，让调用者处理
                        yield content;
                        // 每 20 个内容块记录一次
                        if (contentChunkCount % 20 === 0) {
                            console.log(`[DeepSeek Stream] 已 yield ${contentChunkCount} 个内容块`);
                        }
                    }
                } catch (e) {
                    // 忽略解析错误，继续处理下一行
                    if (chunkIndex <= 5) {
                        console.warn('[DeepSeek Stream] 解析 JSON 失败:', e, '数据:', data.substring(0, 100));
                    }
                }
            }
        }

        // 处理剩余的 buffer
        if (buffer.trim() && buffer.startsWith('data: ')) {
            const data = buffer.slice(6);
            if (data !== '[DONE]') {
                try {
                    const json = JSON.parse(data);
                    const content = json.choices?.[0]?.delta?.content || '';
                    if (content) {
                        yield content;
                    }
                } catch (e) {
                    // 忽略解析错误
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
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
    private isProcessing = false;

    async prepare() {
        // 必须登录
        if (!this.user?._id) {
            this.send(JSON.stringify({ type: 'error', message: '请先登录后再使用 AI 辅助功能。' }));
            this.close(4001, 'Unauthorized');
            return;
        }

        // 发送连接成功消息
        this.send(JSON.stringify({
            type: 'ready',
            message: 'WebSocket 连接成功，可以开始 AI 对话',
        }));
    }

    /**
     * 处理客户端发送的消息
     * 使用 message() 方法，payload 已经是解析后的对象
     */
    async message(payload: any) {
        // 防止并发请求
        if (this.isProcessing) {
            this.send(JSON.stringify({
                type: 'error',
                message: '上一个请求正在处理中，请稍候...',
            }));
            return;
        }

        this.isProcessing = true;

        try {
            const {
                problemId,
                code,
                mode = 'hint',
                language,
                prompt,
            } = payload || {};

            if (!problemId) {
                this.send(JSON.stringify({ type: 'error', message: '缺少必要参数：problemId。' }));
                this.isProcessing = false;
                return;
            }

            if ((mode === 'debug' || mode === 'optimize') && !code) {
                this.send(JSON.stringify({ type: 'error', message: '调试或优化模式需要提供代码。' }));
                this.isProcessing = false;
                return;
            }

            // 发送开始处理信号
            this.send(JSON.stringify({
                type: 'start',
                message: 'AI 正在思考中...',
            }));

            // 构造 prompt（包含题面/样例/代码等）
            const promptText = await buildPromptText(this.domain._id as string, {
                problemId,
                code,
                mode,
                language,
                prompt,
            });

            // 调用 DeepSeek 流式 API，实时转发给前端
            let fullContent = '';
            let jsonBuffer = '';
            let inJsonBlock = false;
            let chunkCount = 0;

            console.log('[AI Helper Stream] 开始流式传输...');
            const startTime = Date.now();

            // 使用 for await 循环，但确保每次 yield 后立即发送
            for await (const chunk of callDeepSeekStream(promptText)) {
                chunkCount++;
                fullContent += chunk;
                jsonBuffer += chunk;

                // 立即发送每个数据块，使用同步方式确保不阻塞
                try {
                    const deltaMessage = JSON.stringify({
                        type: 'delta',
                        content: chunk,
                        accumulated: fullContent,
                    });

                    // 直接调用 send，这是同步的
                    this.send(deltaMessage);

                    // 每 10 个 chunk 记录一次日志，避免日志过多
                    if (chunkCount % 10 === 0 || chunk.length > 50) {
                        console.log(`[AI Helper Stream] 已发送 ${chunkCount} 个数据块，当前块长度: ${chunk.length}, 累计: ${fullContent.length}`);
                    }
                } catch (sendErr) {
                    console.error('[AI Helper Stream] 发送数据块失败:', sendErr);
                }

                // 尝试检测 JSON 结构（但不阻塞流式传输）
                if (!inJsonBlock && jsonBuffer.includes('{')) {
                    inJsonBlock = true;
                }

                // 如果检测到可能的 JSON 结束，尝试解析
                if (inJsonBlock && jsonBuffer.includes('}')) {
                    try {
                        const jsonMatch = jsonBuffer.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            // 如果解析成功，发送结构化数据
                            this.send(JSON.stringify({
                                type: 'structured',
                                data: {
                                    analysis: parsed.analysis || '',
                                    suggestions: parsed.suggestions || [],
                                    steps: parsed.steps || [],
                                },
                            }));
                            inJsonBlock = false;
                            jsonBuffer = '';
                        }
                    } catch {
                        // 继续等待更多内容
                    }
                }
            }

            const elapsed = Date.now() - startTime;
            console.log(`[AI Helper Stream] 流式传输完成，共 ${chunkCount} 个数据块，总长度: ${fullContent.length}，耗时: ${elapsed}ms`);

            // 发送完成信号
            this.send(JSON.stringify({
                type: 'done',
                message: 'AI 回答完成',
                fullContent,
            }));

            // 尝试最终解析 JSON（如果之前没有成功）
            try {
                const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    this.send(JSON.stringify({
                        type: 'final',
                        data: {
                            analysis: parsed.analysis || fullContent,
                            suggestions: parsed.suggestions || [],
                            steps: parsed.steps || [],
                        },
                    }));
                } else {
                    // 如果没有 JSON，将整个内容作为 analysis
                    this.send(JSON.stringify({
                        type: 'final',
                        data: {
                            analysis: fullContent,
                            suggestions: [],
                            steps: [],
                        },
                    }));
                }
            } catch {
                // 解析失败，使用原始内容
                this.send(JSON.stringify({
                    type: 'final',
                    data: {
                        analysis: fullContent,
                        suggestions: [],
                        steps: [],
                    },
                }));
            }

            // 扣除积分
            try {
                const uid = Number(this.user._id);
                const domainId = this.domain._id as string;
                (this.ctx as any).emit('ai/helper-used', {
                    uid,
                    domainId,
                    cost: 100,
                    reason: '使用 AI 辅助解题（流式）',
                });
            } catch (scoreErr) {
                console.error('[Confetti AI Helper Stream] 扣除积分失败:', scoreErr);
            }
        } catch (e: any) {
            console.error('[Confetti AI Helper Stream] 错误:', e);
            this.send(JSON.stringify({
                type: 'error',
                message: `AI 流式服务调用失败: ${e.message || e.toString()}`,
            }));
        } finally {
            this.isProcessing = false;
        }
    }

    async cleanup() {
        this.isProcessing = false;
        console.log('[Confetti AI Helper Stream] WebSocket 连接已关闭');
    }
}
