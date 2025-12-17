import { Context, PRIV, Schema } from 'hydrooj';
import {
    StudentAnalyticsAdminHandler,
    StudentAnalyticsApiHandler,
    StudentAnalyticsHandler,
} from './src/handlers';
import type { StudentAnalyticsStats } from './src/services';
import { StudentAnalyticsService } from './src/services';
import type { CachedStats } from './src/services/StatsCacheService';

// 学生数据分析系统配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用学生数据分析系统'),
    // 缓存配置
    cacheTTL: Schema.number().default(10 * 60 * 1000).description('缓存过期时间（毫秒），默认10分钟'),
    cacheEnabled: Schema.boolean().default(true).description('是否启用统计缓存'),
});

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        // 统计缓存表（替代原来的 records 表）
        'student.analytics.stats': CachedStats;
    }
}

// 插件主函数
export default async function apply(ctx: Context, config: any = {}) {
    const defaultConfig = {
        enabled: true,
        cacheTTL: 10 * 60 * 1000, // 10 分钟
        cacheEnabled: true,
    };

    const finalConfig = { ...defaultConfig, ...config };

    if (!finalConfig.enabled) {
        console.log('[Student Analytics] Plugin is disabled in config');
        return;
    }

    console.log('[Student Analytics] Plugin loading...');

    // 创建带缓存配置的服务实例
    const analyticsService = new StudentAnalyticsService(ctx, {
        ttl: finalConfig.cacheTTL,
        enabled: finalConfig.cacheEnabled,
    });

    // 创建索引
    try {
        // 为统计缓存表创建索引
        await ctx.db.ensureIndexes(
            ctx.db.collection('student.analytics.stats' as any),
            { key: { uid: 1 }, name: 'uid', unique: true },
            { key: { dirty: 1, lastUpdated: 1 }, name: 'dirty_lastUpdated' },
        );

        console.log('[Student Analytics] ✅ Indexes created successfully');
    } catch (error) {
        console.error('[Student Analytics] ❌ Error creating indexes:', error.message);
    }

    // 监听提交记录事件，标记缓存为脏
    // 这样用户下次访问统计页面时会重新计算
    ctx.on('record/judge', async (rdoc, updated) => {
        try {
            if (!updated || !rdoc) return;

            // 标记用户缓存为脏（轻量级操作，只更新一个字段）
            await analyticsService.invalidateUserCache(rdoc.uid);
        } catch (error) {
            console.error('[Student Analytics] ❌ Error invalidating cache:', error);
        }
    });

    console.log('[Student Analytics] ✅ Cache invalidation listener registered');

    // 注册路由
    ctx.Route('student_analytics', '/analytics/student', StudentAnalyticsHandler);
    ctx.Route('student_analytics_api', '/analytics/student/api/more', StudentAnalyticsApiHandler);
    ctx.Route('student_analytics_admin', '/analytics/student/admin', StudentAnalyticsAdminHandler);

    // 注入导航栏
    ctx.injectUI('Nav', 'student_analytics', {
        prefix: 'analytics',
        before: 'typing',
    }, PRIV.PRIV_USER_PROFILE);

    console.log('[Student Analytics] ✅ Plugin loaded successfully!');
}

// 导出配置Schema和类型
export { Config };
export type { StudentAnalyticsStats };
