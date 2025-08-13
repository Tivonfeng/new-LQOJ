import {
    Context,
} from 'hydrooj';
import { ScoreService } from './ScoreService';

// 掷骰子游戏记录接口
export interface DiceGameRecord {
    _id?: any;
    uid: number;
    domainId: string;
    bet: number; // 投入积分 (固定20)
    guess: 'big' | 'small'; // 用户猜测
    diceValue: number; // 骰子点数 (1-6)
    actualResult: 'big' | 'small'; // 实际大小 (1-3为小，4-6为大)
    won: boolean; // 是否获胜
    reward: number; // 奖励积分 (获胜40，失败0)
    netGain: number; // 净收益 (+20 或 -20)
    gameTime: Date;
}

// 用户掷骰子统计接口
export interface UserDiceStats {
    _id?: any;
    uid: number;
    domainId: string;
    totalGames: number; // 总游戏次数
    totalWins: number; // 总胜利次数
    totalBet: number; // 总投入积分
    totalReward: number; // 总奖励积分
    netProfit: number; // 净盈亏
    winStreak: number; // 当前连胜次数
    maxWinStreak: number; // 最大连胜纪录
    lastGameTime: Date;
}

/**
 * 掷骰子猜大小游戏服务
 * 负责：游戏逻辑、积分管理、数据统计
 */
export class DiceGameService {
    private ctx: Context;
    private scoreService: ScoreService;

    // 游戏常量
    private static readonly BET_AMOUNT = 20; // 固定投注20积分
    private static readonly WIN_REWARD = 40; // 获胜奖励40积分
    private static readonly NET_WIN = 20; // 净收益20积分
    private static readonly NET_LOSS = -20; // 净亏损20积分

    constructor(ctx: Context, scoreService: ScoreService) {
        this.ctx = ctx;
        this.scoreService = scoreService;
    }

    /**
     * 执行掷骰子游戏
     * @param domainId 域ID
     * @param uid 用户ID
     * @param guess 用户猜测('big' | 'small')
     * @returns 游戏结果
     */
    async playDiceGame(domainId: string, uid: number, guess: 'big' | 'small'): Promise<{
        success: boolean;
        message?: string;
        result?: DiceGameRecord;
    }> {
        // 验证输入
        if (!['big', 'small'].includes(guess)) {
            return { success: false, message: '无效的猜测选项' };
        }

        // 检查用户积分
        const userScore = await this.scoreService.getUserScore(domainId, uid);
        if (!userScore || userScore.totalScore < DiceGameService.BET_AMOUNT) {
            return { 
                success: false, 
                message: `积分不足，需要${DiceGameService.BET_AMOUNT}积分才能游戏` 
            };
        }

        // 掷骰子 (1-6)
        const diceValue = Math.floor(Math.random() * 6) + 1;
        const actualResult: 'big' | 'small' = diceValue >= 4 ? 'big' : 'small';
        const won = guess === actualResult;
        const reward = won ? DiceGameService.WIN_REWARD : 0;
        const netGain = won ? DiceGameService.NET_WIN : DiceGameService.NET_LOSS;

        console.log(`[DiceGame] User ${uid} - Dice: ${diceValue}, Guess: ${guess}, Result: ${actualResult}, Won: ${won}`);

        // 扣除投注积分
        await this.scoreService.updateUserScore(domainId, uid, -DiceGameService.BET_AMOUNT);
        await this.scoreService.addScoreRecord({
            uid,
            domainId,
            pid: 0,
            recordId: null,
            score: -DiceGameService.BET_AMOUNT,
            reason: `掷骰子游戏投注`,
            problemTitle: '掷骰子游戏'
        });

        // 如果获胜，发放奖励
        if (won) {
            await this.scoreService.updateUserScore(domainId, uid, DiceGameService.WIN_REWARD);
            await this.scoreService.addScoreRecord({
                uid,
                domainId,
                pid: 0,
                recordId: null,
                score: DiceGameService.WIN_REWARD,
                reason: `掷骰子猜中获胜 (${diceValue}点-${actualResult})`,
                problemTitle: '掷骰子游戏'
            });
        }

        // 保存游戏记录
        const gameRecord: Omit<DiceGameRecord, '_id'> = {
            uid,
            domainId,
            bet: DiceGameService.BET_AMOUNT,
            guess,
            diceValue,
            actualResult,
            won,
            reward,
            netGain,
            gameTime: new Date()
        };

        const recordResult = await this.ctx.db.collection('dice.records' as any).insertOne(gameRecord);
        const finalRecord = { ...gameRecord, _id: recordResult.insertedId };

        // 更新用户统计
        await this.updateUserStats(domainId, uid, won, netGain);

        console.log(`[DiceGame] ✅ User ${uid} game completed - Net: ${netGain}`);

        return { success: true, result: finalRecord };
    }

