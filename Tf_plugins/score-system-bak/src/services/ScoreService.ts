import {
    Context,
} from 'hydrooj';
import type {
    IScoreService,
    ScoreConfig,
    ScoreOperationResult,
    ScoreRecord,
    UserScore,
} from '../types';
import { SCORE_EVENTS } from '../events/ScoreEvents';

// 导出类型以保持向后兼容
export type { ScoreConfig, ScoreRecord, UserScore } from '../types';

/**
 * 积分计算与管理服务
 * 负责：AC积分计算、用户积分管理、排行榜查询
 */
export class ScoreService implements IScoreService {
    private config: ScoreConfig;
    private ctx: Context;

    constructor(config: ScoreConfig, ctx: Context) {
        this.config = config;
        this.ctx = ctx;
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

    /**
     * 分页获取所有积分记录
     * @param domainId 域ID
     * @param page 页码（从1开始）
     * @param limit 每页数量
     * @returns 分页的积分记录
     */
    async getScoreRecordsWithPagination(domainId: string, page: number, limit: number): Promise<{
        records: ScoreRecord[];
        total: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        // 获取积分记录
        const records = await this.ctx.db.collection('score.records' as any)
            .find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // 获取总记录数
        const total = await this.ctx.db.collection('score.records' as any)
            .countDocuments();

        const totalPages = Math.ceil(total / limit);

        return {
            records,
            total,
            totalPages,
            currentPage: page,
        };
    }

    /**
     * 格式化积分记录的日期
     * @param records 原始记录数组
     * @returns 格式化后的记录数组
     */
    formatScoreRecords(records: ScoreRecord[]): Array<Omit<ScoreRecord, 'createdAt'> & { createdAt: string }> {
        return records.map((record) => ({
            ...record,
            createdAt: record.createdAt.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
        }));
    }

    /**
     * 检查用户积分是否足够
     */
    async checkSufficientScore(domainId: string, uid: number, requiredScore: number): Promise<boolean> {
        const userScore = await this.getUserScore(domainId, uid);
        return userScore ? userScore.totalScore >= requiredScore : false;
    }

    /**
     * 扣除用户积分（带检查）
     */
    async deductUserScore(domainId: string, uid: number, score: number, reason: string): Promise<ScoreOperationResult> {
        try {
            const sufficientScore = await this.checkSufficientScore(domainId, uid, score);
            if (!sufficientScore) {
                const currentScore = await this.getUserScore(domainId, uid);
                this.ctx.emit(SCORE_EVENTS.SCORE_INSUFFICIENT, {
                    uid,
                    domainId,
                    required: score,
                    current: currentScore?.totalScore || 0,
                    action: reason,
                });
                return {
                    success: false,
                    message: '积分不足',
                    data: { required: score, current: currentScore?.totalScore || 0 },
                };
            }

            await this.updateUserScore(domainId, uid, -score);
            await this.addScoreRecord({
                uid,
                domainId,
                pid: 0, // 非题目相关的积分变化
                recordId: null,
                score: -score,
                reason,
            });

            this.ctx.emit(SCORE_EVENTS.SCORE_CHANGE, {
                uid,
                domainId,
                change: -score,
                reason,
            });

            return {
                success: true,
                message: '积分扣除成功',
            };
        } catch (error) {
            console.error('[ScoreService] 扣除积分失败:', error);
            return {
                success: false,
                message: '积分扣除失败',
            };
        }
    }

    /**
     * 增加用户积分
     */
    async addUserScore(domainId: string, uid: number, score: number, reason: string): Promise<ScoreOperationResult> {
        try {
            await this.updateUserScore(domainId, uid, score);
            await this.addScoreRecord({
                uid,
                domainId,
                pid: 0, // 非题目相关的积分变化
                recordId: null,
                score,
                reason,
            });

            this.ctx.emit(SCORE_EVENTS.SCORE_CHANGE, {
                uid,
                domainId,
                change: score,
                reason,
            });

            return {
                success: true,
                message: '积分增加成功',
            };
        } catch (error) {
            console.error('[ScoreService] 增加积分失败:', error);
            return {
                success: false,
                message: '积分增加失败',
            };
        }
    }
}
