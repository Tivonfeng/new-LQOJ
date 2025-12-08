import {
    Context,
} from 'hydrooj';
import { ScoreService } from './ScoreService';

// 每日签到记录接口
export interface DailyCheckInRecord {
    _id?: any;
    uid: number;
    checkInDate: string; // YYYY-MM-DD 格式
    score: number;
    isConsecutive: boolean;
    streak: number;
    createdAt: Date;
}

// 用户签到统计接口
export interface UserCheckInStats {
    _id?: any;
    uid: number;
    totalDays: number;
    currentStreak: number;
    maxStreak: number;
    lastCheckIn: string; // YYYY-MM-DD 格式
    lastUpdated: Date;
}

// 签到结果接口
export interface CheckInResult {
    success: boolean;
    message: string;
    score?: number;
    streak?: number;
    isFirstTime?: boolean;
}

/**
 * 每日签到服务
 * 负责：签到逻辑、连续签到计算、奖励发放
 */
export class CheckInService {
    private ctx: Context;
    private scoreService: ScoreService;

    constructor(ctx: Context, scoreService: ScoreService) {
        this.ctx = ctx;
        this.scoreService = scoreService;
    }

    /**
     * 执行签到
     * @param domainId 域ID
     * @param uid 用户ID
     * @returns 签到结果
     */
    async checkIn(domainId: string, uid: number): Promise<CheckInResult> {
        const today = this.getTodayDateString();

        // 检查今日是否已签到
        const hasCheckedIn = await this.hasCheckedInToday(uid);
        if (hasCheckedIn) {
            return {
                success: false,
                message: '今日已签到，请明天再来！',
            };
        }

        try {
            // 计算连续签到天数
            const streak = await this.calculateStreak(uid);
            const newStreak = streak + 1;

            // 计算签到奖励积分
            const score = this.calculateCheckInScore(newStreak);

            // 创建签到记录
            await this.ctx.db.collection('checkin.records' as any).insertOne({
                uid,
                checkInDate: today,
                score,
                isConsecutive: newStreak > 1,
                streak: newStreak,
                createdAt: new Date(),
            });

            // 更新用户签到统计
            await this.updateUserStats(uid, newStreak);

            // 生成唯一的 pid 值，避免唯一索引冲突（签到使用 -10000000 范围）
            const uniquePid = -10000000 - Date.now();
            // 添加积分记录
            await this.scoreService.addScoreRecord({
                uid,
                domainId,
                pid: uniquePid,
                recordId: null,
                score,
                reason: `每日签到奖励 (连续${newStreak}天)`,
                problemTitle: '每日签到',
            });

            // 更新用户总积分
            await this.scoreService.updateUserScore(domainId, uid, score);

            console.log(`[CheckIn] User ${uid} checked in: ${score} points, streak: ${newStreak}`);

            return {
                success: true,
                message: `签到成功！获得 ${score} 积分`,
                score,
                streak: newStreak,
                isFirstTime: newStreak === 1,
            };
        } catch (error) {
            console.error('[CheckIn] Error during check-in:', error);
            return {
                success: false,
                message: '签到失败，请稍后重试',
            };
        }
    }

    /**
     * 检查今日是否已签到
     * @param uid 用户ID
     * @returns 是否已签到
     */
    async hasCheckedInToday(uid: number): Promise<boolean> {
        const today = this.getTodayDateString();
        const record = await this.ctx.db.collection('checkin.records' as any).findOne({
            uid,
            checkInDate: today,
        });
        return !!record;
    }

    /**
     * 获取用户签到统计
     * @param uid 用户ID
     * @returns 用户签到统计
     */
    async getUserCheckInStats(uid: number): Promise<UserCheckInStats | null> {
        return await this.ctx.db.collection('checkin.stats' as any).findOne({ uid });
    }

