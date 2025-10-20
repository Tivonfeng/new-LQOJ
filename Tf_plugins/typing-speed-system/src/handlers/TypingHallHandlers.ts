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

        // 获取用户个人数据
        let userStats = null;
        let userMaxRank = null;
        let userAvgRank = null;
        if (uid) {
            userStats = await statsService.getUserStats(uid, this.domain._id);
            if (userStats) {
                userMaxRank = await statsService.getUserRank(uid, 'max', this.domain._id);
                userAvgRank = await statsService.getUserRank(uid, 'avg', this.domain._id);
            }
        }

        // 获取排行榜 Top 10
        const maxWpmRanking = await statsService.getMaxWpmRanking(10, this.domain._id);
        const avgWpmRanking = await statsService.getAvgWpmRanking(10, this.domain._id);
        const improvementRanking = await statsService.getImprovementRanking(10, this.domain._id);

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
        for (const uid in udocs) {
            udocsSimplified[uid] = {
                uname: udocs[uid].uname,
                displayName: udocs[uid].displayName,
                mail: udocs[uid].mail,
                avatar: udocs[uid].avatar,
                avatarUrl: avatar(udocs[uid].avatar, 32), // 生成32px的头像URL
            };
        }

        this.response.template = 'typing_hall.html';
        this.response.body = {
            globalStats,
            userStats: userStats || { maxWpm: 0, avgWpm: 0, totalRecords: 0 },
            userMaxRank,
            userAvgRank,
            maxWpmRanking,
            avgWpmRanking,
            improvementRanking,
            recentRecords: formattedRecentRecords,
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

        let users = [];
        let total = 0;

        if (type === 'improvement') {
            // 进步排行榜
            const allImprovements = await statsService.getImprovementRanking(1000, this.domain._id);
            total = allImprovements.length;
            users = allImprovements.slice(skip, skip + limit);
        } else {
            // 最高速度或平均速度排行榜
            const sortField = type === 'max' ? 'maxWpm' : 'avgWpm';
            users = await this.ctx.db.collection('typing.stats' as any)
                .find({ domainId: this.domain._id })
                .sort({ [sortField]: -1, lastUpdated: 1 })
                .skip(skip)
                .limit(limit)
                .toArray();

            total = await this.ctx.db.collection('typing.stats' as any)
                .countDocuments({ domainId: this.domain._id });
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
