import {
    Context,
} from 'hydrooj';
import { SCORE_EVENTS } from '../events/ScoreEvents';
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
 *
 * 这是HydroOJ积分系统的核心服务类，负责处理所有与积分相关的业务逻辑：
 *
 * ## 核心功能：
 * 1. **AC积分奖励**：处理题目通过后的积分奖励，确保每题只奖励一次
 * 2. **用户积分管理**：增加/扣除用户积分，维护用户总积分
 * 3. **排行榜查询**：提供分页的积分排行榜功能
 * 4. **积分记录**：记录所有积分变化的详细日志，便于追踪和审计
 * 5. **数据统计**：提供今日积分统计、总积分等数据分析功能
 *
 * ## 数据库设计：
 * - `score.records` 集合：存储所有积分变化记录
 *   - uid: 用户ID
 *   - pid: 题目ID（0表示非题目相关操作）
 *   - domainId: 域ID
 *   - score: 积分变化量（正数为增加，负数为扣除）
 *   - reason: 积分变化原因
 *   - recordId: 唯一记录标识符
 *   - createdAt: 创建时间
 *
 * - `score.users` 集合：存储用户积分汇总信息
 *   - uid: 用户ID
 *   - totalScore: 用户总积分
 *   - acCount: AC题目数量
 *   - lastUpdated: 最后更新时间
 *
 * ## 核心特性：
 * - **原子性操作**：使用MongoDB事务确保积分记录和用户积分的一致性
 * - **防重复奖励**：通过唯一索引(uid+pid+domainId)防止同一题目重复获得积分
 * - **高性能查询**：创建合适的数据库索引优化排行榜和记录查询
 * - **全局积分**：当前版本实现全局积分系统（跨域共享）
 *
 * @example
 * // 基本用法
 * const scoreService = new ScoreService(ctx);
 *
 * // 处理AC奖励（推荐使用，具有原子性保证）
 * const result = await scoreService.processFirstACReward({
 *   uid: 1001,
 *   domainId: 'system',
 *   pid: 1234,
 *   score: 10,
 *   reason: 'AC题目获得积分',
 *   problemTitle: '两数之和'
 * });
 *
 * // 手动调整用户积分
 * await scoreService.addUserScore('system', 1001, 50, '签到奖励');
 *
 * // 获取排行榜
 * const ranking = await scoreService.getScoreRanking('system', 50);
 */
export class ScoreService implements IScoreService {
    /** HydroOJ上下文对象，提供数据库访问和事件发布能力 */
    private ctx: Context;

    /**
     * 静态计数器，用于生成唯一recordId
     * 结合时间戳、进程ID和随机数确保recordId的全局唯一性
     */
    private static recordIdCounter = 0;

    /**
     * 构造函数
     * @param ctx HydroOJ上下文对象，包含数据库连接、事件总线等核心功能
     */
    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    /**
     * 生成唯一的记录ID
     *
     * 这是一个核心工具方法，为每个积分记录生成全局唯一的标识符。
     * 即使在高并发环境下也能保证唯一性。
     *
     * ## 算法设计：
     * 1. **时间戳**：提供毫秒级的时间唯一性
     * 2. **进程ID**：区分不同的Node.js进程（多进程部署时很重要）
     * 3. **计数器**：同一毫秒内的自增序号，处理高并发场景
     * 4. **随机数**：额外的随机性保障，防止计数器重置等边缘情况
     *
     * ## 生成格式：
     * `{timestamp}_{processId}_{counter}_{random}`
     *
     * @returns 格式化的唯一ID字符串，例如："1673951234567_12345_1_7890"
     *
     * @example
     * const recordId = scoreService.generateUniqueRecordId();
     * console.log(recordId); // "1673951234567_12345_1_7890"
     */
    generateUniqueRecordId(): string {
        const timestamp = Date.now(); // 当前时间戳（毫秒）
        const processId = process.pid || 0; // 当前进程ID
        const counter = ++ScoreService.recordIdCounter; // 递增计数器
        const random = Math.floor(Math.random() * 10000); // 0-9999的随机数

        return `${timestamp}_${processId}_${counter}_${random}`;
    }

