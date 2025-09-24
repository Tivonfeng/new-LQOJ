/* eslint-disable no-await-in-loop */
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

    // 🔒 先删除旧的唯一索引（如果存在）
    try {
        await ctx.db.collection('score.records' as any).dropIndex('uid_1_pid_1_domainId_1');
        console.log('[Score Core] 🗑️ 删除旧的唯一索引');
    } catch (error) {
        // 索引不存在时会报错，这是正常的
        console.log('[Score Core] ℹ️ 旧索引不存在或已删除');
    }

    // 🔒 为题目相关记录创建部分唯一索引，防止重复AC奖励
    try {
        await ctx.db.collection('score.records' as any).createIndex(
            { uid: 1, pid: 1, domainId: 1 },
            { 
                unique: true, 
                partialFilterExpression: { pid: { $gt: 0 } }, // 只对题目记录生效
                background: false,
            },
        );
        console.log('[Score Core] ✅ 题目记录唯一索引创建成功');
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('[Score Core] ✅ 唯一索引已存在');
        } else if (error.message.includes('E11000') || error.message.includes('duplicate key')) {
            console.error('[Score Core] ❌ 数据库中存在重复记录，无法创建唯一索引');
            console.log('[Score Core] 🧹 正在清理重复记录...');

            // 清理重复记录，保留最早的那条
            const pipeline = [
                {
                    $group: {
                        _id: { uid: '$uid', pid: '$pid', domainId: '$domainId' },
                        docs: { $push: '$$ROOT' },
                        count: { $sum: 1 },
                    },
                },
                {
                    $match: { count: { $gt: 1 } },
                },
            ];

            const duplicates = await ctx.db.collection('score.records' as any).aggregate(pipeline).toArray();
            console.log(`[Score Core] 📊 发现 ${duplicates.length} 组重复记录`);

            for (const dup of duplicates) {
                // 保留最早的记录（createdAt最小的），删除其他的
                const docsToDelete = dup.docs.slice(1); // 除了第一个，其他都删除
                const deletePromises = docsToDelete.map((doc: any) =>
                    ctx.db.collection('score.records' as any).deleteOne({ _id: doc._id }),
                );
                await Promise.all(deletePromises);
                console.log(`[Score Core] 🗑️ 清理了 ${docsToDelete.length} 条重复记录 (uid: ${dup._id.uid}, pid: ${dup._id.pid})`);
            }

            // 重新尝试创建索引
            try {
                await ctx.db.collection('score.records' as any).createIndex(
                    { uid: 1, pid: 1, domainId: 1 },
                    { unique: true, background: false },
                );
                console.log('[Score Core] ✅ 重复记录清理完成，唯一索引创建成功');
            } catch (retryError) {
                console.error('[Score Core] ❌ 清理后仍无法创建索引:', retryError.message);
            }
        } else {
            console.error('[Score Core] ❌ 索引创建失败:', error.message);
        }
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
