import {
    Context,
} from 'hydrooj';
import { ScoreService } from './ScoreService';

// 黄金矿工游戏记录接口
export interface GoldMinerRecord {
    _id?: any;
    uid: number;
    domainId: string;
    entryFee: number; // 入场费 (100积分)
    duration: number; // 游戏时长 (30s or 60s)
    score: number; // 游戏得分 (抓取的积分总和)
    items: Array<{ type: string; value: number; catchTime: number }>; // 抓取的物品
    netProfit: number; // 净收益 (score - entryFee)
    gameTime: Date;
}

// 用户黄金矿工统计接口
export interface UserGoldMinerStats {
    _id?: any;
    uid: number;
    domainId: string;
    totalGames: number; // 总游戏次数
    total30sGames: number; // 30秒游戏次数
    total60sGames: number; // 60秒游戏次数
    totalScore: number; // 总得分
    totalProfit: number; // 总盈利
    bestScore: number; // 最高得分
    bestProfit: number; // 最高盈利
    lastGameTime: Date;
}

// 可抓取物品类型
export interface MineItem {
    type: 'gold_large' | 'gold_medium' | 'gold_small' | 'stone' | 'diamond' | 'mystery_box';
    name: string;
    value: number; // 积分值
    weight: number; // 生成权重
    minCatchTime: number; // 最小抓取时间(秒)
    maxCatchTime: number; // 最大抓取时间(秒)
}

/**
 * 黄金矿工游戏服务
 * 负责：游戏逻辑、积分管理、数据统计
 */
export class GoldMinerService {
    private ctx: Context;
    private scoreService: ScoreService;

    // 游戏配置常量
    private static readonly ENTRY_FEES = {
        '30': 100,  // 30秒模式入场费
        '60': 200,  // 60秒模式入场费
    };

    private static readonly DURATIONS = [30, 60]; // 可选时长

    // 物品配置
    private static readonly MINE_ITEMS: MineItem[] = [
        { type: 'gold_large', name: '大金块', value: 150, weight: 5, minCatchTime: 4, maxCatchTime: 6 },
        { type: 'gold_medium', name: '中金块', value: 80, weight: 15, minCatchTime: 2, maxCatchTime: 4 },
        { type: 'gold_small', name: '小金块', value: 30, weight: 30, minCatchTime: 1, maxCatchTime: 2 },
        { type: 'stone', name: '石头', value: 5, weight: 25, minCatchTime: 3, maxCatchTime: 5 },
        { type: 'diamond', name: '钻石', value: 300, weight: 3, minCatchTime: 5, maxCatchTime: 8 },
        { type: 'mystery_box', name: '神秘宝箱', value: 0, weight: 7, minCatchTime: 2, maxCatchTime: 4 }, // 随机奖励
    ];

    constructor(ctx: Context, scoreService: ScoreService) {
        this.ctx = ctx;
        this.scoreService = scoreService;
    }

    /**
     * 开始游戏（扣除入场费）
     * @param domainId 域ID
     * @param uid 用户ID
     * @param duration 游戏时长(30/60)
     * @returns 游戏开始状态
     */
    async startGame(domainId: string, uid: number, duration: number): Promise<{
        success: boolean;
        message?: string;
        gameId?: any;
        entryFee?: number;
    }> {
        // 验证时长
        if (!GoldMinerService.DURATIONS.includes(duration)) {
            return { success: false, message: '无效的游戏时长，请选择30秒或60秒' };
        }

        const entryFee = GoldMinerService.ENTRY_FEES[duration.toString()];

        // 检查用户积分
        const userScore = await this.scoreService.getUserScore(domainId, uid);
        if (!userScore || userScore.totalScore < entryFee) {
            return {
                success: false,
                message: `积分不足，需要${entryFee}积分才能开始${duration}秒游戏`,
            };
        }

        // 扣除入场费
        await this.scoreService.updateUserScore(domainId, uid, -entryFee);
        await this.scoreService.addScoreRecord({
            uid,
            domainId,
            pid: 0,
            recordId: null,
            score: -entryFee,
            reason: `开始黄金矿工游戏(${duration}秒模式)`,
            problemTitle: '黄金矿工',
        });

        console.log(`[GoldMiner] User ${uid} started ${duration}s game, paid ${entryFee} coins`);

        return { success: true, entryFee, gameId: `${uid}_${Date.now()}` };
    }

