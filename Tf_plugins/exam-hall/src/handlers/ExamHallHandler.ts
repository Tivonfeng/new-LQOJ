import { Handler, PRIV } from 'hydrooj';
import CertificateLeaderboardService from '../services/CertificateLeaderboardService';
import CertificateService from '../services/CertificateService';

/**
 * 赛考大厅主页处理器
 * 路由: /exam/hall
 * 功能: 赛考系统总入口，展示证书统计、用户排行榜、热门分类、增长趋势分析
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
            const certService = new CertificateService(this.ctx);

            // 📊 阶段1: 获取全域统计数据（包含竞赛和考级）
            const rawDomainStats = await leaderboardService.getDomainStats();
            const domainStats = this.formatDomainStats(rawDomainStats);

            // 🏆 阶段1.5: 获取竞赛和考级的特定统计
            const competitionStats = await certService.getCompetitionStats();
            const certificationStats = await certService.getCertificationStats();
            const certificationSeriesStats = await certService.getCertificationSeriesStats();

            // 👤 阶段2: 获取当前用户个人数据（如果已登录）
            let userStats: any = null;
            let userRank: any = null;
            let userCompetitionRank: any = null;
            let userCertificationRank: any = null;
            if (uid) {
                userStats = await this.getUserStats(uid);
                userRank = await certService.getUserComprehensiveRank(uid);
                userCompetitionRank = await certService.getUserCompetitionRank(uid);
                userCertificationRank = await certService.getUserCertificationRank(uid);
            }

            // 🏆 阶段3: 获取排行榜数据并格式化
            const rawLeaderboard = await leaderboardService.getUserLeaderboard(10, 0);
            const leaderboard = this.formatLeaderboard(rawLeaderboard);

            // 🏆 阶段3.5: 获取竞赛和考级排行榜
            const competitionLeaderboard = await certService.getCompetitionLeaderboard(10);
            const certificationLeaderboard = await certService.getCertificationLeaderboard(10);

            // 📈 阶段4: 获取热门分类和增长趋势
            const popularCategories = await this.getFormattedPopularCategories();
            const growthTrend = await leaderboardService.getGrowthTrend(30);
            const newUsersStats = await leaderboardService.getNewUsersStats(30);

            // 👥 阶段5: 获取相关用户信息用于显示用户名
            const udocs = await this.getUserDocs(leaderboard);

            // 🔐 阶段6: 检查管理权限
            const canManage = this.checkManagePermission();

            // 📊 获取用户证书数（如果已登录）
            let userCertificates = 0;
            if (uid) {
                const userCertCount = await this.ctx.db.collection('exam.certificates' as any).countDocuments({
                    domainId: this.domain._id,
                    uid,
                    status: 'active',
                });
                userCertificates = userCertCount;
            }

            // 返回HTML模板渲染
            this.response.template = 'exam_hall.html';
            this.response.body = {
                domainStats,
                userStats,
                userRank,
                userCompetitionRank,
                userCertificationRank,
                leaderboard,
                competitionLeaderboard,
                certificationLeaderboard,
                popularCategories,
                growthTrend,
                newUsersStats,
                competitionStats,
                certificationStats,
                certificationSeriesStats,
                udocs,
                canManage,
                isLoggedIn: !!uid,
                managementUrl: '/exam/admin/manage',
                totalCertificates: domainStats.totalCertificates,
                userCertificates,
            };
        } catch (error: any) {
            this.response.status = 500;
            this.response.body = `加载赛考大厅失败: ${(error as any).message}`;
        }
    }

    /**
     * 格式化全域统计数据
     * 计算额外的统计指标（如人均证书数）
     */
    private formatDomainStats(rawStats: any) {
        const averageCertificatesPerUser = rawStats.totalUsers > 0
            ? rawStats.totalCertificates / rawStats.totalUsers
            : 0;

        return {
            totalCertificates: rawStats.totalCertificates,
            uniqueUsers: rawStats.totalUsers,
            averageCertificatesPerUser,
            categories: rawStats.categoriesBreakdown || [],
        };
    }

    /**
     * 获取并格式化当前用户的个人统计数据
     */
    private async getUserStats(uid: number) {
        try {
            const rawUserStats = await this.ctx.db.collection('exam.user_stats' as any).findOne({
                domainId: this.domain._id,
                uid,
            });

            if (!rawUserStats) {
                return null;
            }

            return {
                uid,
                domainId: rawUserStats.domainId,
                totalCertificates: rawUserStats.totalCertificates,
                categoryStats: rawUserStats.categoryStats || {},
                lastCertificateDate: rawUserStats.lastCertificateDate,
                // 新增竞赛和考级统计
                competitionStats: rawUserStats.competitionStats || {
                    total: 0,
                    competitions: {},
                    weight: 0,
                },
                certificationStats: rawUserStats.certificationStats || {
                    total: 0,
                    series: {},
                    highestLevels: {},
                    weight: 0,
                },
                totalWeight: rawUserStats.totalWeight || 0,
            };
        } catch (err: any) {
            console.error(`[ExamHall] 获取用户统计数据异常: ${err.message}`);
            return null;
        }
    }

    /**
     * 格式化排行榜数据，添加排名和分类信息
     */
    private formatLeaderboard(rawLeaderboard: any[]) {
        return rawLeaderboard.map((entry: any, index: number) => {
            return {
                uid: entry.uid,
                rank: index + 1,
                totalCertificates: entry.totalCertificates,
                categoryStats: entry.categories || {},
            };
        });
    }

    /**
     * 获取并格式化热门分类数据
     */
    private async getFormattedPopularCategories() {
        const leaderboardService = new CertificateLeaderboardService(this.ctx);
        const rawPopularCategories = await leaderboardService.getPopularCategories(5);
        return rawPopularCategories.map((cat: any) => ({
            category: cat.category,
            count: cat.count,
        }));
    }

    /**
     * 获取排行榜中相关用户的信息（用于显示用户名等）
     */
    private async getUserDocs(leaderboard: any[]) {
        try {
            const userModel = global.Hydro?.model?.user;
            if (!userModel) {
                console.warn('[ExamHall] 用户模型不可用');
                return {};
            }

            // 检查 getList 方法是否存在
            if (typeof userModel.getList !== 'function') {
                console.warn('[ExamHall] UserModel.getList 不是一个函数');
                return {};
            }

            const userIds = leaderboard.map((entry: any) => entry.uid);

            if (userIds.length === 0) {
                return {};
            }

            const docs = await userModel.getList(this.domain._id, userIds);
            return docs || {};
        } catch (err: any) {
            console.error(`[ExamHall] 获取用户信息异常: ${err.message}`);
            return {};
        }
    }

    /**
     * 检查当前用户是否有管理权限
     */
    private checkManagePermission(): boolean {
        return !!(
            this.user
            && (
                this.user.role === 'admin'
                || (this.user.perm && (this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM)))
            )
        );
    }
}
