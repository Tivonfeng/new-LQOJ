import { Context } from 'hydrooj';
import { TypingRecordService } from './TypingRecordService';
import { TypingStatsService } from './TypingStatsService';

// 全局统计接口
export interface GlobalStats {
    todayRecords: number;
    avgWpm: number;
    maxWpm: number;
    totalUsers: number;
}

// 速度分布接口
export interface SpeedDistribution {
    range: string;
    count: number;
    percentage: number;
}

// 用户速度数据接口（用于散点图）
export interface UserSpeedPoint {
    uid: number;
    avgWpm: number;
    maxWpm: number;
}

// 趋势数据接口
export interface TrendData {
    week: string;
    avgWpm: number;
}

// 个人进步数据接口
export interface ProgressData {
    date: string;
    wpm: number;
}

/**
 * 打字数据分析服务
 * 负责：全局统计、速度分布、趋势分析、个人进步曲线
 */
export class TypingAnalyticsService {
    private ctx: Context;
    private recordService: TypingRecordService;
    private statsService: TypingStatsService;

    constructor(ctx: Context, recordService: TypingRecordService, statsService: TypingStatsService) {
        this.ctx = ctx;
        this.recordService = recordService;
        this.statsService = statsService;
    }

    /**
     * 获取全局统计数据
     */
    async getGlobalStats(): Promise<GlobalStats> {
        // 今日记录数
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayRecords = await this.ctx.db.collection('typing.records' as any)
            .countDocuments({
                createdAt: { $gte: today },
            });

        // 获取所有统计数据
        const allStats = await this.ctx.db.collection('typing.stats' as any)
            .find({})
            .toArray();

        if (allStats.length === 0) {
            return {
                todayRecords: 0,
                avgWpm: 0,
                maxWpm: 0,
                totalUsers: 0,
            };
        }

        // 计算平均WPM（基于所有用户的平均WPM）
        const avgWpm = Math.round(allStats.reduce((sum, s) => sum + s.avgWpm, 0) / allStats.length);

        // 最高WPM
        const maxWpm = Math.max(...allStats.map((s) => s.maxWpm));

        return {
            todayRecords,
            avgWpm,
            maxWpm,
            totalUsers: allStats.length,
        };
    }

    /**
     * 获取速度分布
     */
    async getSpeedDistribution(): Promise<SpeedDistribution[]> {
        const allStats = await this.ctx.db.collection('typing.stats' as any)
            .find({})
            .toArray();

        if (allStats.length === 0) {
            return [];
        }

        // 定义速度区间
        const ranges = [
            { range: '慢速 (0-30 WPM)', min: 0, max: 30 },
            { range: '一般 (30-50 WPM)', min: 30, max: 50 },
            { range: '良好 (50-70 WPM)', min: 50, max: 70 },
            { range: '优秀 (70-90 WPM)', min: 70, max: 90 },
            { range: '卓越 (90+ WPM)', min: 90, max: Infinity },
        ];

        const distribution = ranges.map((r) => {
            const count = allStats.filter((s) => s.avgWpm >= r.min && s.avgWpm < r.max).length;
            const percentage = Math.round((count / allStats.length) * 100);
            return {
                range: r.range,
                count,
                percentage,
            };
        });

        return distribution;
    }

    /**
     * 获取所有用户速度数据点（用于散点图）
     */
    async getUserSpeedPoints(): Promise<UserSpeedPoint[]> {
        const allStats = await this.ctx.db.collection('typing.stats' as any)
            .find({})
            .toArray();

        return allStats.map((s) => ({
            uid: s.uid,
            avgWpm: s.avgWpm,
            maxWpm: s.maxWpm,
        }));
    }

    /**
     * 获取周趋势数据（最近8周）
     */
    async getWeeklyTrend(): Promise<TrendData[]> {
        const trends: TrendData[] = [];

        // 获取最近8周的数据
        for (let i = 7; i >= 0; i--) {
            const date = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
            const weekString = this.getWeekString(date);

            // 获取该周所有快照
            const snapshots = await this.ctx.db.collection('typing.weekly_snapshots' as any)
                .find({ week: weekString })
                .toArray();

            if (snapshots.length > 0) {
                const avgWpm = Math.round(snapshots.reduce((sum, s) => sum + s.avgWpm, 0) / snapshots.length);
                trends.push({
                    week: weekString,
                    avgWpm,
                });
            } else {
                trends.push({
                    week: weekString,
                    avgWpm: 0,
                });
            }
        }

        return trends;
    }

    /**
     * 获取用户进步曲线（最近20条记录）
     */
    async getUserProgress(uid: number): Promise<ProgressData[]> {
        const records = await this.recordService.getUserRecords(uid, 20);

        // 按时间正序排列
        records.reverse();

        return records.map((r) => ({
            date: r.createdAt.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
            wpm: r.wpm,
        }));
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
}
