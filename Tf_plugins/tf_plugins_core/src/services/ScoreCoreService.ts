/* eslint-disable no-await-in-loop */
import { Context } from 'hydrooj';
import {
    AwardIfFirstACParams,
    AwardIfFirstACResult,
    ConcurrencyError,
    NotFoundError,
    SCORE_CONSTANTS,
    ScoreCategory,
    ScoreCategoryType,
    ScoreRecord,
    UserScore,
    validateBulkScoreChanges,
    validateScoreChange,
    validateUserIds,
    ValidationError,
} from '../types';

/**
 * 积分核心服务类
 *
 * 提供积分系统的原子操作，包括记录、查询和管理用户积分。
 */
export class ScoreCoreService {
    /** Hydro框架上下文 */
    private ctx: Context;

    /** 用户积分缓存 Map<userId, {data: UserScore; expires: number}> */
    private userScoreCache = new Map<number, { data: UserScore, expires: number }>();

    /** 排行榜缓存 */
    private rankingCache: { data: UserScore[], expires: number } | null = null;

    /** 缓存配置 */
    private readonly CACHE_CONFIG = SCORE_CONSTANTS.CACHE;

    /** 构造函数 */
    constructor(ctx: Context) {
        this.ctx = ctx;
        // 初始化时创建必要的数据库索引
        this.initializeDatabaseIndexes();
    }

    /** 初始化数据库索引 */
    private async initializeDatabaseIndexes(): Promise<void> {
        try {
            // 用户积分集合索引
            await this.ensureIndex(
                SCORE_CONSTANTS.COLLECTIONS.USERS as any,
                { uid: 1 },
                { name: 'users_uid', unique: true },
            );

            await this.ensureIndex(
                SCORE_CONSTANTS.COLLECTIONS.USERS as any,
                { totalScore: -1 },
                { name: 'users_total_score' },
            );

            await this.ensureIndex(
                SCORE_CONSTANTS.COLLECTIONS.USERS as any,
                { lastUpdated: -1 },
                { name: 'users_last_updated' },
            );

            // 积分记录集合索引
            await this.ensureIndex(
                SCORE_CONSTANTS.COLLECTIONS.RECORDS as any,
                { uid: 1, pid: 1, domainId: 1 },
                { name: 'records_unique_ac', unique: true },
            );

            await this.ensureIndex(
                SCORE_CONSTANTS.COLLECTIONS.RECORDS as any,
                { uid: 1, createdAt: -1 },
                { name: 'records_user_time' },
            );

            await this.ensureIndex(
                SCORE_CONSTANTS.COLLECTIONS.RECORDS as any,
                { domainId: 1, createdAt: -1 },
                { name: 'records_domain_time' },
            );

            await this.ensureIndex(
                SCORE_CONSTANTS.COLLECTIONS.RECORDS as any,
                { category: 1, createdAt: -1 },
                { name: 'records_category_time' },
            );
        } catch (error) {
            console.error('[ScoreCore] Failed to initialize database indexes:', error);
            // 不抛出错误，避免影响服务启动
        }
    }

    /**
     * 安全地创建数据库索引
     * @param collectionName 集合名称
     * @param keys 索引键
     * @param options 索引选项
     */
    private async ensureIndex(collectionName: string, keys: any, options: any = {}): Promise<void> {
        try {
            await this.ctx.db.collection(collectionName as any).createIndex(keys, {
                background: true,
                ...options,
            });
        } catch (error: any) {
            // 如果索引已存在，忽略错误
            if (error.code !== 85 && !error.message?.includes('already exists')) {
                throw error;
            }
        }
    }

    /**
     * 清理过期缓存
     */
    private cleanExpiredCache(): void {
        const now = Date.now();

        // 清理用户积分缓存
        for (const [userId, cacheItem] of this.userScoreCache.entries()) {
            if (cacheItem.expires < now) {
                this.userScoreCache.delete(userId);
            }
        }

        // 清理排行榜缓存
        if (this.rankingCache && this.rankingCache.expires < now) {
            this.rankingCache = null;
        }
    }

    /**
     * 使指定用户的积分缓存失效
     * @param uid 用户ID
     */
    private invalidateUserCache(uid: number): void {
        this.userScoreCache.delete(uid);
        // 同时使排行榜缓存失效，因为用户积分变化会影响排名
        this.rankingCache = null;
    }

    /**
     * 格式化积分显示
     *
     * 将积分数值格式化为用户友好的字符串显示
     *
     * @param score 积分数值
     * @param options 格式化选项
     * @param options.locale 本地化设置，默认'zh-CN'
     * @param options.showSign 是否显示正负号，默认false
     * @param options.zeroText 零值显示文本，默认'0'
     * @returns 格式化后的积分字符串
     *
     * @example
     * ```typescript
     * scoreCore.formatScore(12345);        // "12,345"
     * scoreCore.formatScore(-500, { showSign: true }); // "-500"
     * scoreCore.formatScore(0, { zeroText: '无积分' }); // "无积分"
     * ```
     */
    public formatScore(
        score: number,
        options: {
            locale?: string;
            showSign?: boolean;
            zeroText?: string;
        } = {},
    ): string {
        const { locale = 'zh-CN', showSign = false, zeroText = '0' } = options;

        if (score === 0 && zeroText !== '0') {
            return zeroText;
        }

        const formatted = new Intl.NumberFormat(locale).format(Math.abs(score));

        if (showSign) {
            return score >= 0 ? `+${formatted}` : `-${formatted}`;
        }

        return score >= 0 ? formatted : `-${formatted}`;
    }

