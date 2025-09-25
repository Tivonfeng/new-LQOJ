import { getScoreServiceOrThrow } from '@tivonfeng/score-core';
import {
    Handler,
} from 'hydrooj';
import {
    DailyGameLimitService,
    RPSGameService,
} from '../services';

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

        const scoreService = getScoreServiceOrThrow();
        const rpsService = new RPSGameService(this.ctx, scoreService);

        // 获取用户积分
        const userScore = await scoreService.getUserScore(this.domain._id, uid);
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
            const scoreService = getScoreServiceOrThrow();
            const rpsService = new RPSGameService(this.ctx, scoreService);

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
        const limit = 20;

        const scoreService = getScoreServiceOrThrow();
        const rpsService = new RPSGameService(this.ctx, scoreService);

        // 获取分页游戏历史
        const historyData = await rpsService.getUserGameHistoryPaged(
            this.domain._id,
            this.user._id,
            page,
            limit,
        );

        // 获取用户统计
        const userStats = await rpsService.getUserRPSStats(this.domain._id, this.user._id);

        // 获取选择统计
        const choiceStats = await rpsService.getUserChoiceStats(this.domain._id, this.user._id);

        // 格式化游戏记录
        const formattedRecords = historyData.records.map((record) => ({
            ...record,
            time: record.gameTime.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
            playerChoiceIcon: this.getChoiceIcon(record.playerChoice),
            aiChoiceIcon: this.getChoiceIcon(record.aiChoice),
        }));

        this.response.template = 'rps_history.html';
        this.response.body = {
            gameHistory: formattedRecords,
            currentPage: page,
            totalPages: historyData.totalPages,
            hasMore: page < historyData.totalPages,
            userStats: userStats || {
                totalGames: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                netProfit: 0,
                currentStreak: 0,
                bestStreak: 0,
            },
            choiceStats: choiceStats || {
                rock: 0,
                paper: 0,
                scissors: 0,
            },
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

/**
 * 剪刀石头布游戏管理员统计处理器
 * 路由: /score/rps/admin
 * 功能: 管理员查看游戏系统统计信息
 */
export class RPSAdminHandler extends Handler {
    async prepare() {
        // 可以根据需要添加管理员权限检查
        // this.checkPerm(PERM.PERM_EDIT_DOMAIN);
    }

    async get() {
        const scoreService = getScoreServiceOrThrow();
        const rpsService = new RPSGameService(this.ctx, scoreService);

        // 获取系统统计
        const systemStats = await rpsService.getSystemStats(this.domain._id);

        // 获取最近游戏记录 (所有用户)
        const recentGames = await this.ctx.db.collection('rps.records' as any)
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
            time: game.gameTime.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
            playerChoiceIcon: this.getChoiceIcon(game.playerChoice),
            aiChoiceIcon: this.getChoiceIcon(game.aiChoice),
        }));

        this.response.template = 'rps_admin.html';
        this.response.body = {
            systemStats,
            recentGames: formattedGames,
            udocs,
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
