import { Context, ObjectId } from 'hydrooj';
import { TypingRecordService } from './TypingRecordService';

// 用户统计接口
export interface TypingUserStats {
    _id?: any;
    uid: number;
    domainId: string;
    maxWpm: number;
    avgWpm: number;
    totalRecords: number;
    lastRecordAt: Date;
    lastUpdated: Date;
}

// 周快照接口
export interface WeeklySnapshot {
    _id?: any;
    uid: number;
    week: string;
    avgWpm: number;
    recordCount: number;
    createdAt: Date;
}

// 排行榜项接口
export interface RankingItem {
    uid: number;
    value: number;
    rank: number;
}

/**
 * 打字统计服务
 * 负责：用户统计更新、排行榜查询、周快照管理、奖励集成
 */
export class TypingStatsService {
    private ctx: Context;
    private recordService: TypingRecordService;

    constructor(ctx: Context, recordService: TypingRecordService) {
        this.ctx = ctx;
        this.recordService = recordService;
    }

    /**
     * 更新用户统计数据（不包含奖励）
     */
    async updateUserStats(uid: number, domainId: string): Promise<void> {
        // 获取用户所有记录（全域统一，获取该用户在任何域的所有记录）
        const records = await this.ctx.db.collection('typing.records' as any)
            .find({ uid })
            .toArray();

        if (records.length === 0) return;

        // 计算统计数据
        const maxWpm = Math.max(...records.map((r) => r.wpm));
        const avgWpm = Math.round(records.reduce((sum, r) => sum + r.wpm, 0) / records.length);
        const lastRecordAt = new Date(Math.max(...records.map((r) => r.createdAt.getTime())));

        // 更新或插入统计记录（uid 作为唯一键，全域统一数据）
        await this.ctx.db.collection('typing.stats' as any).updateOne(
            { uid },
            {
                $set: {
                    uid,
                    domainId,
                    maxWpm,
                    avgWpm,
                    totalRecords: records.length,
                    lastRecordAt,
                    lastUpdated: new Date(),
                },
            },
            { upsert: true },
        );
    }

    /**
     * 更新用户统计数据并处理奖励（内部方法）
     * 用于在添加新记录时调用
     */
    async updateUserStatsWithBonuses(
        uid: number,
        domainId: string,
        recordId: ObjectId,
        newWpm: number,
        bonusCallback?: (recordId: ObjectId, newWpm: number, previousMaxWpm: number) => Promise<{
            totalBonus: number;
            bonuses: Array<{
                type: 'progress' | 'level' | 'surpass';
                bonus: number;
                reason: string;
            }>;
        }>,
    ): Promise<{
        totalBonus: number;
        bonuses: Array<{
            type: 'progress' | 'level' | 'surpass';
            bonus: number;
            reason: string;
        }>;
    }> {
        // 获取用户所有记录
        const records = await this.ctx.db.collection('typing.records' as any)
            .find({ uid })
            .toArray();

        if (records.length === 0) {
            return { totalBonus: 0, bonuses: [] };
        }

        // 计算新的统计数据
        const maxWpm = Math.max(...records.map((r) => r.wpm));
        const avgWpm = Math.round(records.reduce((sum, r) => sum + r.wpm, 0) / records.length);
        const lastRecordAt = new Date(Math.max(...records.map((r) => r.createdAt.getTime())));

        // 获取之前的最高速度
        const previousStats = await this.ctx.db.collection('typing.stats' as any).findOne({ uid });
        const previousMaxWpm = previousStats?.maxWpm || 0;

        // 更新统计记录
        await this.ctx.db.collection('typing.stats' as any).updateOne(
            { uid },
            {
                $set: {
                    uid,
                    domainId,
                    maxWpm,
                    avgWpm,
                    totalRecords: records.length,
                    lastRecordAt,
                    lastUpdated: new Date(),
                },
            },
            { upsert: true },
        );

        // 更新周快照
        await this.updateWeeklySnapshot(uid);

        // 处理奖励（如果有回调函数）
        let bonusInfo = { totalBonus: 0, bonuses: [] as any[] };
        if (bonusCallback) {
            // 调用外部的奖励处理逻辑，传递必要的参数
            bonusInfo = await bonusCallback(recordId, newWpm, previousMaxWpm);
        }

        return bonusInfo;
    }

    /**
     * 获取用户统计数据
     */
    async getUserStats(uid: number, _domainId?: string): Promise<TypingUserStats | null> {
        // 全域统一数据，只需按 uid 查询
        return await this.ctx.db.collection('typing.stats' as any).findOne({ uid });
    }

