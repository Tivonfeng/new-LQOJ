import { Handler } from 'hydrooj';
import CertificateLeaderboardService from '../services/CertificateLeaderboardService';

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
        let limit = Math.min(Math.max(1, Number.parseInt((this.request.query?.limit as string) || '50')), 500);
        let skip = Math.max(0, Number.parseInt((this.request.query?.skip as string) || '0'));

        // 防止过大的 skip 值导致内存溢出
        if (skip > 1000000) {
            skip = 1000000;
        }

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

        try {
            const leaderboardService = new CertificateLeaderboardService(this.ctx);

            let rankInfo;

            if (category) {
                rankInfo = await leaderboardService.getCategoryRank(
                    Number.parseInt(uid),
                    category as string,
                );
            } else {
                rankInfo = await leaderboardService.getUserRank(Number.parseInt(uid));
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
                uid: Number.parseInt(uid),
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
        const days = Math.min(Math.max(1, Number.parseInt((this.request.query?.days as string) || '30')), 365);

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
        const limit = Math.min(Math.max(1, Number.parseInt((this.request.query?.limit as string) || '5')), 100);

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
