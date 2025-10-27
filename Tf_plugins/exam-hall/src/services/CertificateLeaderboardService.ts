import { Context } from 'hydrooj';

export interface UserLeaderboardEntry {
    uid: number;
    username?: string;
    totalCertificates: number;
    categories: Record<string, number>;
    latestCertificateDate?: Date;
    score?: number;
}

export interface CategoryStats {
    category: string;
    count: number;
    users: number;
}

export interface DomainStats {
    totalCertificates: number;
    totalUsers: number;
    categoriesBreakdown: CategoryStats[];
    topUsers: UserLeaderboardEntry[];
}

/**
 * 证书排行榜和统计服务
 */
export class CertificateLeaderboardService {
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    /**
     * 获取用户排行榜（按证书数量）
     */
    async getUserLeaderboard(
    limit = 100,
    skip = 0,
    ): Promise<UserLeaderboardEntry[]> {
        try {
            const statsCollection = this.ctx.db.collection('exam.user_stats');

            const leaderboard = await statsCollection
                .aggregate([
                    {
                        $match: {
                            domainId: this.ctx.domain!._id,
                            totalCertificates: { $gt: 0 },
                        },
                    },
                    // 使用稳定的排序：先按证书数量降序，再按 uid 升序（保证分页稳定性）
                    { $sort: { totalCertificates: -1, uid: 1 } },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: 'users',
                            let: { uid: '$uid' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
                                { $project: { _id: 0, username: 1 } },
                            ],
                            as: 'user',
                        },
                    },
                    {
                        $project: {
                            uid: 1,
                            username: { $arrayElemAt: ['$user.username', 0] },
                            totalCertificates: 1,
                            categories: '$categoryStats',
                            latestCertificateDate: '$lastCertificateDate',
                        },
                    },
                ])
                .toArray() as UserLeaderboardEntry[];

