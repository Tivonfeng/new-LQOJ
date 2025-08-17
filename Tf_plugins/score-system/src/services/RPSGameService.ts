import {
    Context,
} from 'hydrooj';
import { ScoreService } from './ScoreService';

// 剪刀石头布游戏记录接口
export interface RPSGameRecord {
    _id?: any;
    uid: number;
    domainId: string;
    playerChoice: 'rock' | 'paper' | 'scissors'; // 用户选择
    aiChoice: 'rock' | 'paper' | 'scissors'; // AI选择
    result: 'win' | 'lose' | 'draw'; // 游戏结果
    baseCost: number; // 基础费用 (15)
    reward: number; // 奖励积分 (胜利45, 平局15, 失败0)
    netGain: number; // 净收益 (胜利+30, 平局0, 失败-15)
    streakBonus: number; // 连胜奖励
    currentStreak: number; // 当前连胜数
    gameTime: Date;
}

// 用户剪刀石头布统计接口
export interface UserRPSStats {
    _id?: any;
    uid: number;
    domainId: string;
    totalGames: number; // 总游戏次数
    wins: number; // 胜利次数
    draws: number; // 平局次数
    losses: number; // 失败次数
    totalCost: number; // 总投入积分
    totalReward: number; // 总奖励积分
    netProfit: number; // 净盈亏
    currentStreak: number; // 当前连胜次数
    bestStreak: number; // 最佳连胜纪录
    lastGameTime: Date;
}

// 用户选择统计接口
export interface UserChoiceStats {
    rock: number;
    paper: number;
    scissors: number;
}

/**
 * 剪刀石头布游戏服务
 * 负责：游戏逻辑、积分管理、数据统计
 */
export class RPSGameService {
    private ctx: Context;
    private scoreService: ScoreService;

    // 游戏常量
    private static readonly BASE_COST = 15; // 基础费用
    private static readonly WIN_REWARD = 30; // 胜利奖励(2倍)
    private static readonly DRAW_REWARD = 15; // 平局退款
    private static readonly STREAK_BONUS = 5; // 连胜奖励
    private static readonly CHOICES = ['rock', 'paper', 'scissors'] as const;

    constructor(ctx: Context, scoreService: ScoreService) {
        this.ctx = ctx;
        this.scoreService = scoreService;
    }

    /**
     * 获取游戏配置
     */
    getGameConfig() {
        return {
            baseCost: RPSGameService.BASE_COST,
            winReward: RPSGameService.WIN_REWARD,
            drawReward: RPSGameService.DRAW_REWARD,
            streakBonus: RPSGameService.STREAK_BONUS,
            winMultiplier: 2
        };
    }

