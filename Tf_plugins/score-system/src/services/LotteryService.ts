import {
    Context,
} from 'hydrooj';
import { ScoreCategory, ScoreService } from './ScoreService';

// 实物奖品信息接口
export interface PhysicalPrizeInfo {
    description: string; // 奖品描述
    imageUrl?: string; // 奖品图片
    stock?: number; // 库存（可选）
}

// 奖品配置接口
export interface PrizeConfig {
    name: string;
    type: 'reward' | 'nothing' | 'bonus' | 'physical';
    reward: number; // 积分奖励（physical 类型为 0）
    probability: number;
    physicalPrize?: PhysicalPrizeInfo; // 实物奖品信息（仅 physical 类型）
}

// 九宫格抽奖记录接口
export interface LotteryGameRecord {
    _id?: any;
    uid: number;
    domainId: string;
    bet: number; // 投入积分
    prizeIndex: number; // 中奖格子索引 (0-8)
    prizeName: string; // 奖品名称
    prizeType: 'reward' | 'nothing' | 'bonus' | 'physical'; // 奖品类型
    reward: number; // 奖励积分 (可能为0)
    netGain: number; // 净收益
    gameTime: Date;

    // 实物奖品核销相关字段
    physicalPrize?: PhysicalPrizeInfo; // 实物奖品信息
    redeemStatus?: 'pending' | 'redeemed' | 'cancelled'; // 核销状态
    redeemedAt?: Date; // 核销时间
    redeemedBy?: number; // 核销管理员UID
    redeemNote?: string; // 核销备注
}

// 用户抽奖统计接口
export interface UserLotteryStats {
    _id?: any;
    uid: number;
    domainId: string;
    totalGames: number; // 总抽奖次数
    totalWins: number; // 总中奖次数（有奖励的）
    totalBet: number; // 总投入积分
    totalReward: number; // 总奖励积分
    netProfit: number; // 净盈亏
    lastGameTime: Date;
}

/**
 * 九宫格抽奖游戏服务
 * 负责：游戏逻辑、积分管理、数据统计
 */
export class LotteryService {
    private ctx: Context;
    private scoreService: ScoreService;

    // 游戏常量
    private static readonly BET_AMOUNT = 100; // 每次抽奖消耗积分
    // 九宫格显示的9个位置（8个可见奖品 + 1个中间按钮占位）
    // 按界面显示顺序：左上(0) -> 上中(1) -> 右上(2) -> 右中(3) -> 中间(4,按钮占位) -> 右下(5) -> 下中(6) -> 左下(7) -> 左中(8)
    // 注意：索引4位置被按钮覆盖，但保留在数组中用于索引对应，抽奖时不会抽中此位置
    private static readonly PRIZES: PrizeConfig[] = [
        { name: '100积分', type: 'reward' as const, reward: 50, probability: 0.10 }, // 0: 左上 - 25%
        { name: '谢谢参与', type: 'nothing' as const, reward: 0, probability: 0.10 }, // 1: 上中 - 20%
        { name: '50积分', type: 'reward' as const, reward: 50, probability: 0.15 }, // 2: 右上 - 15%
        { name: '再来一次', type: 'bonus' as const, reward: 0, probability: 0.10 }, // 3: 右中 - 10%
        { name: '谢谢参与', type: 'nothing' as const, reward: 0, probability: 0.00 }, // 4: 中间（被按钮覆盖，概率为0，不会抽中）
        {
            name: '小玩具一份',
            type: 'physical' as const,
            reward: 0,
            probability: 0.10, // 5: 右下 - 10%
            physicalPrize: {
                description: '小玩具一份',
            },
        },
        {
            name: '小零食一份',
            type: 'physical' as const,
            reward: 0,
            probability: 0.20, // 6: 下中 - 8%
            physicalPrize: {
                description: '小零食一份',
            },
        },
        {
            name: '定制礼品',
            type: 'physical' as const,
            reward: 0,
            probability: 0.05, // 7: 左下 - 5%
            physicalPrize: {
                description: '定制礼品一份',
            },
        },
        {
            name: '饮料一瓶',
            type: 'physical' as const,
            reward: 0,
            probability: 0.20, // 8: 左中 - 7%
            physicalPrize: {
                description: '饮料一瓶',
            },
        },
    ];

    constructor(ctx: Context, scoreService: ScoreService) {
        this.ctx = ctx;
        this.scoreService = scoreService;
    }