    /**
     * 添加积分记录
     *
     * 这是记录所有积分变化的核心方法。每次积分变化（无论是AC奖励、管理员调整、
     * 还是其他插件的操作）都会通过此方法记录到数据库中，用于审计和历史追踪。
     *
     * ## 自动处理的字段：
     * - `recordId`: 自动生成唯一标识符
     * - `createdAt`: 自动设置当前时间戳
     * - `_id`: MongoDB自动生成的文档ID
     *
     * ## 使用场景：
     * - AC题目获得积分
     * - 管理员手动调整用户积分
     * - 签到、抽奖等插件奖励积分
     * - 转账、消费等扣除积分
     *
     * @param record 积分记录数据，包含用户ID、积分变化、原因等信息
     *
     * @example
     * // AC奖励记录
     * await scoreService.addScoreRecord({
     *   uid: 1001,
     *   domainId: 'system',
     *   pid: 1234, // 题目ID
     *   score: 10, // 增加10积分
     *   reason: 'AC题目获得积分',
     *   problemTitle: '两数之和'
     * });
     *
     * // 管理员调整记录
     * await scoreService.addScoreRecord({
     *   uid: 1001,
     *   domainId: 'system',
     *   pid: 0, // 非题目操作使用0
     *   score: -5, // 扣除5积分
     *   reason: '违规扣分',
     *   problemTitle: '管理员操作'
     * });
     */
    async addScoreRecord(record: Omit<ScoreRecord, '_id' | 'createdAt' | 'recordId'>): Promise<void> {
        // 向 score.records 集合插入一条新记录
        await this.ctx.db.collection('score.records' as any).insertOne({
            ...record, // 展开传入的记录数据
            recordId: this.generateUniqueRecordId(), // 自动生成唯一ID
            createdAt: new Date(), // 设置当前时间戳
        });
    }