    /**
     * 执行剪刀石头布游戏
     * @param domainId 域ID
     * @param uid 用户ID
     * @param playerChoice 用户选择
     * @returns 游戏结果
     */
    async playRPSGame(domainId: string, uid: number, playerChoice: 'rock' | 'paper' | 'scissors'): Promise<{
        success: boolean;
        message?: string;
        result?: string;
        playerChoice?: string;
        aiChoice?: string;
        reward?: number;
        newBalance?: number;
        streak?: number;
        streakBonus?: number;
    }> {
        try {
            console.log(`[RPSGameService] Starting game for user ${uid}, choice: ${playerChoice}`);
            
            // 验证输入
            if (!RPSGameService.CHOICES.includes(playerChoice)) {
                console.log(`[RPSGameService] Invalid choice: ${playerChoice}`);
                return { success: false, message: '无效的选择' };
            }

            // 检查用户积分
            console.log(`[RPSGameService] Checking user score for domain ${domainId}, uid ${uid}`);
            const userScore = await this.scoreService.getUserScore(domainId, uid);
            console.log(`[RPSGameService] User score result:`, userScore);
            
            if (!userScore || userScore.totalScore < RPSGameService.BASE_COST) {
                console.log(`[RPSGameService] Insufficient balance: ${userScore?.totalScore || 0} < ${RPSGameService.BASE_COST}`);
                return { 
                    success: false, 
                    message: `积分不足，至少需要${RPSGameService.BASE_COST}积分` 
                };
            }
        } catch (error) {
            console.error(`[RPSGameService] Error in playRPSGame:`, error);
            return {
                success: false,
                message: `游戏服务错误: ${error.message}`
            };
        }

        try {
            // 获取当前用户统计（用于连胜计算）
            console.log(`[RPSGameService] Getting user stats`);
            const userStats = await this.getUserRPSStats(domainId, uid);
            let currentStreak = userStats?.currentStreak || 0;

            // AI随机选择
            const aiChoice = RPSGameService.CHOICES[Math.floor(Math.random() * 3)];
            console.log(`[RPSGameService] AI choice: ${aiChoice}, Player choice: ${playerChoice}`);

            // 判断游戏结果
            const gameResult = this.determineWinner(playerChoice, aiChoice);
            console.log(`[RPSGameService] Game result: ${gameResult}`);
            
            // 计算奖励和连胜
            let reward = 0;
            let netGain = -RPSGameService.BASE_COST;
            let streakBonus = 0;

            if (gameResult === 'win') {
                currentStreak += 1;
                reward = RPSGameService.WIN_REWARD;
                netGain = RPSGameService.WIN_REWARD - RPSGameService.BASE_COST;
                
                // 连胜奖励（从第2胜开始）
                if (currentStreak >= 2) {
                    streakBonus = RPSGameService.STREAK_BONUS * (currentStreak - 1);
                    reward += streakBonus;
                    netGain += streakBonus;
                }
            } else if (gameResult === 'draw') {
                reward = RPSGameService.DRAW_REWARD;
                netGain = 0; // 平局不损失积分
                // 平局不重置连胜，但也不增加
            } else {
                currentStreak = 0; // 失败重置连胜
            }

            console.log(`[RPSGameService] Calculated reward: ${reward}, netGain: ${netGain}, streak: ${currentStreak}`);

            // 扣除基础费用并记录
            console.log(`[RPSGameService] Deducting base cost: ${RPSGameService.BASE_COST}`);
            await this.scoreService.updateUserScore(domainId, uid, -RPSGameService.BASE_COST);
            await this.scoreService.addScoreRecord({
                uid,
                domainId,
                pid: 0, // 游戏类型记录，使用0表示非题目
                recordId: null,
                score: -RPSGameService.BASE_COST,
                reason: `剪刀石头布游戏 - 游戏费用`,
                problemTitle: '剪刀石头布',
            });

            // 发放奖励（如果有）并记录
            if (reward > 0) {
                console.log(`[RPSGameService] Adding reward: ${reward}`);
                await this.scoreService.updateUserScore(domainId, uid, reward);
                
                let rewardReason = '';
                if (gameResult === 'win') {
                    rewardReason = `剪刀石头布游戏 - 胜利奖励`;
                    if (streakBonus > 0) {
                        rewardReason += ` (连胜${currentStreak}次，奖励+${streakBonus})`;
                    }
                } else if (gameResult === 'draw') {
                    rewardReason = `剪刀石头布游戏 - 平局退款`;
                }
                
                await this.scoreService.addScoreRecord({
                    uid,
                    domainId,
                    pid: 0, // 游戏类型记录，使用0表示非题目
                    recordId: null,
                    score: reward,
                    reason: rewardReason,
                    problemTitle: '剪刀石头布',
                });
            }

            // 记录游戏结果
            const gameRecord: RPSGameRecord = {
                uid,
                domainId,
                playerChoice,
                aiChoice,
                result: gameResult,
                baseCost: RPSGameService.BASE_COST,
                reward,
                netGain,
                streakBonus,
                currentStreak,
                gameTime: new Date()
            };

            console.log(`[RPSGameService] Inserting game record`);
            await this.ctx.db.collection('rps.records' as any).insertOne(gameRecord);

            // 更新用户统计
            console.log(`[RPSGameService] Updating user stats`);
            await this.updateUserStats(domainId, uid, gameRecord);

            // 获取更新后的用户积分
            console.log(`[RPSGameService] Getting updated user score`);
            const updatedScore = await this.scoreService.getUserScore(domainId, uid);

            const result = {
                success: true,
                result: gameResult,
                playerChoice,
                aiChoice,
                reward: netGain, // 返回净收益
                newBalance: updatedScore?.totalScore || 0,
                streak: currentStreak,
                streakBonus
            };

            console.log(`[RPSGameService] Game completed successfully:`, result);
            return result;
        } catch (error) {
            console.error(`[RPSGameService] Error in game execution:`, error);
            return {
                success: false,
                message: `游戏执行错误: ${error.message}`
            };
        }
    }

    /**
     * 判断游戏胜负
     */
    private determineWinner(playerChoice: string, aiChoice: string): 'win' | 'lose' | 'draw' {
        if (playerChoice === aiChoice) {
            return 'draw';
        }

        const winConditions = {
            'rock': 'scissors',
            'paper': 'rock',
            'scissors': 'paper'
        };

        return winConditions[playerChoice] === aiChoice ? 'win' : 'lose';
    }

    /**
     * 更新用户统计
     */
    private async updateUserStats(domainId: string, uid: number, gameRecord: RPSGameRecord) {
        const collection = this.ctx.db.collection('rps.stats' as any);
        
        const updateData: any = {
            $inc: {
                totalGames: 1,
                totalCost: gameRecord.baseCost,
                totalReward: gameRecord.reward,
                netProfit: gameRecord.netGain
            },
            $set: {
                lastGameTime: gameRecord.gameTime,
                currentStreak: gameRecord.currentStreak
            }
        };

        // 根据游戏结果更新对应计数
        if (gameRecord.result === 'win') {
            updateData.$inc.wins = 1;
            updateData.$max = { bestStreak: gameRecord.currentStreak };
        } else if (gameRecord.result === 'lose') {
            updateData.$inc.losses = 1;
        } else {
            updateData.$inc.draws = 1;
        }

        await collection.updateOne(
            { uid, domainId },
            updateData,
            { upsert: true }
        );
    }

