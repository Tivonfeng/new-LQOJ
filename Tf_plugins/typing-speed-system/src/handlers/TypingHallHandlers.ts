import { Handler, PRIV } from 'hydrooj';
import avatar from 'hydrooj/src/lib/avatar';
import {
    TypingAnalyticsService,
    TypingRecordService,
    TypingStatsService,
} from '../services';

/**
 * 打字大厅处理器
 * 路由: /typing/hall
 * 功能: 打字系统总入口，展示排行榜、统计数据、数据可视化
 */
export class TypingHallHandler extends Handler {
    async get() {
        const uid = this.user?._id;
        const recordService = new TypingRecordService(this.ctx);
        const statsService = new TypingStatsService(this.ctx, recordService);
        const analyticsService = new TypingAnalyticsService(this.ctx, recordService, statsService);

        // 获取全局统计
        const globalStats = await analyticsService.getGlobalStats();

        // 获取用户个人数据（暂不使用 domainId 过滤，与其他查询保持一致）
        let userStats: import('../services/TypingStatsService').TypingUserStats | null = null;
        let userMaxRank: number | null = null;
        let userAvgRank: number | null = null;
        if (uid) {
            userStats = await statsService.getUserStats(uid);
            if (userStats) {
                userMaxRank = await statsService.getUserRank(uid, 'max');
                userAvgRank = await statsService.getUserRank(uid, 'avg');
            }
        }

        // 获取排行榜 Top 10（暂不使用 domainId 过滤，与其他查询保持一致）
        const maxWpmRanking = await statsService.getMaxWpmRanking(10);
        const avgWpmRanking = await statsService.getAvgWpmRanking(10);
        const improvementRanking = await statsService.getImprovementRanking(10);

        // 获取最近记录
        const recentRecords = await recordService.getRecentRecords(10);

        // 获取速度分布
        const speedDistribution = await analyticsService.getSpeedDistribution();

        // 获取用户速度点数据（用于散点图）
        const userSpeedPoints = await analyticsService.getUserSpeedPoints();

        // 获取周趋势
        const weeklyTrend = await analyticsService.getWeeklyTrend();

        // 获取所有涉及的用户ID
        const rankingUids = [
            ...maxWpmRanking.map((u) => u.uid),
            ...avgWpmRanking.map((u) => u.uid),
            ...improvementRanking.map((u) => u.uid),
            ...recentRecords.map((r) => r.uid),
            ...userSpeedPoints.map((p) => p.uid),
        ];
        const allUids = [...new Set(rankingUids)];

        // 获取用户信息
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, allUids);

        // 检查管理权限
        const canManage = this.user?.priv && this.user.priv & PRIV.PRIV_EDIT_SYSTEM;

        // 格式化最近记录
        const formattedRecentRecords = recordService.formatRecords(recentRecords);

        // 将udocs转换为简化的JSON格式，包含头像URL
        const udocsSimplified = {};
        for (const userId in udocs) {
            udocsSimplified[userId] = {
                uname: udocs[userId].uname,
                displayName: udocs[userId].displayName,
                mail: udocs[userId].mail,
                avatar: udocs[userId].avatar,
                avatarUrl: avatar(udocs[userId].avatar, 32), // 生成32px的头像URL
            };
        }

        this.response.template = 'typing_hall.html';
        this.response.body = {
            globalStats,
            globalStatsJSON: JSON.stringify(globalStats),
            userStats: userStats || { maxWpm: 0, avgWpm: 0, totalRecords: 0 },
            userStatsJSON: JSON.stringify(userStats || { maxWpm: 0, avgWpm: 0, totalRecords: 0 }),
            userMaxRank,
            userAvgRank,
            maxWpmRanking,
            maxWpmRankingJSON: JSON.stringify(maxWpmRanking),
            avgWpmRanking,
            avgWpmRankingJSON: JSON.stringify(avgWpmRanking),
            improvementRanking,
            improvementRankingJSON: JSON.stringify(improvementRanking),
            recentRecords: formattedRecentRecords,
            recentRecordsJSON: JSON.stringify(formattedRecentRecords),
            speedDistribution,
            userSpeedPoints,
            userSpeedPointsJSON: JSON.stringify(userSpeedPoints),
            udocsJSON: JSON.stringify(udocsSimplified),
            weeklyTrend,
            weeklyTrendJSON: JSON.stringify(weeklyTrend),
            udocs,
            canManage,
            isLoggedIn: !!uid,
        };
    }
}

/**
 * 完整排行榜处理器
 * 路由: /typing/ranking
 * 功能: 显示完整的排行榜，支持分页和多种排序方式
 */
export class TypingRankingHandler extends Handler {
    async get() {
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const type = (this.request.query.type as string) || 'max'; // max, avg, improvement
        const limit = 50;
        const skip = (page - 1) * limit;

        const recordService = new TypingRecordService(this.ctx);
        const statsService = new TypingStatsService(this.ctx, recordService);

        let users: any[] = [];
        let total = 0;

        if (type === 'improvement') {
            // 进步排行榜（全域统一数据）
            const allImprovements = await statsService.getImprovementRanking(1000);
            total = allImprovements.length;
            users = allImprovements.slice(skip, skip + limit);
        } else {
            // 最高速度或平均速度排行榜（全域统一数据）
            const sortField = type === 'max' ? 'maxWpm' : 'avgWpm';
            users = await this.ctx.db.collection('typing.stats' as any)
                .find({})
                .sort({ [sortField]: -1, lastUpdated: 1 })
                .skip(skip)
                .limit(limit)
                .toArray();

            total = await this.ctx.db.collection('typing.stats' as any)
                .countDocuments({});
        }

        // 获取用户信息
        const uids = users.map((u) => u.uid);
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

        this.response.template = 'typing_ranking.html';
        this.response.body = {
            users,
            udocs,
            page,
            total,
            totalPages: Math.ceil(total / limit),
            type,
        };
    }
}
