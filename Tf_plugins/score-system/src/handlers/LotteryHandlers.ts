import {
    avatar,
    Handler,
    PERM,
    PRIV,
} from 'hydrooj';
import {
    DailyGameLimitService,
    LotteryService,
} from '../services';

// helper: 获取注入的 scoreCore 服务
function getScoreCore(ctx: any) {
    // 优先从全局对象获取（在插件加载时设置）
    let scoreCore = (global as any).scoreCoreService;
    if (scoreCore) {
        return scoreCore;
    }

    // 降级到 ctx.inject（在处理器运行时可能不可用）
    try {
        if (typeof ctx.inject === 'function') {
            ctx.inject(['scoreCore'], ({ scoreCore: _sc }: any) => {
                scoreCore = _sc;
            });
        } else {
            scoreCore = (ctx as any).scoreCore;
        }
    } catch (e) {
        scoreCore = (ctx as any).scoreCore;
    }

    if (!scoreCore) {
        throw new Error('ScoreCore service not available. Please ensure tf_plugins_core plugin is loaded before score-system plugin.');
    }

    return scoreCore;
}

/**
 * 序列化对象为 JSON 兼容格式
 * 处理 BigInt 和 Date 对象
 */
function serializeForJSON(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    if (obj instanceof Date) {
        return obj.toISOString();
    }
    if (Array.isArray(obj)) {
        return obj.map(serializeForJSON);
    }
    if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = serializeForJSON(value);
        }
        return result;
    }
    return obj;
}

/**
 * 九宫格抽奖游戏大厅处理器
 * 路由: /score/lottery
 * 功能: 九宫格抽奖游戏主界面
 */
export class LotteryGameHandler extends Handler {
    async get() {
        const uid = this.user?._id;

        if (!uid) {
            this.response.redirect = this.url('user_login');
            return;
        }

        const scoreCore = getScoreCore(this.ctx);
        const lotteryService = new LotteryService(this.ctx);

        // 获取用户积分
        const userScore = await scoreCore.getUserScore(this.domain._id, uid);
        const currentCoins = userScore?.totalScore || 0;

        // 获取用户游戏统计
        const userStats = await lotteryService.getUserLotteryStats(this.domain._id, uid);

        // 获取最近游戏记录
        const recentGames = await lotteryService.getUserGameHistory(undefined, uid, 10);

        // 检查每日游戏次数限制
        const dailyLimitService = new DailyGameLimitService(this.ctx);
        const lotteryLimit = await dailyLimitService.checkCanPlay(this.domain._id, uid, 'lottery');

        // 获取游戏配置
        const gameConfig = lotteryService.getGameConfig();

        // 检查是否可以抽奖
        const canPlay = currentCoins >= gameConfig.betAmount && lotteryLimit.canPlay;

        // 格式化游戏记录时间
        const formattedGames = recentGames.map((game) => {
            let formattedTime = '';
            if (game.gameTime) {
                if (game.gameTime instanceof Date) {
                    formattedTime = game.gameTime.toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    });
                } else {
                    try {
                        formattedTime = new Date(game.gameTime).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                        });
                    } catch (e) {
                        formattedTime = String(game.gameTime);
                    }
                }
            }
            return {
                ...game,
                gameTime: formattedTime,
            };
        });

        // 计算胜率
        const winRate = userStats && userStats.totalGames > 0
            ? (userStats.totalWins / userStats.totalGames * 100).toFixed(1)
            : '0.0';

        // 获取当前用户信息
        const UserModel = global.Hydro.model.user;
        const currentUser = await UserModel.getById(this.domain._id, uid);
        const udocs: Record<string, any> = {};
        if (currentUser) {
            const uidKey = String(uid);
            udocs[uidKey] = {
                ...currentUser,
                avatarUrl: avatar(currentUser.avatar || `gravatar:${currentUser.mail}`, 40),
            };
        }

        // 序列化 udocs 为 JSON 字符串（处理 BigInt）
        const serializedUdocs = serializeForJSON(udocs);
        const udocsJson = JSON.stringify(serializedUdocs);

        // 序列化游戏配置和游戏记录为 JSON 字符串，避免模板中的转义问题
        const gameConfigJson = JSON.stringify(gameConfig);
        const recentGamesJson = JSON.stringify(formattedGames);

        // 检查是否有管理权限（用于显示管理员入口）
        // 规则与后端权限保持一致：系统管理员 或 当前域管理员
        let isLotteryAdmin = false;
        if (this.user?.priv && this.user.priv & PRIV.PRIV_EDIT_SYSTEM) {
            isLotteryAdmin = true;
        } else {
            try {
                this.checkPerm(PERM.PERM_EDIT_DOMAIN);
                isLotteryAdmin = true;
            } catch {
                isLotteryAdmin = false;
            }
        }

        this.response.template = 'lottery_game.html';
        this.response.body = {
            currentCoins,
            canPlay,
            gameConfigJson,
            userStats: userStats || {
                totalGames: 0,
                totalWins: 0,
                netProfit: 0,
            },
            winRate,
            recentGamesJson,
            dailyLimit: lotteryLimit,
            udocsJson,
            isLotteryAdmin,
        };
    }
}