            return leaderboard;
        } catch (err: any) {
            console.error(`[ExamHall] 获取排行榜异常: ${err.message}`);
            return [];
        }
    }

    /**
     * 获取按分类的排行榜
     */
    async getCategoryLeaderboard(
        category: string,
    limit = 100,
    ): Promise<UserLeaderboardEntry[]> {
        try {
            const statsCollection = this.ctx.db.collection('exam.user_stats');

            const leaderboard = await statsCollection
                .aggregate([
                    {
                        $match: {
                            domainId: this.ctx.domain!._id,
                            [`categoryStats.${category}`]: { $gt: 0 },
                        },
                    },
                    {
                        $addFields: {
                            categoryCount: `$categoryStats.${category}`,
                        },
                    },
                    // 使用稳定的排序：先按分类数量降序，再按 uid 升序
                    { $sort: { categoryCount: -1, uid: 1 } },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: 'users',
                            let: { uid: '$uid' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$_id', '$$uid'] } } },
                                { $project: { _id: 0, username: 1 } },
                            ],
                            as: 'user',
                        },
                    },
                    {
                        $project: {
                            uid: 1,
                            username: { $arrayElemAt: ['$user.username', 0] },
                            totalCertificates: '$categoryCount',
                            categories: '$categoryStats',
                        },
                    },
                ])
                .toArray() as UserLeaderboardEntry[];

            return leaderboard;
        } catch (err: any) {
            console.error(`[ExamHall] 获取分类排行榜异常: ${err.message}`);
            return [];
        }
    }

    /**
     * 获取全域证书统计
     */
    async getDomainStats(): Promise<DomainStats> {
        try {
            const certCollection = this.ctx.db.collection('exam.certificates');
            const statsCollection = this.ctx.db.collection('exam.user_stats');

            // 总证书数
            const totalCertificates = await certCollection.countDocuments({
                domainId: this.ctx.domain!._id,
                status: 'active',
            });

            // 拥有证书的用户数
            const totalUsers = await statsCollection.countDocuments({
                domainId: this.ctx.domain!._id,
                totalCertificates: { $gt: 0 },
            });

            // 分类统计
            const categoryStats = (await certCollection
                .aggregate([
                    {
                        $match: {
                            domainId: this.ctx.domain!._id,
                            status: 'active',
                        },
                    },
                    {
                        $group: {
                            _id: '$category',
                            count: { $sum: 1 },
                            users: { $addToSet: '$uid' },
                        },
                    },
                    {
                        $project: {
                            category: '$_id',
                            count: 1,
                            users: { $size: '$users' },
                            _id: 0,
                        },
                    },
                    { $sort: { count: -1 } },
                ])
                .toArray()) as CategoryStats[];

            // 获取前10用户
            const topUsers = await this.getUserLeaderboard(10, 0);

            return {
                totalCertificates,
                totalUsers,
                categoriesBreakdown: categoryStats,
                topUsers,
            };
        } catch (err: any) {
            console.error(`[ExamHall] 获取全域统计异常: ${err.message}`);
            return {
                totalCertificates: 0,
                totalUsers: 0,
                categoriesBreakdown: [],
                topUsers: [],
            };
        }
    }

    /**
     * 获取用户排名
     */
    async getUserRank(uid: number): Promise<{ rank: number, totalUsers: number } | null> {
        try {
            const statsCollection = this.ctx.db.collection('exam.user_stats');

            const userStats = await statsCollection.findOne({
                domainId: this.ctx.domain!._id,
                uid,
            });

            if (!userStats || userStats.totalCertificates === 0) {
                return null;
            }

            // 统计排名
            const rank =
                (await statsCollection.countDocuments({
                    domainId: this.ctx.domain!._id,
                    totalCertificates: { $gt: userStats.totalCertificates },
                })) + 1;

            const totalUsers = await statsCollection.countDocuments({
                domainId: this.ctx.domain!._id,
                totalCertificates: { $gt: 0 },
            });

            return { rank, totalUsers };
        } catch (err: any) {
            console.error(`[ExamHall] 获取用户排名异常: ${err.message}`);
            return null;
        }
    }

    /**
     * 获取分类排名
     */
    async getCategoryRank(
        uid: number,
        category: string,
    ): Promise<{ rank: number, total: number } | null> {
        try {
            const statsCollection = this.ctx.db.collection('exam.user_stats');

            const userStats = await statsCollection.findOne({
                domainId: this.ctx.domain!._id,
                uid,
            });

            if (!userStats || !userStats.categoryStats || !userStats.categoryStats[category]) {
                return null;
            }

            const userCount = userStats.categoryStats[category];

            // 统计排名
            const rank =
                (await statsCollection.countDocuments({
                    domainId: this.ctx.domain!._id,
                    [`categoryStats.${category}`]: { $gt: userCount },
                })) + 1;

            const total = await statsCollection.countDocuments({
                domainId: this.ctx.domain!._id,
                [`categoryStats.${category}`]: { $gt: 0 },
            });

            return { rank, total };
        } catch (err: any) {
            console.error(`[ExamHall] 获取分类排名异常: ${err.message}`);
            return null;
        }
    }

    /**
     * 获取增长趋势（最近N天）
     */
    async getGrowthTrend(days = 30): Promise<Array<{ date: string, count: number }>> {
        try {
            const certCollection = this.ctx.db.collection('exam.certificates');
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const trend = await certCollection
                .aggregate([
                    {
                        $match: {
                            domainId: this.ctx.domain!._id,
                            createdAt: { $gte: startDate },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: '%Y-%m-%d',
                                    date: '$createdAt',
                                },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            date: '$_id',
                            count: 1,
                            _id: 0,
                        },
                    },
                    { $sort: { date: 1 } },
                ])
                .toArray() as Array<{ date: string, count: number }>;

            return trend;
        } catch (err: any) {
            console.error(`[ExamHall] 获取增长趋势异常: ${err.message}`);
            return [];
        }
    }

    /**
     * 获取热门分类
     */
    async getPopularCategories(limit = 5): Promise<CategoryStats[]> {
        try {
            const certCollection = this.ctx.db.collection('exam.certificates');

            const categories = (await certCollection
                .aggregate([
                    {
                        $match: {
                            domainId: this.ctx.domain!._id,
                            status: 'active',
                        },
                    },
                    {
                        $group: {
                            _id: '$category',
                            count: { $sum: 1 },
                            users: { $addToSet: '$uid' },
                        },
                    },
                    {
                        $project: {
                            category: '$_id',
                            count: 1,
                            users: { $size: '$users' },
                            _id: 0,
                        },
                    },
                    { $sort: { count: -1 } },
                    { $limit: limit },
                ])
                .toArray()) as CategoryStats[];

            return categories;
        } catch (err: any) {
            console.error(`[ExamHall] 获取热门分类异常: ${err.message}`);
            return [];
        }
    }

    /**
     * 获取新增用户统计（最近N天新增）
     */
    async getNewUsersStats(days = 30): Promise<{ count: number, trend: Array<{ date: string, count: number }> }> {
        try {
            const statsCollection = this.ctx.db.collection('exam.user_stats');
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            // 新增用户总数
            const newUsersCount = await statsCollection.countDocuments({
                domainId: this.ctx.domain!._id,
                createdAt: { $gte: startDate },
            });

            // 按日期统计新增
            const trend = await statsCollection
                .aggregate([
                    {
                        $match: {
                            domainId: this.ctx.domain!._id,
                            createdAt: { $gte: startDate },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: '%Y-%m-%d',
                                    date: '$createdAt',
                                },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $project: {
                            date: '$_id',
                            count: 1,
                            _id: 0,
                        },
                    },
                    { $sort: { date: 1 } },
                ])
                .toArray() as Array<{ date: string, count: number }>;

            return { count: newUsersCount, trend };
        } catch (err: any) {
            console.error(`[ExamHall] 获取新增用户统计异常: ${err.message}`);
            return { count: 0, trend: [] };
        }
    }
}

export default CertificateLeaderboardService;
