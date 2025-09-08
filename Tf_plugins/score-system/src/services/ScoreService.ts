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
    domainId?: string; // 可选，用于向后兼容
    totalScore: number;
    acCount: number;
    lastUpdated: Date;
    migratedFrom?: string[]; // 迁移来源域列表
    migratedAt?: Date; // 迁移时间
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
     * 检查是否为首次AC (全局)
     * @param _domainId 域ID (保留用于记录，但不影响检查逻辑)
     * @param uid 用户ID
     * @param pid 题目ID
     * @returns 是否首次AC
     */
    async isFirstAC(_domainId: string, uid: number, pid: number): Promise<boolean> {
        // 检查该用户是否在任何域中AC过这道题
        const existingRecord = await this.ctx.db.collection('score.records' as any).findOne({
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
     * 更新用户总积分 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容，但不再用于数据隔离)
     * @param uid 用户ID
     * @param scoreChange 积分变化量（正数为增加，负数为减少）
     */
    async updateUserScore(_domainId: string, uid: number, scoreChange: number): Promise<void> {
        await this.ctx.db.collection('score.users' as any).updateOne(
            { uid }, // 移除 domainId 条件，改为全局用户积分
            {
                $inc: { totalScore: scoreChange, acCount: scoreChange > 0 ? 1 : 0 },
                $set: { lastUpdated: new Date() },
            },
            { upsert: true },
        );
    }

    /**
     * 获取用户积分 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @param uid 用户ID
     * @returns 用户积分信息
     */
    async getUserScore(_domainId: string, uid: number): Promise<UserScore | null> {
        return await this.ctx.db.collection('score.users' as any).findOne({ uid });
    }

    /**
     * 获取积分排行榜 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @param limit 返回数量限制
     * @returns 积分排行榜
     */
    async getScoreRanking(_domainId: string, limit: number = 50): Promise<UserScore[]> {
        return await this.ctx.db.collection('score.users' as any)
            .find({}) // 移除域限制，返回全局排行榜
            .sort({ totalScore: -1, lastUpdated: 1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取用户积分记录 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @param uid 用户ID
     * @param limit 返回数量限制
     * @returns 用户积分记录
     */
    async getUserScoreRecords(_domainId: string, uid: number, limit: number = 20): Promise<ScoreRecord[]> {
        return await this.ctx.db.collection('score.records' as any)
            .find({ uid }) // 移除域限制，返回用户所有记录
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取用户排名 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @param uid 用户ID
     * @returns 用户排名（从1开始，如果用户不存在返回null）
     */
    async getUserRank(_domainId: string, uid: number): Promise<number | null> {
        const userScore = await this.getUserScore(_domainId, uid);
        if (!userScore) return null;

        const higherRankCount = await this.ctx.db.collection('score.users' as any)
            .countDocuments({
                totalScore: { $gt: userScore.totalScore },
            });

        return higherRankCount + 1;
    }

    /**
     * 获取今日积分统计 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @returns 今日积分统计
     */
    async getTodayStats(_domainId: string): Promise<{
        totalScore: number;
        activeUsers: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayScores = await this.ctx.db.collection('score.records' as any)
            .find({
                createdAt: { $gte: today },
            })
            .toArray();

        const totalScore = todayScores.reduce((sum, record) => sum + record.score, 0);
        const activeUsers = new Set(todayScores.map((record) => record.uid)).size;

        return { totalScore, activeUsers };
    }
}
