import { avatar, Handler, PRIV } from 'hydrooj';
import { getTypingServices } from '../utils/ctxHelper';

/**
 * 打字大厅处理器
 * 路由: /typing/hall
 * 功能: 打字系统总入口，展示排行榜、统计数据、数据可视化
 *
 * 同路由双模式：
 *  - 浏览器普通 GET（Accept: text/html）：渲染页面，首屏仅带 20 条排行榜/最近记录
 *  - fetch GET（Accept: application/json，带 ?section=...）：返回分页 JSON，供前端翻页
 */
export class TypingHallHandler extends Handler {
    async get() {
        const uid = this.user?._id;
        const { recordService, statsService, analyticsService } = getTypingServices(this.ctx);
        if (!recordService || !statsService || !analyticsService) {
            this.response.body = { error: '打字系统服务未就绪' };
            return;
        }

        // 同路由双模式：JSON 请求且带 section 参数时返回分页数据，不渲染页面
        const isApiRequest = this.request.json
            || (this.request.headers.accept || '').includes('application/json');
        const section = this.request.query?.section as string;
        if (isApiRequest && section) {
            await this.handleApiRequest(section, { recordService, statsService });
            return;
        }

        // 获取全局统计
        const globalStats = await analyticsService.getGlobalStats();

        // 获取用户个人数据（全域统一，与其他查询保持一致）
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

        // 首屏只带 20 条排行榜与最近记录，翻页走分页 API，降低首屏体积
        const initialLimit = 20;
        const maxWpmRanking = await statsService.getMaxWpmRanking(initialLimit);
        const avgWpmRanking = await statsService.getAvgWpmRanking(initialLimit);
        const improvementRanking = await statsService.getImprovementRanking(initialLimit);
        const recentRecords = await recordService.getRecentRecords(initialLimit);

        // 获取速度分布
        const speedDistribution = await analyticsService.getSpeedDistribution();

        // 获取用户速度点数据（用于散点图）
        const userSpeedPoints = await analyticsService.getUserSpeedPoints();

        // 获取周趋势
        const weeklyTrend = await analyticsService.getWeeklyTrend();

        // 获取所有涉及的用户ID
        const rankingUids = [
            ...maxWpmRanking.map((u: any) => u.uid),
            ...avgWpmRanking.map((u: any) => u.uid),
            ...improvementRanking.map((u: any) => u.uid),
            ...recentRecords.map((r: any) => r.uid),
            ...userSpeedPoints.map((p: any) => p.uid),
        ];
        const allUids = [...new Set(rankingUids)];

        // 获取用户信息
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, allUids);

        // 检查管理权限
        const canManage = this.user?.priv && this.user.priv & PRIV.PRIV_EDIT_SYSTEM;

        // 将udocs转换为简化的JSON格式，包含头像URL
        const udocsSimplified: Record<string, any> = {};
        for (const userId in udocs) {
            udocsSimplified[userId] = {
                uname: udocs[userId].uname,
                displayName: udocs[userId].displayName,
                mail: udocs[userId].mail,
                avatar: udocs[userId].avatar,
                avatarUrl: avatar(udocs[userId].avatar, 32), // 生成32px的头像URL
            };
        }

        // recentRecords 直接传原始记录，createdAt 保持 Date（JSON.stringify 自动转 ISO）

