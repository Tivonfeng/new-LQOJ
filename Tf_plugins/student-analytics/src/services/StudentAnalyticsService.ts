import type { Context } from 'hydrooj';
import {
    type ProblemCompletionStats,
    type ProblemDifficultyDistribution,
    ProblemStatsService,
    type ProblemTagDistribution,
} from './ProblemStatsService';
import { type MonthlyCodeStats, StudentDataService, type WeeklyCodeStats } from './StudentDataService';
import {
    type SubmissionStats,
    SubmissionStatsService,
    type SubmissionStatusDistribution,
    type SubmissionTimeDistribution,
} from './SubmissionStatsService';

// 学生分析记录类型
export interface StudentAnalyticsRecord {
    _id: any;
    uid: number;
    domainId?: string; // 可选，用于记录来源域
    eventType: string;
    eventData: Record<string, any>;
    createdAt: Date;
}

// 学生分析统计类型（全域统计）
export interface StudentAnalyticsStats {
    _id: any;
    uid: number;
    totalEvents: number;
    lastUpdated: Date;
    totalCodeLines?: number; // 总代码行数
    weeklyCodeStats?: WeeklyCodeStats[]; // 每周代码统计
    monthlyCodeStats?: MonthlyCodeStats[]; // 每月代码统计
    submissionStats?: SubmissionStats; // 提交统计
    problemCompletionStats?: ProblemCompletionStats; // 题目完成情况统计
    submissionTimeDistribution?: SubmissionTimeDistribution[]; // 提交时间分布
    submissionStatusDistribution?: SubmissionStatusDistribution[]; // 提交状态分布
    problemDifficultyDistribution?: ProblemDifficultyDistribution[]; // 题目难度分布
    problemTagDistribution?: ProblemTagDistribution[]; // 题目标签分布
}

// 学生数据分析服务
export class StudentAnalyticsService {
    private dataService: StudentDataService;
    private submissionStatsService: SubmissionStatsService;
    private problemStatsService: ProblemStatsService;

    constructor(private ctx: Context) {
        this.dataService = new StudentDataService(ctx);
        this.submissionStatsService = new SubmissionStatsService(ctx);
        this.problemStatsService = new ProblemStatsService(ctx);
    }

    /**
     * 获取学生统计数据（全域统计，包含所有统计信息）
     * @param uid 用户ID
     * @param includeWeeklyStats 是否包含每周统计（默认 true）
     * @param includeMonthlyStats 是否包含每月统计（默认 true）
     * @param weeks 统计周数（默认 12 周）
     * @param months 统计月数（默认 12 个月）
     * @returns 学生统计数据
     */
    async getStudentStats(
        uid: number,
        includeWeeklyStats: boolean = true,
        includeMonthlyStats: boolean = true,
        weeks: number = 12,
        months: number = 12,
    ): Promise<StudentAnalyticsStats | null> {
        const baseStats = await this.ctx.db.collection('student.analytics.stats' as any).findOne({
            uid,
        });

        // 并行获取所有统计数据（全域）
        const [
            totalCodeLines,
            weeklyCodeStats,
            monthlyCodeStats,
            submissionStats,
            problemCompletionStats,
            submissionTimeDistribution,
            submissionStatusDistribution,
            problemDifficultyDistribution,
            problemTagDistribution,
        ] = await Promise.all([
            this.dataService.getTotalCodeLines(uid),
            includeWeeklyStats
                ? this.dataService.getWeeklyCodeStats(uid, weeks)
                : Promise.resolve(undefined),
            includeMonthlyStats
                ? this.dataService.getMonthlyCodeStats(uid, months)
                : Promise.resolve(undefined),
            this.submissionStatsService.getSubmissionStats(uid),
            this.problemStatsService.getProblemCompletionStats(uid),
            this.submissionStatsService.getSubmissionTimeDistribution(uid),
            this.submissionStatsService.getSubmissionStatusDistribution(uid),
            this.problemStatsService.getProblemDifficultyDistribution(uid),
            this.problemStatsService.getProblemTagDistribution(uid),
        ]);

        return {
            ...(baseStats || {
                _id: null,
                uid,
                totalEvents: 0,
                lastUpdated: new Date(),
            }),
            totalCodeLines,
            weeklyCodeStats,
            monthlyCodeStats,
            submissionStats,
            problemCompletionStats,
            submissionTimeDistribution,
            submissionStatusDistribution,
            problemDifficultyDistribution,
            problemTagDistribution,
        };
    }

    /**
     * 获取学生每周代码行数统计（全域统计）
     * @param uid 用户ID
     * @param weeks 统计周数（默认 12 周）
     * @returns 每周代码统计数组
     */
    async getWeeklyCodeStats(
        uid: number,
        weeks: number = 12,
    ): Promise<WeeklyCodeStats[]> {
        return await this.dataService.getWeeklyCodeStats(uid, weeks);
    }

    /**
     * 获取学生每月代码行数统计（全域统计）
     * @param uid 用户ID
     * @param months 统计月数（默认 12 个月）
     * @returns 每月代码统计数组
     */
    async getMonthlyCodeStats(
        uid: number,
        months: number = 12,
    ): Promise<MonthlyCodeStats[]> {
        return await this.dataService.getMonthlyCodeStats(uid, months);
    }

    /**
     * 获取学生总代码行数（全域统计）
     * @param uid 用户ID
     * @returns 总代码行数
     */
    async getTotalCodeLines(uid: number): Promise<number> {
        return await this.dataService.getTotalCodeLines(uid);
    }

    /**
     * 获取提交统计（全域统计）
     */
    async getSubmissionStats(uid: number): Promise<SubmissionStats> {
        return await this.submissionStatsService.getSubmissionStats(uid);
    }

    /**
     * 获取题目完成情况统计（全域统计）
     */
    async getProblemCompletionStats(
        uid: number,
    ): Promise<ProblemCompletionStats> {
        return await this.problemStatsService.getProblemCompletionStats(uid);
    }

    /**
     * 获取提交时间分布（全域统计）
     */
    async getSubmissionTimeDistribution(
        uid: number,
    ): Promise<SubmissionTimeDistribution[]> {
        return await this.submissionStatsService.getSubmissionTimeDistribution(uid);
    }

    /**
     * 获取提交状态分布（全域统计）
     */
    async getSubmissionStatusDistribution(
        uid: number,
    ): Promise<SubmissionStatusDistribution[]> {
        return await this.submissionStatsService.getSubmissionStatusDistribution(uid);
    }

    /**
     * 获取题目难度分布（全域统计）
     */
    async getProblemDifficultyDistribution(
        uid: number,
    ): Promise<ProblemDifficultyDistribution[]> {
        return await this.problemStatsService.getProblemDifficultyDistribution(uid);
    }

    /**
     * 获取题目标签分布（全域统计）
     */
    async getProblemTagDistribution(
        uid: number,
    ): Promise<ProblemTagDistribution[]> {
        return await this.problemStatsService.getProblemTagDistribution(uid);
    }

    async addAnalyticsRecord(record: Omit<StudentAnalyticsRecord, '_id' | 'createdAt'>): Promise<void> {
        await this.ctx.db.collection('student.analytics.records' as any).insertOne({
            ...record,
            createdAt: new Date(),
        });
    }
}
