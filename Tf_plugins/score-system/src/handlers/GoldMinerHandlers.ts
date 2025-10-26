import {
    Handler,
} from 'hydrooj';
import {
    DailyGameLimitService,
    GoldMinerService,
    ScoreService,
} from '../services';
import { DEFAULT_CONFIG } from './config';

/**
 * 黄金矿工游戏大厅处理器
 * 路由: /score/goldminer
 * 功能: 黄金矿工游戏主界面,展示游戏规则、用户统计、最近游戏记录
 */
export class GoldMinerGameHandler extends Handler {
    async get() {
        const uid = this.user?._id;

        if (!uid) {
            this.response.redirect = this.url('user_login');
            return;
        }

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const goldMinerService = new GoldMinerService(this.ctx, scoreService);

        // 获取用户积分
        const userScore = await scoreService.getUserScore(this.domain._id, uid);
        const currentCoins = userScore?.totalScore || 0;

        // 获取用户游戏统计
        const userStats = await goldMinerService.getUserStats(this.domain._id, uid);

        // 获取最近游戏记录
        const recentGames = await goldMinerService.getUserGameHistory(this.domain._id, uid, 10);

        // 检查每日游戏次数限制
        const dailyLimitService = new DailyGameLimitService(this.ctx);
        const goldMinerLimit = await dailyLimitService.checkCanPlay(this.domain._id, uid, 'goldminer');

        // 获取游戏配置
        const gameConfig = goldMinerService.getGameConfig();

        // 检查用户可以玩的模式
        const canPlay30s = currentCoins >= gameConfig.entryFees['30'];
        const canPlay60s = currentCoins >= gameConfig.entryFees['60'];

        // 格式化游戏记录时间
        const formattedGames = recentGames.map((game) => ({
            ...game,
            gameTime: game.gameTime.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
        }));

        // 计算盈利率
        const profitRate = userStats && userStats.totalGames > 0
            ? ((userStats.totalProfit / (userStats.totalGames * 100)) * 100).toFixed(1)
            : '0.0';

        this.response.template = 'gold_miner.html';
        this.response.body = {
            currentCoins,
            canPlay30s: canPlay30s && goldMinerLimit.canPlay,
            canPlay60s: canPlay60s && goldMinerLimit.canPlay,
            gameConfig,
            userStats: userStats || {
                totalGames: 0,
                total30sGames: 0,
                total60sGames: 0,
                totalScore: 0,
                totalProfit: 0,
                bestScore: 0,
                bestProfit: 0,
            },
            profitRate,
            recentGames: formattedGames,
            dailyLimit: goldMinerLimit,
        };
    }
}

/**
 * 黄金矿工游戏开始处理器
 * 路由: /score/goldminer/start
 * 功能: 开始游戏,扣除入场费
 */
export class GoldMinerStartHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async post() {
        const { duration } = this.request.body;

        const durationNum = Number.parseInt(duration);
        if (!durationNum || ![30, 60].includes(durationNum)) {
            this.response.body = { success: false, message: '无效的游戏时长,请选择30秒或60秒' };
            return;
        }

        // 检查每日游戏次数限制
        const dailyLimitService = new DailyGameLimitService(this.ctx);
        const limitCheck = await dailyLimitService.checkCanPlay(this.domain._id, this.user._id, 'goldminer');

        if (!limitCheck.canPlay) {
            this.response.body = {
                success: false,
                message: `今日黄金矿工游戏次数已用完,请明天再来!(${limitCheck.totalPlays}/${limitCheck.maxPlays})`,
            };
            return;
        }

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const goldMinerService = new GoldMinerService(this.ctx, scoreService);

        const result = await goldMinerService.startGame(
            this.domain._id,
            this.user._id,
            durationNum,
        );

        // 如果游戏成功开始,记录游戏次数
        if (result.success) {
            await dailyLimitService.recordPlay(this.domain._id, this.user._id, 'goldminer');
        }

        this.response.body = result;
    }
}

/**
 * 黄金矿工游戏提交处理器
 * 路由: /score/goldminer/submit
 * 功能: 提交游戏结果,结算积分
 */
export class GoldMinerSubmitHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async post() {
        const { duration, items } = this.request.body;

        const durationNum = Number.parseInt(duration);
        if (!durationNum || ![30, 60].includes(durationNum)) {
            this.response.body = { success: false, message: '无效的游戏时长' };
            return;
        }

        if (!Array.isArray(items)) {
            this.response.body = { success: false, message: '无效的游戏数据' };
            return;
        }

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const goldMinerService = new GoldMinerService(this.ctx, scoreService);

        const result = await goldMinerService.submitGameResult(
            this.domain._id,
            this.user._id,
            durationNum,
            items,
        );

        this.response.body = result;
    }
}

/**
 * 黄金矿工游戏历史处理器
 * 路由: /score/goldminer/history
 * 功能: 展示用户的黄金矿工游戏历史记录,支持分页
 */
export class GoldMinerHistoryHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async get() {
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const limit = 20;

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const goldMinerService = new GoldMinerService(this.ctx, scoreService);

        // 获取分页游戏历史
        const historyData = await goldMinerService.getUserGameHistoryPaged(
            this.domain._id,
            this.user._id,
            page,
            limit,
        );

        // 获取用户统计
        const userStats = await goldMinerService.getUserStats(this.domain._id, this.user._id);

        // 格式化游戏记录时间
        const formattedRecords = historyData.records.map((record) => ({
            ...record,
            gameTime: record.gameTime.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
            durationText: `${record.duration}秒`,
            itemsCount: record.items.length,
            profitText: record.netProfit > 0 ? `+${record.netProfit}` : record.netProfit.toString(),
        }));

        // 计算统计信息
        const profitRate = userStats && userStats.totalGames > 0
            ? ((userStats.totalProfit / (userStats.totalGames * 100)) * 100).toFixed(1)
            : '0.0';

        this.response.template = 'gold_miner_history.html';
        this.response.body = {
            records: formattedRecords,
            page,
            total: historyData.total,
            totalPages: historyData.totalPages,
            userStats: userStats || {
                totalGames: 0,
                total30sGames: 0,
                total60sGames: 0,
                totalScore: 0,
                totalProfit: 0,
                bestScore: 0,
                bestProfit: 0,
            },
            profitRate,
        };
    }
}

/**
 * 黄金矿工游戏管理处理器(管理员)
 * 路由: /score/goldminer/admin
 * 功能: 管理员查看游戏系统统计信息
 */
export class GoldMinerAdminHandler extends Handler {
    async prepare() {
        // 可以根据需要添加管理员权限检查
        // this.checkPerm(PERM.PERM_EDIT_DOMAIN);
    }

    async get() {
        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const goldMinerService = new GoldMinerService(this.ctx, scoreService);

        // 获取系统统计
        const systemStats = await goldMinerService.getSystemStats(this.domain._id);

        // 获取最近游戏记录 (所有用户)
        const recentGames = await this.ctx.db.collection('goldminer.records' as any)
            .find({ domainId: this.domain._id })
            .sort({ gameTime: -1 })
            .limit(50)
            .toArray();

        // 获取用户信息
        const uids = [...new Set(recentGames.map((g) => g.uid))];
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

        // 格式化最近游戏记录
        const formattedGames = recentGames.map((game) => ({
            ...game,
            gameTime: game.gameTime.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
            durationText: `${game.duration}秒`,
            itemsCount: game.items.length,
        }));

        this.response.template = 'gold_miner_admin.html';
        this.response.body = {
            systemStats,
            recentGames: formattedGames,
            udocs,
        };
    }
}
