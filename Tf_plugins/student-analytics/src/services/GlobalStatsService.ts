import { Context, ObjectId } from 'hydrooj';

/**
 * 全局统计数据
 */
export interface GlobalStats {
    // 用户统计
    totalUsers: number;           // 有提交记录的总用户数
    activeUsers: number;          // 最近 30 天有提交的活跃用户数

    // 提交统计
    totalSubmissions: number;     // 总提交数
    totalAcSubmissions: number;   // 总 AC 提交数
    todaySubmissions: number;     // 今日提交数
    weekSubmissions: number;      // 本周提交数
    monthSubmissions: number;     // 本月提交数

    // 代码统计
    totalCodeLines: number;       // 总代码行数（估算）

    // 题目统计
    totalProblemsAttempted: number;  // 被尝试过的题目数
    totalProblemsSolved: number;     // 被 AC 过的题目数

    // 缓存统计
    cacheStats: {
        totalCached: number;
        dirtyCount: number;
        expiredCount: number;
    };

    // 更新时间
    lastUpdated: Date;
}

/**
 * 全局统计服务
 * 提供全局用户统计、提交统计等数据
 */
export class GlobalStatsService {
    constructor(private ctx: Context) {}

    /**
     * 获取全局统计数据
     */
    async getGlobalStats(): Promise<GlobalStats> {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(now);
        monthStart.setDate(monthStart.getDate() - 30);

        // 排除 pretest 和 generate 类型的提交
        const pretestId = new ObjectId('000000000000000000000000');
        const generateId = new ObjectId('000000000000000000000001');
        const baseMatch = {
            contest: { $nin: [pretestId, generateId] },
        };

        // 并行执行多个统计查询
        const [
            userStats,
            submissionStats,
            todayStats,
            weekStats,
            monthStats,
            codeLineStats,
            problemStats,
            cacheStats,
        ] = await Promise.all([
            // 用户统计
            this.getUserStats(baseMatch, monthStart),
            // 提交统计
            this.getSubmissionStats(baseMatch),
            // 今日提交
            this.getTimeRangeSubmissions(baseMatch, todayStart, now),
            // 本周提交
            this.getTimeRangeSubmissions(baseMatch, weekStart, now),
            // 本月提交
            this.getTimeRangeSubmissions(baseMatch, monthStart, now),
            // 代码行数（使用采样估算）
            this.estimateCodeLines(baseMatch),
            // 题目统计
            this.getProblemStats(),
            // 缓存统计
            this.getCacheStats(),
        ]);

        return {
            totalUsers: userStats.totalUsers,
            activeUsers: userStats.activeUsers,
            totalSubmissions: submissionStats.total,
            totalAcSubmissions: submissionStats.acCount,
            todaySubmissions: todayStats,
            weekSubmissions: weekStats,
            monthSubmissions: monthStats,
            totalCodeLines: codeLineStats,
            totalProblemsAttempted: problemStats.attempted,
            totalProblemsSolved: problemStats.solved,
            cacheStats,
            lastUpdated: now,
        };
    }

