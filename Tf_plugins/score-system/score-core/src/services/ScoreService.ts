import {
    Context,
} from 'hydrooj';
import { SCORE_EVENTS } from '../events/ScoreEvents';
import { getConfigManagerOrThrow } from '../registry/ServiceRegistry';
import type {
    DuplicateRecordsGroup,
    IScoreService,
    ScoreOperationResult,
    ScoreRecord,
    UserScore,
} from '../types';
// 导出类型以保持向后兼容
export type { ScoreConfig, ScoreRecord, UserScore } from '../types';

/**
 * 积分计算与管理服务
 * 负责：AC积分计算、用户积分管理、排行榜查询
 */
export class ScoreService implements IScoreService {
    private ctx: Context;
    private static recordIdCounter = 0;
    private config = getConfigManagerOrThrow();
    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    /**
     * 检查积分系统是否启用
     */
    isEnabled(): boolean {
        return this.config.config.score.ENABLED;
    }

    /**
     * 获取AC奖励积分
     */
    getAcReward(): number {
        return this.config.config.score.AC_REWARD_DEFAULT;
    }

    /**
     * 生成唯一的记录ID
     * 使用时间戳 + 进程ID + 计数器确保唯一性
     */
    static generateUniqueRecordId(): string {
        const timestamp = Date.now();
        const processId = process.pid || 0;
        const counter = ++ScoreService.recordIdCounter;
        const random = Math.floor(Math.random() * 10000);
        return `${timestamp}_${processId}_${counter}_${random}`;
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
     * 分页获取积分排行榜 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @param page 页码（从1开始）
     * @param limit 每页数量
     * @returns 分页的积分排行榜
     */
    async getScoreRankingWithPagination(_domainId: string, page: number, limit: number): Promise<{
        users: UserScore[];
        total: number;
        totalPages: number;
        currentPage: number;
    }> {
        const skip = (page - 1) * limit;

        // 获取用户排行榜
        const users = await this.ctx.db.collection('score.users' as any)
            .find({})
            .sort({ totalScore: -1, lastUpdated: 1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // 获取总用户数
        const total = await this.ctx.db.collection('score.users' as any)
            .countDocuments({});

        const totalPages = Math.ceil(total / limit);

        return {
            users,
            total,
            totalPages,
            currentPage: page,
        };
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
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @param page 页码（从1开始）
     * @param limit 每页数量
     * @returns 分页的积分记录
     */
    async getScoreRecordsWithPagination(_domainId: string, page: number, limit: number): Promise<{
        records: ScoreRecord[];
        total: number;
        totalPages: number;
        currentPage: number;
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
     * 格式化日期的通用方法
     * @param date 日期对象
     * @param includeYear 是否包含年份，默认true
     * @returns 格式化后的日期字符串
     */
    private formatDate(date: Date, includeYear: boolean = true): string {
        const options: Intl.DateTimeFormatOptions = {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        };

        if (includeYear) {
            options.year = 'numeric';
        }

        return date.toLocaleString('zh-CN', options);
    }

    /**
     * 格式化积分记录的日期
     * @param records 原始记录数组
     * @param includeYear 是否包含年份，默认true
     * @returns 格式化后的记录数组
     */
    formatScoreRecords(records: ScoreRecord[], includeYear: boolean = true): Array<Omit<ScoreRecord, 'createdAt'> & { createdAt: string }> {
        return records.map((record) => ({
            ...record,
            createdAt: this.formatDate(record.createdAt, includeYear),
        }));
    }

    /**
     * 格式化用户积分数据的日期
     * @param users 原始用户数据数组
     * @param includeYear 是否包含年份，默认true
     * @returns 格式化后的用户数据数组
     */
    formatUserScores(users: UserScore[], includeYear: boolean = true): Array<Omit<UserScore, 'lastUpdated'> & { lastUpdated: string | null }> {
        return users.map((user) => ({
            ...user,
            lastUpdated: user.lastUpdated ? this.formatDate(user.lastUpdated, includeYear) : null,
        }));
    }

    /**
     * 获取总用户数 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @returns 总用户数
     */
    async getTotalUsersCount(_domainId: string): Promise<number> {
        return await this.ctx.db.collection('score.users' as any).countDocuments({});
    }

    /**
     * 获取重复的积分记录
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @returns 重复记录组的信息
     */
    async getDuplicateRecords(_domainId: string): Promise<DuplicateRecordsGroup[]> {
        const pipeline = [
            {
                $group: {
                    _id: { uid: '$uid', pid: '$pid', domainId: '$domainId' },
                    docs: { $push: '$$ROOT' },
                    count: { $sum: 1 },
                },
            },
            {
                $match: { count: { $gt: 1 } },
            },
        ];

        return await this.ctx.db.collection('score.records' as any).aggregate(pipeline).toArray() as DuplicateRecordsGroup[];
    }

    /**
     * 删除重复的积分记录
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @returns 删除操作的结果
     */
    async deleteDuplicateRecords(_domainId: string): Promise<{
        duplicateGroups: number;
        deletedRecords: number;
    }> {
        const duplicates = await this.getDuplicateRecords(_domainId);
        console.log(`[ScoreService] 发现 ${duplicates.length} 组重复记录`);

        let totalDeleted = 0;
        const deletePromises: Promise<any>[] = [];

        for (const dup of duplicates) {
            // 按创建时间排序，保留最早的记录
            dup.docs.sort((a: any, b: any) => a.createdAt - b.createdAt);
            const docsToDelete = dup.docs.slice(1); // 删除除第一个外的所有记录

            for (const doc of docsToDelete) {
                deletePromises.push(
                    this.ctx.db.collection('score.records' as any).deleteOne({ _id: doc._id }),
                );
            }
            totalDeleted += docsToDelete.length;

            console.log(`[ScoreService] 标记清理 ${docsToDelete.length} 条重复记录 `
                + `(uid: ${dup._id.uid}, pid: ${dup._id.pid}, domainId: ${dup._id.domainId})`);
        }

        await Promise.all(deletePromises);

        return {
            duplicateGroups: duplicates.length,
            deletedRecords: totalDeleted,
        };
    }

    /**
     * 获取系统总积分数 (全局)
     * @param _domainId 域ID (保留参数用于向后兼容)
     * @returns 系统总积分数
     */
    async getTotalScoreSum(_domainId: string): Promise<number> {
        const result = await this.ctx.db.collection('score.users' as any).aggregate([
            { $group: { _id: null, total: { $sum: '$totalScore' } } },
        ]).toArray();
        return result[0]?.total || 0;
    }

    /**
     * 初始化数据库索引
     * 创建必要的索引以确保数据完整性和查询性能
     */
    async initializeIndexes(): Promise<void> {
        try {
            // 为题目相关记录创建部分唯一索引，防止重复AC奖励
            await this.ctx.db.collection('score.records' as any).createIndex(
                { uid: 1, pid: 1, domainId: 1 },
                {
                    unique: true,
                    partialFilterExpression: { pid: { $gt: 0 } }, // 只对题目记录生效
                    background: false,
                },
            );
            console.log('[ScoreService] ✅ 题目记录唯一索引创建成功');

            // 为排行榜查询创建复合索引，提升查询性能
            await this.ctx.db.collection('score.users' as any).createIndex(
                { totalScore: -1, lastUpdated: 1 },
                { background: true },
            );
            console.log('[ScoreService] ✅ 排行榜复合索引创建成功');

            // 为用户积分查询创建索引
            await this.ctx.db.collection('score.users' as any).createIndex(
                { uid: 1 },
                { background: true },
            );
            console.log('[ScoreService] ✅ 用户积分查询索引创建成功');

            // 为积分记录查询创建索引
            await this.ctx.db.collection('score.records' as any).createIndex(
                { uid: 1, createdAt: -1 },
                { background: true },
            );
            console.log('[ScoreService] ✅ 积分记录查询索引创建成功');
        } catch (error: any) {
            if (error.message.includes('already exists')) {
                console.log('[ScoreService] ✅ 唯一索引已存在');
            } else if (error.message.includes('E11000') || error.message.includes('duplicate key')) {
                console.error('[ScoreService] ❌ 数据库中存在重复记录，无法创建唯一索引');
                console.log('[ScoreService] 🧹 正在清理重复记录...');

                // 使用现有的清理方法
                const result = await this.deleteDuplicateRecords('system');
                console.log(`[ScoreService] 📊 清理了 ${result.duplicateGroups} 组重复记录，删除 ${result.deletedRecords} 条记录`);

                // 重新尝试创建索引
                try {
                    await this.ctx.db.collection('score.records' as any).createIndex(
                        { uid: 1, pid: 1, domainId: 1 },
                        {
                            unique: true,
                            background: false,
                            partialFilterExpression: { pid: { $gt: 0 } },
                        },
                    );
                    console.log('[ScoreService] ✅ 重复记录清理完成，唯一索引创建成功');
                } catch (retryError: any) {
                    console.error('[ScoreService] ❌ 清理后仍无法创建索引:', retryError.message);
                    throw retryError;
                }
            } else {
                console.error('[ScoreService] ❌ 索引创建失败:', error.message);
                throw error;
            }
        }
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
                recordId: ScoreService.generateUniqueRecordId(), // 生成唯一标识符
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
     * 原子性处理首次AC奖励
     * 使用数据库事务确保积分记录和用户积分更新的原子性
     * @param record AC积分记录信息
     * @returns 处理结果，包含是否首次AC和实际积分
     */
    async processFirstACReward(record: Omit<ScoreRecord, '_id' | 'createdAt'>): Promise<{
        isFirstAC: boolean;
        score: number;
    }> {
        const session = this.ctx.db.client.startSession();

        try {
            let isFirstAC = false;
            let score = 0;

            await session.withTransaction(async () => {
                try {
                    // 尝试插入积分记录（利用唯一索引检测首次AC）
                    await this.ctx.db.collection('score.records' as any).insertOne({
                        ...record,
                        createdAt: new Date(),
                    }, { session });

                    // 插入成功，说明是首次AC
                    isFirstAC = true;
                    score = record.score;

                    // 更新用户总积分
                    await this.ctx.db.collection('score.users' as any).updateOne(
                        { uid: record.uid },
                        {
                            $inc: { totalScore: score, acCount: 1 },
                            $set: { lastUpdated: new Date() },
                        },
                        { upsert: true, session },
                    );
                } catch (error: any) {
                    // 插入失败（重复键错误），说明已经存在记录，是重复AC
                    if (error.code === 11000 || error.message.includes('E11000')) {
                        isFirstAC = false;
                        score = 0;
                        // 重复AC不需要更新积分，事务自动回滚
                    } else {
                        throw error; // 其他错误继续抛出
                    }
                }
            });

            return { isFirstAC, score };
        } finally {
            await session.endSession();
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
                recordId: ScoreService.generateUniqueRecordId(), // 生成唯一标识符
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
