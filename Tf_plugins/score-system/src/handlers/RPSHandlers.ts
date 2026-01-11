import {
    avatar,
    Handler,
} from 'hydrooj';
import {
    DailyGameLimitService,
    RPSGameService,
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
 * 剪刀石头布游戏大厅处理器
 * 路由: /score/rps
 * 功能: 剪刀石头布游戏主界面，展示游戏规则、用户统计、最近游戏记录
 */
export class RPSGameHandler extends Handler {
    async get() {
        const uid = this.user?._id;

        if (!uid) {
            this.response.redirect = this.url('user_login');
            return;
        }

        const scoreCore = getScoreCore(this.ctx);
        const rpsService = new RPSGameService(this.ctx);

        // 获取用户积分
        const userScore = await scoreCore.getUserScore(this.domain._id, uid);
        const currentCoins = userScore?.totalScore || 0;

        // 获取用户游戏统计
        const userStats = await rpsService.getUserRPSStats(this.domain._id, uid);

        // 获取最近游戏记录
        const recentGames = await rpsService.getUserGameHistory(this.domain._id, uid, 6);

        // 检查每日游戏次数限制
        const dailyLimitService = new DailyGameLimitService(this.ctx);
        const rpsLimit = await dailyLimitService.checkCanPlay(this.domain._id, uid, 'rps');

        // 获取游戏配置
        const gameConfig = rpsService.getGameConfig();

        // 检查用户是否有足够积分游戏并且没有超过每日限制
        const canPlay = currentCoins >= gameConfig.baseCost && rpsLimit.canPlay;

        // 格式化游戏记录时间
        const formattedGames = recentGames.map((game) => ({
            ...game,
            time: game.gameTime.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
            playerChoiceIcon: this.getChoiceIcon(game.playerChoice),
            aiChoiceIcon: this.getChoiceIcon(game.aiChoice),
        }));

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

        this.response.template = 'rock_paper_scissors.html';
        this.response.body = {
            currentCoins,
            canPlay,
            gameConfig,
            userStats: userStats || {
                totalGames: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                netProfit: 0,
                currentStreak: 0,
                bestStreak: 0,
            },
            recentGames: formattedGames,
            dailyLimit: rpsLimit,
            udocsJson,
        };
    }

    /**
     * 根据选择返回对应图标
     */
    private getChoiceIcon(choice: string): string {
        const icons = {
            rock: '🗿',
            paper: '📄',
            scissors: '✂️',
        };
        return icons[choice] || '❓';
    }
}

/**
 * 剪刀石头布游戏状态API处理器
 * 路由: /score/rps/status
 * 功能: 获取当前用户的游戏状态数据（JSON格式，用于前端刷新）
 */
export class RPSStatusHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async get() {
        const uid = this.user._id;
        const scoreCore = getScoreCore(this.ctx);
        const rpsService = new RPSGameService(this.ctx);

        // 获取用户积分
        const userScore = await scoreCore.getUserScore(this.domain._id, uid);
        const currentCoins = userScore?.totalScore || 0;

        // 获取用户游戏统计
        const userStats = await rpsService.getUserRPSStats(this.domain._id, uid);

        // 获取最近游戏记录
        const recentGames = await rpsService.getUserGameHistory(this.domain._id, uid, 10);

        // 检查每日游戏次数限制
        const dailyLimitService = new DailyGameLimitService(this.ctx);
        const rpsLimit = await dailyLimitService.checkCanPlay(this.domain._id, uid, 'rps');

        // 获取游戏配置
        const gameConfig = rpsService.getGameConfig();

        // 检查用户是否有足够积分游戏并且没有超过每日限制
        const canPlay = currentCoins >= gameConfig.baseCost && rpsLimit.canPlay;

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
            ? (userStats.wins / userStats.totalGames * 100).toFixed(1)
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
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    netProfit: 0,
                    currentStreak: 0,
                    bestStreak: 0,
                },
                winRate,
                recentGames: formattedGames,
                dailyLimit: rpsLimit,
            },
        };
    }
}

/**
 * 剪刀石头布游戏执行处理器
 * 路由: /score/rps/play
 * 功能: 执行剪刀石头布游戏操作，返回游戏结果
 */
export class RPSPlayHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async post() {
        try {
            console.log(`[RPSPlayHandler] Starting RPS game request for user ${this.user._id}`);
            console.log('[RPSPlayHandler] Request body:', this.request.body);

            const { choice } = this.request.body;

            if (!['rock', 'paper', 'scissors'].includes(choice)) {
                console.log(`[RPSPlayHandler] Invalid choice received: ${choice}`);
                this.response.body = { success: false, message: '无效的选择' };
                this.response.type = 'application/json';
                return;
            }

            // 检查每日游戏次数限制
            const dailyLimitService = new DailyGameLimitService(this.ctx);
            const limitCheck = await dailyLimitService.checkCanPlay(this.domain._id, this.user._id, 'rps');

            if (!limitCheck.canPlay) {
                this.response.body = {
                    success: false,
                    message: `今日剪刀石头布游戏次数已用完，请明天再来！(${limitCheck.totalPlays}/${limitCheck.maxPlays})`,
                };
                this.response.type = 'application/json';
                return;
            }

            console.log(`[RPSPlayHandler] Creating services for domain ${this.domain._id}`);
            const rpsService = new RPSGameService(this.ctx);

            console.log(`[RPSPlayHandler] Calling playRPSGame with choice: ${choice}`);
            const result = await rpsService.playRPSGame(
                this.domain._id,
                this.user._id,
                choice as 'rock' | 'paper' | 'scissors',
            );

            console.log('[RPSPlayHandler] Game result:', result);

            // 如果游戏成功，记录游戏次数
            if (result.success) {
                await dailyLimitService.recordPlay(this.domain._id, this.user._id, 'rps');
            }

            // 添加选择图标到结果中
            if (result.success && result.playerChoice && result.aiChoice) {
                (result as any).playerChoiceIcon = this.getChoiceIcon(result.playerChoice);
                (result as any).aiChoiceIcon = this.getChoiceIcon(result.aiChoice);
                console.log('[RPSPlayHandler] Added choice icons');
            }

            this.response.body = result;
            this.response.type = 'application/json';
            console.log('[RPSPlayHandler] Response set successfully');
        } catch (error) {
            console.error('[RPSPlayHandler] Error:', error);
            this.response.body = {
                success: false,
                message: `服务器内部错误: ${error.message}`,
            };
            this.response.type = 'application/json';
        }
    }

    private getChoiceIcon(choice: string): string {
        const icons = {
            rock: '🗿',
            paper: '📄',
            scissors: '✂️',
        };
        return icons[choice] || '❓';
    }
}

/**
 * 剪刀石头布游戏历史处理器
 * 路由: /score/rps/history
 * 功能: 展示用户的剪刀石头布游戏历史记录，支持分页
 */
export class RPSHistoryHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async get() {
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const limit = Number.parseInt(this.request.query.limit as string) || 20;

        const rpsService = new RPSGameService(this.ctx);

        // 获取分页游戏历史
        const historyData = await rpsService.getUserGameHistoryPaged(
            this.domain._id,
            this.user._id,
            page,
            limit,
        );

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

    private getChoiceIcon(choice: string): string {
        const icons = {
            rock: '🗿',
            paper: '📄',
            scissors: '✂️',
        };
        return icons[choice] || '❓';
    }
}
