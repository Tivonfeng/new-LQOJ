import {
    Context,
    ObjectId,
} from 'hydrooj';
import { ScoreService, ScoreRecord } from './ScoreService';
import { WeightCalculationService } from './WeightCalculationService';

// 抽奖奖品接口
export interface LotteryPrize {
    _id?: any;
    domainId?: string; // 可选，支持全域统一
    name: string;
    icon: string;
    description: string;
    type: 'coin' | 'badge' | 'privilege' | 'virtual';
    value: any;
    probability: number;
    weight: number;
    calculatedWeight?: number; // 自动计算的权重
    lastWeightUpdate?: Date; // 权重更新时间
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    enabled: boolean;
    totalStock: number;
    currentStock: number;
    createdAt: Date;
    updatedAt: Date;
}

// 抽奖记录接口
export interface LotteryRecord {
    _id?: any;
    uid: number;
    domainId: string;
    prizeId?: any;
    prizeName?: string;
    prizeIcon?: string;
    prizeRarity?: string;
    cost: number;
    lotteryType: 'basic' | 'premium';
    result: 'win' | 'lose';
    drawTime: Date;
    claimed: boolean;
    claimTime?: Date;
}

// 用户抽奖统计接口
export interface UserLotteryStats {
    _id?: any;
    uid: number;
    domainId: string;
    totalDraws: number;
    totalWins: number;
    totalSpent: number;
    totalValue: number;
    currentStreak: number;
    lastDrawTime: Date;
    rarityStats: {
        common: number;
        rare: number;
        epic: number;
        legendary: number;
    };
}

// 抽奖系统常量
export const LOTTERY_TYPES = {
    basic: {
        id: 'basic',
        name: '普通抽奖',
        cost: 10,
        icon: '🎲',
        description: '消耗10绿旗币，有机会获得各种奖励'
    },
    premium: {
        id: 'premium',
        name: '高级抽奖',
        cost: 50,
        icon: '💎',
        description: '消耗50绿旗币，获得稀有奖励概率更高',
        guaranteeDraws: 10
    }
} as const;

export const PRIZE_RARITY = {
    common: { name: '普通', color: '#9E9E9E', weight: 55 },
    rare: { name: '稀有', color: '#2196F3', weight: 20 },
    epic: { name: '史诗', color: '#9C27B0', weight: 15 },
    legendary: { name: '传说', color: '#FF9800', weight: 5 },
    no_prize: { name: '未中奖', color: '#ef4444', weight: 5 }
} as const;

/**
 * 抽奖系统服务
 * 负责：抽奖算法、奖品发放、保底机制、奖品管理
 */
export class LotteryService {
    private ctx: Context;
    private scoreService: ScoreService;
    private weightCalculationService: WeightCalculationService;

    constructor(ctx: Context, scoreService: ScoreService) {
        this.ctx = ctx;
        this.scoreService = scoreService;
        this.weightCalculationService = new WeightCalculationService(ctx);
    }

