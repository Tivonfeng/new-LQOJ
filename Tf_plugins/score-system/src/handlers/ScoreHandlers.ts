import {
    Handler,
    PERM,
    PRIV,
} from 'hydrooj';
import {
    CheckInService,
    DailyGameLimitService,
    LotteryService,
    MigrationService,
    ScoreService,
    StatisticsService,
    type UserScore,
} from '../services';
import { DEFAULT_CONFIG } from './config';

/**
 * 积分大厅处理器
 * 路由: /score/hall
 * 功能: 积分系统总入口，展示用户积分概览、排行榜、今日统计
 */
export class ScoreHallHandler extends Handler {
    async get() {
        const uid = this.user?._id;
        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const checkInService = new CheckInService(this.ctx, scoreService);
        let userScore: UserScore | null = null;
        let userRank: number | string = '-';
        let recentRecords: any[] = [];
        let hasCheckedInToday = false;
        let nextReward = 10;
        let gameRemainingPlays = { lottery: 0, dice: 0, rps: 0 };

        if (uid) {
            // 获取用户积分信息
            userScore = await scoreService.getUserScore(this.domain._id, uid);

            // 获取用户排名
            if (userScore) {
                userRank = await scoreService.getUserRank(this.domain._id, uid) || '-';
            }

            // 获取签到相关信息
            hasCheckedInToday = await checkInService.hasCheckedInToday(uid);

            // 计算下次签到奖励
            if (!hasCheckedInToday) {
                const userStats = await checkInService.getUserCheckInStats(uid);
                const currentStreak = userStats?.currentStreak || 0;
                nextReward = checkInService.calculateCheckInScore(currentStreak + 1);
            }

            // 获取各游戏剩余次数
            const dailyLimitService = new DailyGameLimitService(this.ctx);
            gameRemainingPlays = await dailyLimitService.getAllRemainingPlays(this.domain._id, uid);
        }

        // 获取全局最近积分记录（所有用户）
        const { records: rawRecords } = await scoreService.getScoreRecordsWithPagination(this.domain._id, 1, 10);

        recentRecords = rawRecords.map((record) => ({
            ...record,
            createdAt: record.createdAt.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
        }));

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
            maxDailyPlays: DailyGameLimitService.getMaxDailyPlays(),
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
        const skip = (page - 1) * limit;

        const users = await this.ctx.db.collection('score.users' as any)
            .find({}) // 移除域限制，显示全局排行榜
            .sort({ totalScore: -1, lastUpdated: 1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await this.ctx.db.collection('score.users' as any)
            .countDocuments({}); // 移除域限制，统计全局用户数

        // 获取用户信息
        const uids = users.map((u) => u.uid);
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

        // 检查是否有管理权限
        const canManage = this.user?.priv && this.user.priv & PRIV.PRIV_EDIT_SYSTEM;

        // 格式化日期
        const formattedUsers = users.map((user) => ({
            ...user,
            lastUpdated: user.lastUpdated ? user.lastUpdated.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }) : null,
        }));

        this.response.template = 'score_ranking.html';
        this.response.body = {
            users: formattedUsers,
            udocs,
            page,
            total,
            totalPages: Math.ceil(total / limit),
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
        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);

        const userScore = await scoreService.getUserScore(this.domain._id, uid);
        const recentRecords = await scoreService.getUserScoreRecords(this.domain._id, uid, 20);

        // 格式化日期
        const formattedRecords = recentRecords.map((record) => ({
            ...record,
            createdAt: record.createdAt.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
        }));

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

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);

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
        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const lotteryService = new LotteryService(this.ctx, scoreService);
        const statisticsService = new StatisticsService(this.ctx, scoreService, lotteryService);

        const recentActivity = await statisticsService.getRecentActivity(this.domain._id, 20);
        const systemOverview = await statisticsService.getSystemOverview(this.domain._id);

        // 获取积分排行榜前10名
        const topUsers = await scoreService.getScoreRanking(this.domain._id, 10);