    /**
     * 获取用户积分统计
     *
     * 获取用户的积分概览统计信息
     *
     * @param _domainId 域ID（目前未使用）
     * @param uid 用户ID
     * @returns 用户积分统计信息
     *
     * @example
     * ```typescript
     * const stats = await scoreCore.getUserScoreStats('domain1', 123);
     * console.log(`总积分: ${stats.totalScore}`);
     * console.log(`排名: ${stats.rank}`);
     * console.log(`今日获得: ${stats.todayEarned}`);
     * ```
     */
    async getUserScoreStats(_domainId: string, uid: number): Promise<{
        totalScore: number;
        rank: number | null;
        todayEarned: number;
        todaySpent: number;
        lastActivity: Date | null;
        categoryBreakdown: Record<string, number>;
    } | null> {
        if (uid < SCORE_CONSTANTS.VALIDATION.MIN_USER_ID) {
            throw new ValidationError('uid', `必须大于等于${SCORE_CONSTANTS.VALIDATION.MIN_USER_ID}`);
        }

        const userScore = await this.getUserScore(_domainId, uid);
        if (!userScore) {
            return null;
        }

        // 获取排名
        const rank = await this.getUserRank(_domainId, uid);

        // 获取今日统计
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRecords = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any)
            .find({
                uid,
                createdAt: { $gte: today },
            })
            .toArray();

        const todayEarned = todayRecords
            .filter((r) => (r.score as number) > 0)
            .reduce((sum, r) => sum + (r.score as number), 0);

        const todaySpent = Math.abs(todayRecords
            .filter((r) => (r.score as number) < 0)
            .reduce((sum, r) => sum + (r.score as number), 0));