    /**
     * 获取最高速度排行榜
     */
    async getMaxWpmRanking(limit: number = 50, _domainId?: string): Promise<TypingUserStats[]> {
        // 全域统一数据，不需要过滤 domainId
        return await this.ctx.db.collection('typing.stats' as any)
            .find({})
            .sort({ maxWpm: -1, lastUpdated: 1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取平均速度排行榜
     */
    async getAvgWpmRanking(limit: number = 50, _domainId?: string): Promise<TypingUserStats[]> {
        // 全域统一数据，不需要过滤 domainId
        return await this.ctx.db.collection('typing.stats' as any)
            .find({})
            .sort({ avgWpm: -1, lastUpdated: 1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取分页排行榜（支持最高速度或平均速度）
     */
    async getRankingWithPagination(
        type: 'max' | 'avg',
        page: number,
        limit: number,
    ): Promise<{
        users: TypingUserStats[];
        total: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        const sortField = type === 'max' ? 'maxWpm' : 'avgWpm';

        const [users, total] = await Promise.all([
            this.ctx.db.collection('typing.stats' as any)
                .find({})
                .sort({ [sortField]: -1, lastUpdated: 1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            this.ctx.db.collection('typing.stats' as any)
                .countDocuments({}),
        ]);

        return {
            users,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * 获取所有统计记录（用于获取旧排行榜）
     */
    async getAllStats(): Promise<TypingUserStats[]> {
        return await this.ctx.db.collection('typing.stats' as any)
            .find({})
            .sort({ maxWpm: -1, lastUpdated: 1 })
            .toArray();
    }

    /**
     * 清空所有统计数据
     */
    async clearAllStats(): Promise<void> {
        await this.ctx.db.collection('typing.stats' as any).deleteMany({});
    }

    /**
     * 清空所有周快照数据
     */
    async clearAllWeeklySnapshots(): Promise<void> {
        await this.ctx.db.collection('typing.weekly_snapshots' as any).deleteMany({});
    }

    /**
     * 获取进步最快排行榜（本周 vs 上周）
     */
    async getImprovementRanking(limit: number = 50, _domainId?: string): Promise<Array<TypingUserStats & { improvement: number }>> {
        const thisWeek = this.getWeekString(new Date());
        const lastWeek = this.getWeekString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

        // 获取所有用户统计（全域统一数据）
        const allStats = await this.ctx.db.collection('typing.stats' as any)
            .find({})
            .toArray();

        const improvements: Array<TypingUserStats & { improvement: number }> = [];

        // 并行获取所有用户的快照数据
        const snapshotsPromises = allStats.map((stats) =>
            Promise.all([
                this.ctx.db.collection('typing.weekly_snapshots' as any).findOne({ uid: stats.uid, week: thisWeek }),
                this.ctx.db.collection('typing.weekly_snapshots' as any).findOne({ uid: stats.uid, week: lastWeek }),
            ]).then(([thisWeekSnapshot, lastWeekSnapshot]) => ({
                stats,
                thisWeekSnapshot,
                lastWeekSnapshot,
            })),
        );

        const snapshots = await Promise.all(snapshotsPromises);

        for (const { stats, thisWeekSnapshot, lastWeekSnapshot } of snapshots) {
            if (thisWeekSnapshot && lastWeekSnapshot) {
                const improvement = thisWeekSnapshot.avgWpm - lastWeekSnapshot.avgWpm;
                improvements.push({
                    ...stats,
                    improvement,
                });
            }
        }

        // 按进步值排序
        improvements.sort((a, b) => b.improvement - a.improvement);

        return improvements.slice(0, limit);
    }

    /**
     * 更新周快照
     */
    async updateWeeklySnapshot(uid: number): Promise<void> {
        const currentWeek = this.getWeekString(new Date());

        // 获取本周的所有记录
        const weekStart = this.getWeekStart(new Date());
        const records = await this.ctx.db.collection('typing.records' as any)
            .find({
                uid,
                createdAt: { $gte: weekStart },
            })
            .toArray();

        if (records.length === 0) return;

        const avgWpm = Math.round(records.reduce((sum, r) => sum + r.wpm, 0) / records.length);

        // 更新或插入周快照
        await this.ctx.db.collection('typing.weekly_snapshots' as any).updateOne(
            { uid, week: currentWeek },
            {
                $set: {
                    avgWpm,
                    recordCount: records.length,
                    createdAt: new Date(),
                },
            },
            { upsert: true },
        );
    }

    /**
     * 获取用户排名
     */
    async getUserRank(uid: number, type: 'max' | 'avg' = 'max', _domainId?: string): Promise<number | null> {
        const userStats = await this.getUserStats(uid);
        if (!userStats) return null;

        const field = type === 'max' ? 'maxWpm' : 'avgWpm';
        const value = type === 'max' ? userStats.maxWpm : userStats.avgWpm;

        // 全域统一数据，只需查询比该用户更高的记录数
        const higherRankCount = await this.ctx.db.collection('typing.stats' as any)
            .countDocuments({ [field]: { $gt: value } });

        return higherRankCount + 1;
    }

    /**
     * 获取周字符串 (如: "2025-W03")
     */
    private getWeekString(date: Date): string {
        const year = date.getFullYear();
        const weekNumber = this.getWeekNumber(date);
        return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    }

    /**
     * 获取周数
     */
    private getWeekNumber(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    /**
     * 获取本周开始日期
     */
    private getWeekStart(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 周一为一周开始
        return new Date(d.setDate(diff));
    }

    /**
     * 删除指定用户的统计数据
     */
    async deleteStatsByUids(uids: number[]): Promise<void> {
        if (uids.length === 0) return;
        await this.ctx.db.collection('typing.stats' as any).deleteMany({
            uid: { $in: uids },
        });
    }
}
