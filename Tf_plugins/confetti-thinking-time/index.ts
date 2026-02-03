import {
    Context,
} from 'hydrooj';
import { ClassroomToolsHandler } from './src/handlers';
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
    // AI 辅助 WebSocket 流式接口
    ctx.Connection(
        'confetti_ai_helper_stream',
        '/ws/ai-helper/stream',
        AiHelperStreamHandler,
    );

    // 课堂工具接口路由
    ctx.Route('confetti_classroom_tools', '/confetti-thinking-time/classroom-tools', ClassroomToolsHandler);

    // thinkingTime projection and indexes are handled by `score-system` plugin

    console.log('Confetti thinking time plugin loaded successfully!');
}
