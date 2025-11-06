import { Handler } from 'hydrooj';
import CertificateLeaderboardService from '../services/CertificateLeaderboardService';

// ============================================================================
// 常量定义
// ============================================================================
const CONSTANTS = {
    // 排行榜限制
    MAX_LEADERBOARD_LIMIT: 500,
    DEFAULT_LEADERBOARD_LIMIT: 50,
    MAX_SKIP_OFFSET: 1000000,

    // 趋势统计
    MAX_TREND_DAYS: 365,
    DEFAULT_TREND_DAYS: 30,
    MIN_TREND_DAYS: 1,

    // 热门分类
    MAX_CATEGORIES_LIMIT: 100,
    DEFAULT_CATEGORIES_LIMIT: 5,
};

/**
 * 排行榜处理器
 */
export class LeaderboardHandler extends Handler {
    /**
     * GET /exam/leaderboard
     * 获取用户排行榜
     */
    async get() {
        const type = (this.request.query?.type as string) || 'total';
        const category = this.request.query?.category as string;

        // 参数验证和边界检查
        let limit = Number.parseInt((this.request.query?.limit as string) || String(CONSTANTS.DEFAULT_LEADERBOARD_LIMIT));
        if (Number.isNaN(limit) || limit < 1) limit = CONSTANTS.DEFAULT_LEADERBOARD_LIMIT;
        limit = Math.min(limit, CONSTANTS.MAX_LEADERBOARD_LIMIT);

        let skip = Number.parseInt((this.request.query?.skip as string) || '0');
        if (Number.isNaN(skip) || skip < 0) skip = 0;
        if (skip > CONSTANTS.MAX_SKIP_OFFSET) skip = CONSTANTS.MAX_SKIP_OFFSET;

        try {
            const leaderboardService = new CertificateLeaderboardService(this.ctx);

            let leaderboard;

            if (type === 'category' && category) {
                // 获取按分类的排行榜
                leaderboard = await leaderboardService.getCategoryLeaderboard(
                    category as string,
                    limit,
                );
            } else {
                // 获取总排行榜
                leaderboard = await leaderboardService.getUserLeaderboard(limit, skip);
            }

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                leaderboard,
                type,
                category: category || null,
            };
        } catch (error: any) {
            this.response.type = 'application/json';
            this.response.status = 500;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}

/**
 * 用户排名处理器
 */
export class UserRankHandler extends Handler {
    /**
     * GET /exam/rank/:uid
     * 获取用户排名
     */
    async get() {
        const uid = this.request.params?.uid as string;
        const category = this.request.query?.category as string;

        if (!uid) {
            this.response.type = 'application/json';
            this.response.status = 400;
            this.response.body = {
                success: false,
                error: '缺少 uid 参数',
            };
            return;
        }

        // 验证 UID 是有效的数字
        const parsedUid = Number.parseInt(uid);
        if (Number.isNaN(parsedUid) || parsedUid < 0) {
            this.response.type = 'application/json';
            this.response.status = 400;
            this.response.body = {
                success: false,
                error: '无效的 uid 参数：必须是正整数',
            };
            return;
        }

        try {
            const leaderboardService = new CertificateLeaderboardService(this.ctx);

            let rankInfo;

            if (category) {
                rankInfo = await leaderboardService.getCategoryRank(
                    parsedUid,
                    category as string,
                );
            } else {
                rankInfo = await leaderboardService.getUserRank(parsedUid);
            }

            if (!rankInfo) {
                this.response.type = 'application/json';
                this.response.status = 404;
                this.response.body = {
                    success: false,
                    error: '用户暂无排名',
                };
                return;
            }

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                uid: parsedUid,
                rank: rankInfo.rank,
                total: rankInfo.total,
                category: category || null,
            };
        } catch (error: any) {
            this.response.type = 'application/json';
            this.response.status = 500;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}

/**
 * 全域统计处理器
 */
export class DomainStatsHandler extends Handler {
    /**
     * GET /exam/stats/domain
     * 获取全域统计信息
     */
    async get() {
        try {
            const leaderboardService = new CertificateLeaderboardService(this.ctx);
            const stats = await leaderboardService.getDomainStats();

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                stats,
            };
        } catch (error: any) {
            this.response.type = 'application/json';
            this.response.status = 500;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}

/**
 * 增长趋势处理器
 */
export class GrowthTrendHandler extends Handler {
    /**
     * GET /exam/stats/trend
     * 获取证书增长趋势
     */
    async get() {
        const type = (this.request.query?.type as string) || 'certificates';

        // 参数验证和边界检查：days 必须在 1 到 365 天之间
        let days = Number.parseInt((this.request.query?.days as string) || String(CONSTANTS.DEFAULT_TREND_DAYS));
        if (Number.isNaN(days) || days < CONSTANTS.MIN_TREND_DAYS) days = CONSTANTS.DEFAULT_TREND_DAYS;
        days = Math.min(days, CONSTANTS.MAX_TREND_DAYS);

        try {
            const leaderboardService = new CertificateLeaderboardService(this.ctx);

            let trend;

            if (type === 'new-users') {
                const newUsersStats = await leaderboardService.getNewUsersStats(days);
                trend = newUsersStats.trend;
            } else {
                trend = await leaderboardService.getGrowthTrend(days);
            }

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                trend,
                type,
                days,
            };
        } catch (error: any) {
            this.response.type = 'application/json';
            this.response.status = 500;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}

/**
 * 热门分类处理器
 */
export class PopularCategoriesHandler extends Handler {
    /**
     * GET /exam/stats/popular-categories
     * 获取热门分类
     */
    async get() {
        // 参数验证和边界检查：limit 必须在 1 到 100 之间
        let limit = Number.parseInt((this.request.query?.limit as string) || String(CONSTANTS.DEFAULT_CATEGORIES_LIMIT));
        if (Number.isNaN(limit) || limit < 1) limit = CONSTANTS.DEFAULT_CATEGORIES_LIMIT;
        limit = Math.min(limit, CONSTANTS.MAX_CATEGORIES_LIMIT);

        try {
            const leaderboardService = new CertificateLeaderboardService(this.ctx);
            const categories = await leaderboardService.getPopularCategories(limit);

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                categories,
            };
        } catch (error: any) {
            this.response.type = 'application/json';
            this.response.status = 500;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}