        // 获取所有涉及的用户ID（包括排行榜和最近记录）
        const rankingUids = topUsers.map((u) => u.uid);
        const recentUids = recentActivity.scoreRecords.map((r: any) => r.uid);
        const allUids = [...new Set([...rankingUids, ...recentUids])]; // 去重

        // 获取用户信息用于显示用户名
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, allUids);

        this.response.template = 'score_manage.html';
        this.response.body = {
            recentRecords: recentActivity.scoreRecords,
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

                const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);

                // 更新用户积分
                await scoreService.updateUserScore(this.domain._id, user._id, scoreChangeNum);

                // 添加积分记录
                await scoreService.addScoreRecord({
                    uid: user._id,
                    domainId: this.domain._id,
                    pid: 0, // 管理员操作使用0
                    recordId: null,
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
        } else if (action === 'migrate_scores') {
            try {
                const migrationService = new MigrationService(this.ctx);

                // 检查当前迁移状态
                const status = await migrationService.checkMigrationStatus();

                if (!status.hasDomainData) {
                    this.response.body = { success: false, message: '没有需要迁移的分域数据' };
                    return;
                }

                if (status.hasGlobalData) {
                    this.response.body = { success: false, message: '已存在全局积分数据，请先清理或回滚' };
                    return;
                }

                // 执行迁移
                const result = await migrationService.mergeUserScores();

                console.log(`[ScoreManage] Admin ${this.user._id} executed score migration: ${result.mergedUsers} users merged`);

                this.response.body = {
                    success: true,
                    message: `成功合并 ${result.mergedUsers} 个用户的积分数据（来自 ${result.totalRecords} 条域记录）`,
                    data: result,
                };
            } catch (error) {
                console.error('[ScoreManage] Error during migration:', error);
                this.response.body = { success: false, message: `迁移失败：${error.message}` };
            }
        } else if (action === 'rollback_migration') {
            try {
                const migrationService = new MigrationService(this.ctx);

                // 检查当前状态
                const status = await migrationService.checkMigrationStatus();

                if (!status.hasGlobalData) {
                    this.response.body = { success: false, message: '没有需要回滚的全局数据' };
                    return;
                }

                // 执行回滚
                const result = await migrationService.rollbackMigration();

                console.log(`[ScoreManage] Admin ${this.user._id} executed migration rollback: ${result.rolledBackUsers} users`);

                this.response.body = {
                    success: true,
                    message: `成功回滚 ${result.rolledBackUsers} 个用户的积分数据`,
                    data: result,
                };
            } catch (error) {
                console.error('[ScoreManage] Error during rollback:', error);
                this.response.body = { success: false, message: `回滚失败：${error.message}` };
            }
        } else if (action === 'get_migration_status') {
            try {
                const migrationService = new MigrationService(this.ctx);
                const status = await migrationService.checkMigrationStatus();
                const stats = await migrationService.getMigrationStats();

                this.response.body = {
                    success: true,
                    data: { status, stats },
                };
            } catch (error) {
                console.error('[ScoreManage] Error getting migration status:', error);
                this.response.body = { success: false, message: `获取状态失败：${error.message}` };
            }
        } else {
            this.response.body = { success: false, message: '无效的操作' };
        }
    }
}

/**
 * 首次AC检查处理器
 * 路由: /score/check-first-ac
 * 功能: 检查是否为首次AC并返回积分信息
 */
export class CheckFirstACHandler extends Handler {
    async post() {
        try {
            const { pid, uid } = this.request.body;

            if (!pid || !uid) {
                this.response.body = {
                    success: false,
                    message: '缺少必要参数: pid和uid',
                };
                return;
            }

            const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);

            // 检查是否为首次AC
            const isFirstAC = await scoreService.isFirstAC(this.domain._id, uid, pid);

            // 计算积分
            const score = scoreService.calculateACScore(isFirstAC);

            this.response.body = {
                success: true,
                isFirstAC,
                score,
                message: isFirstAC ? '首次AC' : '重复AC',
            };
        } catch (error) {
            console.error('[CheckFirstAC] Error:', error);
            this.response.body = {
                success: false,
                message: `检查失败：${error.message}`,
            };
        }
    }
}