    /**
     * 提交游戏结果
     * @param domainId 域ID
     * @param uid 用户ID
     * @param duration 游戏时长
     * @param items 抓取的物品列表
     * @returns 游戏结果
     */
    async submitGameResult(
        domainId: string,
        uid: number,
        duration: number,
        items: Array<{ type: string; catchTime: number }>,
    ): Promise<{
        success: boolean;
        message?: string;
        result?: GoldMinerRecord;
    }> {
        // 验证时长
        if (!GoldMinerService.DURATIONS.includes(duration)) {
            return { success: false, message: '无效的游戏时长' };
        }

        const entryFee = GoldMinerService.ENTRY_FEES[duration.toString()];

        // 计算总得分
        let totalScore = 0;
        const processedItems: Array<{ type: string; value: number; catchTime: number }> = [];

        for (const item of items) {
            const itemConfig = GoldMinerService.MINE_ITEMS.find((i) => i.type === item.type);
            if (!itemConfig) continue;

            let value = itemConfig.value;

            // 神秘宝箱随机奖励 (50-500)
            if (itemConfig.type === 'mystery_box') {
                value = Math.floor(Math.random() * 451) + 50;
            }

            totalScore += value;
            processedItems.push({
                type: item.type,
                value,
                catchTime: item.catchTime,
            });
        }

        const netProfit = totalScore - entryFee;

        // 发放游戏得分
        if (totalScore > 0) {
            await this.scoreService.updateUserScore(domainId, uid, totalScore);
            await this.scoreService.addScoreRecord({
                uid,
                domainId,
                pid: 0,
                recordId: null,
                score: totalScore,
                reason: `黄金矿工游戏获得${totalScore}积分 (${duration}秒模式, ${processedItems.length}件物品)`,
                problemTitle: '黄金矿工',
            });
        }

        // 保存游戏记录
        const gameRecord: Omit<GoldMinerRecord, '_id'> = {
            uid,
            domainId,
            entryFee,
            duration,
            score: totalScore,
            items: processedItems,
            netProfit,
            gameTime: new Date(),
        };

        const recordResult = await this.ctx.db.collection('goldminer.records' as any).insertOne(gameRecord);
        const finalRecord = { ...gameRecord, _id: recordResult.insertedId };

        // 更新用户统计
        await this.updateUserStats(domainId, uid, duration, totalScore, netProfit);

        console.log(`[GoldMiner] ✅ User ${uid} completed ${duration}s game - Score: ${totalScore}, Net: ${netProfit}`);

        return { success: true, result: finalRecord };
    }

    /**
     * 更新用户游戏统计
     * @param domainId 域ID
     * @param uid 用户ID
     * @param duration 游戏时长
     * @param score 得分
     * @param netProfit 净收益
     */
    private async updateUserStats(
        domainId: string,
        uid: number,
        duration: number,
        score: number,
        netProfit: number,
    ): Promise<void> {
        const currentStats = await this.ctx.db.collection('goldminer.stats' as any).findOne({ domainId, uid });

        const updateData: any = {
            $inc: {
                totalGames: 1,
                totalScore: score,
                totalProfit: netProfit,
            },
            $set: {
                lastGameTime: new Date(),
            },
        };

        // 更新对应时长的游戏次数
        if (duration === 30) {
            updateData.$inc.total30sGames = 1;
        } else if (duration === 60) {
            updateData.$inc.total60sGames = 1;
        }

        // 更新最佳记录
        if (!currentStats || score > (currentStats.bestScore || 0)) {
            updateData.$set.bestScore = score;
        }
        if (!currentStats || netProfit > (currentStats.bestProfit || 0)) {
            updateData.$set.bestProfit = netProfit;
        }

        await this.ctx.db.collection('goldminer.stats' as any).updateOne(
            { domainId, uid },
            updateData,
            { upsert: true },
        );
    }

    /**
     * 获取用户统计
     * @param domainId 域ID
     * @param uid 用户ID
     * @returns 用户游戏统计
     */
    async getUserStats(domainId: string, uid: number): Promise<UserGoldMinerStats | null> {
        return await this.ctx.db.collection('goldminer.stats' as any).findOne({ domainId, uid });
    }

    /**
     * 获取用户游戏历史
     * @param domainId 域ID
     * @param uid 用户ID
     * @param limit 返回数量限制
     * @returns 游戏历史记录
     */
    async getUserGameHistory(domainId: string, uid: number, limit: number = 20): Promise<GoldMinerRecord[]> {
        return await this.ctx.db.collection('goldminer.records' as any)
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
        records: GoldMinerRecord[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const records = await this.ctx.db.collection('goldminer.records' as any)
            .find({ domainId, uid })
            .sort({ gameTime: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await this.ctx.db.collection('goldminer.records' as any)
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
     * @returns 游戏配置
     */
    getGameConfig() {
        return {
            entryFees: GoldMinerService.ENTRY_FEES,
            durations: GoldMinerService.DURATIONS,
            items: GoldMinerService.MINE_ITEMS,
        };
    }

    /**
     * 获取系统统计
     * @param domainId 域ID
     * @returns 系统统计
     */
    async getSystemStats(domainId: string): Promise<{
        totalGames: number;
        totalPlayers: number;
        total30sGames: number;
        total60sGames: number;
        totalScoreEarned: number;
        totalEntryFeesCollected: number;
    }> {
        const gameStats = await this.ctx.db.collection('goldminer.records' as any).aggregate([
            { $match: { domainId } },
            {
                $group: {
                    _id: null,
                    totalGames: { $sum: 1 },
                    total30sGames: { $sum: { $cond: [{ $eq: ['$duration', 30] }, 1, 0] } },
                    total60sGames: { $sum: { $cond: [{ $eq: ['$duration', 60] }, 1, 0] } },
                    totalScoreEarned: { $sum: '$score' },
                    totalEntryFeesCollected: { $sum: '$entryFee' },
                    players: { $addToSet: '$uid' },
                },
            },
        ]).toArray();

        const result = gameStats[0];
        if (!result) {
            return {
                totalGames: 0,
                totalPlayers: 0,
                total30sGames: 0,
                total60sGames: 0,
                totalScoreEarned: 0,
                totalEntryFeesCollected: 0,
            };
        }

        return {
            totalGames: result.totalGames,
            totalPlayers: result.players.length,
            total30sGames: result.total30sGames,
            total60sGames: result.total60sGames,
            totalScoreEarned: result.totalScoreEarned,
            totalEntryFeesCollected: result.totalEntryFeesCollected,
        };
    }
}