    /**
     * 更新用户总积分 (全局)
     *
     * 这是维护用户积分汇总数据的核心方法。它使用MongoDB的原子性操作
     * 确保用户总积分的准确性，支持并发更新而不会造成数据不一致。
     *
     * ## 全局积分设计：
     * 当前版本实现全局积分系统，所有域的积分共享。这简化了跨域排行榜
     * 和积分统计的实现。
     *
     * ## 自动更新的字段：
     * - `totalScore`: 用户总积分，通过$inc原子性增减
     * - `acCount`: AC题目数量，只有正积分变化时才增加
     * - `lastUpdated`: 最后更新时间戳
     *
     * ## MongoDB操作说明：
     * - 使用 `upsert: true` 自动创建不存在的用户记录
     * - 使用 `$inc` 确保并发情况下积分计算的原子性
     * - 使用 `$set` 更新时间戳字段
     *
     * @param _domainId 域ID（保留用于向后兼容，当前版本忽略此参数）
     * @param uid 用户ID
     * @param scoreChange 积分变化量（正数为增加，负数为减少）
     *
     * @example
     * // 增加用户积分
     * await scoreService.updateUserScore('system', 1001, 10);
     *
     * // 减少用户积分
     * await scoreService.updateUserScore('system', 1001, -5);
     */
    async updateUserScore(_domainId: string, uid: number, scoreChange: number): Promise<void> {
        // 使用MongoDB的原子性更新操作
        await this.ctx.db.collection('score.users' as any).updateOne(
            { uid }, // 查询条件：根据用户ID查找
            {
                // 原子性增减操作
                $inc: {
                    totalScore: scoreChange, // 增减总积分
                    acCount: scoreChange > 0 ? 1 : 0, // 只有正积分变化时才增加AC计数
                },
                // 设置字段值
                $set: {
                    lastUpdated: new Date(), // 更新时间戳
                },
            },
            {
                upsert: true, // 如果用户记录不存在，自动创建
            },
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
     *
     * 这是系统启动时的重要初始化步骤，创建必要的数据库索引以确保：
     * 1. **数据完整性**：防止重复AC奖励
     * 2. **查询性能**：优化排行榜和记录查询
     * 3. **并发安全**：支持高并发场景下的正确性
     *
     * ## 索引设计说明：
     *
     * ### 1. 唯一索引 - 防重复奖励
     * ```javascript
     * { uid: 1, pid: 1, domainId: 1 }
     * ```
     * - **作用**：确保每个用户在每个域中的每道题只能获得一次AC奖励
     * - **部分索引**：只对题目记录(pid > 0)生效，不影响其他类型的积分记录
     * - **唯一性**：数据库层面保证，比应用层检查更可靠
     *
     * ### 2. 排行榜索引 - 性能优化
     * ```javascript
     * { totalScore: -1, lastUpdated: 1 }
     * ```
     * - **作用**：优化排行榜查询，按积分降序排列
     * - **复合索引**：同时支持积分排序和时间排序
     * - **查询模式**：`db.users.find().sort({totalScore: -1, lastUpdated: 1})`
     *
     * ### 3. 用户查询索引 - 基础查询
     * ```javascript
     * { uid: 1 }
     * ```
     * - **作用**：优化根据用户ID查询积分信息
     * - **高频查询**：几乎所有用户相关操作都需要此索引
     *
     * ### 4. 记录查询索引 - 历史记录
     * ```javascript
     * { uid: 1, createdAt: -1 }
     * ```
     * - **作用**：优化用户积分记录的时间序列查询
     * - **复合索引**：支持按用户和时间的组合查询
     *
     * ## 错误处理机制：
     * - **索引已存在**：正常跳过，记录日志
     * - **重复数据冲突**：自动清理重复记录后重试
     * - **其他错误**：抛出异常，阻止系统启动
     *
     * @throws 如果索引创建失败且无法自动修复
     *
     * @example
     * // 在插件启动时调用
     * try {
     *   await scoreService.initializeIndexes();
     *   console.log('数据库索引初始化完成');
     * } catch (error) {
     *   console.error('索引创建失败，系统无法启动:', error);
     *   process.exit(1);
     * }
     */
    async initializeIndexes(): Promise<void> {
        try {
            // 创建核心唯一索引：防止重复AC奖励
            // 这是系统最重要的索引，必须首先创建
            await this.ctx.db.collection('score.records' as any).createIndex(
                { uid: 1, pid: 1, domainId: 1 }, // 用户ID + 题目ID + 域ID的组合
                {
                    unique: true, // 唯一约束
                    partialFilterExpression: { pid: { $gt: 0 } }, // 部分索引：只对题目记录生效
                    background: false, // 前台创建，确保立即生效
                },
            );
            console.log('[ScoreService] ✅ 题目记录唯一索引创建成功');

            // 创建排行榜查询优化索引
            await this.ctx.db.collection('score.users' as any).createIndex(
                { totalScore: -1, lastUpdated: 1 }, // 积分降序 + 更新时间升序
                { background: true }, // 后台创建，不阻塞其他操作
            );
            console.log('[ScoreService] ✅ 排行榜复合索引创建成功');

            // 创建用户积分查询索引
            await this.ctx.db.collection('score.users' as any).createIndex(
                { uid: 1 }, // 用户ID索引
                { background: true },
            );
            console.log('[ScoreService] ✅ 用户积分查询索引创建成功');

            // 创建积分记录历史查询索引
            await this.ctx.db.collection('score.records' as any).createIndex(
                { uid: 1, createdAt: -1 }, // 用户ID + 创建时间降序
                { background: true },
            );
            console.log('[ScoreService] ✅ 积分记录查询索引创建成功');
        } catch (error: any) {
            // 详细的错误处理逻辑
            if (error.message.includes('already exists')) {
                // 索引已存在，这是正常情况（重启时常见）
                console.log('[ScoreService] ✅ 唯一索引已存在');
            } else if (error.message.includes('E11000') || error.message.includes('duplicate key')) {
                // 数据库中存在重复记录，需要清理
                console.error('[ScoreService] ❌ 数据库中存在重复记录，无法创建唯一索引');
                console.log('[ScoreService] 🧹 正在清理重复记录...');

                // 自动清理重复记录
                const result = await this.deleteDuplicateRecords('system');
                console.log(`[ScoreService] 📊 清理了 ${result.duplicateGroups} 组重复记录，删除 ${result.deletedRecords} 条记录`);

                // 清理完成后重试创建索引
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
                    throw retryError; // 抛出错误，阻止系统启动
                }
            } else {
                // 其他未知错误，直接抛出
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
     *
     * 这是积分系统最核心的方法之一，专门处理用户第一次AC某道题目时的积分奖励。
     * 它使用MongoDB事务确保数据的一致性，防止并发情况下的重复奖励问题。
     *
     * ## 核心算法：利用唯一索引检测首次AC
     *
     * 1. **唯一索引设计**：在`score.records`集合上创建`(uid, pid, domainId)`的唯一索引
     * 2. **原子性检测**：尝试插入记录，如果插入成功说明是首次AC，失败说明重复AC
     * 3. **事务保证**：使用MongoDB事务确保积分记录和用户总积分的原子性更新
     *
     * ## 处理流程：
     * ```
     * 开始事务 -> 尝试插入记录 -> 成功？-> 是：更新用户积分，返回奖励
     *                                    -> 否：检查错误类型
     *                                         -> 重复键：返回无奖励
     *                                         -> 其他错误：抛出异常
     * ```
     *
     * ## 并发安全性：
     * - 使用MongoDB事务的ACID特性
     * - 唯一索引在数据库层面防止重复记录
     * - 即使多个请求同时处理同一用户的同一题目，也只有一个能成功
     *
     * ## 性能优化：
     * - 单次数据库事务，减少网络往返
     * - 利用数据库索引，避免应用层查重逻辑
     * - 错误码判断，快速识别重复AC情况
     *
     * @param record AC积分记录信息（不包含自动生成的字段）
     * @returns 处理结果，包含是否首次AC和实际获得的积分
     *
     * @example
     * // 处理用户AC奖励
     * const result = await scoreService.processFirstACReward({
     *   uid: 1001,
     *   domainId: 'system',
     *   pid: 1234,
     *   score: 10,
     *   reason: 'AC题目获得积分',
     *   problemTitle: '两数之和'
     * });
     *
     * if (result.isFirstAC) {
     *   console.log(`恭喜！首次AC获得${result.score}积分`);
     * } else {
     *   console.log('该题目已AC过，不重复奖励积分');
     * }
     */
    async processFirstACReward(record: Omit<ScoreRecord, '_id' | 'createdAt' | 'recordId'>): Promise<{
        isFirstAC: boolean;
        score: number;
    }> {
        // 创建MongoDB会话用于事务
        const session = this.ctx.db.client.startSession();

        try {
            let isFirstAC = false;
            let score = 0;

            // 使用事务确保操作的原子性
            await session.withTransaction(async () => {
                try {
                    // 尝试插入积分记录（关键步骤：利用唯一索引检测首次AC）
                    await this.ctx.db.collection('score.records' as any).insertOne({
                        ...record,
                        recordId: this.generateUniqueRecordId(), // 生成唯一标识符
                        createdAt: new Date(), // 设置创建时间
                    }, { session }); // 在事务中执行

                    // 执行到这里说明插入成功，这是首次AC
                    isFirstAC = true;
                    score = record.score;

                    // 原子性更新用户总积分
                    await this.ctx.db.collection('score.users' as any).updateOne(
                        { uid: record.uid }, // 查找目标用户
                        {
                            $inc: {
                                totalScore: score, // 增加总积分
                                acCount: 1, // 增加AC题目计数
                            },
                            $set: {
                                lastUpdated: new Date(), // 更新时间戳
                            },
                        },
                        {
                            upsert: true, // 用户不存在时自动创建
                            session, // 在同一事务中执行
                        },
                    );
                } catch (error: any) {
                    // 捕获插入失败的情况
                    if (error.code === 11000 || error.message.includes('E11000')) {
                        // E11000是MongoDB的重复键错误，说明该用户已经AC过这道题
                        isFirstAC = false;
                        score = 0;
                        // 注意：这里不需要显式回滚，因为我们没有执行任何写操作
                        // 事务会自动回滚，不会产生任何数据变化
                    } else {
                        // 其他类型的错误（如网络问题、权限问题等）需要向上抛出
                        throw error;
                    }
                }
            });

            return { isFirstAC, score };
        } finally {
            // 无论成功或失败，都要关闭会话释放资源
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
