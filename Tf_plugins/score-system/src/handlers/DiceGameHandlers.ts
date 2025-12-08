import {
    Handler,
} from 'hydrooj';
import {
    DailyGameLimitService,
    DiceGameService,
    ScoreService,
} from '../services';
import { DEFAULT_CONFIG } from './config';

/**
 * 掷骰子游戏大厅处理器
 * 路由: /score/dice
 * 功能: 掷骰子游戏主界面，展示游戏规则、用户统计、最近游戏记录
 */
export class DiceGameHandler extends Handler {
    async get() {
        const uid = this.user?._id;

        if (!uid) {
            this.response.redirect = this.url('user_login');
            return;
        }

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const diceService = new DiceGameService(this.ctx, scoreService);

        // 获取用户积分
        const userScore = await scoreService.getUserScore(this.domain._id, uid);
        const currentCoins = userScore?.totalScore || 0;

        // 获取用户游戏统计
        const userStats = await diceService.getUserDiceStats(this.domain._id, uid);

        // 获取最近游戏记录
        const recentGames = await diceService.getUserGameHistory(this.domain._id, uid, 10);

        // 检查每日游戏次数限制
        const dailyLimitService = new DailyGameLimitService(this.ctx);
        const diceLimit = await dailyLimitService.checkCanPlay(this.domain._id, uid, 'dice');

        // 获取游戏配置
        const gameConfig = diceService.getGameConfig();

        // 检查用户可以下注的最大金额
        const availableBets = gameConfig.availableBets.filter((bet) => currentCoins >= bet);

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

        // 计算胜率
        const winRate = userStats && userStats.totalGames > 0
            ? (userStats.totalWins / userStats.totalGames * 100).toFixed(1)
            : '0.0';

        this.response.template = 'dice_game.html';
        this.response.body = {
            currentCoins,
            canPlay: availableBets.length > 0 && diceLimit.canPlay,
            availableBets,
            gameConfig,
            userStats: userStats || {
                totalGames: 0,
                totalWins: 0,
                netProfit: 0,
                winStreak: 0,
                maxWinStreak: 0,
            },
            winRate,
            recentGames: formattedGames,
            dailyLimit: diceLimit,
        };
    }
}

/**
 * 掷骰子游戏状态API处理器
 * 路由: /score/dice/status
 * 功能: 获取当前用户的游戏状态数据（JSON格式，用于前端刷新）
 */
export class DiceStatusHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async get() {
        const uid = this.user._id;
        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const diceService = new DiceGameService(this.ctx, scoreService);

        // 获取用户积分
        const userScore = await scoreService.getUserScore(this.domain._id, uid);
        const currentCoins = userScore?.totalScore || 0;

        // 获取用户游戏统计
        const userStats = await diceService.getUserDiceStats(this.domain._id, uid);

        // 获取最近游戏记录
        const recentGames = await diceService.getUserGameHistory(this.domain._id, uid, 10);

        // 检查每日游戏次数限制
        const dailyLimitService = new DailyGameLimitService(this.ctx);
        const diceLimit = await dailyLimitService.checkCanPlay(this.domain._id, uid, 'dice');

        // 获取游戏配置
        const gameConfig = diceService.getGameConfig();

        // 检查用户可以下注的最大金额
        const availableBets = gameConfig.availableBets.filter((bet) => currentCoins >= bet);

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

        // 计算胜率
        const winRate = userStats && userStats.totalGames > 0
            ? (userStats.totalWins / userStats.totalGames * 100).toFixed(1)
            : '0.0';

        this.response.type = 'application/json';
        this.response.body = {
            success: true,
            data: {
                currentCoins,
                canPlay: availableBets.length > 0 && diceLimit.canPlay,
                availableBets,
                gameConfig,
                userStats: userStats || {
                    totalGames: 0,
                    totalWins: 0,
                    netProfit: 0,
                    winStreak: 0,
                    maxWinStreak: 0,
                },
                winRate,
                recentGames: formattedGames,
                dailyLimit: diceLimit,
            },
        };
    }
}

