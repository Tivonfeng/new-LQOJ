import {
    Handler,
    PERM,
    PRIV,
} from 'hydrooj';
import { LearningAnalysisService } from '../services/LearningAnalysisService';
import { LearningStatisticsService } from '../services/LearningStatisticsService';
import { LearningAnalysisConfig } from '../types';

// 默认配置
const DEFAULT_CONFIG: LearningAnalysisConfig = {
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

/**
 * 学情分析大厅处理器
 * 路由: /learning/analysis
 * 功能: 学情分析系统主入口，展示个人学习概览、进度趋势、智能推荐
 */
export class LearningAnalysisHallHandler extends Handler {
    async get() {
        const uid = this.user?._id;
        if (!uid) {
            this.response.template = 'learning_analysis_login.html';
            return;
        }

        const analysisService = new LearningAnalysisService(DEFAULT_CONFIG, this.ctx);
        const statisticsService = new LearningStatisticsService(this.ctx, DEFAULT_CONFIG);

        try {
            // 获取用户学习统计摘要
            const learningStats = await statisticsService.getUserLearningStats(uid, this.domain._id);
            
            // 获取学习进度趋势（最近30天）
            const progressTrend = await statisticsService.getLearningProgressTrend(uid, this.domain._id, 30);
            
            // 获取知识点掌握分布
            const knowledgeDistribution = await statisticsService.getKnowledgePointDistribution(uid, this.domain._id);
            
            // 获取同伴对比分析
            const peerComparison = await statisticsService.getPeerComparison(uid, this.domain._id);
            
            // 获取学习效率趋势
            const efficiencyTrend = await statisticsService.getEfficiencyTrend(uid, this.domain._id, 14);
            
            // 获取活跃度热力图
            const activityHeatmap = await statisticsService.getActivityHeatmap(uid, this.domain._id, 12);
            
            // 获取错误模式分析
            const errorPatterns = await analysisService.analyzeErrorPatterns(uid, this.domain._id, 30);
            
            // 获取学习效率分析
            const efficiencyAnalysis = await analysisService.analyzeEfficiency(uid, this.domain._id);
            
            // 获取智能推荐
            const recommendations = await this.ctx.db.collection('learning.recommendations' as any)
                .find({ uid, domainId: this.domain._id, status: 'pending' })
                .sort({ priority: -1, generatedAt: -1 })
                .limit(5)
                .toArray();

            // 获取用户信息（用于推荐中显示题目信息）
            const problemIds = recommendations.flatMap(r => r.problemIds);
            const problems = await this.ctx.db.collection('problem').find({
                domainId: this.domain._id,
                docId: { $in: problemIds }
            }).toArray();

            const problemMap = new Map(problems.map(p => [p.docId, p]));

            this.response.template = 'learning_analysis_hall.html';
            this.response.body = {
                learningStats,
                progressTrend,
                knowledgeDistribution,
                peerComparison,
                efficiencyTrend,
                activityHeatmap,
                errorPatterns,
                efficiencyAnalysis,
                recommendations: recommendations.map(r => ({
                    ...r,
                    problems: r.problemIds.map(pid => problemMap.get(pid)).filter(Boolean),
                })),
                currentUser: {
                    uid,
                    name: this.user.uname,
                    displayName: this.user.displayName,
                },
                isLoggedIn: true,
            };
        } catch (error) {
            console.error('[LearningAnalysisHall] ❌ Error loading analysis data:', error);
            this.response.template = 'learning_analysis_error.html';
            this.response.body = {
                error: '学习分析数据加载失败，请稍后重试',
                isLoggedIn: !!uid,
            };
        }
    }

    async post() {
        const uid = this.user._id;
        const { action, timeRange, analysisType } = this.request.body;

        const analysisService = new LearningAnalysisService(DEFAULT_CONFIG, this.ctx);
        const statisticsService = new LearningStatisticsService(this.ctx, DEFAULT_CONFIG);

        try {
            let result;
            
            switch (action) {
                case 'refresh_recommendations':
                    await analysisService.generateRecommendations(uid, this.domain._id);
                    result = { success: true, message: '推荐已刷新' };
                    break;
                    
                case 'get_detailed_progress':
                    const days = parseInt(timeRange) || 30;
                    const detailedProgress = await statisticsService.getLearningProgressTrend(uid, this.domain._id, days);
                    result = { success: true, data: detailedProgress };
                    break;
                    
                case 'get_error_analysis':
                    const errorDays = parseInt(timeRange) || 30;
                    const errorAnalysis = await analysisService.analyzeErrorPatterns(uid, this.domain._id, errorDays);
                    result = { success: true, data: errorAnalysis };
                    break;
                    
                case 'mark_recommendation_viewed':
                    const { recommendationId } = this.request.body;
                    await this.ctx.db.collection('learning.recommendations' as any).updateOne(
                        { _id: recommendationId, uid },
                        { $set: { status: 'viewed', viewedAt: new Date() } }
                    );
                    result = { success: true, message: '推荐已标记为已查看' };
                    break;
                    
                default:
                    result = { success: false, message: '未知操作' };
            }
            
            this.response.body = result;
        } catch (error) {
            console.error('[LearningAnalysisHall] ❌ Error processing request:', error);
            this.response.body = { 
                success: false, 
                message: `操作失败：${error.message}` 
            };
        }
    }
}

/**
 * 学习进度详情处理器
 * 路由: /learning/progress
 * 功能: 展示详细的学习进度和历史记录
 */
export class LearningProgressHandler extends Handler {
    async get() {
        const uid = this.user._id;
        const statisticsService = new LearningStatisticsService(this.ctx, DEFAULT_CONFIG);

        const timeRange = this.request.query.range || '30';
        const days = Math.min(365, Math.max(7, parseInt(timeRange)));

        try {
            // 获取学习统计摘要
            const learningStats = await statisticsService.getUserLearningStats(uid, this.domain._id);
            
            // 获取详细进度趋势
            const progressTrend = await statisticsService.getLearningProgressTrend(uid, this.domain._id, days);
            
            // 获取效率趋势
            const efficiencyTrend = await statisticsService.getEfficiencyTrend(uid, this.domain._id, days);
            
            // 获取活跃度热力图
            const weeks = Math.ceil(days / 7);
            const activityHeatmap = await statisticsService.getActivityHeatmap(uid, this.domain._id, weeks);

            this.response.template = 'learning_progress.html';
            this.response.body = {
                learningStats,
                progressTrend,
                efficiencyTrend,
                activityHeatmap,
                timeRange: days,
                currentUser: {
                    uid,
                    name: this.user.uname,
                    displayName: this.user.displayName,
                },
            };
        } catch (error) {
            console.error('[LearningProgress] ❌ Error:', error);
            this.response.template = 'error.html';
            this.response.body = { error: '数据加载失败' };
        }
    }
}

/**
 * 知识点掌握详情处理器
 * 路由: /learning/knowledge
 * 功能: 展示知识点掌握情况和薄弱点分析
 */
export class KnowledgePointsHandler extends Handler {
    async get() {
        const uid = this.user._id;
        const analysisService = new LearningAnalysisService(DEFAULT_CONFIG, this.ctx);
        const statisticsService = new LearningStatisticsService(this.ctx, DEFAULT_CONFIG);

        try {
            // 获取知识点掌握情况
            const knowledgePoints = await analysisService.getUserKnowledgePoints(uid, this.domain._id);
            
            // 获取知识点分布
            const knowledgeDistribution = await statisticsService.getKnowledgePointDistribution(uid, this.domain._id);
            
            // 获取同伴对比
            const peerComparison = await statisticsService.getPeerComparison(uid, this.domain._id);

            this.response.template = 'knowledge_points.html';
            this.response.body = {
                knowledgePoints,
                knowledgeDistribution,
                strongerAreas: peerComparison.strongerAreas,
                weakerAreas: peerComparison.weakerAreas,
                currentUser: {
                    uid,
                    name: this.user.uname,
                    displayName: this.user.displayName,
                },
            };
        } catch (error) {
            console.error('[KnowledgePoints] ❌ Error:', error);
            this.response.template = 'error.html';
            this.response.body = { error: '数据加载失败' };
        }
    }
}

/**
 * 智能推荐页面处理器
 * 路由: /learning/recommendations
 * 功能: 展示个性化题目推荐和学习路径
 */
export class RecommendationsHandler extends Handler {
    async get() {
        const uid = this.user._id;
        const analysisService = new LearningAnalysisService(DEFAULT_CONFIG, this.ctx);

        try {
            // 获取所有推荐
            const allRecommendations = await this.ctx.db.collection('learning.recommendations' as any)
                .find({ uid, domainId: this.domain._id })
                .sort({ priority: -1, generatedAt: -1 })
                .toArray();

            // 获取题目信息
            const problemIds = allRecommendations.flatMap(r => r.problemIds);
            const problems = await this.ctx.db.collection('problem').find({
                domainId: this.domain._id,
                docId: { $in: problemIds }
            }).toArray();

            const problemMap = new Map(problems.map(p => [p.docId, p]));

            // 按状态分组推荐
            const groupedRecommendations = {
                pending: allRecommendations.filter(r => r.status === 'pending'),
                viewed: allRecommendations.filter(r => r.status === 'viewed'),
                completed: allRecommendations.filter(r => r.status === 'completed'),
            };

            // 获取知识点掌握情况用于推荐解释
            const knowledgePoints = await analysisService.getUserKnowledgePoints(uid, this.domain._id);
            const weakKnowledgePoints = knowledgePoints
                .filter(kp => kp.masteryLevel < 70)
                .sort((a, b) => a.masteryLevel - b.masteryLevel);

            this.response.template = 'recommendations.html';
            this.response.body = {
                recommendations: {
                    pending: this.enrichRecommendations(groupedRecommendations.pending, problemMap),
                    viewed: this.enrichRecommendations(groupedRecommendations.viewed, problemMap),
                    completed: this.enrichRecommendations(groupedRecommendations.completed, problemMap),
                },
                weakKnowledgePoints,
                currentUser: {
                    uid,
                    name: this.user.uname,
                    displayName: this.user.displayName,
                },
            };
        } catch (error) {
            console.error('[Recommendations] ❌ Error:', error);
            this.response.template = 'error.html';
            this.response.body = { error: '推荐数据加载失败' };
        }
    }

    async post() {
        const uid = this.user._id;
        const { action, recommendationId } = this.request.body;

        try {
            let result;
            
            switch (action) {
                case 'mark_attempted':
                    await this.ctx.db.collection('learning.recommendations' as any).updateOne(
                        { _id: recommendationId, uid },
                        { $set: { status: 'attempted' } }
                    );
                    result = { success: true, message: '已标记为尝试' };
                    break;
                    
                case 'mark_completed':
                    await this.ctx.db.collection('learning.recommendations' as any).updateOne(
                        { _id: recommendationId, uid },
                        { $set: { status: 'completed', completedAt: new Date() } }
                    );
                    result = { success: true, message: '已标记为完成' };
                    break;
                    
                case 'generate_new':
                    const analysisService = new LearningAnalysisService(DEFAULT_CONFIG, this.ctx);
                    await analysisService.generateRecommendations(uid, this.domain._id);
                    result = { success: true, message: '新推荐已生成' };
                    break;
                    
                default:
                    result = { success: false, message: '未知操作' };
            }
            
            this.response.body = result;
        } catch (error) {
            console.error('[Recommendations] ❌ Error processing request:', error);
            this.response.body = { 
                success: false, 
                message: `操作失败：${error.message}` 
            };
        }
    }

    private enrichRecommendations(recommendations: any[], problemMap: Map<any, any>) {
        return recommendations.map(r => ({
            ...r,
            problems: r.problemIds.map(pid => problemMap.get(pid)).filter(Boolean),
            createdAt: r.generatedAt.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
        }));
    }
}

/**
 * 学情分析管理处理器
 * 路由: /learning/admin
 * 功能: 管理员查看系统整体学习分析数据
 */
export class LearningAnalysisAdminHandler extends Handler {
    async prepare() {
        if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
            this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        }
    }

    async get() {
        const statisticsService = new LearningStatisticsService(this.ctx, DEFAULT_CONFIG);

        try {
            // 获取系统整体统计
            const systemOverview = await statisticsService.getSystemOverview(this.domain._id);
            
            // 获取最近的学习记录
            const recentRecords = await this.ctx.db.collection('learning.records' as any)
                .find({ domainId: this.domain._id })
                .sort({ submissionTime: -1 })
                .limit(20)
                .toArray();

            // 获取用户信息
            const userIds = [...new Set(recentRecords.map(r => r.uid))];
            const UserModel = global.Hydro.model.user;
            const users = await UserModel.getList(this.domain._id, userIds);

            this.response.template = 'learning_analysis_admin.html';
            this.response.body = {
                systemOverview,
                recentRecords: recentRecords.map(record => ({
                    ...record,
                    submissionTime: record.submissionTime.toLocaleString('zh-CN'),
                    userName: users[record.uid]?.uname || `User ${record.uid}`,
                })),
                canManage: true,
                currentDomain: {
                    id: this.domain._id,
                    name: this.domain.name || this.domain._id,
                },
            };
        } catch (error) {
            console.error('[LearningAnalysisAdmin] ❌ Error:', error);
            this.response.template = 'error.html';
            this.response.body = { error: '管理数据加载失败' };
        }
    }
}