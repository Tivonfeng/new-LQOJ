import { Context, PRIV, Schema } from 'hydrooj';
import {
    TypingAdminHandler,
    TypingHallHandler,
    TypingProfileHandler,
} from './src/handlers';
import type {
    TypingRecord,
    TypingUserStats,
    WeeklySnapshot,
} from './src/services';
import { TypingRecordService, TypingStatsService, TypingAnalyticsService, TypingBonusService } from './src/services';

// 打字速度系统配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用打字速度统计系统'),
});

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        'typing.records': TypingRecord;
        'typing.stats': TypingUserStats;
        'typing.weekly_snapshots': WeeklySnapshot;
    }

    interface Context {
        scoreCore?: any;
        typingRecordService?: import('./src/services/TypingRecordService').TypingRecordService;
        typingStatsService?: import('./src/services/TypingStatsService').TypingStatsService;
        typingAnalyticsService?: import('./src/services/TypingAnalyticsService').TypingAnalyticsService;
        typingBonusService?: import('./src/services/TypingBonusService').TypingBonusService;
    }
}

// 插件主函数
export default async function apply(ctx: Context, config: any = {}) {
    const defaultConfig = {
        enabled: true,
    };

    const finalConfig = { ...defaultConfig, ...config };

    if (!finalConfig.enabled) {
        console.log('[Typing Speed System] Plugin is disabled in config');
        return;
    }

    console.log('[Typing Speed System] Plugin loading...');

    // 📦 注册服务单例 - Register service singletons
    const typingRecordService = new TypingRecordService(ctx);
    const typingStatsService = new TypingStatsService(ctx, typingRecordService);
    const typingAnalyticsService = new TypingAnalyticsService(ctx, typingRecordService, typingStatsService);
    const typingBonusService = new TypingBonusService(ctx);

    ctx.provide('typingRecordService', typingRecordService);
    ctx.provide('typingStatsService', typingStatsService);
    ctx.provide('typingAnalyticsService', typingAnalyticsService);
    ctx.provide('typingBonusService', typingBonusService);

    // 修复旧索引和数据（删除可能存在的 uid_domainId 复合索引，因为数据是全域统一的）
    try {
        const statsCollection = ctx.db.collection('typing.stats' as any);
        const existingIndexes = await statsCollection.listIndexes().toArray();

        // 检查是否存在 uid_domainId 复合索引
        const hasUidDomainIdIndex = existingIndexes.some(
            (idx) => idx.name === 'uid_domainId'
                || (idx.key && idx.key.uid && idx.key.domainId && idx.unique),
        );

        // 如果存在 uid_domainId 索引，需要先清理重复数据
        if (hasUidDomainIdIndex) {
            console.log('[Typing Speed System] 🔧 Found uid_domainId index, cleaning duplicate data...');

            // 查找所有有重复 uid 的记录（由于旧索引，可能同一用户在不同域有多条记录）
            const allStats = await statsCollection.find({}).toArray();
            const uidMap = new Map<number, any[]>();

            for (const stat of allStats) {
                if (!uidMap.has(stat.uid)) {
                    uidMap.set(stat.uid, []);
                }
                uidMap.get(stat.uid)!.push(stat);
            }

            // 对于每个有重复的用户，保留一条记录（选择最新的或记录最多的）
            const deletePromises: Promise<any>[] = [];
            for (const [uid, stats] of uidMap.entries()) {
                if (stats.length > 1) {
                    // 选择记录数最多或最新的
                    const bestStat = stats.reduce((best, current) => {
                        if (current.totalRecords > best.totalRecords) return current;
                        if (current.totalRecords === best.totalRecords
                            && new Date(current.lastUpdated) > new Date(best.lastUpdated)) {
                            return current;
                        }
                        return best;
                    });

                    // 删除其他重复记录
                    const idsToDelete = stats.filter((s) => s._id.toString() !== bestStat._id.toString())
                        .map((s) => s._id);
                    if (idsToDelete.length > 0) {
                        deletePromises.push(
                            statsCollection.deleteMany({ _id: { $in: idsToDelete } })
                                .then(() => {
                                    console.log(`[Typing Speed System] 🗑️  Removed ${idsToDelete.length} duplicate stats for uid ${uid}`);
                                }),
                        );
                    }
                }
            }
            if (deletePromises.length > 0) {
                await Promise.all(deletePromises);
            }

            console.log('[Typing Speed System] ✅ Duplicate data cleaned');
        }

        // 检查并删除所有可能冲突的旧索引
        const indexesToDrop: string[] = [];
        for (const idx of existingIndexes) {
            // 收集需要删除的索引名称
            if (idx.name === 'uid_domainId'
                || (idx.key && idx.key.uid && idx.key.domainId && idx.unique)) {
                indexesToDrop.push(idx.name);
            } else if (idx.name === 'uid_1' && idx.unique === true) {
                indexesToDrop.push(idx.name);
            }
        }

        // 并行删除所有旧索引
        if (indexesToDrop.length > 0) {
            const dropPromises = indexesToDrop.map(async (indexName) => {
                console.log(`[Typing Speed System] 🔧 Dropping old incorrect index: ${indexName}`);
                try {
                    await statsCollection.dropIndex(indexName);
                    console.log(`[Typing Speed System] ✅ Old index ${indexName} dropped successfully`);
                } catch (err: any) {
                    console.log(`[Typing Speed System] ⚠️  Failed to drop index ${indexName}: ${err.message}`);
                }
            });
            await Promise.all(dropPromises);
        }
    } catch (error: any) {
        console.log('[Typing Speed System] ℹ️  No old indexes to fix:', error.message);
    }

    // 创建索引 (使用 Hydro 推荐的 ensureIndexes 方法)
    try {
        // 为记录创建索引
        await ctx.db.ensureIndexes(
            ctx.db.collection('typing.records' as any),
            { key: { domainId: 1, uid: 1, createdAt: -1 }, name: 'domainId_uid_createdAt' },
            { key: { domainId: 1, createdAt: -1 }, name: 'domainId_createdAt' },
        );

        // 为统计创建索引 (uid 唯一，全域统一数据)
        await ctx.db.ensureIndexes(
            ctx.db.collection('typing.stats' as any),
            { key: { uid: 1 }, name: 'uid', unique: true },
            { key: { maxWpm: -1 }, name: 'maxWpm' },
            { key: { avgWpm: -1 }, name: 'avgWpm' },
        );

        // 为周快照创建索引
        await ctx.db.ensureIndexes(
            ctx.db.collection('typing.weekly_snapshots' as any),
            { key: { uid: 1, week: 1 }, name: 'uid_week', unique: true },
        );

        console.log('[Typing Speed System] ✅ Indexes created successfully');
    } catch (error) {
        console.error('[Typing Speed System] ❌ Error creating indexes:', error.message);
    }

    // 通过 ctx.inject 声明对 scoreCore 的依赖
    // Cordis 的 ctx.inject 会创建子 fiber，子 fiber 的 ctx 能访问被注入的服务
    // 因此将路由注册都放在 inject 回调内，确保 Handler 中 this.ctx.scoreCore 可用
    ctx.inject(['scoreCore'], (ctx2: Context) => {
        console.log('[Typing Speed System] ✅ scoreCore injected, registering routes');

        // 注册路由（使用注入了 scoreCore 的 ctx2）
        ctx2.Route('typing_hall', '/typing/hall', TypingHallHandler);
        ctx2.Route('typing_profile', '/typing/me', TypingProfileHandler);
        ctx2.Route('typing_admin', '/typing/admin', TypingAdminHandler);

        // 注入导航栏
        ctx2.injectUI('Nav', 'typing_hall', {
            prefix: 'typing',
            before: 'score', // 插入到积分系统前面
        }, PRIV.PRIV_USER_PROFILE);

        console.log('[Typing Speed System] ✅ Plugin loaded successfully!');
    });
}

// 导出配置Schema
export { Config };
