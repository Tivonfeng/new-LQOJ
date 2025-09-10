/* eslint-disable github/array-foreach */
import { Context } from 'hydrooj';
import {
    KnowledgePoint,
    LearningAnalysisConfig,
    LearningProgressTrend,
    LearningRecord,
    LearningStatsSummary,
    PeerComparison,
} from '../types';

/**
 * 学情分析统计服务
 * 负责：统计数据计算、趋势分析、同伴对比
 */
export class LearningStatisticsService {
    private ctx: Context;
    private config: LearningAnalysisConfig;

    constructor(ctx: Context, config: LearningAnalysisConfig) {
        this.ctx = ctx;
        this.config = config;
    }

    /**
     * 获取用户学习统计摘要
     */
    async getUserLearningStats(uid: number, domainId: string): Promise<LearningStatsSummary> {
        const userRecords = await this.ctx.db.collection('learning.records' as any)
            .find({ uid, domainId })
            .toArray();

        if (userRecords.length === 0) {
            return this.getEmptyStats(uid, domainId);
        }

        // 基础统计
        const totalProblems = new Set(userRecords.map((r) => r.problemId)).size;
        const solvedProblems = new Set(
            userRecords.filter((r) => r.status === 'Accepted').map((r) => r.problemId),
        ).size;
        const successfulSubmissions = userRecords.filter((r) => r.status === 'Accepted');
        const successRate = successfulSubmissions.length / userRecords.length;

        // 平均尝试次数计算
        const problemAttempts = new Map<number, number>();
        userRecords.forEach((record) => {
            const current = problemAttempts.get(record.problemId) || 0;
            problemAttempts.set(record.problemId, Math.max(current, record.attemptCount));
        });
        const averageAttempts = Array.from(problemAttempts.values())
            .reduce((sum, attempts) => sum + attempts, 0) / problemAttempts.size;

        // 平均解题时间（只计算AC的记录）
        const averageSolutionTime = successfulSubmissions.length > 0
            ? successfulSubmissions.reduce((sum, r) => sum + r.solutionTime, 0) / successfulSubmissions.length
            : 0;

        // 偏好编程语言
        const languageCount = new Map<string, number>();
        userRecords.forEach((record) => {
            const count = languageCount.get(record.language) || 0;
            languageCount.set(record.language, count + 1);
        });
        const favoriteLanguage = Array.from(languageCount.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

        // 活跃天数和连续天数
        const activeDates = new Set(
            userRecords.map((r) => r.submissionTime.toISOString().split('T')[0]),
        );
        const activeDays = activeDates.size;

        // 计算连续学习天数
        const sortedDates = Array.from(activeDates).sort();
        const streakDays = this.calculateStreakDays(sortedDates);

        // 总学习时间
        const totalStudyTime = userRecords.reduce((sum, r) => sum + r.solutionTime, 0);

        return {
            uid,
            domainId,
            totalProblems,
            solvedProblems,
            successRate: Math.round(successRate * 100) / 100,
            averageAttempts: Math.round(averageAttempts * 100) / 100,
            averageSolutionTime: Math.round(averageSolutionTime),
            favoriteLanguage,
            activeDays,
            totalStudyTime,
            streakDays,
            lastActiveDate: userRecords.length > 0
                ? new Date(Math.max(...userRecords.map((r) => r.submissionTime.getTime())))
                : new Date(),
        };
    }

    /**
     * 获取学习进度趋势
     */
    async getLearningProgressTrend(
        uid: number,
        domainId: string,
        days: number = 30,
    ): Promise<LearningProgressTrend[]> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const userRecords = await this.ctx.db.collection('learning.records' as any)
            .find({
                uid,
                domainId,
                submissionTime: { $gte: startDate, $lte: endDate },
            })
            .sort({ submissionTime: 1 })
            .toArray();

        // 按日期分组统计
        const dailyStats = new Map<string, {
            records: LearningRecord[];
            solvedProblems: Set<number>;
            totalTime: number;
            knowledgePoints: Set<string>;
        }>();

        userRecords.forEach((record) => {
            const dateKey = record.submissionTime.toISOString().split('T')[0];

            if (!dailyStats.has(dateKey)) {
                dailyStats.set(dateKey, {
                    records: [],
                    solvedProblems: new Set(),
                    totalTime: 0,
                    knowledgePoints: new Set(),
                });
            }

            const dayData = dailyStats.get(dateKey)!;
            dayData.records.push(record);
            dayData.totalTime += record.solutionTime;

            if (record.status === 'Accepted') {
                dayData.solvedProblems.add(record.problemId);
            }

            record.knowledgePoints.forEach((kp) => dayData.knowledgePoints.add(kp));
        });

        // 生成趋势数据
        const trends: LearningProgressTrend[] = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateKey = date.toISOString().split('T')[0];

            const dayData = dailyStats.get(dateKey);
            if (dayData) {
                const successfulRecords = dayData.records.filter((r) => r.status === 'Accepted');
                const successRate = dayData.records.length > 0
                    ? successfulRecords.length / dayData.records.length
                    : 0;
                const averageTime = successfulRecords.length > 0
                    ? successfulRecords.reduce((sum, r) => sum + r.solutionTime, 0) / successfulRecords.length
                    : 0;

                trends.push({
                    date: dateKey,
                    problemsSolved: dayData.solvedProblems.size,
                    successRate: Math.round(successRate * 100) / 100,
                    averageTime: Math.round(averageTime),
                    studyTime: dayData.totalTime,
                    knowledgeGrowth: dayData.knowledgePoints.size,
                });
            } else {
                trends.push({
                    date: dateKey,
                    problemsSolved: 0,
                    successRate: 0,
                    averageTime: 0,
                    studyTime: 0,
                    knowledgeGrowth: 0,
                });
            }
        }