    /**
     * 获取用户游戏统计
     */
    async getUserRPSStats(domainId: string, uid: number): Promise<UserRPSStats | null> {
        const stats = await this.ctx.db.collection('rps.stats' as any)
            .findOne({ uid, domainId });

        return stats as UserRPSStats | null;
    }

    /**
     * 获取用户选择偏好统计
     */
    async getUserChoiceStats(domainId: string, uid: number): Promise<UserChoiceStats> {
        const pipeline = [
            { $match: { uid, domainId } },
            {
                $group: {
                    _id: '$playerChoice',
                    count: { $sum: 1 }
                }
            }
        ];

        const results = await this.ctx.db.collection('rps.records' as any)
            .aggregate(pipeline).toArray();

        const stats: UserChoiceStats = { rock: 0, paper: 0, scissors: 0 };
        
        results.forEach(result => {
            if (result._id && stats.hasOwnProperty(result._id)) {
                stats[result._id as keyof UserChoiceStats] = result.count;
            }
        });

        return stats;
    }

    /**
     * 获取用户游戏历史记录
     */
    async getUserGameHistory(domainId: string, uid: number, limit: number = 10): Promise<RPSGameRecord[]> {
        const records = await this.ctx.db.collection('rps.records' as any)
            .find({ uid, domainId })
            .sort({ gameTime: -1 })
            .limit(limit)
            .toArray();

        return records as RPSGameRecord[];
    }

    /**
     * 获取用户游戏历史记录（分页）
     */
    async getUserGameHistoryPaged(domainId: string, uid: number, page: number = 1, limit: number = 20): Promise<{
        records: RPSGameRecord[];
        total: number;
        totalPages: number;
        currentPage: number;
    }> {
        const skip = (page - 1) * limit;
        
        const [records, total] = await Promise.all([
            this.ctx.db.collection('rps.records' as any)
                .find({ uid, domainId })
                .sort({ gameTime: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            this.ctx.db.collection('rps.records' as any)
                .countDocuments({ uid, domainId })
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            records: records as RPSGameRecord[],
            total,
            totalPages,
            currentPage: page
        };
    }

    /**
     * 获取系统统计信息（管理员用）
     */
    async getSystemStats(domainId: string): Promise<{
        totalGames: number;
        totalPlayers: number;
        totalCost: number;
        totalReward: number;
        systemProfit: number;
        winRate: number;
        drawRate: number;
        loseRate: number;
        choiceDistribution: UserChoiceStats;
    }> {
        const [gameStats, playerCount, choiceStats] = await Promise.all([
            // 游戏统计
            this.ctx.db.collection('rps.records' as any).aggregate([
                { $match: { domainId } },
                {
                    $group: {
                        _id: null,
                        totalGames: { $sum: 1 },
                        totalCost: { $sum: '$baseCost' },
                        totalReward: { $sum: '$reward' },
                        wins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
                        draws: { $sum: { $cond: [{ $eq: ['$result', 'draw'] }, 1, 0] } },
                        losses: { $sum: { $cond: [{ $eq: ['$result', 'lose'] }, 1, 0] } }
                    }
                }
            ]).toArray(),

            // 玩家数量
            this.ctx.db.collection('rps.stats' as any).countDocuments({ domainId }),

            // 选择分布
            this.ctx.db.collection('rps.records' as any).aggregate([
                { $match: { domainId } },
                {
                    $group: {
                        _id: '$playerChoice',
                        count: { $sum: 1 }
                    }
                }
            ]).toArray()
        ]);

        const stats = gameStats[0] || {
            totalGames: 0,
            totalCost: 0,
            totalReward: 0,
            wins: 0,
            draws: 0,
            losses: 0
        };

        const choiceDistribution: UserChoiceStats = { rock: 0, paper: 0, scissors: 0 };
        choiceStats.forEach(choice => {
            if (choice._id && choiceDistribution.hasOwnProperty(choice._id)) {
                choiceDistribution[choice._id as keyof UserChoiceStats] = choice.count;
            }
        });

        return {
            totalGames: stats.totalGames,
            totalPlayers: playerCount,
            totalCost: stats.totalCost,
            totalReward: stats.totalReward,
            systemProfit: stats.totalCost - stats.totalReward,
            winRate: stats.totalGames > 0 ? (stats.wins / stats.totalGames * 100) : 0,
            drawRate: stats.totalGames > 0 ? (stats.draws / stats.totalGames * 100) : 0,
            loseRate: stats.totalGames > 0 ? (stats.losses / stats.totalGames * 100) : 0,
            choiceDistribution
        };
    }
}