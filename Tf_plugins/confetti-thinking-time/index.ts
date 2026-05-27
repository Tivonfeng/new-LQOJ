import {
    Context,
} from 'hydrooj';
import { ClassroomToolsHandler, ScoreInfoHandler } from './src/handlers';
import { AiHelperStreamHandler } from './src/handlers/AiHelperStreamHandler';
import { ClassroomToolsService } from './src/services';

declare module 'hydrooj' {
    interface Context {
        scoreCore?: any;
        classroomToolsService?: import('./src/services/ClassroomToolsService').ClassroomToolsService;
    }
}

export default function apply(ctx: Context) {
    // 📦 注册服务单例 - Register service singletons
    const classroomToolsService = new ClassroomToolsService(ctx);
    ctx.provide('classroomToolsService', classroomToolsService);

    // AI 辅助 WebSocket 流式接口
    ctx.Connection(
        'confetti_ai_helper_stream',
        '/ws/ai-helper/stream',
        AiHelperStreamHandler,
    );

    // 课堂工具接口路由
    ctx.Route('confetti_classroom_tools', '/confetti-thinking-time/classroom-tools', ClassroomToolsHandler);

    // 积分信息查询接口
    ctx.Route('confetti_score_info', '/confetti-thinking-time/score-info', ScoreInfoHandler);

    // thinkingTime projection and indexes are handled by `score-system` plugin

    console.log('Confetti thinking time plugin loaded successfully!');
}