/**
 * 九宫格抽奖游戏状态API处理器
 * 路由: /score/lottery/status
 * 功能: 获取当前用户的游戏状态数据（JSON格式，用于前端刷新）
 */
export class LotteryStatusHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async get() {
        const uid = this.user._id;
        const scoreCore = getScoreCore(this.ctx);
        const lotteryService = new LotteryService(this.ctx);

        // 获取用户积分
        const userScore = await scoreCore.getUserScore(this.domain._id, uid);
        const currentCoins = userScore?.totalScore || 0;

        // 获取用户游戏统计
        const userStats = await lotteryService.getUserLotteryStats(this.domain._id, uid);

        // 获取最近游戏记录
        const recentGames = await lotteryService.getUserGameHistory(undefined, uid, 10);

        // 检查每日游戏次数限制
        const dailyLimitService = new DailyGameLimitService(this.ctx);
        const lotteryLimit = await dailyLimitService.checkCanPlay(this.domain._id, uid, 'lottery');

        // 获取游戏配置
        const gameConfig = lotteryService.getGameConfig();

        // 检查是否可以抽奖
        const canPlay = currentCoins >= gameConfig.betAmount && lotteryLimit.canPlay;

        // 格式化游戏记录时间
        const formattedGames = recentGames.map((game) => {
            let formattedTime = '';
            if (game.gameTime) {
                if (game.gameTime instanceof Date) {
                    formattedTime = game.gameTime.toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    });
                } else {
                    try {
                        formattedTime = new Date(game.gameTime).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                        });
                    } catch (e) {
                        formattedTime = String(game.gameTime);
                    }
                }
            }
            return {
                ...game,
                gameTime: formattedTime,
            };
        });

        // 计算胜率
        const winRate = userStats && userStats.totalGames > 0
            ? (userStats.totalWins / userStats.totalGames * 100).toFixed(1)
            : '0.0';

        this.response.type = 'application/json';
        this.response.body = {
            success: true,
            data: {
                currentCoins,
                canPlay,
                gameConfig,
                userStats: userStats || {
                    totalGames: 0,
                    totalWins: 0,
                    netProfit: 0,
                },
                winRate,
                recentGames: formattedGames,
                dailyLimit: lotteryLimit,
            },
        };
    }
}

/**
 * 九宫格抽奖游戏执行处理器
 * 路由: /score/lottery/play
 * 功能: 执行九宫格抽奖操作，返回游戏结果
 */
export class LotteryPlayHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async post() {
        try {
            // 检查每日游戏次数限制
            const dailyLimitService = new DailyGameLimitService(this.ctx);
            const limitCheck = await dailyLimitService.checkCanPlay(this.domain._id, this.user._id, 'lottery');

            if (!limitCheck.canPlay) {
                this.response.body = {
                    success: false,
                    message: `今日抽奖次数已用完，请明天再来！(${limitCheck.totalPlays}/${limitCheck.maxPlays})`,
                };
                this.response.type = 'application/json';
                return;
            }

            const lotteryService = new LotteryService(this.ctx);

            const result = await lotteryService.playLottery(
                this.domain._id,
                this.user._id,
            );

            // 如果游戏成功，记录游戏次数
            if (result.success) {
                await dailyLimitService.recordPlay(this.domain._id, this.user._id, 'lottery');
            }

            this.response.body = result;
            this.response.type = 'application/json';
        } catch (error: any) {
            console.error('[LotteryPlayHandler] Error:', error);
            this.response.body = {
                success: false,
                message: error.message || '抽奖执行失败，请稍后重试',
            };
            this.response.type = 'application/json';
            this.response.status = 500;
        }
    }
}

/**
 * 九宫格抽奖游戏历史处理器
 * 路由: /score/lottery/history
 * 功能: 展示用户的抽奖历史记录，支持分页
 */
export class LotteryHistoryHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async get() {
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const limit = Number.parseInt(this.request.query.limit as string) || 20;

        const lotteryService = new LotteryService(this.ctx);

        // 获取分页游戏历史（全域统一）
        const historyData = await lotteryService.getUserGameHistoryPaged(
            undefined, // 全域查询
            this.user._id,
            page,
            limit,
        );

        // 格式化游戏记录时间
        const formattedRecords = historyData.records.map((record) => ({
            ...record,
            gameTime: record.gameTime && record.gameTime instanceof Date
                ? record.gameTime.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                })
                : record.gameTime
                    ? new Date(record.gameTime).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    })
                    : '',
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