/**
 * 掷骰子游戏执行处理器
 * 路由: /score/dice/play
 * 功能: 执行掷骰子游戏操作，返回游戏结果
 */
export class DicePlayHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async post() {
        try {
        const { guess, betAmount } = this.request.body;

            if (!guess || !['big', 'small'].includes(guess)) {
            this.response.body = { success: false, message: '无效的猜测选项' };
                this.response.type = 'application/json';
            return;
        }

        const betAmountNum = Number.parseInt(betAmount);
        if (!betAmountNum || ![20, 50, 100].includes(betAmountNum)) {
            this.response.body = { success: false, message: '无效的投注金额，请选择20、50或100积分' };
                this.response.type = 'application/json';
            return;
        }

        // 检查每日游戏次数限制
        const dailyLimitService = new DailyGameLimitService(this.ctx);
        const limitCheck = await dailyLimitService.checkCanPlay(this.domain._id, this.user._id, 'dice');

        if (!limitCheck.canPlay) {
            this.response.body = {
                success: false,
                message: `今日骰子游戏次数已用完，请明天再来！(${limitCheck.totalPlays}/${limitCheck.maxPlays})`,
            };
                this.response.type = 'application/json';
            return;
        }

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const diceService = new DiceGameService(this.ctx, scoreService);

        const result = await diceService.playDiceGame(
            this.domain._id,
            this.user._id,
            guess as 'big' | 'small',
            betAmountNum,
        );

        // 如果游戏成功，记录游戏次数
        if (result.success) {
            await dailyLimitService.recordPlay(this.domain._id, this.user._id, 'dice');
        }

        this.response.body = result;
            this.response.type = 'application/json';
        } catch (error: any) {
            console.error('[DicePlayHandler] Error:', error);
            this.response.body = {
                success: false,
                message: error.message || '游戏执行失败，请稍后重试',
            };
            this.response.type = 'application/json';
            this.response.status = 500;
        }
    }
}

/**
 * 掷骰子游戏历史处理器
 * 路由: /score/dice/history
 * 功能: 展示用户的掷骰子游戏历史记录，支持分页
 */
export class DiceHistoryHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async get() {
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const limit = Number.parseInt(this.request.query.limit as string) || 20;

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const diceService = new DiceGameService(this.ctx, scoreService);

        // 获取分页游戏历史
        const historyData = await diceService.getUserGameHistoryPaged(
            this.domain._id,
            this.user._id,
            page,
            limit,
        );

        // 获取用户统计
        const userStats = await diceService.getUserDiceStats(this.domain._id, this.user._id);

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
        }));

        // 始终返回 JSON 格式（前端通过 API 调用）
        this.response.type = 'application/json';
        this.response.body = {
            success: true,
            records: formattedRecords,
            page,
            total: historyData.total,
            totalPages: historyData.totalPages,
            limit,
        };
    }
}

/**
 * 掷骰子游戏统计处理器（管理员）
 * 路由: /score/dice/admin
 * 功能: 管理员查看游戏系统统计信息
 */
export class DiceAdminHandler extends Handler {
    async prepare() {
        // 可以根据需要添加管理员权限检查
        // this.checkPerm(PERM.PERM_EDIT_DOMAIN);
    }

    async get() {
        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const diceService = new DiceGameService(this.ctx, scoreService);

        // 获取系统统计
        const systemStats = await diceService.getSystemStats(this.domain._id);

        // 获取最近游戏记录 (所有用户)
        const recentGames = await this.ctx.db.collection('dice.records' as any)
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
            diceEmoji: this.getDiceEmoji(game.diceValue),
            resultText: game.actualResult === 'big' ? '大' : '小',
            guessText: game.guess === 'big' ? '大' : '小',
        }));

        this.response.template = 'dice_admin.html';
        this.response.body = {
            systemStats,
            recentGames: formattedGames,
            udocs,
        };
    }

    private getDiceEmoji(value: number): string {
        const diceEmojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return diceEmojis[value] || '🎲';
    }
}
