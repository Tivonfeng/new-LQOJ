import { Context } from 'hydrooj';
import { LotteryService, UserLotteryStats } from './LotteryService';
import { ScoreService, UserScore } from './ScoreService';

/**
 * 统计分析服务
 * 负责：数据统计、报表生成、用户分析
 */
export class StatisticsService {
    private ctx: Context;
    private scoreService: ScoreService;
    private lotteryService: LotteryService;

    constructor(ctx: Context, scoreService: ScoreService, lotteryService: LotteryService) {
        this.ctx = ctx;
        this.scoreService = scoreService;
        this.lotteryService = lotteryService;
    }

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
        totalDraws: number;
        totalWins: number;
        winRate: number;
    }> {
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
        const todayStats = await this.scoreService.getTodayStats(_domainId);

        // 获取抽奖统计
        const lotteryStats = await this.lotteryService.getLotteryStats();

        const winRate = lotteryStats.totalDraws > 0
            ? (lotteryStats.totalWins / lotteryStats.totalDraws * 100) : 0;

        return {
            totalUsers: scoreData.totalUsers,
            totalScore: scoreData.totalScore,
            todayScore: todayStats.totalScore,
            todayActiveUsers: todayStats.activeUsers,
            totalDraws: lotteryStats.totalDraws,
            totalWins: lotteryStats.totalWins,
            winRate: Math.round(winRate * 100) / 100,
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
     * 获取抽奖奖品统计
     * @returns 奖品分布统计
     */
    async getPrizeDistribution(): Promise<{
        rarity: string;
        count: number;
        wonCount: number;
        winRate: number;
    }[]> {
        // 获取所有奖品
        const prizes = await this.ctx.db.collection('lottery.prizes' as any)
            .find({})
            .toArray();

        // 获取中奖统计
        const wonStats = await this.ctx.db.collection('lottery.records' as any).aggregate([
            { $match: { result: 'win' } },
            {
                $group: {
                    _id: '$prizeRarity',
                    wonCount: { $sum: 1 },
                },
            },
        ]).toArray();

        const rarities = ['common', 'rare', 'epic', 'legendary'];
        const rarityLabels = {
            common: '普通',
            rare: '稀有',
            epic: '史诗',
            legendary: '传说',
        };

        return rarities.map((rarity) => {
            const prizeCount = prizes.filter((p) => p.rarity === rarity).length;
            const wonData = wonStats.find((s) => s._id === rarity);
            const wonCount = wonData ? wonData.wonCount : 0;
            const totalDraws = prizes.filter((p) => p.rarity === rarity)
                .reduce((sum, prize) => sum + prize.weight, 0);

            const winRate = totalDraws > 0 ? (wonCount / totalDraws * 100) : 0;

            return {
                rarity: rarityLabels[rarity],
                count: prizeCount,
                wonCount,
                winRate: Math.round(winRate * 100) / 100,
            };
        });
    }

    /**
     * 获取最近记录统计 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @param limit 记录数量
     * @returns 最近记录统计
     */
    async getRecentActivity(_domainId: string, limit: number = 20): Promise<{
        scoreRecords: any[];
        lotteryRecords: any[];
    }> {
        // 获取最近积分记录
        const scoreRecords = await this.ctx.db.collection('score.records' as any)
            .find({}) // 移除域限制
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();

        // 获取最近抽奖记录
        const lotteryRecords = await this.ctx.db.collection('lottery.records' as any)
            .find({}) // 移除域限制
            .sort({ drawTime: -1 })
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
            lotteryRecords: lotteryRecords.map((record) => ({
                ...record,
                drawTime: formatTime(record.drawTime),
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
        lotteryStats: UserLotteryStats | null;
        recentScoreCount: number;
        recentLotteryCount: number;
    }> {
        // 获取用户积分信息和排名
        const scoreInfo = await this.scoreService.getUserScore(_domainId, uid);
        const rank = await this.scoreService.getUserRank(_domainId, uid);

        // 获取用户抽奖统计
        const lotteryStats = await this.lotteryService.getUserLotteryStats(_domainId, uid);

        // 获取最近活动数量
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentScoreCount = await this.ctx.db.collection('score.records' as any)
            .countDocuments({
                uid, // 移除域限制
                createdAt: { $gte: oneWeekAgo },
            });

        const recentLotteryCount = await this.ctx.db.collection('lottery.records' as any)
            .countDocuments({
                uid, // 移除域限制
                drawTime: { $gte: oneWeekAgo },
            });

        return {
            scoreInfo,
            rank,
            lotteryStats,
            recentScoreCount,
            recentLotteryCount,
        };
    }
}