    /**
     * 执行九宫格抽奖
     * @param domainId 域ID
     * @param uid 用户ID
     * @returns 游戏结果
     */
    async playLottery(domainId: string, uid: number): Promise<{
        success: boolean;
        message?: string;
        result?: LotteryGameRecord;
    }> {
        try {
            // 检查用户积分
            const userScore = await this.scoreService.getUserScore(domainId, uid);
            if (!userScore || userScore.totalScore < LotteryService.BET_AMOUNT) {
                return {
                    success: false,
                    message: `积分不足，需要${LotteryService.BET_AMOUNT}积分才能抽奖`,
                };
            }

            // 根据概率抽奖
            const prizeIndex = this.drawPrize();
            const prize = LotteryService.PRIZES[prizeIndex];

            // 计算净收益
            let netGain = -LotteryService.BET_AMOUNT; // 先扣除投注
            let finalReward = 0;

            if (prize.type === 'reward') {
                // 积分奖励：立即发放
                finalReward = prize.reward;
                netGain += prize.reward;
            } else if (prize.type === 'physical') {
                // 实物奖品：不发放积分，记录待核销状态
                finalReward = 0;
                // netGain 保持 -50（只扣除投注）
            } else if (prize.type === 'bonus') {
                // 再来一次：返还投注，相当于免费再抽一次
                finalReward = 0;
                netGain = 0; // 不扣除积分
            } else {
                // nothing: 谢谢参与
                finalReward = 0;
            }

            // 先保存游戏记录
            const gameRecord: Omit<LotteryGameRecord, '_id'> = {
                uid,
                domainId,
                bet: LotteryService.BET_AMOUNT,
                prizeIndex,
                prizeName: prize.name,
                prizeType: prize.type,
                reward: finalReward,
                netGain,
                gameTime: new Date(),
                // 如果是实物奖品，添加核销状态
                ...(prize.type === 'physical' ? {
                    physicalPrize: prize.physicalPrize,
                    redeemStatus: 'pending' as const, // 待核销
                } : {}),
            };

            const recordResult = await this.ctx.db.collection('lottery.records' as any).insertOne(gameRecord);
            const finalRecord = { ...gameRecord, _id: recordResult.insertedId };
            const gameRecordId = recordResult.insertedId;

            // 为每次游戏生成唯一的负数 pid，避免与题目ID冲突
            const timestamp = Math.floor(Date.now() / 1000);
            const uniquePid = -2000000 - (timestamp % 1000000);

            // 扣除投注积分
            await this.scoreService.updateUserScore(domainId, uid, -LotteryService.BET_AMOUNT);
            await this.scoreService.addScoreRecord({
                uid,
                domainId,
                pid: uniquePid,
                recordId: gameRecordId,
                score: -LotteryService.BET_AMOUNT,
                reason: `九宫格抽奖投注${LotteryService.BET_AMOUNT}积分`,
                category: ScoreCategory.GAME_ENTERTAINMENT,
                title: '九宫格抽奖',
            });

            // 只有积分奖励才发放积分
            if (prize.type === 'reward' && finalReward > 0) {
                await this.scoreService.updateUserScore(domainId, uid, finalReward);
                await this.scoreService.addScoreRecord({
                    uid,
                    domainId,
                    pid: uniquePid - 1,
                    recordId: gameRecordId,
                    score: finalReward,
                    reason: `九宫格抽奖获得${prize.name}`,
                    category: ScoreCategory.GAME_ENTERTAINMENT,
                    title: '九宫格抽奖',
                });
            }
            // 实物奖品不需要发放积分，但已记录到核销系统

            // 如果再来一次，返还投注
            if (prize.type === 'bonus') {
                await this.scoreService.updateUserScore(domainId, uid, LotteryService.BET_AMOUNT);
                await this.scoreService.addScoreRecord({
                    uid,
                    domainId,
                    pid: uniquePid - 2,
                    recordId: gameRecordId,
                    score: LotteryService.BET_AMOUNT,
                    reason: `九宫格抽奖获得${prize.name}，返还投注`,
                    category: ScoreCategory.GAME_ENTERTAINMENT,
                    title: '九宫格抽奖',
                });
            }

            // 更新用户统计（实物奖品也算中奖）
            const won = finalReward > 0 || prize.type === 'physical';
            await this.updateUserStats(domainId, uid, won, netGain, LotteryService.BET_AMOUNT, finalReward);

            return { success: true, result: finalRecord };
        } catch (error: any) {
            console.error(`[LotteryService] Error playing lottery for user ${uid}:`, error);
            return {
                success: false,
                message: `抽奖执行失败: ${error.message || '未知错误'}`,
            };
        }
    }

    /**
     * 根据概率抽取奖品
     * @returns 奖品索引 (0-8)
     */
    private drawPrize(): number {
        const random = Math.random();
        let cumulative = 0;

        for (let i = 0; i < LotteryService.PRIZES.length; i++) {
            cumulative += LotteryService.PRIZES[i].probability;
            if (random <= cumulative) {
                return i;
            }
        }

        // 默认返回第一个奖品（10积分）
        return 0;
    }

    /**
     * 更新用户游戏统计
     */
    private async updateUserStats(domainId: string, uid: number, won: boolean, netGain: number, betAmount: number, reward: number): Promise<void> {
        const updateData = {
            $inc: {
                totalGames: 1,
                totalWins: won ? 1 : 0,
                totalBet: betAmount,
                totalReward: reward,
                netProfit: netGain,
            },
            $set: {
                lastGameTime: new Date(),
            },
        };

        await this.ctx.db.collection('lottery.stats' as any).updateOne(
            { domainId, uid },
            updateData,
            { upsert: true },
        );
    }

    /**
     * 获取用户抽奖统计
     */
    async getUserLotteryStats(domainId: string, uid: number): Promise<UserLotteryStats | null> {
        return await this.ctx.db.collection('lottery.stats' as any).findOne({ domainId, uid });
    }

    /**
     * 获取用户游戏历史
     */
    async getUserGameHistory(domainId: string, uid: number, limit: number = 20): Promise<LotteryGameRecord[]> {
        return await this.ctx.db.collection('lottery.records' as any)
            .find({ domainId, uid })
            .sort({ gameTime: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取用户分页游戏历史
     */
    async getUserGameHistoryPaged(domainId: string, uid: number, page: number = 1, limit: number = 20): Promise<{
        records: LotteryGameRecord[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const records = await this.ctx.db.collection('lottery.records' as any)
            .find({ domainId, uid })
            .sort({ gameTime: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await this.ctx.db.collection('lottery.records' as any)
            .countDocuments({ domainId, uid });

        return {
            records,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * 获取游戏配置信息
     */
    getGameConfig() {
        return {
            betAmount: LotteryService.BET_AMOUNT,
            prizes: LotteryService.PRIZES.map((prize, index) => ({
                index,
                name: prize.name,
                type: prize.type,
                reward: prize.reward,
                physicalPrize: prize.physicalPrize,
            })),
        };
    }
}
