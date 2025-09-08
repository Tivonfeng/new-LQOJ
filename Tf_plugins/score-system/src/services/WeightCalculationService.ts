/* eslint-disable no-await-in-loop */
/* eslint-disable github/array-foreach */
import { Context } from 'hydrooj';
import { LotteryPrize } from './LotteryService';

/**
 * 权重计算服务
 * 负责：自动计算奖品权重、维护稀有度概率分布
 */
export class WeightCalculationService {
    private ctx: Context;

    // 稀有度基础权重配置 (放大100倍避免小数)
    private readonly RARITY_BASE_WEIGHTS = {
        common: 6000, // 普通 50%
        rare: 2000, // 稀有 30%
        epic: 1500, // 史诗 15%
        legendary: 500, // 传说 5%
    };


    // 未中奖权重 - 降低未中奖概率，提升用户体验
    private readonly NO_PRIZE_WEIGHT = 0; // 0% 未中奖 (移除未中奖机制)

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    /**
     * 计算所有奖品的权重
     * 同一稀有度的奖品平均分配该稀有度的总权重
     */
    async calculateAllWeights(): Promise<void> {
        console.log('[WeightCalculation] 开始重新计算所有奖品权重...');

        // 获取所有启用的奖品
        const allPrizes = await this.ctx.db.collection('lottery.prizes' as any)
            .find({ enabled: true })
            .toArray();

        if (allPrizes.length === 0) {
            console.log('[WeightCalculation] 没有找到启用的奖品');
            return;
        }

        // 按稀有度分组
        const groupedPrizes = this.groupByRarity(allPrizes);

        // 为每个稀有度计算权重
        for (const [rarity, prizes] of Object.entries(groupedPrizes)) {
            if (prizes.length === 0) continue;

            const baseWeight = this.RARITY_BASE_WEIGHTS[rarity as keyof typeof this.RARITY_BASE_WEIGHTS];
            if (!baseWeight) {
                console.warn(`[WeightCalculation] 未知稀有度: ${rarity}`);
                continue;
            }

            // 同稀有度下每个奖品的权重 = 基础权重 / 奖品数量
            const individualWeight = Math.floor(baseWeight / prizes.length);

            console.log(`[WeightCalculation] ${rarity} 级别: ${prizes.length}个奖品, 每个权重: ${individualWeight}`);

            // 更新数据库中该稀有度所有奖品的权重
            const prizeIds = prizes.map((p) => p._id);
            await this.ctx.db.collection('lottery.prizes' as any).updateMany(
                { _id: { $in: prizeIds } },
                {
                    $set: {
                        weight: individualWeight,
                        calculatedWeight: individualWeight,
                        lastWeightUpdate: new Date(),
                    },
                },
            );
        }

        console.log('[WeightCalculation] 权重计算完成');
    }

    /**
     * 为特定稀有度重新计算权重
     * 用于添加/删除奖品后的增量更新
     */
    async recalculateRarityWeights(rarity: string): Promise<void> {
        console.log(`[WeightCalculation] 重新计算 ${rarity} 级别权重...`);

        const baseWeight = this.RARITY_BASE_WEIGHTS[rarity as keyof typeof this.RARITY_BASE_WEIGHTS];
        if (!baseWeight) {
            console.warn(`[WeightCalculation] 未知稀有度: ${rarity}`);
            return;
        }

        // 获取该稀有度的所有启用奖品
        const rarityPrizes = await this.ctx.db.collection('lottery.prizes' as any)
            .find({ rarity, enabled: true })
            .toArray();

        if (rarityPrizes.length === 0) {
            console.log(`[WeightCalculation] ${rarity} 级别没有启用的奖品`);
            return;
        }

        // 计算新权重
        const individualWeight = Math.floor(baseWeight / rarityPrizes.length);

        console.log(`[WeightCalculation] ${rarity} 级别: ${rarityPrizes.length}个奖品, 新权重: ${individualWeight}`);

        // 更新权重
        await this.ctx.db.collection('lottery.prizes' as any).updateMany(
            { rarity, enabled: true },
            {
                $set: {
                    weight: individualWeight,
                    calculatedWeight: individualWeight,
                    lastWeightUpdate: new Date(),
                },
            },
        );
    }

    /**
     * 添加新奖品后触发权重重新计算
     */
    async onPrizeAdded(rarity: string): Promise<void> {
        console.log(`[WeightCalculation] 检测到新奖品添加: ${rarity} 级别`);
        await this.recalculateRarityWeights(rarity);
    }

    /**
     * 删除奖品后触发权重重新计算
     */
    async onPrizeRemoved(rarity: string): Promise<void> {
        console.log(`[WeightCalculation] 检测到奖品删除: ${rarity} 级别`);
        await this.recalculateRarityWeights(rarity);
    }