    /**
     * 获取用户统计
     */
    private async getUserStats(baseMatch: any, activeThreshold: Date): Promise<{
        totalUsers: number;
        activeUsers: number;
    }> {
        const result = await this.ctx.db.collection('record').aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: '$uid',
                    lastSubmission: { $max: { $ifNull: ['$judgeAt', { $toDate: '$_id' }] } },
                },
            },
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    activeUsers: {
                        $sum: {
                            $cond: [{ $gte: ['$lastSubmission', activeThreshold] }, 1, 0],
                        },
                    },
                },
            },
        ]).toArray();

        return {
            totalUsers: result[0]?.totalUsers || 0,
            activeUsers: result[0]?.activeUsers || 0,
        };
    }

    /**
     * 获取提交统计
     */
    private async getSubmissionStats(baseMatch: any): Promise<{
        total: number;
        acCount: number;
    }> {
        const result = await this.ctx.db.collection('record').aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    acCount: {
                        $sum: { $cond: [{ $eq: ['$status', 1] }, 1, 0] }, // STATUS_ACCEPTED = 1
                    },
                },
            },
        ]).toArray();

        return {
            total: result[0]?.total || 0,
            acCount: result[0]?.acCount || 0,
        };
    }

    /**
     * 获取时间范围内的提交数
     */
    private async getTimeRangeSubmissions(
        baseMatch: any,
        startDate: Date,
        endDate: Date,
    ): Promise<number> {
        const count = await this.ctx.db.collection('record').countDocuments({
            ...baseMatch,
            $or: [
                { judgeAt: { $gte: startDate, $lte: endDate } },
                {
                    judgeAt: { $exists: false },
                    _id: {
                        $gte: ObjectId.createFromTime(Math.floor(startDate.getTime() / 1000)),
                        $lte: ObjectId.createFromTime(Math.floor(endDate.getTime() / 1000)),
                    },
                },
            ],
        });
        return count;
    }

    /**
     * 估算总代码行数（使用采样）
     */
    private async estimateCodeLines(baseMatch: any): Promise<number> {
        // 获取总记录数
        const totalCount = await this.ctx.db.collection('record').countDocuments({
            ...baseMatch,
            code: { $exists: true, $ne: null, $ne: '' },
        });

        if (totalCount === 0) return 0;

        // 采样 1000 条记录计算平均行数
        const sampleSize = Math.min(1000, totalCount);
        const sample = await this.ctx.db.collection('record').aggregate([
            {
                $match: {
                    ...baseMatch,
                    code: { $exists: true, $ne: null, $ne: '' },
                },
            },
            { $sample: { size: sampleSize } },
            {
                $project: {
                    codeLines: {
                        $size: { $split: ['$code', '\n'] },
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    avgLines: { $avg: '$codeLines' },
                },
            },
        ]).toArray();

        const avgLines = sample[0]?.avgLines || 0;
        return Math.round(avgLines * totalCount);
    }

    /**
     * 获取题目统计
     */
    private async getProblemStats(): Promise<{
        attempted: number;
        solved: number;
    }> {
        // 统计被尝试过的题目
        const attemptedResult = await this.ctx.db.collection('document.status').aggregate([
            { $match: { docType: 10 } }, // TYPE_PROBLEM
            {
                $group: {
                    _id: { domainId: '$domainId', docId: '$docId' },
                    hasSolved: { $max: { $cond: [{ $eq: ['$status', 1] }, 1, 0] } },
                },
            },
            {
                $group: {
                    _id: null,
                    attempted: { $sum: 1 },
                    solved: { $sum: '$hasSolved' },
                },
            },
        ]).toArray();

        return {
            attempted: attemptedResult[0]?.attempted || 0,
            solved: attemptedResult[0]?.solved || 0,
        };
    }

    /**
     * 获取缓存统计
     */
    private async getCacheStats(): Promise<{
        totalCached: number;
        dirtyCount: number;
        expiredCount: number;
    }> {
        const ttl = 10 * 60 * 1000; // 默认 10 分钟
        const now = new Date();
        const expireTime = new Date(now.getTime() - ttl);

        const [totalCached, dirtyCount, expiredCount] = await Promise.all([
            this.ctx.db.collection('student.analytics.stats' as any).countDocuments({}),
            this.ctx.db.collection('student.analytics.stats' as any).countDocuments({ dirty: true }),
            this.ctx.db.collection('student.analytics.stats' as any).countDocuments({
                lastUpdated: { $lt: expireTime },
            }),
        ]);

        return {
            totalCached,
            dirtyCount,
            expiredCount,
        };
    }

    /**
     * 清除所有缓存
     */
    async clearAllCache(): Promise<number> {
        const result = await this.ctx.db.collection('student.analytics.stats' as any).deleteMany({});
        return result.deletedCount;
    }

    /**
     * 标记所有缓存为脏
     */
    async markAllCacheDirty(): Promise<number> {
        const result = await this.ctx.db.collection('student.analytics.stats' as any).updateMany(
            {},
            { $set: { dirty: true } },
        );
        return result.modifiedCount;
    }
}

