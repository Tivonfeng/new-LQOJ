import { Context, PRIV, Schema, STATUS } from 'hydrooj';
import {
    StudentAnalyticsAdminHandler,
    StudentAnalyticsHandler,
} from './src/handlers';
import {
    type StudentAnalyticsRecord,
    StudentAnalyticsService,
    type StudentAnalyticsStats,
} from './src/services';

// 学生数据分析系统配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用学生数据分析系统'),
    autoCollect: Schema.boolean().default(true).description('是否自动收集提交记录'),
});

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        'student.analytics.records': StudentAnalyticsRecord;
        'student.analytics.stats': StudentAnalyticsStats;
    }
}

// 插件主函数
export default async function apply(ctx: Context, config: any = {}) {
    const defaultConfig = {
        enabled: true,
        autoCollect: true,
    };

    const finalConfig = { ...defaultConfig, ...config };

    if (!finalConfig.enabled) {
        console.log('[Student Analytics] Plugin is disabled in config');
        return;
    }

    console.log('[Student Analytics] Plugin loading...');

    const analyticsService = new StudentAnalyticsService(ctx);

    // 创建索引（全域统计，按 uid 索引）
    try {
        // 为记录创建索引
        await ctx.db.ensureIndexes(
            ctx.db.collection('student.analytics.records' as any),
            { key: { uid: 1, createdAt: -1 }, name: 'uid_createdAt' },
            { key: { createdAt: -1 }, name: 'createdAt' },
            { key: { uid: 1, eventType: 1 }, name: 'uid_eventType' },
        );

        // 为统计创建索引（全域统计，uid 唯一）
        await ctx.db.ensureIndexes(
            ctx.db.collection('student.analytics.stats' as any),
            { key: { uid: 1 }, name: 'uid', unique: true },
        );

        console.log('[Student Analytics] ✅ Indexes created successfully (global mode)');
    } catch (error) {
        console.error('[Student Analytics] ❌ Error creating indexes:', error.message);
    }

    // 监听提交记录事件，自动收集数据
    if (finalConfig.autoCollect) {
        ctx.on('record/judge', async (rdoc, updated, pdoc) => {
            try {
                if (!updated || !rdoc || !pdoc) return;

                // 记录提交事件
                await analyticsService.addAnalyticsRecord({
                    uid: rdoc.uid,
                    domainId: rdoc.domainId,
                    eventType: 'submission',
                    eventData: {
                        recordId: rdoc._id.toString(),
                        problemId: rdoc.pid,
                        problemTitle: pdoc.title,
                        status: rdoc.status,
                        score: rdoc.score,
                        lang: rdoc.lang,
                        time: rdoc.time,
                        memory: rdoc.memory,
                    },
                });

                // 如果是 AC，记录 AC 事件
                if (rdoc.status === STATUS.STATUS_ACCEPTED) {
                    await analyticsService.addAnalyticsRecord({
                        uid: rdoc.uid,
                        domainId: rdoc.domainId,
                        eventType: 'accepted',
                        eventData: {
                            recordId: rdoc._id.toString(),
                            problemId: rdoc.pid,
                            problemTitle: pdoc.title,
                            score: rdoc.score,
                            time: rdoc.time,
                            memory: rdoc.memory,
                        },
                    });
                }
            } catch (error) {
                console.error('[Student Analytics] ❌ Error collecting record data:', error);
            }
        });

        console.log('[Student Analytics] ✅ Event listeners registered');
    }

    // 注册路由
    ctx.Route('student_analytics', '/analytics/student', StudentAnalyticsHandler);
    ctx.Route('student_analytics_admin', '/analytics/student/admin', StudentAnalyticsAdminHandler);

    // 注入导航栏
    ctx.injectUI('Nav', 'student_analytics', {
        prefix: 'analytics',
        before: 'typing', // 插入到打字系统前面
    }, PRIV.PRIV_USER_PROFILE);

    console.log('[Student Analytics] ✅ Plugin loaded successfully!');
}

// 导出配置Schema
export { Config };
