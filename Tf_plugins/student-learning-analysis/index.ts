import {
    Context,
    ProblemDoc,
    RecordDoc,
    Schema,
} from 'hydrooj';
import {
    LearningAnalysisHallHandler,
    LearningProgressHandler,
    KnowledgePointsHandler,
    RecommendationsHandler,
    LearningAnalysisAdminHandler,
} from './src/handlers';
import {
    LearningAnalysisService,
} from './src/services';
import {
    LearningRecord,
    KnowledgePoint,
    AnalysisCache,
    RecommendationRecord,
    LearningAnalysisConfig,
} from './src/types';

// 默认配置
const defaultConfig: LearningAnalysisConfig = {
    enabled: true,
    dataRetention: 365,
    cacheExpiration: 60,
    analysisDepth: 'comprehensive',
    updateFrequency: 'realtime',
    recommendation: {
        enabled: true,
        maxRecommendations: 10,
        refreshInterval: 24,
        algorithms: {
            knowledgeBased: true,
            difficultyBased: true,
            peerBased: true,
            sequenceBased: false,
        },
        weights: {
            masteryLevel: 0.3,
            recentPerformance: 0.25,
            errorPattern: 0.25,
            timeSpent: 0.2,
        },
    },
};

// 学情分析系统配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用学情分析系统'),
    dataRetention: Schema.number().default(365).description('数据保留天数'),
    cacheExpiration: Schema.number().default(60).description('缓存过期时间（分钟）'),
    analysisDepth: Schema.union([
        Schema.const('basic').description('基础分析'),
        Schema.const('advanced').description('高级分析'),
        Schema.const('comprehensive').description('全面分析'),
    ]).default('comprehensive').description('分析深度'),
    updateFrequency: Schema.union([
        Schema.const('realtime').description('实时更新'),
        Schema.const('hourly').description('每小时更新'),
        Schema.const('daily').description('每日更新'),
    ]).default('realtime').description('更新频率'),
    recommendation: Schema.object({
        enabled: Schema.boolean().default(true).description('是否启用智能推荐'),
        maxRecommendations: Schema.number().default(10).description('最大推荐数量'),
        refreshInterval: Schema.number().default(24).description('刷新间隔（小时）'),
        algorithms: Schema.object({
            knowledgeBased: Schema.boolean().default(true).description('基于知识点推荐'),
            difficultyBased: Schema.boolean().default(true).description('基于难度推荐'),
            peerBased: Schema.boolean().default(true).description('基于同伴推荐'),
            sequenceBased: Schema.boolean().default(false).description('基于学习序列推荐'),
        }).description('推荐算法配置'),
        weights: Schema.object({
            masteryLevel: Schema.number().default(0.3).description('掌握程度权重'),
            recentPerformance: Schema.number().default(0.25).description('最近表现权重'),
            errorPattern: Schema.number().default(0.25).description('错误模式权重'),
            timeSpent: Schema.number().default(0.2).description('时间投入权重'),
        }).description('推荐权重配置'),
    }).description('推荐系统配置'),
});

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        'learning.records': LearningRecord;
        'learning.knowledge_points': KnowledgePoint;
        'learning.analysis_cache': AnalysisCache;
        'learning.recommendations': RecommendationRecord;
    }
}