        return trends;
    }

    /**
     * 获取同伴对比分析
     */
    async getPeerComparison(uid: number, domainId: string): Promise<PeerComparison> {
        // 获取用户统计
        const userStats = await this.getUserLearningStats(uid, domainId);

        // 获取所有用户的基本统计用于排名计算
        const allUserStats = await this.ctx.db.collection('learning.records' as any).aggregate([
            { $match: { domainId } },
            {
                $group: {
                    _id: '$uid',
                    totalSubmissions: { $sum: 1 },
                    successfulSubmissions: {
                        $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] },
                    },
                    uniqueProblems: { $addToSet: '$problemId' },
                    avgSolutionTime: { $avg: '$solutionTime' },
                },
            },
            {
                $project: {
                    uid: '$_id',
                    successRate: { $divide: ['$successfulSubmissions', '$totalSubmissions'] },
                    problemsSolved: { $size: '$uniqueProblems' },
                    avgSolutionTime: 1,
                    score: {
                        $add: [
                            { $multiply: [{ $size: '$uniqueProblems' }, 10] },
                            { $multiply: [{ $divide: ['$successfulSubmissions', '$totalSubmissions'] }, 50] },
                        ],
                    },
                },
            },
            { $sort: { score: -1 } },
        ]).toArray();

        // 计算用户排名
        const userRank = allUserStats.findIndex((u) => u.uid === uid) + 1;
        const totalUsers = allUserStats.length;
        const percentile = Math.round(((totalUsers - userRank + 1) / totalUsers) * 100);

        // 计算基准指标
        const benchmarkMetrics = {
            avgSolutionTime: allUserStats.reduce((sum, u) => sum + u.avgSolutionTime, 0) / totalUsers,
            avgSuccessRate: allUserStats.reduce((sum, u) => sum + u.successRate, 0) / totalUsers,
            avgProblemsSolved: allUserStats.reduce((sum, u) => sum + u.problemsSolved, 0) / totalUsers,
        };

        // 获取用户知识点掌握情况
        const userKnowledgePoints = await this.ctx.db.collection('learning.knowledge_points' as any)
            .find({ uid, domainId })
            .toArray();

        // 分析优势和劣势领域
        const strongerAreas: string[] = [];
        const weakerAreas: string[] = [];

        userKnowledgePoints.forEach((kp: KnowledgePoint) => {
            if (kp.masteryLevel > 75) {
                strongerAreas.push(kp.topic);
            } else if (kp.masteryLevel < 50) {
                weakerAreas.push(kp.topic);
            }
        });

        // 找到相似水平的同伴（排名±20的用户）
        const similarRankRange = 20;
        const similarPeers = allUserStats
            .slice(
                Math.max(0, userRank - similarRankRange - 1),
                Math.min(totalUsers, userRank + similarRankRange),
            )
            .filter((u) => u.uid !== uid)
            .map((u) => u.uid)
            .slice(0, 10);

        return {
            uid,
            domainId,
            userRank,
            totalUsers,
            percentile,
            strongerAreas: strongerAreas.slice(0, 5),
            weakerAreas: weakerAreas.slice(0, 5),
            similarPeers,
            benchmarkMetrics: {
                avgSolutionTime: Math.round(benchmarkMetrics.avgSolutionTime),
                avgSuccessRate: Math.round(benchmarkMetrics.avgSuccessRate * 100) / 100,
                avgProblemsSolved: Math.round(benchmarkMetrics.avgProblemsSolved),
            },
        };
    }

    /**
     * 获取知识点掌握分布
     */
    async getKnowledgePointDistribution(uid: number, domainId: string): Promise<{
        category: string;
        points: { name: string, mastery: number, confidence: number }[];
        averageMastery: number;
    }[]> {
        const knowledgePoints = await this.ctx.db.collection('learning.knowledge_points' as any)
            .find({ uid, domainId })
            .sort({ category: 1, masteryLevel: -1 })
            .toArray();

        // 按类别分组
        const categories = new Map<string, KnowledgePoint[]>();
        knowledgePoints.forEach((kp: KnowledgePoint) => {
            if (!categories.has(kp.category)) {
                categories.set(kp.category, []);
            }
            categories.get(kp.category)!.push(kp);
        });

        // 生成分布数据
        const distribution = Array.from(categories.entries()).map(([category, points]) => {
            const averageMastery = points.reduce((sum, p) => sum + p.masteryLevel, 0) / points.length;

            return {
                category,
                points: points.map((p) => ({
                    name: p.topic,
                    mastery: p.masteryLevel,
                    confidence: p.confidence,
                })),
                averageMastery: Math.round(averageMastery * 100) / 100,
            };
        });

        return distribution.sort((a, b) => b.averageMastery - a.averageMastery);
    }

    /**
     * 获取学习活跃度热力图数据
     */
    async getActivityHeatmap(uid: number, domainId: string, weeks: number = 12): Promise<{
        date: string;
        count: number;
        level: number; // 0-4 activity level
    }[]> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - (weeks * 7));

        const records = await this.ctx.db.collection('learning.records' as any)
            .find({
                uid,
                domainId,
                submissionTime: { $gte: startDate, $lte: endDate },
            })
            .toArray();

        // 按日期统计活动次数
        const dailyActivity = new Map<string, number>();
        records.forEach((record) => {
            const dateKey = record.submissionTime.toISOString().split('T')[0];
            dailyActivity.set(dateKey, (dailyActivity.get(dateKey) || 0) + 1);
        });

        // 计算活动级别阈值
        const activityCounts = Array.from(dailyActivity.values());
        const maxActivity = Math.max(...activityCounts);
        const avgActivity = activityCounts.reduce((sum, count) => sum + count, 0) / activityCounts.length;

        // 生成热力图数据
        const heatmapData = [];
        for (let i = 0; i < weeks * 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateKey = date.toISOString().split('T')[0];
            const count = dailyActivity.get(dateKey) || 0;

            // 计算活动级别 (0-4)
            let level = 0;
            if (count > 0) {
                if (count >= maxActivity * 0.8) level = 4;
                else if (count >= avgActivity * 2) level = 3;
                else if (count >= avgActivity) level = 2;
                else level = 1;
            }

            heatmapData.push({
                date: dateKey,
                count,
                level,
            });
        }

        return heatmapData;
    }

    /**
     * 获取学习效率趋势
     */
    async getEfficiencyTrend(uid: number, domainId: string, days: number = 30): Promise<{
        date: string;
        efficiency: number; // 效率分数 0-100
        problemsPerHour: number;
        accuracyRate: number;
    }[]> {
        const trends = await this.getLearningProgressTrend(uid, domainId, days);

        return trends.map((trend) => {
            const hoursSpent = trend.studyTime / 3600; // 转换为小时
            const problemsPerHour = hoursSpent > 0 ? trend.problemsSolved / hoursSpent : 0;

            // 效率分数：综合考虑解题数量、正确率和时间效率
            const efficiency = Math.min(100, Math.max(0,
                (trend.problemsSolved * 10) // 解题数量得分
                + (trend.successRate * 30) // 正确率得分
                + Math.min(30, problemsPerHour * 10), // 时间效率得分
            ));

            return {
                date: trend.date,
                efficiency: Math.round(efficiency),
                problemsPerHour: Math.round(problemsPerHour * 100) / 100,
                accuracyRate: trend.successRate,
            };
        });
    }

    /**
     * 获取系统整体统计
     */
    async getSystemOverview(domainId: string): Promise<{
        totalUsers: number;
        activeUsers: number;
        totalSubmissions: number;
        totalProblems: number;
        averageSuccessRate: number;
        popularLanguages: { language: string, count: number, percentage: number }[];
        activityTrend: { date: string, submissions: number, users: number }[];
    }> {
        // 基础统计
        const totalUsers = await this.ctx.db.collection('learning.records' as any)
            .distinct('uid', { domainId });

        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const activeUsers = await this.ctx.db.collection('learning.records' as any)
            .distinct('uid', { domainId, submissionTime: { $gte: last7Days } });

        const [submissionStats] = await this.ctx.db.collection('learning.records' as any).aggregate([
            { $match: { domainId } },
            {
                $group: {
                    _id: null,
                    totalSubmissions: { $sum: 1 },
                    successfulSubmissions: { $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] } },
                    uniqueProblems: { $addToSet: '$problemId' },
                    languageStats: { $push: '$language' },
                },
            },
        ]).toArray();

        const averageSuccessRate = submissionStats.totalSubmissions > 0
            ? submissionStats.successfulSubmissions / submissionStats.totalSubmissions
            : 0;

        // 编程语言统计
        const languageCount = new Map<string, number>();
        submissionStats.languageStats.forEach((lang: string) => {
            languageCount.set(lang, (languageCount.get(lang) || 0) + 1);
        });

        const popularLanguages = Array.from(languageCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([language, count]) => ({
                language,
                count,
                percentage: Math.round((count / submissionStats.totalSubmissions) * 100),
            }));

        // 活动趋势（最近7天）
        const activityTrend = await this.getSystemActivityTrend(domainId, 7);

        return {
            totalUsers: totalUsers.length,
            activeUsers: activeUsers.length,
            totalSubmissions: submissionStats.totalSubmissions,
            totalProblems: submissionStats.uniqueProblems.length,
            averageSuccessRate: Math.round(averageSuccessRate * 100) / 100,
            popularLanguages,
            activityTrend,
        };
    }

    /**
     * 获取系统活动趋势
     */
    private async getSystemActivityTrend(domainId: string, days: number): Promise<{
        date: string;
        submissions: number;
        users: number;
    }[]> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const dailyStats = await this.ctx.db.collection('learning.records' as any).aggregate([
            {
                $match: {
                    domainId,
                    submissionTime: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$submissionTime' },
                        month: { $month: '$submissionTime' },
                        day: { $dayOfMonth: '$submissionTime' },
                    },
                    submissions: { $sum: 1 },
                    users: { $addToSet: '$uid' },
                },
            },
            {
                $project: {
                    _id: 1,
                    submissions: 1,
                    users: { $size: '$users' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        ]).toArray();

        // 补充缺失的日期
        const result = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateKey = date.toISOString().split('T')[0];

            const dayData = dailyStats.find((d) =>
                d._id.year === date.getFullYear()
                && d._id.month === date.getMonth() + 1
                && d._id.day === date.getDate(),
            );

            result.push({
                date: dateKey,
                submissions: dayData?.submissions || 0,
                users: dayData?.users || 0,
            });
        }

        return result;
    }

    /**
     * 计算连续学习天数
     */
    private calculateStreakDays(sortedDates: string[]): number {
        if (sortedDates.length === 0) return 0;

        let streak = 1;
        let maxStreak = 1;

        for (let i = 1; i < sortedDates.length; i++) {
            const current = new Date(sortedDates[i]);
            const previous = new Date(sortedDates[i - 1]);
            const dayDiff = Math.round((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));

            if (dayDiff === 1) {
                streak++;
                maxStreak = Math.max(maxStreak, streak);
            } else {
                streak = 1;
            }
        }

        return maxStreak;
    }

    /**
     * 获取空的统计数据
     */
    private getEmptyStats(uid: number, domainId: string): LearningStatsSummary {
        return {
            uid,
            domainId,
            totalProblems: 0,
            solvedProblems: 0,
            successRate: 0,
            averageAttempts: 0,
            averageSolutionTime: 0,
            favoriteLanguage: 'unknown',
            activeDays: 0,
            totalStudyTime: 0,
            streakDays: 0,
            lastActiveDate: new Date(),
        };
    }
}
