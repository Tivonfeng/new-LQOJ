import {
    Handler,
    PERM,
    PRIV,
} from 'hydrooj';
import { getScoreService } from '../registry/ServiceRegistry';
import type {
    UserScore,
} from '../services';
import { ScoreService } from '../services/ScoreService';

/**
 * 积分大厅处理器
 * 路由: /score/hall
 * 功能: 积分系统总入口，展示用户积分概览、排行榜、今日统计
 */
export class ScoreHallHandler extends Handler {
    async get() {
        const uid = this.user?._id;
        const scoreService = getScoreService();
        if (!scoreService) throw new Error('积分核心服务不可用');
        let userScore: UserScore | null = null;
        let userRank: number | string = '-';
        let recentRecords: any[] = [];
        const hasCheckedInToday = false;
        const nextReward = 10;
        const gameRemainingPlays = { lottery: 0, dice: 0, rps: 0 };

        if (uid) {
            // 获取用户积分信息
            userScore = await scoreService.getUserScore(this.domain._id, uid);

            // 获取用户排名
            if (userScore) {
                userRank = await scoreService.getUserRank(this.domain._id, uid) || '-';
            }

            // TODO: 签到相关功能需要依赖 CheckInService (from score-checkin plugin)
            // hasCheckedInToday = await checkInService.hasCheckedInToday(uid);
            // nextReward = checkInService.calculateCheckInScore(currentStreak + 1);

            // TODO: 游戏次数限制功能需要依赖 DailyGameLimitService (from other plugin)
            // gameRemainingPlays = await dailyLimitService.getAllRemainingPlays(this.domain._id, uid);
        }

        // 获取全局最近积分记录（所有用户）
        const { records: rawRecords } = await scoreService.getScoreRecordsWithPagination(this.domain._id, 1, 10);

        // 使用 service 方法格式化日期（不包含年份）
        recentRecords = scoreService.formatScoreRecords(rawRecords, false);

        // 获取积分排行榜前10
        const topUsers = await scoreService.getScoreRanking(this.domain._id, 10);

        // 获取用户信息（包括排行榜和最近记录的用户）
        const rankingUids = topUsers.map((u) => u.uid);
        const recentRecordUids = recentRecords.map((r) => r.uid);
        const allUids = [...new Set([...rankingUids, ...recentRecordUids])]; // 去重合并
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, allUids);

        // 获取今日新增积分统计
        const todayStats = await scoreService.getTodayStats(this.domain._id);

        // 检查是否有管理权限
        const canManage = this.user?.priv && this.user.priv & PRIV.PRIV_EDIT_SYSTEM;

        this.response.template = 'score_hall.html';
        this.response.body = {
            userScore: userScore || { totalScore: 0, acCount: 0 },
            currentCoins: userScore?.totalScore || 0,
            userRank,
            recentRecords,
            topUsers,
            udocs,
            todayTotalScore: todayStats.totalScore,
            todayActiveUsers: todayStats.activeUsers,
            canManage,
            isLoggedIn: !!uid,
            hasCheckedInToday,
            nextReward,
            gameRemainingPlays,
            maxDailyPlays: { lottery: 3, dice: 5, rps: 5 }, // TODO: Move to config or get from plugin
        };
    }
}

/**
 * 积分排行榜处理器
 * 路由: /score/ranking
 * 功能: 展示全站用户积分排名，支持分页
 */
export class ScoreRankingHandler extends Handler {
    async get() {
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const limit = 50;

        const scoreService = getScoreService();
        if (!scoreService) throw new Error('积分核心服务不可用');

        // 使用 service 方法获取分页排行榜数据
        const { users, total, totalPages } = await scoreService.getScoreRankingWithPagination(
            this.domain._id,
            page,
            limit,
        );

        // 获取用户信息
        const uids = users.map((u) => u.uid);
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

        // 检查是否有管理权限
        const canManage = this.user?.priv && this.user.priv & PRIV.PRIV_EDIT_SYSTEM;

        // 使用 service 方法格式化日期
        const formattedUsers = scoreService.formatUserScores(users);

        this.response.template = 'score_ranking.html';
        this.response.body = {
            users: formattedUsers,
            udocs,
            page,
            total,
            totalPages,
            canManage,
        };
    }
}

/**
 * 用户个人积分处理器
 * 路由: /score/me
 * 功能: 展示当前用户的个人积分详情和历史记录
 */
export class UserScoreHandler extends Handler {
    async get() {
        const uid = this.user._id;
        const scoreService = getScoreService();
        if (!scoreService) throw new Error('积分核心服务不可用');

        const userScore = await scoreService.getUserScore(this.domain._id, uid);
        const recentRecords = await scoreService.getUserScoreRecords(this.domain._id, uid, 20);

        // 使用 service 方法格式化日期
        const formattedRecords = scoreService.formatScoreRecords(recentRecords);

        const userScoreData = userScore || { totalScore: 0, acCount: 0 };
        const averageScore = userScoreData.acCount > 0
            ? (userScoreData.totalScore / userScoreData.acCount).toFixed(1)
            : '0';

        this.response.template = 'user_score.html';
        this.response.body = {
            userScore: userScoreData,
            averageScore,
            recentRecords: formattedRecords,
        };
    }
}

/**
 * 全部积分记录处理器
 * 路由: /score/records
 * 功能: 显示所有用户的积分记录，支持分页
 */