    /**
     * 计算连续签到天数
     * @param uid 用户ID
     * @returns 当前连续签到天数
     */
    async calculateStreak(uid: number): Promise<number> {
        const yesterday = this.getYesterdayDateString();

        // 获取用户最近的签到记录，按日期倒序
        const recentRecords = await this.ctx.db.collection('checkin.records' as any)
            .find({ uid })
            .sort({ checkInDate: -1 })
            .limit(100) // 限制查询数量，避免性能问题
            .toArray();

        if (recentRecords.length === 0) {
            return 0; // 从未签到
        }

        let streak = 0;
        let expectedDate = yesterday; // 从昨天开始检查连续性

        for (const record of recentRecords) {
            if (record.checkInDate === expectedDate) {
                streak++;
                // 计算前一天的日期
                const date = new Date(expectedDate);
                date.setDate(date.getDate() - 1);
                expectedDate = this.formatDateString(date);
            } else {
                break; // 连续性中断
            }
        }

        return streak;
    }

    /**
     * 计算签到奖励积分
     * @param streak 连续签到天数
     * @returns 获得的积分
     */
    calculateCheckInScore(streak: number): number {
        const baseScore = 10; // 基础签到奖励

        if (streak === 1) return baseScore; // 第1天
        if (streak <= 3) return baseScore + 2; // 第2-3天: 12分
        if (streak <= 6) return baseScore + 3; // 第4-6天: 13分
        if (streak === 7) return baseScore + 10; // 第7天: 20分 (周奖励)
        if (streak <= 13) return baseScore + 5; // 第8-13天: 15分
        if (streak === 14) return baseScore + 20; // 第14天: 30分 (双周奖励)

        return baseScore + 8; // 第15天及以后: 18分
    }

    /**
     * 获取签到历史
     * @param uid 用户ID
     * @param limit 返回数量限制
     * @returns 签到历史记录
     */
    async getCheckInHistory(uid: number, limit: number = 30): Promise<DailyCheckInRecord[]> {
        return await this.ctx.db.collection('checkin.records' as any)
            .find({ uid })
            .sort({ checkInDate: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取本月签到记录
     * @param uid 用户ID
     * @returns 本月签到日期数组
     */
    async getMonthlyCheckIns(uid: number): Promise<string[]> {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
        const monthEnd = `${year}-${month.toString().padStart(2, '0')}-31`;

        const records = await this.ctx.db.collection('checkin.records' as any)
            .find({
                uid,
                checkInDate: { $gte: monthStart, $lte: monthEnd },
            })
            .sort({ checkInDate: 1 })
            .toArray();

        return records.map((record: DailyCheckInRecord) => record.checkInDate);
    }

    /**
     * 更新用户签到统计
     * @param uid 用户ID
     * @param newStreak 新的连续签到天数
     */
    private async updateUserStats(uid: number, newStreak: number): Promise<void> {
        const existingStats = await this.getUserCheckInStats(uid);
        const today = this.getTodayDateString();

        if (existingStats) {
            // 更新现有统计
            await this.ctx.db.collection('checkin.stats' as any).updateOne(
                { uid },
                {
                    $inc: { totalDays: 1 },
                    $set: {
                        currentStreak: newStreak,
                        maxStreak: Math.max(existingStats.maxStreak, newStreak),
                        lastCheckIn: today,
                        lastUpdated: new Date(),
                    },
                },
            );
        } else {
            // 创建新的统计记录
            await this.ctx.db.collection('checkin.stats' as any).insertOne({
                uid,
                totalDays: 1,
                currentStreak: newStreak,
                maxStreak: newStreak,
                lastCheckIn: today,
                lastUpdated: new Date(),
            });
        }
    }

    /**
     * 获取今天的日期字符串 (YYYY-MM-DD)
     */
    private getTodayDateString(): string {
        return this.formatDateString(new Date());
    }

    /**
     * 获取昨天的日期字符串 (YYYY-MM-DD)
     */
    private getYesterdayDateString(): string {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return this.formatDateString(yesterday);
    }

    /**
     * 格式化日期为 YYYY-MM-DD 字符串
     * @param date 日期对象
     */
    private formatDateString(date: Date): string {
        return date.toISOString().split('T')[0];
    }
}
