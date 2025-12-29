import {
    Context,
    db,
    ProblemModel,
    RecordModel,
} from 'hydrooj';
import { ClassroomToolsHandler, ThinkingTimeHandler } from './src/handlers';
import { AiHelperStreamHandler } from './src/handlers/AiHelperStreamHandler';

export default function apply(ctx: Context) {
    // 通过 inject 获取 scoreCore 服务并存储到 global
    try {
        if (typeof ctx.inject === 'function') {
            ctx.inject(['scoreCore'], ({ scoreCore }: any) => {
                (global as any).scoreCoreService = scoreCore;
                if (scoreCore) {
                    console.log('[Confetti Thinking Time] ✅ scoreCore service injected to global');
                } else {
                    console.warn('[Confetti Thinking Time] ⚠️ scoreCore service injected but is null');
                }
            });
        } else if ((ctx as any).scoreCore) {
            (global as any).scoreCoreService = (ctx as any).scoreCore;
            console.log('[Confetti Thinking Time] ✅ scoreCore service available via ctx');
        } else {
            console.warn('[Confetti Thinking Time] ⚠️ ctx.inject not available and ctx.scoreCore not found');
        }
    } catch (e) {
        console.warn('[Confetti Thinking Time] ⚠️ Failed to inject scoreCore:', e);
    }
    ctx.Route('thinking_time', '/thinking-time', ThinkingTimeHandler);

    // AI 辅助 WebSocket 流式接口
    ctx.Connection(
        'confetti_ai_helper_stream',
        '/ws/ai-helper/stream',
        AiHelperStreamHandler,
    );

    // 课堂工具接口路由
    ctx.Route('confetti_classroom_tools', '/confetti-thinking-time/classroom-tools', ClassroomToolsHandler);

    ctx.on('app/started' as any, async () => {
        try {
            if (RecordModel && RecordModel.PROJECTION_LIST) {
                if (!RecordModel.PROJECTION_LIST.includes('thinkingTime' as any)) {
                    RecordModel.PROJECTION_LIST.push('thinkingTime' as any);
                    console.log('✅ 已添加 thinkingTime 到 RecordModel PROJECTION_LIST');
                }
            } else {
                console.warn('⚠️ 无法找到 RecordModel 或 PROJECTION_LIST');
            }

            if (ProblemModel) {
                const projectionLists = ['PROJECTION_LIST', 'PROJECTION_PUBLIC', 'PROJECTION_CONTEST_LIST'];
                for (const listName of projectionLists) {
                    if (ProblemModel[listName] && Array.isArray(ProblemModel[listName])) {
                        if (!ProblemModel[listName].includes('thinkingTimeStats' as any)) {
                            ProblemModel[listName].push('thinkingTimeStats' as any);
                            console.log(`✅ 已添加 thinkingTimeStats 到 ProblemModel.${listName}`);
                        }
                    }
                }
            } else {
                console.warn('⚠️ 无法找到 ProblemModel');
            }

            const recordColl = db.collection('record');

            await recordColl.createIndex(
                { uid: 1, domainId: 1, thinkingTime: 1 },
                {
                    name: 'thinking_time_user_stats',
                    background: true,
                    sparse: true,
                },
            );

            await recordColl.createIndex(
                { pid: 1, domainId: 1, thinkingTime: 1 },
                {
                    name: 'thinking_time_problem_stats',
                    background: true,
                    sparse: true,
                },
            );

            console.log('✅ 思考时间插件索引创建成功');
        } catch (error) {
            console.warn('⚠️ 思考时间插件索引创建失败:', error);
        }
    });

    console.log('Confetti thinking time plugin loaded successfully!');
}