    /**
     * 初始化默认奖品(全域统一)
     */
    async initializePrizes() {
        const existingPrizes = await this.ctx.db.collection('lottery.prizes' as any)
            .countDocuments({});
        
        if (existingPrizes > 0) return; // 已有奖品，跳过初始化

        const defaultPrizes = [
            // 普通奖品
            { name: '绿旗币 x5', icon: '🪙', type: 'coin' as const, value: 5, rarity: 'common' as const, weight: 30 },
            { name: '绿旗币 x8', icon: '💰', type: 'coin' as const, value: 8, rarity: 'common' as const, weight: 20 },
            { name: '新手徽章', icon: '🔰', type: 'badge' as const, value: 'newbie', rarity: 'common' as const, weight: 15 },
            
            // 稀有奖品
            { name: '绿旗币 x20', icon: '💎', type: 'coin' as const, value: 20, rarity: 'rare' as const, weight: 15 },
            { name: '解题达人徽章', icon: '🎯', type: 'badge' as const, value: 'solver', rarity: 'rare' as const, weight: 8 },
            
            // 史诗奖品
            { name: '绿旗币 x50', icon: '💍', type: 'coin' as const, value: 50, rarity: 'epic' as const, weight: 7 },
            { name: '编程大师徽章', icon: '👑', type: 'badge' as const, value: 'master', rarity: 'epic' as const, weight: 3 },
            
            // 传说奖品
            { name: '绿旗币 x100', icon: '🏆', type: 'coin' as const, value: 100, rarity: 'legendary' as const, weight: 2 },
            { name: '传说程序员徽章', icon: '🌟', type: 'badge' as const, value: 'legend', rarity: 'legendary' as const, weight: 1 }
        ];

        for (const prize of defaultPrizes) {
            await this.ctx.db.collection('lottery.prizes' as any).insertOne({
                ...prize,
                description: `${prize.name}奖励`,
                // 保持原始权重，不要覆盖为1
                weight: prize.weight || 1,
                probability: 0, // 将在权重计算后更新
                enabled: true,
                totalStock: -1, // 无限库存
                currentStock: -1,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        console.log('[LotteryService] 默认奖品已添加，开始计算权重...');
        // 初始化权重
        await this.weightCalculationService.calculateAllWeights();
    }

    /**
     * 执行抽奖
     * @param domainId 域ID
     * @param uid 用户ID
     * @param lotteryType 抽奖类型
     * @returns 抽奖结果
     */
    async drawLottery(domainId: string, uid: number, lotteryType: 'basic' | 'premium'): Promise<{
        success: boolean;
        message?: string;
        result?: {
            won: boolean;
            prize?: LotteryPrize;
            record: LotteryRecord;
        };
    }> {
        const lotteryConfig = LOTTERY_TYPES[lotteryType];
        const cost = lotteryConfig.cost;

        // 检查用户积分
        const userScore = await this.scoreService.getUserScore(domainId, uid);
        if (!userScore || userScore.totalScore < cost) {
            return { success: false, message: '绿旗币不足' };
        }

        // 检查保底机制
        const shouldGuaranteeWin = await this.checkGuarantee(domainId, uid, lotteryType);
        
        // 获取可用奖品(全域统一)
        const availablePrizes = await this.getAvailablePrizes(lotteryType, shouldGuaranteeWin);
        if (availablePrizes.length === 0) {
            return { success: false, message: '暂无可用奖品' };
        }

        // 执行抽奖算法
        const drawnPrize = this.performDraw(availablePrizes, shouldGuaranteeWin);
        const won = drawnPrize !== null;

        // 扣除积分并记录
        await this.scoreService.updateUserScore(domainId, uid, -cost);
        await this.scoreService.addScoreRecord({
            uid,
            domainId,
            pid: 0,
            recordId: null,
            score: -cost,
            reason: `${lotteryType === 'basic' ? '普通' : '高级'}抽奖消费`,
            problemTitle: '抽奖系统'
        });

        // 创建抽奖记录
        const record: Omit<LotteryRecord, '_id'> = {
            uid,
            domainId,
            prizeId: drawnPrize?._id,
            prizeName: drawnPrize?.name,
            prizeIcon: drawnPrize?.icon,
            prizeRarity: drawnPrize?.rarity,
            cost,
            lotteryType,
            result: won ? 'win' : 'lose',
            drawTime: new Date(),
            claimed: false
        };

        const recordResult = await this.ctx.db.collection('lottery.records' as any).insertOne(record);
        const finalRecord = { ...record, _id: recordResult.insertedId };

        // 更新用户统计
        await this.updateUserStats(domainId, uid, cost, won ? drawnPrize : null);

        // 更新奖品库存
        if (won && drawnPrize && drawnPrize.currentStock > 0) {
            await this.ctx.db.collection('lottery.prizes' as any).updateOne(
                { _id: drawnPrize._id },
                { $inc: { currentStock: -1 } }
            );
        }

        return {
            success: true,
            result: {
                won,
                prize: drawnPrize || undefined,
                record: finalRecord
            }
        };
    }

    /**
     * 抽奖算法
     * @param prizes 可用奖品列表
     * @param guarantee 是否保底
     * @returns 抽中的奖品或null
     */
    private performDraw(prizes: LotteryPrize[], guarantee: boolean): LotteryPrize | null {
        if (guarantee) {
            // 保底情况下，只从稀有以上奖品中选择，跳过未中奖逻辑
            const guaranteePrizes = prizes.filter(p => 
                p.rarity === 'rare' || p.rarity === 'epic' || p.rarity === 'legendary'
            );
            if (guaranteePrizes.length > 0) {
                // 保底抽奖不包含未中奖概率
                const totalWeight = guaranteePrizes.reduce((sum, prize) => sum + prize.weight, 0);
                if (totalWeight === 0) return null;

                const random = Math.random() * totalWeight;
                let currentWeight = 0;

                for (const prize of guaranteePrizes) {
                    currentWeight += prize.weight;
                    if (random <= currentWeight) {
                        return prize;
                    }
                }
            }
        }

        // 正常抽奖逻辑：确保100%中奖
        const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);

        if (totalWeight === 0) return null; // 没有可用奖品

        const random = Math.random() * totalWeight;
        let currentWeight = 0;

        // 按权重选择奖品，确保必中
        for (const prize of prizes) {
            currentWeight += prize.weight;
            if (random <= currentWeight) {
                return prize;
            }
        }

        // 兜底：如果没有选中任何奖品，返回权重最大的奖品
        return prizes.reduce((max, prize) => 
            prize.weight > max.weight ? prize : max, prizes[0]
        );
    }

    /**
     * 检查保底机制
     * @param domainId 域ID
     * @param uid 用户ID
     * @param lotteryType 抽奖类型
     * @returns 是否应该保底
     */
    private async checkGuarantee(domainId: string, uid: number, lotteryType: string): Promise<boolean> {
        if (lotteryType !== 'premium') return false;

        const recentRecords = await this.ctx.db.collection('lottery.records' as any)
            .find({ 
                domainId, 
                uid, 
                lotteryType: 'premium', 
                result: 'lose' 
            })
            .sort({ drawTime: -1 })
            .limit(LOTTERY_TYPES.premium.guaranteeDraws)
            .toArray();

        return recentRecords.length >= LOTTERY_TYPES.premium.guaranteeDraws;
    }

    /**
     * 获取可用奖品
     * @param lotteryType 抽奖类型
     * @param guaranteeMode 是否保底模式
     * @returns 可用奖品列表
     */
    private async getAvailablePrizes(lotteryType: string, guaranteeMode: boolean = false): Promise<LotteryPrize[]> {
        let query: any = { 
            enabled: true,
            $or: [
                { currentStock: -1 }, // 无限库存
                { currentStock: { $gt: 0 } } // 有库存
            ]
        };

        const prizes = await this.ctx.db.collection('lottery.prizes' as any)
            .find(query)
            .toArray();

        // 高级抽奖调整权重分配
        if (lotteryType === 'premium' && !guaranteeMode) {
            return this.adjustPremiumWeights(prizes);
        }

        return prizes;
    }

    /**
     * 为高级抽奖调整奖品权重
     * 普通10%，稀有50%，史诗30%，传说10%
     */
    private adjustPremiumWeights(prizes: LotteryPrize[]): LotteryPrize[] {
        const premiumWeights = {
            common: 3000,      // 普通 10%
            rare: 5000,        // 稀有 50%
            epic: 1500,        // 史诗 30%
            legendary: 500    // 传说 10%
        };

        // 按稀有度分组
        const groupedPrizes: Record<string, LotteryPrize[]> = {
            common: [],
            rare: [],
            epic: [],
            legendary: []
        };

        prizes.forEach(prize => {
            if (groupedPrizes[prize.rarity]) {
                groupedPrizes[prize.rarity].push(prize);
            }
        });

        // 调整每个奖品的权重
        const adjustedPrizes: LotteryPrize[] = [];
        Object.entries(groupedPrizes).forEach(([rarity, rarityPrizes]) => {
            if (rarityPrizes.length === 0) return;

            const totalWeight = premiumWeights[rarity as keyof typeof premiumWeights] || 0;
            const individualWeight = Math.floor(totalWeight / rarityPrizes.length);

            rarityPrizes.forEach(prize => {
                adjustedPrizes.push({
                    ...prize,
                    weight: individualWeight
                });
            });
        });

        return adjustedPrizes;
    }

    /**
     * 更新用户抽奖统计
     * @param domainId 域ID
     * @param uid 用户ID
     * @param cost 消费积分
     * @param prize 获得奖品
     */
    private async updateUserStats(domainId: string, uid: number, cost: number, prize: LotteryPrize | null) {
        const updateData: any = {
            $inc: {
                totalDraws: 1,
                totalSpent: cost,
                ...(prize ? {
                    totalWins: 1,
                    currentStreak: 0, // 中奖后重置连续未中奖次数
                    [`rarityStats.${prize.rarity}`]: 1,
                    ...(prize.type === 'coin' ? { totalValue: prize.value } : {})
                } : {
                    currentStreak: 1 // 未中奖增加连续次数
                })
            },
            $set: { lastDrawTime: new Date() }
        };

        await this.ctx.db.collection('lottery.stats' as any).updateOne(
            { domainId, uid },
            updateData,
            { upsert: true }
        );
    }

    /**
     * 领取奖品
     * @param domainId 域ID
     * @param uid 用户ID
     * @param recordId 记录ID
     * @returns 领取结果
     */
    async claimPrize(domainId: string, uid: number, recordId: any): Promise<{
        success: boolean;
        message?: string;
    }> {
        // 确保 recordId 是正确的格式
        if (!recordId) {
            return { success: false, message: '记录ID不能为空' };
        }

        // 正确的 ObjectId 转换方式
        let queryId = recordId;
        
        // 如果是字符串，尝试转换为ObjectId
        if (typeof recordId === 'string') {
            if (ObjectId.isValid(recordId)) {
                queryId = new ObjectId(recordId);
            } else {
                return { success: false, message: '无效的记录ID格式' };
            }
        }

        const record = await this.ctx.db.collection('lottery.records' as any).findOne({
            _id: queryId,
            uid,
            domainId,
            result: 'win',
            claimed: false
        });

        if (!record) {
            return { success: false, message: '记录不存在或已领取' };
        }

        // 发放奖品
        if (record.prizeId) {
            const prize = await this.ctx.db.collection('lottery.prizes' as any).findOne({ _id: record.prizeId });
            if (prize) {
                await this.givePrize(domainId, uid, prize);
            }
        }

        // 标记为已领取，使用相同的queryId确保一致性
        await this.ctx.db.collection('lottery.records' as any).updateOne(
            { _id: queryId },
            { $set: { claimed: true, claimTime: new Date() } }
        );

        return { success: true, message: '奖品领取成功' };
    }

    /**
     * 发放奖品
     * @param domainId 域ID
     * @param uid 用户ID
     * @param prize 奖品信息
     */
    private async givePrize(domainId: string, uid: number, prize: LotteryPrize) {
        if (prize.type === 'coin') {
            // 发放绿旗币
            await this.scoreService.updateUserScore(domainId, uid, prize.value);
            await this.scoreService.addScoreRecord({
                uid,
                domainId,
                pid: 0,
                recordId: null,
                score: prize.value,
                reason: `抽奖获得 ${prize.name}`,
                problemTitle: '抽奖奖励'
            });
        } else if (prize.type === 'badge') {
            // 发放徽章 (可以根据实际需求实现徽章系统)
            console.log(`用户 ${uid} 获得徽章: ${prize.value}`);
        }
        // 其他类型奖品的发放逻辑...
    }

    /**
     * 获取用户抽奖历史
     * @param domainId 域ID
     * @param uid 用户ID
     * @param limit 返回数量限制
     * @returns 抽奖历史记录
     */
    async getUserLotteryHistory(domainId: string, uid: number, limit: number = 20): Promise<LotteryRecord[]> {
        return await this.ctx.db.collection('lottery.records' as any)
            .find({ domainId, uid })
            .sort({ drawTime: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取用户抽奖统计
     * @param domainId 域ID
     * @param uid 用户ID
     * @returns 用户抽奖统计
     */
    async getUserLotteryStats(domainId: string, uid: number): Promise<UserLotteryStats | null> {
        return await this.ctx.db.collection('lottery.stats' as any).findOne({ domainId, uid });
    }

    /**
     * 获取所有奖品
     * @param enabledOnly 是否只返回启用的奖品
     * @returns 奖品列表
     */
    async getAllPrizes(enabledOnly: boolean = false): Promise<LotteryPrize[]> {
        const query = enabledOnly ? { enabled: true } : {};
        return await this.ctx.db.collection('lottery.prizes' as any)
            .find(query)
            .sort({ rarity: 1, createdAt: -1 })
            .toArray();
    }

    /**
     * 获取抽奖统计信息
     * @returns 抽奖系统统计
     */
    async getLotteryStats(): Promise<{
        totalDraws: number;
        totalWins: number;
        totalCost: number;
        basicDraws: number;
        premiumDraws: number;
    }> {
        const stats = await this.ctx.db.collection('lottery.records' as any).aggregate([
            { $match: {} },
            {
                $group: {
                    _id: null,
                    totalDraws: { $sum: 1 },
                    totalWins: { $sum: { $cond: [{ $eq: ['$result', 'win'] }, 1, 0] } },
                    totalCost: { $sum: '$cost' },
                    basicDraws: { $sum: { $cond: [{ $eq: ['$lotteryType', 'basic'] }, 1, 0] } },
                    premiumDraws: { $sum: { $cond: [{ $eq: ['$lotteryType', 'premium'] }, 1, 0] } }
                }
            }
        ]).toArray();

        const result = stats[0];
        return {
            totalDraws: result?.totalDraws || 0,
            totalWins: result?.totalWins || 0,
            totalCost: result?.totalCost || 0,
            basicDraws: result?.basicDraws || 0,
            premiumDraws: result?.premiumDraws || 0
        };
    }

    /**
     * 添加新奖品后重新计算权重
     * @param rarity 奖品稀有度
     */
    async onPrizeAdded(rarity: string): Promise<void> {
        console.log(`[LotteryService] 奖品已添加，触发权重重新计算: ${rarity}`);
        await this.weightCalculationService.onPrizeAdded(rarity);
    }

    /**
     * 删除奖品后重新计算权重
     * @param rarity 奖品稀有度
     */
    async onPrizeDeleted(rarity: string): Promise<void> {
        console.log(`[LotteryService] 奖品已删除，触发权重重新计算: ${rarity}`);
        await this.weightCalculationService.onPrizeRemoved(rarity);
    }

    /**
     * 启用/禁用奖品后重新计算权重
     * @param rarity 奖品稀有度
     */
    async onPrizeStatusChanged(rarity: string): Promise<void> {
        console.log(`[LotteryService] 奖品状态已变更，触发权重重新计算: ${rarity}`);
        await this.weightCalculationService.onPrizeStatusChanged(rarity);
    }

    /**
     * 获取权重分布预览
     * @param lotteryType 抽奖类型
     */
    async getWeightDistribution(lotteryType: 'basic' | 'premium' = 'basic') {
        return await this.weightCalculationService.getWeightDistribution(lotteryType);
    }

    /**
     * 验证权重系统完整性
     */
    async validateWeightSystem() {
        return await this.weightCalculationService.validateWeightSystem();
    }

    /**
     * 重新计算所有权重
     */
    async recalculateAllWeights(): Promise<void> {
        console.log('[LotteryService] 手动触发全量权重重新计算');
        await this.weightCalculationService.calculateAllWeights();
    }
}