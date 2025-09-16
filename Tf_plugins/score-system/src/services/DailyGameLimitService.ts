import {
    Context,
} from 'hydrooj';

// 用户每日游戏次数记录接口
export interface DailyGameLimit {
    _id?: any;
    uid: number;
    domainId: string;
    gameType: 'lottery' | 'dice' | 'rps';
    date: string; // YYYY-MM-DD格式
    playCount: number;
    lastPlayTime: Date;
}

/**
 * 每日游戏次数限制服务
 * 负责：管理三个游戏的每日游戏次数限制
 */
export class DailyGameLimitService {
    private ctx: Context;
    private static readonly MAX_DAILY_PLAYS = 10; // 每日最大游戏次数

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    /**
     * 获取今天的日期字符串 (YYYY-MM-DD)
     */
    private getTodayString(): string {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * 检查用户今日是否还能继续游戏（全域限制）
     * @param domainId 域ID
     * @param uid 用户ID
     * @param gameType 游戏类型
     * @returns 是否可以游戏以及剩余次数
     */
    async checkCanPlay(domainId: string, uid: number, gameType: 'lottery' | 'dice' | 'rps'): Promise<{
        canPlay: boolean;
        remainingPlays: number;
        totalPlays: number;
        maxPlays: number;
    }> {
        const today = this.getTodayString();

        // 查找用户今日该游戏类型的所有记录（跨所有域）
        const records = await this.ctx.db.collection('daily_game_limits' as any)
            .find({
                uid,
                gameType,
                date: today,
            })
            .toArray();

        // 计算总游戏次数
        const currentPlays = records.reduce((total, record) => total + record.playCount, 0);
        const remainingPlays = Math.max(0, DailyGameLimitService.MAX_DAILY_PLAYS - currentPlays);
        const canPlay = remainingPlays > 0;

        return {
            canPlay,
            remainingPlays,
            totalPlays: currentPlays,
            maxPlays: DailyGameLimitService.MAX_DAILY_PLAYS,
        };
    }

    /**
     * 记录一次游戏
     * @param domainId 域ID
     * @param uid 用户ID
     * @param gameType 游戏类型
     * @returns 是否记录成功
     */
    async recordPlay(domainId: string, uid: number, gameType: 'lottery' | 'dice' | 'rps'): Promise<boolean> {
        const today = this.getTodayString();
        const now = new Date();

        try {
            // 使用upsert操作，如果记录存在则增加计数，不存在则创建
            const result = await this.ctx.db.collection('daily_game_limits' as any).updateOne(
                {
                    uid,
                    domainId,
                    gameType,
                    date: today,
                },
                {
                    $inc: { playCount: 1 },
                    $set: { lastPlayTime: now },
                    $setOnInsert: {
                        uid,
                        domainId,
                        gameType,
                        date: today,
                    },
                },
                { upsert: true },
            );

            return result.acknowledged;
        } catch (error) {
            console.error('[DailyGameLimitService] 记录游戏次数失败:', error);
            return false;
        }
    }

    /**
     * 获取用户所有游戏类型的今日剩余次数（全域限制）
     * @param _domainId 域ID（未使用，保持API兼容性）
     * @param uid 用户ID
     * @returns 各游戏类型的剩余次数
     */
    async getAllRemainingPlays(_domainId: string, uid: number): Promise<{
        lottery: number;
        dice: number;
        rps: number;
    }> {
        const today = this.getTodayString();

        // 查找今日所有游戏记录（跨所有域）
        const records = await this.ctx.db.collection('daily_game_limits' as any)
            .find({
                uid,
                date: today,
            })
            .toArray();

        // 按游戏类型统计总次数
        const gameStats = {
            lottery: 0,
            dice: 0,
            rps: 0,
        };

        for (const record of records) {
            if (record.gameType in gameStats) {
                gameStats[record.gameType] += record.playCount;
            }
        }

        // 计算剩余次数
        const result = {
            lottery: Math.max(0, DailyGameLimitService.MAX_DAILY_PLAYS - gameStats.lottery),
            dice: Math.max(0, DailyGameLimitService.MAX_DAILY_PLAYS - gameStats.dice),
            rps: Math.max(0, DailyGameLimitService.MAX_DAILY_PLAYS - gameStats.rps),
        };

        return result;
    }

    /**
     * 获取最大每日游戏次数限制
     */
    static getMaxDailyPlays(): number {
        return DailyGameLimitService.MAX_DAILY_PLAYS;
    }

    /**
     * 清理过期的游戏次数记录 (可选，用于维护)
     * @param daysToKeep 保留多少天的记录，默认30天
     */
    async cleanupOldRecords(daysToKeep: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffString = cutoffDate.toISOString().split('T')[0];

        try {
            const result = await this.ctx.db.collection('daily_game_limits' as any).deleteMany({
                date: { $lt: cutoffString },
            });

            console.log(`[DailyGameLimitService] 清理了 ${result.deletedCount} 条过期记录`);
            return result.deletedCount;
        } catch (error) {
            console.error('[DailyGameLimitService] 清理过期记录失败:', error);
            return 0;
        }
    }
}