export class ScoreRecordsHandler extends Handler {
    async get() {
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const limit = 20;

        const scoreService = getScoreService();
        if (!scoreService) throw new Error('积分核心服务不可用');

        // 使用 service 方法获取分页数据
        const { records, total, totalPages } = await scoreService.getScoreRecordsWithPagination(
            this.domain._id,
            page,
            limit,
        );

        // 获取涉及的用户信息
        const uids = [...new Set(records.map((r) => r.uid))];
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

        // 使用 service 方法格式化记录
        const formattedRecords = scoreService.formatScoreRecords(records);

        this.response.template = 'score_records.html';
        this.response.body = {
            records: formattedRecords,
            udocs,
            page,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        };
    }
}

/**
 * 积分管理页面处理器
 * 路由: /score/manage
 * 功能: 管理员积分系统总览和管理工具
 */
export class ScoreManageHandler extends Handler {
    async prepare() {
        // 检查是否有系统权限或者域内的编辑权限
        if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
            this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        }
    }

    async get() {
        const scoreService = getScoreService();
        if (!scoreService) throw new Error('积分核心服务不可用');

        // TODO: These services are from other plugins
        // const lotteryService = new LotteryService(this.ctx, scoreService);
        // const statisticsService = new StatisticsService(this.ctx, scoreService, lotteryService);
        // const recentActivity = await statisticsService.getRecentActivity(this.domain._id, 20);
        // const systemOverview = await statisticsService.getSystemOverview(this.domain._id);

        // Basic implementation without external services
        const { records: recentRecords } = await scoreService.getScoreRecordsWithPagination(this.domain._id, 1, 20);
        const todayStats = await scoreService.getTodayStats(this.domain._id);
        const systemOverview = {
            totalUsers: await scoreService.getTotalUsersCount(this.domain._id),
            totalScore: await scoreService.getTotalScoreSum(this.domain._id),
            todayStats,
        };

        // 获取积分排行榜前10名
        const topUsers = await scoreService.getScoreRanking(this.domain._id, 10);

        // 获取所有涉及的用户ID（包括排行榜和最近记录）
        const rankingUids = topUsers.map((u) => u.uid);
        const recentUids = recentRecords.map((r: any) => r.uid);
        const allUids = [...new Set([...rankingUids, ...recentUids])]; // 去重

        // 获取用户信息用于显示用户名
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, allUids);

        this.response.template = 'score_manage.html';
        this.response.body = {
            recentRecords,
            topUsers,
            udocs,
            systemOverview,
            currentDomain: {
                id: this.domain._id,
                name: this.domain.name || this.domain._id,
                displayName: this.domain.displayName || this.domain.name || this.domain._id,
            },
        };
    }

    async post() {
        const { action, username, scoreChange, reason } = this.request.body;

        if (action === 'adjust_score') {
            try {
                // 根据用户名查找用户
                const UserModel = global.Hydro.model.user;
                const user = await UserModel.getByUname(this.domain._id, username);

                if (!user) {
                    this.response.body = { success: false, message: '用户不存在' };
                    return;
                }

                const scoreChangeNum = Number.parseInt(scoreChange);
                if (!scoreChangeNum || Math.abs(scoreChangeNum) > 10000) {
                    this.response.body = { success: false, message: '积分变化值无效（范围：-10000 到 +10000）' };
                    return;
                }

                if (!reason || reason.length < 2) {
                    this.response.body = { success: false, message: '请填写调整原因' };
                    return;
                }

                const scoreService = getScoreService();
                if (!scoreService) throw new Error('积分核心服务不可用');

                // 更新用户积分
                await scoreService.updateUserScore(this.domain._id, user._id, scoreChangeNum);

                // 添加积分记录
                await scoreService.addScoreRecord({
                    uid: user._id,
                    domainId: this.domain._id,
                    pid: 0, // 管理员操作使用0
                    recordId: ScoreService.generateUniqueRecordId(), // 生成唯一标识符
                    score: scoreChangeNum,
                    reason: `管理员调整：${reason}`,
                    problemTitle: '管理员操作',
                });

                console.log(`[ScoreManage] Admin ${this.user._id} adjusted user ${user._id} score by ${scoreChangeNum}: ${reason}`);

                this.response.body = {
                    success: true,
                    message: `成功${scoreChangeNum > 0 ? '增加' : '减少'}用户 ${username} ${Math.abs(scoreChangeNum)} 积分`,
                };
            } catch (error) {
                console.error('[ScoreManage] Error adjusting score:', error);
                this.response.body = { success: false, message: `操作失败：${error.message}` };
            }
        } else if (action === 'clean_duplicates') {
            try {
                console.log('[ScoreManage] Starting manual duplicate cleanup...');

                const scoreService = getScoreService();
                if (!scoreService) throw new Error('积分核心服务不可用');

                // 使用 service 方法删除重复记录
                const result = await scoreService.deleteDuplicateRecords(this.domain._id);

                this.response.body = {
                    success: true,
                    message: `成功清理了 ${result.deletedRecords} 条重复记录`,
                    data: result,
                };
            } catch (error) {
                console.error('[ScoreManage] 清理重复记录失败:', error);
                this.response.body = {
                    success: false,
                    message: `清理失败：${error.message}`,
                };
            }
        } else if (action === 'migrate_scores' || action === 'rollback_migration' || action === 'get_migration_status') {
            // TODO: Migration functionality requires MigrationService (from another plugin)
            this.response.body = { success: false, message: '迁移功能需要额外的插件支持' };
        } else {
            this.response.body = { success: false, message: '无效的操作' };
        }
    }
}