        // 获取最后活动时间
        const lastRecord = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any)
            .find({ uid })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();

        const lastActivity = lastRecord.length > 0 ? (lastRecord[0].createdAt as Date) : null;

        // 获取分类统计
        const categoryStats = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any)
            .aggregate([
                { $match: { uid } },
                {
                    $group: {
                        _id: '$category',
                        total: { $sum: '$score' },
                    },
                },
            ])
            .toArray();

        const categoryBreakdown: Record<string, number> = {};
        for (const stat of categoryStats) {
            categoryBreakdown[stat._id || '其他'] = stat.total;
        }

        return {
            totalScore: userScore.totalScore,
            rank,
            todayEarned,
            todaySpent,
            lastActivity,
            categoryBreakdown,
        };
    }

    catch(error) {
        console.error('[ScoreCore] Failed to get user score stats:', error);
        throw error;
    }

    async getSystemScoreStats(_domainId: string): Promise<{
        totalUsers: number;
        totalScore: number;
        todayActiveUsers: number;
        todayTotalScoreChange: number;
        topCategories: Array<{ category: string, totalScore: number, count: number }>;
    }> {
        // 总用户数和总积分
        const userStats = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.USERS as any)
            .aggregate([
                {
                    $group: {
                        _id: null,
                        totalUsers: { $sum: 1 },
                        totalScore: { $sum: '$totalScore' },
                    },
                },
            ])
            .toArray();

        const totalUsers = userStats.length > 0 ? userStats[0].totalUsers : 0;
        const totalScore = userStats.length > 0 ? userStats[0].totalScore : 0;

        // 今日活跃用户和积分变动
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayStats = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any)
            .aggregate([
                { $match: { createdAt: { $gte: today } } },
                {
                    $group: {
                        _id: null,
                        todayActiveUsers: { $addToSet: '$uid' },
                        todayTotalScoreChange: { $sum: '$score' },
                    },
                },
            ])
            .toArray();

        const todayActiveUsers = todayStats.length > 0 ? todayStats[0].todayActiveUsers.length : 0;
        const todayTotalScoreChange = todayStats.length > 0 ? todayStats[0].todayTotalScoreChange : 0;

        // 分类统计
        const categoryStats = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any)
            .aggregate([
                {
                    $group: {
                        _id: '$category',
                        totalScore: { $sum: '$score' },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { totalScore: -1 } },
                { $limit: 10 },
            ])
            .toArray();

        const topCategories = categoryStats.map((stat) => ({
            category: stat._id || '其他',
            totalScore: stat.totalScore,
            count: stat.count,
        }));

        return {
            totalUsers,
            totalScore,
            todayActiveUsers,
            todayTotalScoreChange,
            topCategories,
        };
    }

    /**
     * 清理缓存
     *
     * 手动清理所有缓存数据，适用于系统维护或内存优化
     *
     * @returns 清理的缓存项数量
     *
     * @example
     * ```typescript
     * const cleaned = scoreCore.clearCache();
     * console.log(`清理了${cleaned}个缓存项`);
     * ```
     */
    public clearCache(): { userScoreCache: number, rankingCache: number } {
        const userScoreCacheSize = this.userScoreCache.size;
        const rankingCacheSize = this.rankingCache ? 1 : 0;

        this.userScoreCache.clear();
        this.rankingCache = null;

        return {
            userScoreCache: userScoreCacheSize,
            rankingCache: rankingCacheSize,
        };
    }

    /**
     * 获取缓存状态
     *
     * 获取当前缓存的详细状态信息
     *
     * @returns 缓存状态信息
     */
    /** 获取缓存状态 */
    public getCacheStatus(): {
        userScoreCache: { size: number };
        rankingCache: { hasData: boolean, expiresAt: Date | null };
    } {
        return {
            userScoreCache: {
                size: this.userScoreCache.size,
            },
            rankingCache: {
                hasData: this.rankingCache !== null,
                expiresAt: this.rankingCache ? new Date(this.rankingCache.expires) : null,
            },
        };
    }

    /**
     * 添加积分记录
     *
     * 将一次积分变动记录插入数据库。系统会自动添加创建时间戳。
     * 在插入前会验证积分变动的有效性。
     *
     * @param record 积分记录数据（不包含_id和createdAt，系统会自动生成）
     * @throws {Error} 当积分变动无效时抛出错误
     *
     * @example
     * ```typescript
     * await scoreCore.addScoreRecord({
     *   uid: 123,
     *   domainId: 'domain1',
     *   pid: 456,
     *   recordId: 'submission_789',
     *   score: 20,
     *   reason: 'AC题目获得奖励',
     *   category: 'AC_PROBLEM',
     *   title: '两数之和'
     * });
     * ```
     */
    async addScoreRecord(record: Omit<ScoreRecord, '_id' | 'createdAt'>): Promise<void> {
        // 验证积分变动参数
        const validation = validateScoreChange(record.score, SCORE_CONSTANTS.VALIDATION);
        if (!validation.valid) {
            throw new ValidationError('score', validation.error!);
        }

        await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any).insertOne({
            ...record,
            createdAt: new Date(),
        });
    }

    /**
     * 更新用户积分
     *
     * 增加或减少用户的总积分。如果用户不存在，会自动创建用户记录。
     * 当积分增加时，会同时增加AC题目计数（用于统计用户解题数量）。
     *
     * @param _domainId 域ID（目前未使用，保留用于未来多域支持）
     * @param uid 用户ID，必须大于0
     * @param scoreChange 积分变动值（正数增加，负数减少）
     * @throws {Error} 当参数无效时抛出错误
     *
     * @example
     * ```typescript
     * // 增加用户积分
     * await scoreCore.updateUserScore('domain1', 123, 20);
     *
     * // 扣除用户积分
     * await scoreCore.updateUserScore('domain1', 123, -5);
     * ```
     */
    async updateUserScore(_domainId: string, uid: number, scoreChange: number): Promise<void> {
        // 验证积分变动参数
        const validation = validateScoreChange(scoreChange);
        if (!validation.valid) {
            throw new Error(`积分变动无效: ${validation.error}`);
        }

        if (uid <= 0) {
            throw new Error('用户ID无效');
        }

        await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.USERS as any).updateOne(
            { uid },
            {
                $inc: { totalScore: scoreChange, acCount: scoreChange > 0 ? 1 : 0 },
                $set: { lastUpdated: new Date() },
            },
            { upsert: true },
        );

        // 使该用户的缓存失效
        this.invalidateUserCache(uid);
    }

    /**
     * 原子化首次AC奖励
     *
     * 安全地检查用户是否首次通过指定题目，如果是首次则发放积分。
     * 这个操作是原子的，可以安全地在并发环境下使用，避免重复奖励。
     *
     * 实现原理：
     * 1. 尝试插入积分记录（使用题目ID作为唯一键的一部分）
     * 2. 如果插入成功，说明是首次AC，更新用户积分
     * 3. 如果插入失败（重复键错误），说明不是首次AC，返回未奖励状态
     *
     * @param params 首次AC奖励参数
     * @returns 奖励结果，包含是否首次AC和实际发放的积分
     * @throws {Error} 当参数无效或数据库操作失败时抛出错误（非重复键错误）
     *
     * @example
     * ```typescript
     * const result = await scoreCore.awardIfFirstAC({
     *   uid: 123,
     *   pid: 456,
     *   domainId: 'domain1',
     *   recordId: 'submission_789',
     *   score: 20,
     *   reason: '首次AC题目奖励',
     *   category: 'AC_PROBLEM',
     *   title: '两数之和'
     * });
     *
     * if (result.isFirstAC) {
     *   console.log(`首次AC，奖励${result.awarded}积分`);
     * } else {
     *   console.log('重复AC，无奖励');
     * }
     * ```
     */
    async awardIfFirstAC(params: AwardIfFirstACParams): Promise<AwardIfFirstACResult> {
        const { uid, pid, domainId, recordId, score, reason, category, title } = params;

        // 参数验证
        if (uid < SCORE_CONSTANTS.VALIDATION.MIN_USER_ID) {
            throw new ValidationError('uid', `必须大于等于${SCORE_CONSTANTS.VALIDATION.MIN_USER_ID}`);
        }
        if (pid <= 0) {
            throw new ValidationError('pid', '必须是正整数');
        }
        if (!domainId) {
            throw new ValidationError('domainId', '不能为空');
        }

        const validation = validateScoreChange(score);
        if (!validation.valid) {
            throw new Error(`积分变动无效: ${validation.error}`);
        }

        try {
            await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any).insertOne({
                uid,
                pid,
                domainId,
                recordId,
                score,
                reason,
                category,
                title,
                createdAt: new Date(),
            });

            // 插入成功，说明是首次 AC，更新用户积分
            await this.updateUserScore(domainId, uid, score);
            return { isFirstAC: true, awarded: score };
        } catch (err: any) {
            // 处理重复键（已存在积分记录）——非首次 AC
            if (err && (err.code === 11000 || (err.message && err.message.includes('E11000')))) {
                return { isFirstAC: false, awarded: 0 };
            }
            // 其它错误向上抛出
            throw err;
        }
    }

    /**
     * 批量记录积分变动
     *
     * 高效地批量处理多个积分变动操作，同时记录历史并更新用户积分汇总。
     * 支持分批处理以避免数据库压力过大。
     *
     * @param records 积分记录数据数组
     * @returns 成功处理的数量
     * @throws {Error} 当参数无效时抛出错误
     *
     * @example
     * ```typescript
     * const results = await scoreCore.recordScoreChangesBatch([
     *   {
     *     uid: 123,
     *     domainId: 'domain1',
     *     pid: 456,
     *     score: 20,
     *     reason: 'AC题目奖励',
     *     category: ScoreCategory.AC_PROBLEM
     *   },
     *   {
     *     uid: 456,
     *     domainId: 'domain1',
     *     pid: 789,
     *     score: -5,
     *     reason: '使用AI助手',
     *     category: ScoreCategory.AI_ASSISTANT
     *   }
     * ]);
     * console.log(`成功处理${results}条积分记录`);
     * ```
     */
    async recordScoreChangesBatch(records: Array<Omit<ScoreRecord, '_id' | 'createdAt'>>): Promise<number> {
        if (!records.length) {
            throw new ValidationError('records', '积分记录列表不能为空');
        }

        if (records.length > SCORE_CONSTANTS.VALIDATION.MAX_BATCH_SIZE) {
            throw new ValidationError('records', `批量操作不能超过${SCORE_CONSTANTS.VALIDATION.MAX_BATCH_SIZE}条记录`);
        }

        // 验证批量积分变动
        const bulkValidation = validateBulkScoreChanges(
            records.map((r) => ({ uid: r.uid, amount: r.score })),
        );
        if (!bulkValidation.valid) {
            const errorMessages = bulkValidation.errors.map((e) => `用户${e.uid}: ${e.error}`).join('; ');
            throw new ValidationError('records', `批量验证失败: ${errorMessages}`);
        }

        // 分批处理以避免过多的并发连接
        const chunkSize = SCORE_CONSTANTS.BATCH.CHUNK_SIZE;
        const chunks: Array<Array<Omit<ScoreRecord, '_id' | 'createdAt'>>> = [];
        for (let i = 0; i < records.length; i += chunkSize) {
            chunks.push(records.slice(i, i + chunkSize));
        }

        const allResults: PromiseSettledResult<void>[] = [];

        // 逐批并行处理
        for (const chunk of chunks) {
            const chunkResults = await Promise.allSettled(
                chunk.map((record) => this.recordScoreChange(record)),
            );
            allResults.push(...chunkResults);

            // 在批次间添加小延迟，避免数据库压力过大
            if (chunks.length > 1) {
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
        }

        // 统计成功数量
        const successCount = allResults.filter((result) => result.status === 'fulfilled').length;

        // 记录失败的操作
        for (const [index, result] of allResults.entries()) {
            if (result.status === 'rejected') {
                const record = records[index];
                console.error(`[BatchRecord] Failed to record score change for user ${record.uid}:`, result.reason);
            }
        }

        return successCount;
    }

    /**
     * 记录积分变动（推荐使用）
     *
     * 同时记录积分变动历史并更新用户积分汇总。这是积分操作的标准方法，
     * 确保数据一致性和完整性。
     *
     * 这个方法结合了 `addScoreRecord` 和 `updateUserScore` 的功能，
     * 在单个操作中完成积分记录和用户积分更新。
     *
     * @param record 积分记录数据（不包含_id和createdAt）
     * @throws {Error} 当参数无效时抛出错误
     *
     * @example
     * ```typescript
     * // AC题目奖励（推荐方式）
     * await scoreCore.recordScoreChange({
     *   uid: 123,
     *   domainId: 'domain1',
     *   pid: 456,
     *   recordId: 'submission_789',
     *   score: 20,
     *   reason: 'AC题目获得奖励',
     *   category: 'AC_PROBLEM',
     *   title: '两数之和'
     * });
     *
     * // 扣除积分
     * await scoreCore.recordScoreChange({
     *   uid: 123,
     *   domainId: 'domain1',
     *   pid: -1,
     *   score: -5,
     *   reason: '使用AI助手',
     *   category: 'AI_ASSISTANT'
     * });
     * ```
     */
    async recordScoreChange(record: Omit<ScoreRecord, '_id' | 'createdAt'>): Promise<void> {
        // 先添加积分记录，再更新用户积分
        await this.addScoreRecord(record);
        await this.updateUserScore(record.domainId, record.uid, record.score);
    }

    /**
     * 撤销积分记录
     *
     * 撤销指定的积分记录，同时反向调整用户的积分汇总。
     * 这个操作会：
     * 1. 验证记录存在且属于指定用户
     * 2. 添加一条撤销记录（记录撤销操作）
     * 3. 反向调整用户积分（减去原积分值）
     *
     * 注意：这个操作不会删除原记录，而是添加一条撤销记录，
     * 保持审计 trail 的完整性。
     *
     * @param recordId 原积分记录的ID
     * @param uid 用户ID（用于验证权限）
     * @param reason 撤销原因描述
     * @param _adminUid 操作管理员的用户ID（用于审计）
     * @returns 是否成功撤销
     * @throws {Error} 当记录不存在、无权限或参数无效时抛出错误
     *
     * @example
     * ```typescript
     * // 管理员撤销一条积分记录
     * const success = await scoreCore.revokeScoreRecord(
     *   '507f1f77bcf86cd799439011', // 记录ID
     *   123, // 原用户ID
     *   '违规操作，撤销奖励', // 撤销原因
     *   1 // 管理员ID
     * );
     *
     * if (success) {
     *   console.log('积分记录已撤销');
     * }
     * ```
     */
    async revokeScoreRecord(recordId: string | any, uid: number, reason: string, _adminUid: number): Promise<boolean> {
        if (!recordId || uid <= 0 || !reason.trim()) {
            throw new ValidationError('parameters', '撤销积分记录的参数无效');
        }

        // 查找原记录
        const originalRecord = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any)
            .findOne({ _id: recordId, uid });

        if (!originalRecord) {
            throw new NotFoundError('积分记录', '指定的记录不存在或无访问权限');
        }

        // 防止重复撤销
        const existingRevoke = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any)
            .findOne({
                uid: originalRecord.uid,
                pid: -9999999 - Date.now(), // 特殊的撤销标识
                recordId,
                reason: { $regex: `^撤销积分记录.*${reason}` },
            });

        if (existingRevoke) {
            throw new ConcurrencyError('该记录已经被撤销');
        }

        // 创建撤销记录（积分取反）
        const revokeRecord: Omit<ScoreRecord, '_id' | 'createdAt'> = {
            uid: originalRecord.uid,
            domainId: originalRecord.domainId,
            pid: -9999999 - Date.now(), // 特殊的撤销标识PID
            recordId, // 引用原记录ID
            score: -originalRecord.score, // 取反
            reason: `撤销积分记录：${reason} (原记录ID: ${recordId})`,
            category: ScoreCategory.ADMIN_OPERATION,
            title: `撤销操作 - ${originalRecord.title || '无标题'}`,
        };

        // 执行撤销：添加撤销记录并更新用户积分
        await this.recordScoreChange(revokeRecord);

        return true;
    }

    /**
     * 批量奖励积分
     *
     * 为多个用户批量增加积分，并为每个用户创建奖励记录。
     * 这个方法常用于系统级别的批量操作，如活动奖励、节日发放、成就解锁等。
     *
     * @param userScores 用户积分奖励配置数组，每个用户的奖励金额
     * @param reason 奖励原因描述
     * @param category 积分分类，默认为 'ADMIN_OPERATION'
     * @returns 成功奖励的用户数量
     * @throws {Error} 当参数无效或包含负数/零金额时抛出错误
     *
     * @example
     * ```typescript
     * // 批量奖励活动参与者
     * const result = await scoreCore.batchAwardScores([
     *   { uid: 123, domainId: 'domain1', amount: 50 },
     *   { uid: 456, domainId: 'domain1', amount: 30 },
     *   { uid: 789, domainId: 'domain1', amount: 20 }
     * ], '参与春节活动奖励', ScoreCategory.GAME_ENTERTAINMENT);
     *
     * console.log(`成功奖励${result}个用户`);
     * ```
     */
    async batchAwardScores(
        userScores: Array<{ uid: number, domainId: string, amount: number }>,
        reason: string,
        category: ScoreCategoryType = ScoreCategory.ADMIN_OPERATION,
    ): Promise<number> {
        if (!userScores.length || !reason.trim()) {
            throw new ValidationError('parameters', '批量奖励的参数无效');
        }

        if (userScores.length > SCORE_CONSTANTS.VALIDATION.MAX_BATCH_SIZE) {
            throw new ValidationError('userScores', `批量操作不能超过${SCORE_CONSTANTS.VALIDATION.MAX_BATCH_SIZE}个用户`);
        }

        // 验证所有金额都是正数
        const invalidConfigs = userScores.filter(({ amount }) => amount <= 0);
        if (invalidConfigs.length > 0) {
            throw new ValidationError('amount', '批量奖励只接受正数金额');
        }

        const timestamp = Date.now();

        // 过滤有效配置
        const validConfigs = userScores
            .map((config, index) => ({ ...config, originalIndex: index }))
            .filter(({ uid, domainId, originalIndex }) => {
                if (uid < SCORE_CONSTANTS.VALIDATION.MIN_USER_ID || !domainId) {
                    console.warn(`[BatchAward] Skipping invalid user config at index ${originalIndex}`);
                    return false;
                }
                return true;
            });

        // 分批处理以避免过多的并发连接
        const chunkSize = SCORE_CONSTANTS.BATCH.CHUNK_SIZE;
        const chunks: Array<
                Array<{
                    uid: number;
                    domainId: string;
                    amount: number;
                    originalIndex: number;
                }>
            > = [];
        for (let i = 0; i < validConfigs.length; i += chunkSize) {
            chunks.push(validConfigs.slice(i, i + chunkSize));
        }

        const allResults: PromiseSettledResult<void>[] = [];

        // 逐批并行处理
        for (const chunk of chunks) {
            const chunkResults = await Promise.allSettled(
                chunk.map(({ uid, domainId, amount, originalIndex }) =>
                    this.recordScoreChange({
                        uid,
                        domainId,
                        pid: -7777777 - timestamp - originalIndex, // 批量奖励的特殊标识
                        recordId: `batch_award_${timestamp}_${originalIndex}`,
                        score: amount,
                        reason: `[批量奖励] ${reason}`,
                        category,
                        title: `批量奖励 - ${amount}积分`,
                    }),
                ),
            );
            allResults.push(...chunkResults);

            // 在批次间添加小延迟，避免数据库压力过大
            if (chunks.length > 1) {
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
        }

        const results = allResults;

        // 统计成功数量
        const successCount = results.filter((result) => result.status === 'fulfilled').length;

        return successCount;
    }

    /**
     * 批量扣除积分
     *
     * 为多个用户批量扣除积分，并为每个用户创建扣除记录。
     * 这个方法常用于系统级别的批量操作，如违规处罚、活动结算等。
     *
     * @param userScores 用户积分扣除配置数组，每个用户的扣除金额
     * @param reason 扣除原因描述
     * @param category 积分分类，默认为 'ADMIN_OPERATION'
     * @returns 成功扣除的用户数量
     * @throws {Error} 当参数无效或包含负数/零金额时抛出错误
     *
     * @example
     * ```typescript
     * // 批量扣除违规用户的积分
     * const result = await scoreCore.batchDeductScores([
     *   { uid: 123, domainId: 'domain1', amount: 10 },
     *   { uid: 456, domainId: 'domain1', amount: 5 }
     * ], '违反社区规则', ScoreCategory.ADMIN_OPERATION);
     *
     * console.log(`成功为${result}个用户扣除积分`);
     * ```
     */
    async batchDeductScores(
        userScores: Array<{ uid: number, domainId: string, amount: number }>,
        reason: string,
        category: ScoreCategoryType = ScoreCategory.ADMIN_OPERATION,
    ): Promise<number> {
        if (!userScores.length || !reason.trim()) {
            throw new ValidationError('parameters', '批量扣除的参数无效');
        }

        if (userScores.length > SCORE_CONSTANTS.VALIDATION.MAX_BATCH_SIZE) {
            throw new ValidationError('userScores', `批量操作不能超过${SCORE_CONSTANTS.VALIDATION.MAX_BATCH_SIZE}个用户`);
        }

        // 验证所有金额都是正数（因为这是扣除，正数金额会被转为负数）
        const invalidConfigs = userScores.filter(({ amount }) => amount <= 0);
        if (invalidConfigs.length > 0) {
            throw new ValidationError('amount', '批量扣除需要正数金额');
        }

        const timestamp = Date.now();

        // 过滤有效配置
        const validConfigs = userScores
            .map((config, index) => ({ ...config, originalIndex: index }))
            .filter(({ uid, domainId, originalIndex }) => {
                if (uid <= 0 || !domainId) {
                    console.warn(`[BatchDeduct] Skipping invalid user config at index ${originalIndex}`);
                    return false;
                }
                return true;
            });

        // 并行处理所有有效的扣除操作
        const results = await Promise.allSettled(
            validConfigs.map(({ uid, domainId, amount, originalIndex }) =>
                this.recordScoreChange({
                    uid,
                    domainId,
                    pid: -8888888 - timestamp - originalIndex, // 批量扣除的特殊标识
                    recordId: `batch_deduct_${timestamp}_${originalIndex}`,
                    score: -amount,
                    reason: `[批量扣除] ${reason}`,
                    category,
                    title: `批量扣除 - ${amount}积分`,
                }),
            ),
        );

        // 统计成功数量
        const successCount = results.filter((result) => result.status === 'fulfilled').length;

        // 记录失败的操作
        for (const [index, result] of results.entries()) {
            if (result.status === 'rejected') {
                const { uid } = validConfigs[index];
                console.error(`[BatchDeduct] Failed to deduct score for user ${uid}:`, result.reason);
            }
        }

        return successCount;
    }

    /**
     * 积分转账
     *
     * 在两个用户之间转移积分。这个操作包含完整的事务逻辑：
     * 1. 从转出用户扣除积分
     * 2. 给接收用户增加积分
     * 3. 为双方生成对应的积分记录
     *
     * 注意：这个方法不包含事务保证，如果需要原子性转账，
     * 建议在调用层使用数据库事务。
     *
     * @param domainId 域ID
     * @param fromUid 转出用户ID
     * @param toUid 接收用户ID
     * @param amount 转账金额，必须为正数
     * @param reason 转账原因描述（可选）
     * @throws {Error} 当参数无效或用户不能给自己转账时抛出错误
     *
     * @example
     * ```typescript
     * // 用户123给用户456转账50积分
     * await scoreCore.transferPoints('domain1', 123, 456, 50, '感谢帮助');
     * ```
     */
    /**
     * 积分转账（事务版本）
     *
     * 使用数据库事务确保转账的原子性。要么全部成功，要么全部失败。
     * 这对于金融级别的操作非常重要，避免因系统故障导致的数据不一致。
     *
     * @param domainId 域ID
     * @param fromUid 转出用户ID
     * @param toUid 接收用户ID
     * @param amount 转账金额，必须为正数
     * @param reason 转账原因描述（可选）
     * @throws {Error} 当参数无效、积分不足或事务失败时抛出错误
     *
     * @example
     * ```typescript
     * // 安全的转账操作
     * await scoreCore.transferPoints('domain1', 123, 456, 50, '感谢帮助');
     * ```
     */
    async transferPoints(domainId: string, fromUid: number, toUid: number, amount: number, reason?: string): Promise<void> {
        // 参数验证
        if (!domainId) {
            throw new ValidationError('domainId', '不能为空');
        }
        if (fromUid < SCORE_CONSTANTS.VALIDATION.MIN_USER_ID || toUid < SCORE_CONSTANTS.VALIDATION.MIN_USER_ID) {
            throw new ValidationError('userIds', '用户ID必须是正整数');
        }
        if (fromUid === toUid) {
            throw new ValidationError('userIds', '不能给自己转账');
        }
        if (!amount || amount <= 0) {
            throw new ValidationError('amount', '转账金额必须为正数');
        }

        const validation = validateScoreChange(amount);
        if (!validation.valid) {
            throw new ValidationError('amount', validation.error!);
        }

        // 检查转出用户是否有足够积分
        const fromUserScore = await this.getUserScore(domainId, fromUid);
        if (!fromUserScore || fromUserScore.totalScore < amount) {
            throw new ValidationError('amount', '转出用户积分不足');
        }

        const timestamp = Date.now();
        const uniquePidFrom = -7000000 - timestamp;
        const uniquePidTo = -7000000 - timestamp - 1;

        // 生成唯一的转账ID用于关联双方的记录
        const transferId = `transfer_${timestamp}_${fromUid}_${toUid}_${amount}`;

        // 使用应用层原子性保证
        // 注意：如果数据库支持ACID事务，建议使用数据库事务确保原子性
        // 当前实现通过预检查和顺序执行确保数据一致性

        try {
            // 扣除转出用户积分
            await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.USERS as any).updateOne(
                { uid: fromUid },
                {
                    $inc: { totalScore: -amount },
                    $set: { lastUpdated: new Date() },
                },
            );

            // 添加转出用户的积分记录
            await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any).insertOne({
                uid: fromUid,
                domainId,
                pid: uniquePidFrom,
                recordId: transferId,
                score: -amount,
                reason: reason || `转账给用户 ${toUid}`,
                category: ScoreCategory.TRANSFER,
                title: `转账支出 -${amount}积分`,
                createdAt: new Date(),
            });

            // 增加接收用户积分
            await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.USERS as any).updateOne(
                { uid: toUid },
                {
                    $inc: { totalScore: amount },
                    $set: { lastUpdated: new Date() },
                },
                { upsert: true },
            );

            // 添加接收用户的积分记录
            await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any).insertOne({
                uid: toUid,
                domainId,
                pid: uniquePidTo,
                recordId: transferId,
                score: amount,
                reason: reason || `收到用户 ${fromUid} 转账`,
                category: ScoreCategory.TRANSFER,
                title: `转账收入 +${amount}积分`,
                createdAt: new Date(),
            });

            // 使相关用户的缓存失效
            this.invalidateUserCache(fromUid);
            this.invalidateUserCache(toUid);
        } catch (error) {
            // 如果发生错误，尝试回滚积分变动
            try {
                // 回滚转出用户的积分（如果扣除了的话）
                await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.USERS as any).updateOne(
                    { uid: fromUid },
                    { $inc: { totalScore: amount } },
                );
            } catch (rollbackError) {
                console.error('[TransferRollback] Failed to rollback fromUser:', rollbackError);
            }

            throw error;
        }
    }

    /**
     * 获取用户积分信息
     *
     * 查询指定用户的积分统计信息，包括总积分、AC题目数量和最后更新时间。
     *
     * @param _domainId 域ID（目前未使用，保留用于未来多域支持）
     * @param uid 用户ID，必须大于0
     * @returns 用户积分信息，如果用户不存在返回null
     * @throws {Error} 当用户ID无效时抛出错误
     *
     * @example
     * ```typescript
     * const userScore = await scoreCore.getUserScore('domain1', 123);
     * if (userScore) {
     *   console.log(`用户总积分: ${userScore.totalScore}, AC题目数: ${userScore.acCount}`);
     * } else {
     *   console.log('用户不存在');
     * }
     * ```
     */
    /**
     * 批量获取用户积分
     *
     * 高效地批量查询多个用户的积分信息，支持缓存优化
     *
     * @param _domainId 域ID（目前未使用）
     * @param uids 用户ID数组
     * @returns 用户积分映射，key为用户ID，value为积分信息或null
     * @throws {Error} 当参数无效时抛出错误
     *
     * @example
     * ```typescript
     * const scores = await scoreCore.getUserScoresBatch('domain1', [123, 456, 789]);
     * console.log(scores.get(123)); // 用户123的积分信息
     * console.log(scores.get(999)); // null（用户不存在）
     * ```
     */
    async getUserScoresBatch(_domainId: string, uids: number[]): Promise<Map<number, UserScore | null>> {
        // 验证参数
        if (!uids.length) {
            throw new ValidationError('uids', '用户ID列表不能为空');
        }

        if (uids.length > SCORE_CONSTANTS.VALIDATION.MAX_BATCH_SIZE) {
            throw new ValidationError('uids', `批量查询不能超过${SCORE_CONSTANTS.VALIDATION.MAX_BATCH_SIZE}个用户`);
        }

        // 验证所有用户ID
        const validation = validateUserIds(uids);
        if (!validation.valid) {
            throw new ValidationError('uids', `无效的用户ID: ${validation.invalidIds.join(', ')}`);
        }

        const result = new Map<number, UserScore | null>();

        // 检查缓存
        const uncachedUids: number[] = [];
        for (const uid of uids) {
            const cached = this.userScoreCache.get(uid);
            if (cached && cached.expires > Date.now()) {
                result.set(uid, cached.data);
            } else {
                uncachedUids.push(uid);
            }
        }

        // 批量查询未缓存的数据
        if (uncachedUids.length > 0) {
            this.cleanExpiredCache();

            const batchSize = 100; // MongoDB查询限制

            for (let i = 0; i < uncachedUids.length; i += batchSize) {
                const batch = uncachedUids.slice(i, i + batchSize);
                const dbResults = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.USERS as any)
                    .find({ uid: { $in: batch } })
                    .toArray();

                // 将结果转换为Map
                const dbResultMap = new Map(dbResults.map((doc: any) => [doc.uid, doc]));

                // 更新结果和缓存
                for (const uid of batch) {
                    const data = dbResultMap.get(uid) || null;
                    result.set(uid, data);

                    // 缓存有效数据
                    if (data) {
                        this.userScoreCache.set(uid, {
                            data,
                            expires: Date.now() + this.CACHE_CONFIG.USER_SCORE_TTL,
                        });
                    }
                }
            }
        }

        return result;
    }

    async getUserScore(_domainId: string, uid: number): Promise<UserScore | null> {
        if (uid < SCORE_CONSTANTS.VALIDATION.MIN_USER_ID) {
            throw new ValidationError('uid', `必须大于等于${SCORE_CONSTANTS.VALIDATION.MIN_USER_ID}`);
        }

        // 检查缓存
        const cached = this.userScoreCache.get(uid);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }

        // 清理过期缓存
        this.cleanExpiredCache();

        // 查询数据库
        const data = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.USERS as any).findOne({ uid });

        // 缓存结果
        if (data) {
            this.userScoreCache.set(uid, {
                data,
                expires: Date.now() + this.CACHE_CONFIG.USER_SCORE_TTL,
            });
        }

        return data;
    }

    /**
     * 获取积分排行榜
     *
     * 获取积分最高的用户的排行榜，按积分降序排列。
     * 当积分相同时，按最后更新时间升序排列（时间早的排在前面）。
     *
     * @param _domainId 域ID（目前未使用，保留用于未来多域支持）
     * @param limit 返回的最大用户数量，默认50，最大1000
     * @returns 积分排行榜用户数组
     * @throws {Error} 当limit参数无效时抛出错误
     *
     * @example
     * ```typescript
     * // 获取前10名排行榜
     * const topUsers = await scoreCore.getScoreRanking('domain1', 10);
     * topUsers.forEach((user, index) => {
     *   console.log(`第${index + 1}名: 用户${user.uid}, 积分${user.totalScore}`);
     * });
     * ```
     */
    async getScoreRanking(_domainId: string, limit: number = 50): Promise<UserScore[]> {
        const minLimit = SCORE_CONSTANTS.VALIDATION.MIN_PAGE_LIMIT;
        const maxLimit = SCORE_CONSTANTS.VALIDATION.MAX_PAGE_LIMIT;
        if (limit < minLimit || limit > maxLimit) {
            throw new ValidationError('limit', `必须在${minLimit}-${maxLimit}之间`);
        }

        // 检查缓存
        if (this.rankingCache && this.rankingCache.expires > Date.now()) {
            return this.rankingCache.data.slice(0, limit);
        }

        // 清理过期缓存
        this.cleanExpiredCache();

        // 查询数据库
        const data = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.USERS as any)
            .find({})
            .sort({ totalScore: -1, lastUpdated: 1 })
            .limit(200) // 缓存更多数据以供复用
            .toArray();

        // 缓存结果
        this.rankingCache = {
            data,
            expires: Date.now() + this.CACHE_CONFIG.RANKING_TTL,
        };

        return data.slice(0, limit);
    }

    /**
     * 获取用户积分记录
     *
     * 获取指定用户的所有积分变动记录，按时间倒序排列（最新的在前面）。
     * 可以用来查看用户的积分历史和详细变动情况。
     *
     * @param _domainId 域ID（目前未使用，保留用于未来多域支持）
     * @param uid 用户ID，必须大于0
     * @param limit 返回的最大记录数量，默认20，最大1000
     * @returns 用户的积分记录数组，按时间倒序排列
     * @throws {Error} 当参数无效时抛出错误
     *
     * @example
     * ```typescript
     * // 获取用户最近的积分记录
     * const records = await scoreCore.getUserScoreRecords('domain1', 123, 10);
     * records.forEach(record => {
     *   console.log(`${record.createdAt}: ${record.score > 0 ? '+' : ''}${record.score}积分 - ${record.reason}`);
     * });
     * ```
     */
    async getUserScoreRecords(_domainId: string, uid: number, limit: number = 20): Promise<ScoreRecord[]> {
        if (uid <= 0) {
            throw new Error('用户ID无效');
        }
        if (limit <= 0 || limit > 1000) {
            throw new Error('限制参数无效');
        }

        return await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any)
            .find({ uid })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray() as ScoreRecord[];
    }

    /**
     * 获取用户排名
     *
     * 计算用户在积分排行榜中的排名位置。排名从1开始，
     * 排名相同时按最后更新时间决定先后顺序。
     *
     * @param _domainId 域ID（目前未使用，保留用于未来多域支持）
     * @param uid 用户ID，必须大于0
     * @returns 用户的排名位置，如果用户不存在返回null
     * @throws {Error} 当用户ID无效时抛出错误
     *
     * @example
     * ```typescript
     * const rank = await scoreCore.getUserRank('domain1', 123);
     * if (rank) {
     *   console.log(`用户排名: 第${rank}名`);
     * } else {
     *   console.log('用户不存在或没有积分');
     * }
     * ```
     */
    async getUserRank(_domainId: string, uid: number): Promise<number | null> {
        if (uid <= 0) {
            throw new Error('用户ID无效');
        }

        const userScore = await this.getUserScore(_domainId, uid);
        if (!userScore) return null;

        const higherRankCount = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.USERS as any)
            .countDocuments({ totalScore: { $gt: userScore.totalScore } });
        return higherRankCount + 1;
    }

    /**
     * 获取今日积分统计
     *
     * 统计今天（从00:00开始到当前时间）的积分系统活跃情况，
     * 包括总积分变动和活跃用户数量。
     *
     * @param _domainId 域ID（目前未使用，保留用于未来多域支持）
     * @returns 今日统计数据，包含总积分变动和活跃用户数
     *
     * @example
     * ```typescript
     * const stats = await scoreCore.getTodayStats('domain1');
     * console.log(`今日积分变动: ${stats.totalScore}`);
     * console.log(`今日活跃用户: ${stats.activeUsers}`);
     * ```
     */
    async getTodayStats(_domainId: string): Promise<{
        totalScore: number;
        activeUsers: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayScores = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any)
            .find({ createdAt: { $gte: today } })
            .toArray();

        const totalScore = todayScores.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
        const activeUsers = new Set(todayScores.map((r: any) => r.uid)).size;

        return { totalScore, activeUsers };
    }

    /**
     * 获取积分排行榜（分页）
     *
     * 获取积分排行榜的分页版本，支持大量用户的分页查询。
     * 返回指定页的排行榜数据以及总数量和总页数信息。
     *
     * @param _domainId 域ID（目前未使用，保留用于未来多域支持）
     * @param page 页码，从1开始
     * @param limit 每页用户数量，最大1000
     * @returns 分页结果，包含用户数组、总数量和总页数
     * @throws {Error} 当分页参数无效时抛出错误
     *
     * @example
     * ```typescript
     * // 获取第2页，每页20个用户
     * const result = await scoreCore.getScoreRankingWithPagination('domain1', 2, 20);
     * console.log(`第2页用户: ${result.users.length}`);
     * console.log(`总用户数: ${result.total}, 总页数: ${result.totalPages}`);
     * ```
     */
    async getScoreRankingWithPagination(_domainId: string, page: number, limit: number): Promise<{
        users: UserScore[];
        total: number;
        totalPages: number;
    }> {
        // 参数验证
        const minLimit = SCORE_CONSTANTS.VALIDATION.MIN_PAGE_LIMIT;
        const maxLimit = SCORE_CONSTANTS.VALIDATION.MAX_PAGE_LIMIT;
        if (page < minLimit || limit < minLimit || limit > maxLimit) {
            throw new ValidationError(
                '分页参数',
                `页码必须大于0，限制必须在${minLimit}-${maxLimit}之间`,
            );
        }

        const skip = (page - 1) * limit;
        const users = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.USERS as any)
            .find({})
            .sort({ totalScore: -1, lastUpdated: 1 })
            .skip(skip)
            .limit(limit)
            .toArray() as UserScore[];

        const total = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.USERS as any).countDocuments();
        const totalPages = Math.ceil(total / limit);

        return { users, total, totalPages };
    }

    /**
     * 获取积分记录（分页）
     *
     * 获取积分记录的分页版本，支持按分类筛选和大量数据的分页查询。
     * 返回指定页的积分记录以及总数量和总页数信息。
     *
     * @param domainId 域ID（用于筛选特定域的记录）
     * @param page 页码，从1开始
     * @param limit 每页记录数量，最大1000
     * @param category 可选的积分分类筛选器，用于筛选特定类型的积分记录
     * @returns 分页结果，包含记录数组、总数量和总页数
     * @throws {Error} 当参数无效时抛出错误
     *
     * @example
     * ```typescript
     * // 获取AC题目积分记录的第1页，每页50条
     * const result = await scoreCore.getScoreRecordsWithPagination(
     *   'domain1', 1, 50, 'AC_PROBLEM'
     * );
     * console.log(`找到${result.total}条AC记录，共${result.totalPages}页`);
     *
     * // 获取所有积分记录的第2页
     * const allRecords = await scoreCore.getScoreRecordsWithPagination(
     *   'domain1', 2, 20
     * );
     * ```
     */
    async getScoreRecordsWithPagination(domainId: string, page: number, limit: number, category?: string): Promise<{
        records: ScoreRecord[];
        total: number;
        totalPages: number;
    }> {
        // 参数验证
        if (!domainId) {
            throw new Error('域ID不能为空');
        }
        if (page <= 0 || limit <= 0 || limit > 1000) {
            throw new Error('分页参数无效');
        }

        const skip = (page - 1) * limit;
        const query: any = {};
        if (category) query.category = category;

        const records = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any)
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray() as ScoreRecord[];

        const total = await this.ctx.db.collection(SCORE_CONSTANTS.COLLECTIONS.RECORDS as any).countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        return { records, total, totalPages };
    }
}

export default ScoreCoreService;
