import {
    Context,
} from 'hydrooj';

// 积分记录接口
export interface ScoreRecord {
    _id?: any;
    uid: number;
    domainId: string;
    pid: number;
    recordId: any;
    score: number;
    reason: string;
    createdAt: Date;
    problemTitle?: string;
}

// 用户积分统计接口
export interface UserScore {
    _id?: any;
    uid: number;
    domainId: string;
    totalScore: number;
    acCount: number;
    lastUpdated: Date;
}

// 积分系统配置接口
export interface ScoreConfig {
    enabled: boolean;
}

/**
 * 积分计算与管理服务
 * 负责：AC积分计算、用户积分管理、排行榜查询
 */
export class ScoreService {
    private config: ScoreConfig;
    private ctx: Context;

    constructor(config: ScoreConfig, ctx: Context) {
        this.config = config;
        this.ctx = ctx;
    }

    /**
     * 计算AC积分
     * @param isFirstAC 是否首次AC
     * @returns 获得的积分
     */
    calculateACScore(isFirstAC: boolean): number {
        if (!this.config.enabled) return 0;

        // 只有首次AC才得分，防止恶意刷题
        if (!isFirstAC) return 0;

        // 固定每AC一题10分
        return 10;
    }

    /**
     * 检查是否为首次AC
     * @param domainId 域ID
     * @param uid 用户ID
     * @param pid 题目ID
     * @returns 是否首次AC
     */
    async isFirstAC(domainId: string, uid: number, pid: number): Promise<boolean> {
        const existingRecord = await this.ctx.db.collection('score.records' as any).findOne({
            domainId,
            uid,
            pid,
        });
        return !existingRecord;
    }

    /**
     * 添加积分记录
     * @param record 积分记录（不包含_id和createdAt）
     */
    async addScoreRecord(record: Omit<ScoreRecord, '_id' | 'createdAt'>): Promise<void> {
        await this.ctx.db.collection('score.records' as any).insertOne({
            ...record,
            createdAt: new Date(),
        });
    }

    /**
     * 更新用户总积分
     * @param domainId 域ID
     * @param uid 用户ID
     * @param scoreChange 积分变化量（正数为增加，负数为减少）
     */
    async updateUserScore(domainId: string, uid: number, scoreChange: number): Promise<void> {
        await this.ctx.db.collection('score.users' as any).updateOne(
            { domainId, uid },
            {
                $inc: { totalScore: scoreChange, acCount: scoreChange > 0 ? 1 : 0 },
                $set: { lastUpdated: new Date() },
            },
            { upsert: true },
        );
    }

    /**
     * 获取用户积分
     * @param domainId 域ID
     * @param uid 用户ID
     * @returns 用户积分信息
     */
    async getUserScore(domainId: string, uid: number): Promise<UserScore | null> {
        return await this.ctx.db.collection('score.users' as any).findOne({ domainId, uid });
    }

    /**
     * 获取积分排行榜
     * @param domainId 域ID
     * @param limit 返回数量限制
     * @returns 积分排行榜
     */
    async getScoreRanking(domainId: string, limit: number = 50): Promise<UserScore[]> {
        return await this.ctx.db.collection('score.users' as any)
            .find({ domainId })
            .sort({ totalScore: -1, lastUpdated: 1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取用户积分记录
     * @param domainId 域ID
     * @param uid 用户ID
     * @param limit 返回数量限制
     * @returns 用户积分记录
     */
    async getUserScoreRecords(domainId: string, uid: number, limit: number = 20): Promise<ScoreRecord[]> {
        return await this.ctx.db.collection('score.records' as any)
            .find({ domainId, uid })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取用户排名
     * @param domainId 域ID
     * @param uid 用户ID
     * @returns 用户排名（从1开始，如果用户不存在返回null）
     */
    async getUserRank(domainId: string, uid: number): Promise<number | null> {
        const userScore = await this.getUserScore(domainId, uid);
        if (!userScore) return null;

        const higherRankCount = await this.ctx.db.collection('score.users' as any)
            .countDocuments({
                domainId,
                totalScore: { $gt: userScore.totalScore },
            });

        return higherRankCount + 1;
    }

    /**
     * 获取今日积分统计
     * @param domainId 域ID
     * @returns 今日积分统计
     */
    async getTodayStats(domainId: string): Promise<{
        totalScore: number;
        activeUsers: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayScores = await this.ctx.db.collection('score.records' as any)
            .find({
                domainId,
                createdAt: { $gte: today },
            })
            .toArray();

        const totalScore = todayScores.reduce((sum, record) => sum + record.score, 0);
        const activeUsers = new Set(todayScores.map((record) => record.uid)).size;

        return { totalScore, activeUsers };
    }
}