    /**
     * 启用/禁用奖品后触发权重重新计算
     */
    async onPrizeStatusChanged(rarity: string): Promise<void> {
        console.log(`[WeightCalculation] 检测到奖品状态变更: ${rarity} 级别`);
        await this.recalculateRarityWeights(rarity);
    }

    /**
     * 获取权重分布预览
     * @param lotteryType 抽奖类型，用于显示不同权重分布
     */
    async getWeightDistribution(lotteryType: 'basic' = 'basic'): Promise<{
        rarity: string;
        rarityLabel: string;
        prizeCount: number;
        totalWeight: number;
        individualWeight: number;
        probability: string;
    }[]> {
        const allPrizes = await this.ctx.db.collection('lottery.prizes' as any)
            .find({ enabled: true })
            .toArray();

        const groupedPrizes = this.groupByRarity(allPrizes);

        // 使用基础权重配置
        const weightConfig = this.RARITY_BASE_WEIGHTS;
        const totalSystemWeight = Object.values(weightConfig).reduce((sum, w) => sum + w, 0);

        const rarityLabels = {
            common: '普通',
            rare: '稀有',
            epic: '史诗',
            legendary: '传说',
            no_prize: '未中奖',
        };

        const result = Object.entries(groupedPrizes).map(([rarity, prizes]) => {
            const baseWeight = weightConfig[rarity as keyof typeof weightConfig] || 0;
            const individualWeight = prizes.length > 0 ? Math.floor(baseWeight / prizes.length) : 0;
            const probability = ((baseWeight / totalSystemWeight) * 100).toFixed(1);

            return {
                rarity,
                rarityLabel: rarityLabels[rarity as keyof typeof rarityLabels] || rarity,
                prizeCount: prizes.length,
                totalWeight: baseWeight,
                individualWeight,
                probability: `${probability}%`,
            };
        }).sort((a, b) => b.totalWeight - a.totalWeight);

        // 不再显示未中奖项，因为已移除未中奖机制
        return result;
    }

    /**
     * 按稀有度分组奖品
     */
    private groupByRarity(prizes: LotteryPrize[]): Record<string, LotteryPrize[]> {
        const groups: Record<string, LotteryPrize[]> = {
            common: [],
            rare: [],
            epic: [],
            legendary: [],
        };

        prizes.forEach((prize) => {
            if (groups[prize.rarity]) {
                groups[prize.rarity].push(prize);
            }
        });

        return groups;
    }

    /**
     * 验证权重系统完整性
     */
    async validateWeightSystem(): Promise<{
        isValid: boolean;
        issues: string[];
        summary: any;
    }> {
        const issues: string[] = [];

        // 获取所有奖品
        const allPrizes = await this.ctx.db.collection('lottery.prizes' as any)
            .find({})
            .toArray();

        const enabledPrizes = allPrizes.filter((p) => p.enabled);
        const groupedPrizes = this.groupByRarity(enabledPrizes);

        // 检查是否有奖品
        if (enabledPrizes.length === 0) {
            issues.push('系统中没有启用的奖品');
        }

        // 检查每个稀有度的权重一致性
        Object.entries(groupedPrizes).forEach(([rarity, prizes]) => {
            if (prizes.length === 0) return;

            const weights = prizes.map((p) => p.weight || p.calculatedWeight || 0);
            const uniqueWeights = [...new Set(weights)];

            if (uniqueWeights.length > 1) {
                issues.push(`${rarity} 级别奖品权重不一致: ${uniqueWeights.join(', ')}`);
            }

            if (weights.some((w) => w <= 0)) {
                issues.push(`${rarity} 级别存在无效权重 (≤0)`);
            }
        });

        // 验证总概率是否为100%
        const totalPrizeWeight = Object.values(this.RARITY_BASE_WEIGHTS).reduce((sum, w) => sum + w, 0);
        const expectedTotal = 10000; // 100%

        if (totalPrizeWeight !== expectedTotal) {
            issues.push(`总权重不正确: ${totalPrizeWeight}, 期望: ${expectedTotal}`);
        }

        const summary = await this.getWeightDistribution();

        return {
            isValid: issues.length === 0,
            issues,
            summary,
        };
    }

    /**
     * 获取未中奖权重
     */
    getNoPrizeWeight(): number {
        return this.NO_PRIZE_WEIGHT;
    }

    /**
     * 获取总权重（包含未中奖）
     */
    getTotalWeight(): number {
        return Object.values(this.RARITY_BASE_WEIGHTS).reduce((sum, w) => sum + w, 0);
    }
}
