import { Context } from 'hydrooj';
import { TypingRecordService } from './TypingRecordService';
import { TypingStatsService } from './TypingStatsService';
import { getWeekString } from '../utils/dateUtils';

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

    constructor(ctx: Context, recordService: TypingRecordService, _statsService: TypingStatsService) {
        this.ctx = ctx;
        this.recordService = recordService;
    }

    /**
     * 获取全局统计数据
     */
    async getGlobalStats(): Promise<GlobalStats> {
        // 今日记录数（全域统一）
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayRecords = await this.ctx.db.collection('typing.records' as any)
            .countDocuments({
                createdAt: { $gte: today },
            });

        // 获取所有统计数据（全域统一）
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

        // 按 uid 去重，保留最新的记录
        const uniqueStatsMap: { [uid: number]: any } = {};
        allStats.forEach((stat: any) => {
            const uid = stat.uid as number;
            const existing = uniqueStatsMap[uid];
            if (!existing || (stat.lastUpdated && existing.lastUpdated && stat.lastUpdated > existing.lastUpdated)) {
                uniqueStatsMap[uid] = stat;
            }
        });

        return Object.values(uniqueStatsMap).map((s: any) => ({
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
            const weekString = getWeekString(date);

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
     * 时间以 ISO 字符串返回，由前端负责格式化为可读标签。
     */
    async getUserProgress(uid: number): Promise<ProgressData[]> {
        const records = await this.recordService.getUserRecords(uid, 20);

        // 按时间正序排列
        records.reverse();

        return records.map((r) => ({
            date: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString(),
            wpm: r.wpm,
        }));
    }
}
