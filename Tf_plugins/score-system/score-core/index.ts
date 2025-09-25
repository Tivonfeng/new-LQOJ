import {
    Context,
    PRIV,
    ProblemDoc,
    RecordDoc,
    Schema,
    STATUS,
} from 'hydrooj';
import { SCORE_EVENTS } from './src/events/ScoreEvents';
import {
    ScoreHallHandler,
    ScoreManageHandler,
    ScoreRankingHandler,
    ScoreRecordsHandler,
    UserScoreHandler,
} from './src/handlers/ScoreHandlers';
import { ServiceRegistry } from './src/registry/ServiceRegistry';
import { ScoreService } from './src/services/ScoreService';
import type { ScoreConfig, ScoreEventData } from './src/types';

// 积分系统配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用积分系统'),
});

// 声明数据库集合类型和事件类型
declare module 'hydrooj' {
    interface Collections {
        'score.records': import('./src/types').ScoreRecord;
        'score.users': import('./src/types').UserScore;
    }
}

// 插件主函数
export default async function apply(ctx: Context, config: any = {}) {
    // 设置默认配置
    const defaultConfig: ScoreConfig = {
        enabled: true,
    };

    const finalConfig = { ...defaultConfig, ...config };

    console.log('Score Core plugin loading...');
    const scoreService = new ScoreService(finalConfig, ctx);

    // 注册积分服务到服务注册器
    const serviceRegistry = ServiceRegistry.getInstance(ctx);
    serviceRegistry.registerScoreService(scoreService);

    // 使用 service 方法初始化数据库索引
    try {
        await scoreService.initializeIndexes();
        console.log('[Score Core] 🎯 数据库索引初始化完成');
    } catch (error: any) {
        console.error('[Score Core] ❌ 数据库索引初始化失败:', error.message);
        // 不抛出错误，让插件继续加载，但记录错误
    }

    // ⭐ 基于积分记录的准确首次AC检测
    ctx.on('record/judge', async (rdoc: RecordDoc, _updated: boolean, pdoc?: ProblemDoc) => {
        try {
            // 只处理启用状态且有题目信息的记录
            if (!finalConfig.enabled || !pdoc) return;
            if (rdoc.status !== STATUS.STATUS_ACCEPTED) return;

            // 🔒 使用原子操作避免并发竞态条件
            // 尝试插入记录，如果已存在则会失败（利用唯一索引）
            let isFirstAC = false;
            let score = 0;

            try {
                // 先尝试插入积分记录，如果成功说明是首次AC
                await scoreService.addScoreRecord({
                    uid: rdoc.uid,
                    domainId: rdoc.domainId,
                    pid: rdoc.pid,
                    recordId: rdoc._id,
                    score: 10,
                    reason: `AC题目 ${pdoc.title || rdoc.pid} 获得积分`,
                    problemTitle: pdoc.title,
                });

                // 插入成功，说明是首次AC
                isFirstAC = true;
                score = 10;

                await scoreService.updateUserScore(rdoc.domainId, rdoc.uid, score);
                console.log(`[Score Core] ✅ User ${rdoc.uid} first AC problem ${rdoc.pid} (${pdoc.title}), awarded ${score} points`);
            } catch (error) {
                // 插入失败（重复键错误），说明已经存在记录，是重复AC
                if (error.code === 11000 || error.message.includes('E11000')) {
                    isFirstAC = false;
                    score = 0;
                    console.log(`[Score Core] 🔄 User ${rdoc.uid} repeated AC problem ${rdoc.pid}, no points awarded`);
                } else {
                    console.error('[Score Core] ❌ Unexpected error:', error);
                    throw error;
                }
            }

            // 统一发布事件（无论首次还是重复）
            ctx.emit(isFirstAC ? SCORE_EVENTS.AC_REWARDED : SCORE_EVENTS.AC_REPEATED, {
                uid: rdoc.uid,
                pid: rdoc.pid,
                domainId: rdoc.domainId,
                score,
                isFirstAC,
                problemTitle: pdoc.title,
                recordId: rdoc._id,
            } as ScoreEventData);
        } catch (error) {
            console.error('[Score Core] ❌ Error:', error);
        }
    });

    // 注册路由
    ctx.Route('score_manage', '/score/manage', ScoreManageHandler);
    ctx.Route('score_ranking', '/score/ranking', ScoreRankingHandler);
    ctx.Route('score_records', '/score/records', ScoreRecordsHandler);
    ctx.Route('user_score', '/score/me', UserScoreHandler);
    ctx.Route('score_hall', '/score/hall', ScoreHallHandler);

    // 注入导航栏 - 添加权限检查，只有内部用户可见
    ctx.injectUI('Nav', 'score_hall', {
        prefix: 'score',
        before: 'ranking', // 插入到排行榜前面
    }, PRIV.PRIV_USER_PROFILE);

    console.log('Score Core plugin loaded successfully!');
}

// 导出配置Schema
export { Config };

// 导出核心类型和服务，供其他插件使用
export { getScoreService, ServiceRegistry } from './src/registry/ServiceRegistry';
export { ScoreService } from './src/services/ScoreService';
export * from './src/types';
