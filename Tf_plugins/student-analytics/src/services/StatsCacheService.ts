import type { Context } from 'hydrooj';
import type { StudentAnalyticsStats } from './StudentAnalyticsService';

/**
 * 缓存的统计数据结构
 */
export interface CachedStats {
    _id?: any;
    uid: number;
    stats: StudentAnalyticsStats;
    lastUpdated: Date;
    // 缓存是否被标记为脏（需要在下次访问时刷新）
    dirty: boolean;
    // 最后一次提交的时间（用于判断是否有新提交）
    lastSubmissionTime?: Date;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
    // 缓存过期时间（毫秒），默认 10 分钟
    ttl: number;
    // 是否启用缓存
    enabled: boolean;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
    ttl: 10 * 60 * 1000, // 10 分钟
    enabled: true,
};

/**
 * 统计数据缓存服务
 *
 * 缓存策略：
 * 1. 用户访问时，检查缓存是否存在且未过期
 * 2. 如果缓存有效且未被标记为 dirty，直接返回缓存数据
 * 3. 如果缓存无效、不存在或被标记为 dirty，计算新数据并更新缓存
 * 4. 当用户有新提交时（record/judge 事件），标记缓存为 dirty
 */
export class StatsCacheService {
    private config: CacheConfig;

    constructor(
        private ctx: Context,
        config: Partial<CacheConfig> = {},
    ) {
        this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    }

    /**
     * 获取缓存的统计数据
     * @param uid 用户ID
     * @returns 缓存数据，如果不存在或已过期返回 null
     */
    async getCachedStats(uid: number): Promise<CachedStats | null> {
        if (!this.config.enabled) {
            return null;
        }

        const cached = await this.ctx.db.collection('student.analytics.stats' as any).findOne({
            uid,
        }) as CachedStats | null;

        if (!cached) {
            return null;
        }

        // 检查是否被标记为脏
        if (cached.dirty) {
            return null;
        }

        // 检查是否过期
        const now = Date.now();
        const cacheTime = new Date(cached.lastUpdated).getTime();
        if (now - cacheTime > this.config.ttl) {
            return null;
        }

        return cached;
    }

    /**
     * 更新缓存
     * @param uid 用户ID
     * @param stats 统计数据
     * @param lastSubmissionTime 最后提交时间（可选）
     */
    async updateCache(
        uid: number,
        stats: StudentAnalyticsStats,
        lastSubmissionTime?: Date,
    ): Promise<void> {
        if (!this.config.enabled) {
            return;
        }

        const cacheData: Omit<CachedStats, '_id'> = {
            uid,
            stats,
            lastUpdated: new Date(),
            dirty: false,
            lastSubmissionTime,
        };

        await this.ctx.db.collection('student.analytics.stats' as any).updateOne(
            { uid },
            { $set: cacheData },
            { upsert: true },
        );
    }

    /**
     * 标记用户缓存为脏（需要刷新）
     * 当用户有新提交时调用此方法
     * @param uid 用户ID
     */
    async markDirty(uid: number): Promise<void> {
        if (!this.config.enabled) {
            return;
        }

        await this.ctx.db.collection('student.analytics.stats' as any).updateOne(
            { uid },
            {
                $set: {
                    dirty: true,
                    lastUpdated: new Date(),
                },
            },
            { upsert: false }, // 如果不存在，不需要创建
        );
    }

    /**
     * 批量标记缓存为脏
     * @param uids 用户ID数组
     */
    async markDirtyBatch(uids: number[]): Promise<void> {
        if (!this.config.enabled || uids.length === 0) {
            return;
        }

        await this.ctx.db.collection('student.analytics.stats' as any).updateMany(
            { uid: { $in: uids } },
            {
                $set: {
                    dirty: true,
                    lastUpdated: new Date(),
                },
            },
        );
    }

    /**
     * 删除用户缓存
     * @param uid 用户ID
     */
    async invalidateCache(uid: number): Promise<void> {
        await this.ctx.db.collection('student.analytics.stats' as any).deleteOne({ uid });
    }

    /**
     * 清空所有缓存
     */
    async clearAllCache(): Promise<void> {
        await this.ctx.db.collection('student.analytics.stats' as any).deleteMany({});
    }

    /**
     * 获取缓存统计信息（用于管理面板）
     */
    async getCacheStats(): Promise<{
        totalCached: number;
        dirtyCount: number;
        expiredCount: number;
    }> {
        const now = new Date();
        const expireTime = new Date(now.getTime() - this.config.ttl);

        const [totalCached, dirtyCount, expiredCount] = await Promise.all([
            this.ctx.db.collection('student.analytics.stats' as any).countDocuments({}),
            this.ctx.db.collection('student.analytics.stats' as any).countDocuments({ dirty: true }),
            this.ctx.db.collection('student.analytics.stats' as any).countDocuments({
                lastUpdated: { $lt: expireTime },
            }),
        ]);

        return {
            totalCached,
            dirtyCount,
            expiredCount,
        };
    }
}
