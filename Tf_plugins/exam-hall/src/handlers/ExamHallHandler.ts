import { Handler, PRIV } from 'hydrooj';
import CertificateLeaderboardService from '../services/CertificateLeaderboardService';

/**
 * 赛考大厅主页处理器
 * 展示证书统计、排行榜和趋势分析
 */
export class ExamHallHandler extends Handler {
    /**
     * GET /exam/hall
     * 赛考大厅主页 - 展示全域统计、用户排行榜、热门分类等数据
     */
    async get() {
        try {
            const uid = this.user?._id;
            const leaderboardService = new CertificateLeaderboardService(this.ctx);

            // 获取全域统计数据
            const rawDomainStats = await leaderboardService.getDomainStats();

            // 计算每个用户的平均证书数 和 分类数
            const averageCertificatesPerUser = rawDomainStats.totalUsers > 0
                ? rawDomainStats.totalCertificates / rawDomainStats.totalUsers
                : 0;
            const categoryCount = rawDomainStats.categoriesBreakdown.length;

            // 转换为React组件期望的格式
            const domainStats = {
                totalCertificates: rawDomainStats.totalCertificates,
                totalUsers: rawDomainStats.totalUsers,
                averageCertificatesPerUser,
                categoryCount,
            };

            // 获取用户个人数据
            let userStats: any = null;
            let userRank: any = null;
            if (uid) {
                const rawUserStats = await this.ctx.db.collection('exam.user_stats').findOne({
                    domainId: this.domain._id,
                    uid,
                });

                if (rawUserStats) {
                    // 获取用户的顶部分类（按数量排序）
                    const categoryEntries = Object.entries(rawUserStats.categoryStats || {})
                        .map(([cat, count]: [string, any]) => ({ cat, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 3)
                        .map(({ cat }) => cat);

                    userStats = {
                        uid,
                        domainId: rawUserStats.domainId,
                        totalCertificates: rawUserStats.totalCertificates,
                        topCategories: categoryEntries,
                        lastCertificateDate: rawUserStats.lastCertificateDate,
                    };
                }

                userRank = await leaderboardService.getUserRank(uid);
            }

            // 获取排行榜数据 (Top 10) 并添加排名信息
            const rawLeaderboard = await leaderboardService.getUserLeaderboard(10, 0);
            const leaderboard = rawLeaderboard.map((entry: any, index: number) => {
                // 按证书数量排序分类，取前3个
                const topCategories = entry.categories
                    ? Object.entries(entry.categories as Record<string, number>)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([cat]) => cat)
                    : [];

                return {
                    uid: entry.uid,
                    rank: index + 1,
                    certificateCount: entry.totalCertificates,
                    topCategories,
                };
            });

            // 获取热门分类 (Top 5)
            const rawPopularCategories = await leaderboardService.getPopularCategories(5);
            const popularCategories = rawPopularCategories.map((cat: any) => ({
                category: cat.category,
                count: cat.count,
            }));

            // 获取增长趋势 (最近30天)
            const growthTrend = await leaderboardService.getGrowthTrend(30);

            // 获取新用户统计 (最近30天)
            const newUsersStats = await leaderboardService.getNewUsersStats(30);

            // 获取相关用户信息
            let udocs: Record<number, any> = {};
            try {
                if (global.Hydro?.model?.user) {
                    const UserModel = global.Hydro.model.user;
                    const userIds = leaderboard.map((entry: any) => entry.uid);
                    if (userIds.length > 0) {
                        const docs = await UserModel.getList(this.domain._id, userIds);
                        udocs = docs || {};
                    }
                }
            } catch (err) {
                // 如果获取用户信息失败，继续使用空对象
            }

            // 检查管理权限
            const canManage = !!(this.user?.perm && (this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM)));

            // 返回HTML模板渲染
            this.response.template = 'exam_hall.html';
            this.response.body = {
                domainStats,
                userStats,
                userRank,
                leaderboard,
                popularCategories,
                growthTrend,
                newUsersStats,
                udocs,
                canManage,
                isLoggedIn: !!uid,
            };
        } catch (error: any) {
            this.response.status = 500;
            this.response.body = `加载赛考大厅失败: ${(error as any).message}`;
        }
    }
}