    /**
     * 更新用户游戏统计
     * @param domainId 域ID
     * @param uid 用户ID
     * @param won 是否获胜
     * @param netGain 净收益
     */
    private async updateUserStats(domainId: string, uid: number, won: boolean, netGain: number): Promise<void> {
        // 先获取当前统计以计算连胜
        const currentStats = await this.ctx.db.collection('dice.stats' as any).findOne({ domainId, uid });
        
        let newWinStreak = 0;
        let maxWinStreak = 0;

        if (currentStats) {
            if (won) {
                newWinStreak = currentStats.winStreak + 1;
                maxWinStreak = Math.max(currentStats.maxWinStreak || 0, newWinStreak);
            } else {
                newWinStreak = 0;
                maxWinStreak = currentStats.maxWinStreak || 0;
            }
        } else {
            if (won) {
                newWinStreak = 1;
                maxWinStreak = 1;
            }
        }

        const updateData = {
            $inc: {
                totalGames: 1,
                totalWins: won ? 1 : 0,
                totalBet: DiceGameService.BET_AMOUNT,
                totalReward: won ? DiceGameService.WIN_REWARD : 0,
                netProfit: netGain
            },
            $set: { 
                lastGameTime: new Date(),
                winStreak: newWinStreak,
                maxWinStreak: maxWinStreak
            }
        };

        await this.ctx.db.collection('dice.stats' as any).updateOne(
            { domainId, uid },
            updateData,
            { upsert: true }
        );
    }

    /**
     * 获取用户掷骰子统计
     * @param domainId 域ID
     * @param uid 用户ID
     * @returns 用户游戏统计
     */
    async getUserDiceStats(domainId: string, uid: number): Promise<UserDiceStats | null> {
        return await this.ctx.db.collection('dice.stats' as any).findOne({ domainId, uid });
    }

    /**
     * 获取用户游戏历史
     * @param domainId 域ID
     * @param uid 用户ID
     * @param limit 返回数量限制
     * @returns 游戏历史记录
     */
    async getUserGameHistory(domainId: string, uid: number, limit: number = 20): Promise<DiceGameRecord[]> {
        return await this.ctx.db.collection('dice.records' as any)
            .find({ domainId, uid })
            .sort({ gameTime: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取用户分页游戏历史
     * @param domainId 域ID
     * @param uid 用户ID
     * @param page 页码
     * @param limit 每页数量
     * @returns 分页游戏历史
     */
    async getUserGameHistoryPaged(domainId: string, uid: number, page: number = 1, limit: number = 20): Promise<{
        records: DiceGameRecord[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        
        const records = await this.ctx.db.collection('dice.records' as any)
            .find({ domainId, uid })
            .sort({ gameTime: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await this.ctx.db.collection('dice.records' as any)
            .countDocuments({ domainId, uid });

        return {
            records,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * 获取游戏系统统计
     * @param domainId 域ID
     * @returns 系统统计
     */
    async getSystemStats(domainId: string): Promise<{
        totalGames: number;
        totalPlayers: number;
        totalBet: number;
        totalReward: number;
        winRate: number;
    }> {
        const gameStats = await this.ctx.db.collection('dice.records' as any).aggregate([
            { $match: { domainId } },
            {
                $group: {
                    _id: null,
                    totalGames: { $sum: 1 },
                    totalWins: { $sum: { $cond: ['$won', 1, 0] } },
                    totalBet: { $sum: '$bet' },
                    totalReward: { $sum: '$reward' },
                    players: { $addToSet: '$uid' }
                }
            }
        ]).toArray();

        const result = gameStats[0];
        if (!result) {
            return {
                totalGames: 0,
                totalPlayers: 0,
                totalBet: 0,
                totalReward: 0,
                winRate: 0
            };
        }

        return {
            totalGames: result.totalGames,
            totalPlayers: result.players.length,
            totalBet: result.totalBet,
            totalReward: result.totalReward,
            winRate: result.totalGames > 0 ? (result.totalWins / result.totalGames * 100) : 0
        };
    }

    /**
     * 获取游戏配置信息
     * @returns 游戏配置
     */
    getGameConfig() {
        return {
            betAmount: DiceGameService.BET_AMOUNT,
            winReward: DiceGameService.WIN_REWARD,
            netWin: DiceGameService.NET_WIN,
            netLoss: DiceGameService.NET_LOSS,
            rules: {
                small: '1-3',
                big: '4-6'
            }
        };
    }
}