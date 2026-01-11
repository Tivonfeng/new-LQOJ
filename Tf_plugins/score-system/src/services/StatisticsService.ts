import { Context } from 'hydrooj';
import { UserScore } from '../services';

/**
 * 统计分析服务
 * 负责：数据统计、报表生成、用户分析
 */
export class StatisticsService {
    private ctx: Context;
    private scoreCore: any;

    constructor(ctx: Context) {
        this.ctx = ctx;
        this.scoreCore = null;
        // 不再在构造函数中注入，改为在方法调用时动态获取
    }

    /**
     * 获取 scoreCore 服务实例
     */

    /**
     * 获取系统总览统计 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @returns 系统统计信息
     */
    async getSystemOverview(_domainId: string): Promise<{
        totalUsers: number;
        totalScore: number;
        todayScore: number;
        todayActiveUsers: number;
    }> {
        // 获取 scoreCore 实例
        const scoreCore = (global as any).scoreCoreService;
        if (!scoreCore) {
            throw new Error('ScoreCore service not available. Please ensure tf_plugins_core plugin is loaded before score-system plugin.');
        }

        // 获取总用户数和总积分
        const scoreStats = await this.ctx.db.collection('score.users' as any).aggregate([
            { $match: {} }, // 移除域限制
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    totalScore: { $sum: '$totalScore' },
                },
            },
        ]).toArray();

        const scoreData = scoreStats[0] || { totalUsers: 0, totalScore: 0 };

        // 获取今日统计
        const todayStats = await scoreCore.getTodayStats(_domainId);

        return {
            totalUsers: scoreData.totalUsers,
            totalScore: scoreData.totalScore,
            todayScore: todayStats.totalScore,
            todayActiveUsers: todayStats.activeUsers,
        };
    }

    /**
     * 获取用户活跃度统计 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @param days 统计天数
     * @returns 用户活跃度统计
     */
    async getUserActivityStats(_domainId: string, days: number = 7): Promise<{
        date: string;
        activeUsers: number;
        totalScore: number;
        avgScore: number;
    }[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const dailyStats = await this.ctx.db.collection('score.records' as any).aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }, // 移除域限制
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' },
                    },
                    activeUsers: { $addToSet: '$uid' },
                    totalScore: { $sum: '$score' },
                },
            },
            {
                $project: {
                    _id: 1,
                    activeUsers: { $size: '$activeUsers' },
                    totalScore: 1,
                    avgScore: {
                        $cond: [
                            { $gt: [{ $size: '$activeUsers' }, 0] },
                            { $divide: ['$totalScore', { $size: '$activeUsers' }] },
                            0,
                        ],
                    },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        ]).toArray();

        return dailyStats.map((stat) => ({
            date: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}-${String(stat._id.day).padStart(2, '0')}`,
            activeUsers: stat.activeUsers,
            totalScore: stat.totalScore,
            avgScore: Math.round(stat.avgScore * 100) / 100,
        }));
    }

    /**
     * 获取积分分布统计 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @returns 积分分布统计
     */
    async getScoreDistribution(_domainId: string): Promise<{
        range: string;
        count: number;
        percentage: number;
    }[]> {
        const users = await this.ctx.db.collection('score.users' as any)
            .find({}) // 移除域限制
            .toArray();

        const totalUsers = users.length;
        if (totalUsers === 0) return [];

        // 定义积分区间
        const ranges = [
            { min: 0, max: 50, label: '0-50' },
            { min: 51, max: 100, label: '51-100' },
            { min: 101, max: 200, label: '101-200' },
            { min: 201, max: 500, label: '201-500' },
            { min: 501, max: 1000, label: '501-1000' },
            { min: 1001, max: Infinity, label: '1000+' },
        ];

        const distribution = ranges.map((range) => {
            const count = users.filter((user) =>
                user.totalScore >= range.min && user.totalScore <= range.max,
            ).length;

            return {
                range: range.label,
                count,
                percentage: Math.round((count / totalUsers) * 10000) / 100,
            };
        });

        return distribution;
    }

    /**
     * 获取最近记录统计 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @param limit 记录数量
     * @returns 最近记录统计
     */
    async getRecentActivity(_domainId: string, limit: number = 20): Promise<{
        scoreRecords: any[];
    }> {
        // 获取最近积分记录
        const scoreRecords = await this.ctx.db.collection('score.records' as any)
            .find({}) // 移除域限制
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();

        // 格式化时间
        const formatTime = (date: Date) => date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });

        return {
            scoreRecords: scoreRecords.map((record) => ({
                ...record,
                createdAt: formatTime(record.createdAt),
            })),
        };
    }

    /**
     * 获取用户个人统计摘要 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @param uid 用户ID
     * @returns 用户统计摘要
     */
    async getUserSummary(_domainId: string, uid: number): Promise<{
        scoreInfo: UserScore | null;
        rank: number | null;
        recentScoreCount: number;
    }> {
        // 获取 scoreCore 实例
        const scoreCore = (global as any).scoreCoreService;
        if (!scoreCore) {
            throw new Error('ScoreCore service not available. Please ensure tf_plugins_core plugin is loaded before score-system plugin.');
        }

        // 获取用户积分信息和排名
        const scoreInfo = await scoreCore.getUserScore(_domainId, uid);
        const rank = await scoreCore.getUserRank(_domainId, uid);

        // 获取最近活动数量
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentScoreCount = await this.ctx.db.collection('score.records' as any)
            .countDocuments({
                uid, // 移除域限制
                createdAt: { $gte: oneWeekAgo },
            });

        return {
            scoreInfo,
            rank,
            recentScoreCount,
        };
    }
}
