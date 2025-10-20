import { Context } from 'hydrooj';
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
 * 负责：用户统计更新、排行榜查询、周快照管理
 */
export class TypingStatsService {
    private ctx: Context;
    private recordService: TypingRecordService;

    constructor(ctx: Context, recordService: TypingRecordService) {
        this.ctx = ctx;
        this.recordService = recordService;
    }

    /**
     * 更新用户统计数据
     */
    async updateUserStats(uid: number, domainId: string): Promise<void> {
        // 获取用户所有记录
        const records = await this.ctx.db.collection('typing.records' as any)
            .find({ uid })
            .toArray();

        if (records.length === 0) return;

        // 计算统计数据
        const maxWpm = Math.max(...records.map((r) => r.wpm));
        const avgWpm = Math.round(records.reduce((sum, r) => sum + r.wpm, 0) / records.length);
        const lastRecordAt = new Date(Math.max(...records.map((r) => r.createdAt.getTime())));

        // 更新或插入统计记录（uid + domainId 组合作为查询条件）
        await this.ctx.db.collection('typing.stats' as any).updateOne(
            { uid, domainId },
            {
                $set: {
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
     * 获取用户统计数据
     */
    async getUserStats(uid: number, domainId?: string): Promise<TypingUserStats | null> {
        const query = domainId ? { uid, domainId } : { uid };
        return await this.ctx.db.collection('typing.stats' as any).findOne(query);
    }

    /**
     * 获取最高速度排行榜
     */
    async getMaxWpmRanking(limit: number = 50, domainId?: string): Promise<TypingUserStats[]> {
        const query = domainId ? { domainId } : {};
        return await this.ctx.db.collection('typing.stats' as any)
            .find(query)
            .sort({ maxWpm: -1, lastUpdated: 1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取平均速度排行榜
     */
    async getAvgWpmRanking(limit: number = 50, domainId?: string): Promise<TypingUserStats[]> {
        const query = domainId ? { domainId } : {};
        return await this.ctx.db.collection('typing.stats' as any)
            .find(query)
            .sort({ avgWpm: -1, lastUpdated: 1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取进步最快排行榜（本周 vs 上周）
     */
    async getImprovementRanking(limit: number = 50, domainId?: string): Promise<Array<TypingUserStats & { improvement: number }>> {
        const thisWeek = this.getWeekString(new Date());
        const lastWeek = this.getWeekString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

        // 获取所有用户统计
        const query = domainId ? { domainId } : {};
        const allStats = await this.ctx.db.collection('typing.stats' as any)
            .find(query)
            .toArray();

        const improvements = [];

        for (const stats of allStats) {
            // 获取本周和上周的快照
            const thisWeekSnapshot = await this.ctx.db.collection('typing.weekly_snapshots' as any)
                .findOne({ uid: stats.uid, week: thisWeek });
            const lastWeekSnapshot = await this.ctx.db.collection('typing.weekly_snapshots' as any)
                .findOne({ uid: stats.uid, week: lastWeek });

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
    async getUserRank(uid: number, type: 'max' | 'avg' = 'max', domainId?: string): Promise<number | null> {
        const userStats = await this.getUserStats(uid, domainId);
        if (!userStats) return null;

        const field = type === 'max' ? 'maxWpm' : 'avgWpm';
        const value = type === 'max' ? userStats.maxWpm : userStats.avgWpm;

        const query: any = {
            [field]: { $gt: value },
        };
        if (domainId) {
            query.domainId = domainId;
        }

        const higherRankCount = await this.ctx.db.collection('typing.stats' as any)
            .countDocuments(query);

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
}
