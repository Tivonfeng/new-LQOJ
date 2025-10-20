import { Context, PRIV, Schema } from 'hydrooj';
import {
    TypingAdminHandler,
    TypingHallHandler,
    TypingProfileHandler,
    TypingRankingHandler,
} from './src/handlers';
import type {
    TypingRecord,
    TypingUserStats,
    WeeklySnapshot,
} from './src/services';

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

    // 修复旧索引
    try {
        const statsCollection = ctx.db.collection('typing.stats' as any);
        const existingIndexes = await statsCollection.listIndexes().toArray();

        // 检查是否存在错误的 uid_1 索引
        const badIndex = existingIndexes.find((idx) => idx.name === 'uid_1' && idx.unique === true);
        if (badIndex) {
            console.log('[Typing Speed System] 🔧 Dropping old incorrect index: uid_1');
            await statsCollection.dropIndex('uid_1');
            console.log('[Typing Speed System] ✅ Old index dropped successfully');
        }
    } catch (error) {
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

        // 为统计创建索引 (uid + domainId 组合唯一)
        await ctx.db.ensureIndexes(
            ctx.db.collection('typing.stats' as any),
            { key: { uid: 1, domainId: 1 }, name: 'uid_domainId', unique: true },
            { key: { domainId: 1, maxWpm: -1 }, name: 'domainId_maxWpm' },
            { key: { domainId: 1, avgWpm: -1 }, name: 'domainId_avgWpm' },
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

    // 注册路由
    ctx.Route('typing_hall', '/typing/hall', TypingHallHandler);
    ctx.Route('typing_profile', '/typing/me', TypingProfileHandler);
    ctx.Route('typing_ranking', '/typing/ranking', TypingRankingHandler);
    ctx.Route('typing_admin', '/typing/admin', TypingAdminHandler);

    // 注入导航栏
    ctx.injectUI('Nav', 'typing_hall', {
        prefix: 'typing',
        before: 'score', // 插入到积分系统前面
    }, PRIV.PRIV_USER_PROFILE);

    console.log('[Typing Speed System] ✅ Plugin loaded successfully!');
}

// 导出配置Schema
export { Config };