        // 赛季数据（融合到大厅 Tab 展示，需要完整赛季信息）
        let seasonData: any = null;
        const { seasonService, poisonZoneService } = getTypingServices(this.ctx);
        if (seasonService) {
            const currentSeason = await seasonService.getCurrentSeason();
            if (currentSeason) {
                // 当前用户的报名状态和毒圈预览
                let myRegistration: any = null;
                let deductPreview: any = null;
                if (uid) {
                    myRegistration = await seasonService.getRegistration(currentSeason._id, uid);
                    if (myRegistration && poisonZoneService) {
                        deductPreview = await poisonZoneService.getUpcomingDeductPreview(uid);
                    }
                }
                // 赛季排行榜
                const seasonRanking = await seasonService.getSeasonRanking(currentSeason._id, 50);
                // 赛季统计
                const seasonStats = await seasonService.getSeasonStats(currentSeason._id);
                // 历史赛季
                const recentSeasons = await seasonService.getRecentSeasons(5);

                // 合并排行榜与当前用户涉及的 uid，补充用户信息
                const seasonUids = seasonRanking.map((r: any) => r.uid);
                const seasonAllUids = uid
                    ? [...new Set([...seasonUids, uid])]
                    : [...new Set(seasonUids)];
                const UserModel2 = global.Hydro.model.user;
                const seasonUdocsRaw = seasonAllUids.length > 0
                    ? await UserModel2.getList(this.domain._id, seasonAllUids)
                    : {};
                const seasonUdocs: Record<string, any> = {};
                for (const userId in seasonUdocsRaw) {
                    seasonUdocs[userId] = {
                        uname: seasonUdocsRaw[userId].uname,
                        displayName: seasonUdocsRaw[userId].displayName,
                        avatarUrl: avatar(seasonUdocsRaw[userId].avatar, 32),
                    };
                }

                seasonData = {
                    currentSeason,
                    recentSeasons,
                    myRegistration,
                    deductPreview,
                    seasonRanking,
                    seasonStats,
                    udocs: seasonUdocs,
                };
            }
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
            recentRecords,
            speedDistribution,
            userSpeedPoints,
            weeklyTrend,
            udocs: udocsSimplified,
            canManage,
            isLoggedIn: !!uid,
            currentUserId: uid || null,
            seasonData,
        };
    }

    /**
     * 处理分页 API 请求（同路由双模式的 JSON 分支）
     * section=ranking -> 排行榜分页（type=max|avg|improvement）
     * section=records -> 最近记录分页
     */
    private async handleApiRequest(
        section: string,
        services: { recordService: any, statsService: any },
    ) {
        const { recordService, statsService } = services;
        const page = Math.max(1, Number.parseInt(this.request.query?.page as string) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(this.request.query?.limit as string) || 10));

        if (section === 'ranking') {
            const type = (this.request.query?.type as string) || 'max';
            if (type === 'improvement') {
                // 进步榜数据量不大，取较大集合后内存分页
                const all = await statsService.getImprovementRanking(1000);
                const total = all.length;
                const users = all.slice((page - 1) * limit, page * limit);
                this.response.type = 'application/json';
                this.response.body = {
                    success: true,
                    data: users,
                    total,
                    totalPages: Math.ceil(total / limit),
                    page,
                    limit,
                };
                return;
            }
            const result = await statsService.getRankingWithPagination(type as 'max' | 'avg', page, limit);
            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                data: result.users,
                total: result.total,
                totalPages: result.totalPages,
                page,
                limit,
            };
            return;
        }

        if (section === 'records') {
            const result = await recordService.getRecordsWithPagination(page, limit);
            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                data: result.records,
                total: result.total,
                totalPages: result.totalPages,
                page,
                limit,
            };
            return;
        }

        this.response.type = 'application/json';
        this.response.body = { success: false, message: '未知的 section 参数' };
    }
}

// 排行榜功能已集成到打字大厅页面，不再需要单独的排行榜页面
// 如需恢复，可以取消下面的注释
/*
export class TypingRankingHandler extends Handler {
    async get() {
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const type = (this.request.query.type as string) || 'max'; // max, avg, improvement
        const limit = 50;
        const skip = (page - 1) * limit;

        const { recordService, statsService } = getTypingServices(this.ctx);

        let users: any[] = [];
        let total = 0;

        if (type === 'improvement') {
            // 进步排行榜（全域统一数据）
            const allImprovements = await statsService.getImprovementRanking(1000);
            total = allImprovements.length;
            users = allImprovements.slice(skip, skip + limit);
        } else {
            // 最高速度或平均速度排行榜（使用 service 方法）
            const rankingResult = await statsService.getRankingWithPagination(
                type as 'max' | 'avg',
                page,
                limit,
            );
            users = rankingResult.users;
            total = rankingResult.total;
        }

        // 获取用户信息
        const uids = users.map((u: any) => u.uid);
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
*/