// 插件主函数
export default function apply(ctx: Context, config: any = {}) {
    // 合并配置
    const finalConfig: LearningAnalysisConfig = { ...defaultConfig, ...config };

    console.log('Student Learning Analysis plugin loading...');
    console.log('Configuration:', JSON.stringify(finalConfig, null, 2));

    // 初始化服务
    const analysisService = new LearningAnalysisService(finalConfig, ctx);
    // const statisticsService = new LearningStatisticsService(ctx, finalConfig);

    // 监听判题完成事件
    console.log('Setting up event listeners...');

    // 主要事件监听 - 处理判题结果
    ctx.on('record/judge', async (rdoc: RecordDoc, updated: boolean, pdoc?: ProblemDoc) => {
        try {
            if (!finalConfig.enabled || !updated || !pdoc) return;

            console.log(`[LearningAnalysis] 📝 Processing submission ${rdoc._id} for user ${rdoc.uid}, status: ${rdoc.status}`);

            // 处理提交记录（无论AC与否都记录，用于学习分析）
            await analysisService.processSubmissionRecord(rdoc, pdoc);

            // 记录处理成功
            console.log(`[LearningAnalysis] ✅ Successfully processed submission ${rdoc._id} for user ${rdoc.uid}`);
        } catch (error) {
            console.error('[LearningAnalysis] ❌ Error processing submission:', error);
        }
    });

    // 定期清理过期数据
    if (finalConfig.dataRetention > 0) {
        const cleanupInterval = setInterval(async () => {
            try {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - finalConfig.dataRetention);

                // 清理过期的学习记录
                const deletedRecords = await ctx.db.collection('learning.records' as any)
                    .deleteMany({ createdAt: { $lt: cutoffDate } });

                // 清理过期的分析缓存
                const deletedCache = await ctx.db.collection('learning.analysis_cache' as any)
                    .deleteMany({ expiresAt: { $lt: new Date() } });

                if (deletedRecords.deletedCount > 0 || deletedCache.deletedCount > 0) {
                    console.log(`[LearningAnalysis] 🧹 Cleanup: deleted ${deletedRecords.deletedCount} records, ` +
                        `${deletedCache.deletedCount} cache entries`);
                }
            } catch (error) {
                console.error('[LearningAnalysis] ❌ Error during cleanup:', error);
            }
        }, 24 * 60 * 60 * 1000); // 每24小时清理一次

        // 确保在插件卸载时清理定时器（注意：dispose可能需要根据实际Hydro版本调整）
        process.on('SIGTERM', () => {
            clearInterval(cleanupInterval);
        });
    }

    // 定期生成推荐
    if (finalConfig.recommendation.enabled && finalConfig.recommendation.refreshInterval > 0) {
        const recommendationInterval = setInterval(async () => {
            try {
                console.log('[LearningAnalysis] 🎯 Generating periodic recommendations...');

                // 获取活跃用户列表（最近7天有活动的用户）
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const activeUsers = await ctx.db.collection('learning.records' as any)
                    .distinct('uid', { submissionTime: { $gte: sevenDaysAgo } });

                let generatedCount = 0;
                for (const uid of activeUsers) {
                    try {
                        // 检查是否已有近期推荐
                        const recentRecommendation = await ctx.db.collection('learning.recommendations' as any)
                            .findOne({
                                uid,
                                status: 'pending',
                                generatedAt: { $gte: sevenDaysAgo },
                            });

                        if (!recentRecommendation) {
                            // 为用户生成推荐（使用第一个域，实际应用中可能需要遍历所有域）
                            const domains = await ctx.db.collection('domain').find({}).limit(1).toArray();
                            if (domains.length > 0) {
                                await analysisService.generateRecommendations(uid, domains[0]._id);
                                generatedCount++;
                            }
                        }
                    } catch (userError) {
                        console.error(`[LearningAnalysis] ❌ Error generating recommendations for user ${uid}:`, userError);
                    }
                }

                console.log(`[LearningAnalysis] 🎯 Generated recommendations for ${generatedCount} users`);
            } catch (error) {
                console.error('[LearningAnalysis] ❌ Error during periodic recommendation generation:', error);
            }
        }, finalConfig.recommendation.refreshInterval * 60 * 60 * 1000);

        process.on('SIGTERM', () => {
            clearInterval(recommendationInterval);
        });
    }

    console.log('[LearningAnalysis] Event listeners registered successfully!');

    // 注册路由
    ctx.Route('learning_analysis', '/learning/analysis', LearningAnalysisHallHandler);
    ctx.Route('learning_progress', '/learning/progress', LearningProgressHandler);
    ctx.Route('knowledge_points', '/learning/knowledge', KnowledgePointsHandler);
    ctx.Route('recommendations', '/learning/recommendations', RecommendationsHandler);
    ctx.Route('learning_admin', '/learning/admin', LearningAnalysisAdminHandler);

    // 注入导航栏
    ctx.injectUI('Nav', 'learning_analysis', {
        prefix: 'learning',
        before: 'ranking', // 插入到排行榜前面
    });

    console.log('学情分析大厅路由已注册，可通过 /learning/analysis 访问');
    console.log('学习进度页面路由已注册，可通过 /learning/progress 访问');
    console.log('知识点掌握页面路由已注册，可通过 /learning/knowledge 访问');
    console.log('智能推荐页面路由已注册，可通过 /learning/recommendations 访问');
    console.log('管理员页面路由已注册，可通过 /learning/admin 访问');

    console.log('Student Learning Analysis plugin loaded successfully! 🎓📊');
}

// 导出配置Schema
export { Config };
