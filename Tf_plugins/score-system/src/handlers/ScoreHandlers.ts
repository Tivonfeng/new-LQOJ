import {
    Handler,
    PRIV,
} from 'hydrooj';
import {
    ScoreService,
    LotteryService,
    StatisticsService,
    type UserScore
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
        let userScore: UserScore | null = null;
        let userRank: number | string = '-';
        let recentRecords: any[] = [];

        if (uid) {
            // 获取用户积分信息
            userScore = await scoreService.getUserScore(this.domain._id, uid);

            // 获取用户排名
            if (userScore) {
                userRank = await scoreService.getUserRank(this.domain._id, uid) || '-';
            }

            // 获取最近积分记录
            const rawRecords = await scoreService.getUserScoreRecords(this.domain._id, uid, 5);

            recentRecords = rawRecords.map(record => ({
                ...record,
                createdAt: record.createdAt.toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            }));
        }

        // 获取积分排行榜前10
        const topUsers = await scoreService.getScoreRanking(this.domain._id, 10);

        // 获取用户信息
        const uids = topUsers.map(u => u.uid);
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

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
        const page = Math.max(1, parseInt(this.request.query.page as string) || 1);
        const limit = 50;
        const skip = (page - 1) * limit;

        const users = await this.ctx.db.collection('score.users' as any)
            .find({ domainId: this.domain._id })
            .sort({ totalScore: -1, lastUpdated: 1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await this.ctx.db.collection('score.users' as any)
            .countDocuments({ domainId: this.domain._id });

        // 获取用户信息
        const uids = users.map(u => u.uid);
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

        // 检查是否有管理权限
        const canManage = this.user?.priv && this.user.priv & PRIV.PRIV_EDIT_SYSTEM;

        // 格式化日期
        const formattedUsers = users.map(user => ({
            ...user,
            lastUpdated: user.lastUpdated.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
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
        const formattedRecords = recentRecords.map(record => ({
            ...record,
            createdAt: record.createdAt.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
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
 * 积分管理页面处理器
 * 路由: /score/manage
 * 功能: 管理员积分系统总览和管理工具
 */
export class ScoreManageHandler extends Handler {
    async prepare() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
    }

    async get() {
        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const lotteryService = new LotteryService(this.ctx, scoreService);
        const statisticsService = new StatisticsService(this.ctx, scoreService, lotteryService);

        const recentActivity = await statisticsService.getRecentActivity(this.domain._id, 20);
        const systemOverview = await statisticsService.getSystemOverview(this.domain._id);

        this.response.template = 'score_manage.html';
        this.response.body = {
            recentRecords: recentActivity.scoreRecords,
            topUsers: [], // 可以从recentRecords中提取
            systemOverview
        };
    }
}