import type { Context } from 'hydrooj';
import { STATUS } from 'hydrooj';
import { ProblemAggregationService } from './ProblemAggregationService';
import { RecordAggregationService } from './RecordAggregationService';
import { type CacheConfig, StatsCacheService } from './StatsCacheService';

// 学生分析记录类型（保留用于类型兼容）
export interface StudentAnalyticsRecord {
    _id: any;
    uid: number;
    domainId?: string;
    eventType: string;
    eventData: Record<string, any>;
    createdAt: Date;
}

// 每周代码统计类型
export interface WeeklyCodeStats {
    year: number;
    week: number;
    weekStart: Date;
    weekEnd: Date;
    totalLines: number;
    totalSubmissions: number;
    uniqueProblems: number;
    averageLinesPerSubmission: number;
}

// 每月代码统计类型
export interface MonthlyCodeStats {
    year: number;
    month: number;
    monthStart: Date;
    monthEnd: Date;
    totalLines: number;
    totalSubmissions: number;
    uniqueProblems: number;
    averageLinesPerSubmission: number;
    averageLinesPerDay: number;
}

// 提交统计类型
export interface SubmissionStats {
    totalSubmissions: number;
    acCount: number;
    waCount: number;
    tleCount: number;
    mleCount: number;
    reCount: number;
    ceCount: number;
    acRate: number;
    uniqueProblems: number;
    firstAcTime?: Date;
    lastSubmissionTime?: Date;
}

// 提交时间分布
export interface SubmissionTimeDistribution {
    hour: number;
    count: number;
}

// 提交状态分布
export interface SubmissionStatusDistribution {
    status: string;
    count: number;
    percentage: number;
}

// 题目完成情况统计
export interface ProblemCompletionStats {
    totalProblems: number;
    solvedProblems: number;
    attemptedProblems: number;
    completionRate: number;
    starredProblems: number;
}

// 题目难度分布
export interface ProblemDifficultyDistribution {
    difficulty: number;
    count: number;
    solved: number;
}

// 题目标签分布
export interface ProblemTagDistribution {
    tag: string;
    count: number;
    solved: number;
}

// 学生分析统计类型（全域统计）
export interface StudentAnalyticsStats {
    _id: any;
    uid: number;
    totalEvents: number;
    lastUpdated: Date;
    totalCodeLines?: number;
    weeklyCodeStats?: WeeklyCodeStats[];
    monthlyCodeStats?: MonthlyCodeStats[];
    submissionStats?: SubmissionStats;
    problemCompletionStats?: ProblemCompletionStats;
    submissionTimeDistribution?: SubmissionTimeDistribution[];
    submissionStatusDistribution?: SubmissionStatusDistribution[];
    problemDifficultyDistribution?: ProblemDifficultyDistribution[];
    problemTagDistribution?: ProblemTagDistribution[];
}

// 状态名称映射
const STATUS_NAMES: Record<number, string> = {
    [STATUS.STATUS_ACCEPTED]: 'AC',
    [STATUS.STATUS_WRONG_ANSWER]: 'WA',
    [STATUS.STATUS_TIME_LIMIT_EXCEEDED]: 'TLE',
    [STATUS.STATUS_MEMORY_LIMIT_EXCEEDED]: 'MLE',
    [STATUS.STATUS_RUNTIME_ERROR]: 'RE',
    [STATUS.STATUS_COMPILE_ERROR]: 'CE',
    [STATUS.STATUS_SYSTEM_ERROR]: 'SE',
    [STATUS.STATUS_CANCELED]: 'IGN',
};

/**
 * 学生数据分析服务（优化版 + 缓存）
 *
 * 优化特性：
 * 1. 使用 MongoDB 聚合管道减少数据库查询次数和内存占用
 * 2. 预计算缓存，避免重复计算历史数据
 * 3. 智能缓存失效：用户有新提交时标记缓存为脏
 */
export class StudentAnalyticsService {
    private recordAggregation: RecordAggregationService;
    private problemAggregation: ProblemAggregationService;
    private cacheService: StatsCacheService;

    constructor(
        private ctx: Context,
        cacheConfig: Partial<CacheConfig> = {},
    ) {
        this.recordAggregation = new RecordAggregationService(ctx);
        this.problemAggregation = new ProblemAggregationService(ctx);
        this.cacheService = new StatsCacheService(ctx, cacheConfig);
    }

    /**
     * 获取缓存服务实例（用于外部调用缓存失效等操作）
     */
    getCacheService(): StatsCacheService {
        return this.cacheService;
    }

    /**
     * 获取学生统计数据（带缓存）
     *
     * 缓存策略：
     * - 首先检查缓存是否有效
     * - 如果缓存有效且未被标记为脏，直接返回缓存数据
     * - 否则重新计算并更新缓存
     *
     * @param uid 用户ID
     * @param includeWeeklyStats 是否包含每周统计（默认 true）
     * @param includeMonthlyStats 是否包含每月统计（默认 true）
     * @param weeks 统计周数（默认 12 周）
     * @param months 统计月数（默认 12 个月）
     * @param forceRefresh 是否强制刷新缓存（默认 false）
     * @returns 学生统计数据
     */
    async getStudentStats(
        uid: number,
        includeWeeklyStats: boolean = true,
        includeMonthlyStats: boolean = true,
        weeks: number = 12,
        months: number = 12,
        forceRefresh: boolean = false,
    ): Promise<StudentAnalyticsStats | null> {
        // 尝试从缓存获取（除非强制刷新）
        if (!forceRefresh) {
            const cached = await this.cacheService.getCachedStats(uid);
            if (cached && cached.stats) {
                // 缓存命中，直接返回
                return cached.stats;
            }
        }

        // 缓存未命中或强制刷新，重新计算
        const stats = await this.computeStudentStats(uid, includeWeeklyStats, includeMonthlyStats, weeks, months);

        // 更新缓存
        if (stats) {
            await this.cacheService.updateCache(
                uid,
                stats,
                stats.submissionStats?.lastSubmissionTime,
            );
        }

        return stats;
    }

    /**
     * 计算学生统计数据（不使用缓存，直接计算）
     * 内部方法，用于缓存更新
     */
    private async computeStudentStats(
        uid: number,
        includeWeeklyStats: boolean = true,
        includeMonthlyStats: boolean = true,
        weeks: number = 12,
        months: number = 12,
    ): Promise<StudentAnalyticsStats | null> {
        // 并行执行两个聚合查询
        const [recordStats, problemStats] = await Promise.all([
            this.recordAggregation.getAggregatedStats(uid, weeks, months),
            this.problemAggregation.getAggregatedStats(uid),
        ]);

        // 处理周统计
        let weeklyCodeStats: WeeklyCodeStats[] | undefined;
        if (includeWeeklyStats) {
            const filledWeekly = this.recordAggregation.fillWeeklyGaps(
                recordStats.weeklyStats,
                weeks,
            );
            weeklyCodeStats = filledWeekly.map((stat) => {
                const { weekStart, weekEnd } = this.getWeekRange(stat.year, stat.week);
                return {
                    ...stat,
                    weekStart,
                    weekEnd,
                    averageLinesPerSubmission: stat.totalSubmissions > 0
                        ? Math.round((stat.totalLines / stat.totalSubmissions) * 100) / 100
                        : 0,
                };
            });
        }

        // 处理月统计
        let monthlyCodeStats: MonthlyCodeStats[] | undefined;
        if (includeMonthlyStats) {
            const filledMonthly = this.recordAggregation.fillMonthlyGaps(
                recordStats.monthlyStats,
                months,
            );
            monthlyCodeStats = filledMonthly.map((stat) => {
                const monthStart = new Date(stat.year, stat.month - 1, 1);
                monthStart.setHours(0, 0, 0, 0);
                const monthEnd = new Date(stat.year, stat.month, 0);
                monthEnd.setHours(23, 59, 59, 999);
                const daysInMonth = monthEnd.getDate();

                return {
                    ...stat,
                    monthStart,
                    monthEnd,
                    averageLinesPerSubmission: stat.totalSubmissions > 0
                        ? Math.round((stat.totalLines / stat.totalSubmissions) * 100) / 100
                        : 0,
                    averageLinesPerDay: stat.totalLines > 0
                        ? Math.round((stat.totalLines / daysInMonth) * 100) / 100
                        : 0,
                };
            });
        }

        // 处理提交统计
        const { totals } = recordStats;
        const submissionStats: SubmissionStats = {
            totalSubmissions: totals.totalSubmissions,
            acCount: totals.acCount,
            waCount: totals.waCount,
            tleCount: totals.tleCount,
            mleCount: totals.mleCount,
            reCount: totals.reCount,
            ceCount: totals.ceCount,
            acRate: totals.totalSubmissions > 0
                ? Math.round((totals.acCount / totals.totalSubmissions) * 10000) / 100
                : 0,
            uniqueProblems: totals.uniqueProblems,
            firstAcTime: totals.firstAcTime || undefined,
            lastSubmissionTime: totals.lastSubmissionTime || undefined,
        };

        // 处理小时分布
        const filledHours = this.recordAggregation.fillHourGaps(recordStats.hourDistribution);
        const submissionTimeDistribution: SubmissionTimeDistribution[] = filledHours;

        // 处理状态分布
        const total = recordStats.statusDistribution.reduce((sum, s) => sum + s.count, 0);
        const submissionStatusDistribution: SubmissionStatusDistribution[] =
            recordStats.statusDistribution.map((stat) => ({
                status: STATUS_NAMES[stat.status] || `Status ${stat.status}`,
                count: stat.count,
                percentage: total > 0
                    ? Math.round((stat.count / total) * 10000) / 100
                    : 0,
            }));

        return {
            _id: null,
            uid,
            totalEvents: 0,
            lastUpdated: new Date(),
            totalCodeLines: totals.totalLines,
            weeklyCodeStats,
            monthlyCodeStats,
            submissionStats,
            problemCompletionStats: problemStats.completion,
            submissionTimeDistribution,
            submissionStatusDistribution,
            problemDifficultyDistribution: problemStats.difficultyDistribution,
            problemTagDistribution: problemStats.tagDistribution,
        };
    }

    /**
     * 标记用户缓存为脏（当用户有新提交时调用）
     * 这将导致下次访问时重新计算统计数据
     * @param uid 用户ID
     */
    async invalidateUserCache(uid: number): Promise<void> {
        await this.cacheService.markDirty(uid);
    }

    /**
     * 获取周的开始和结束日期
     */
    private getWeekRange(year: number, week: number): { weekStart: Date, weekEnd: Date } {
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dow = simple.getDay();
        const ISOweekStart = simple;
        if (dow <= 4) {
            ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        } else {
            ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        }
        const weekStart = new Date(ISOweekStart);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(ISOweekStart);
        weekEnd.setDate(ISOweekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return { weekStart, weekEnd };
    }

    // ================== 兼容旧接口的方法 ==================
    // 这些方法保留是为了向后兼容

    /**
     * 获取学生每周代码行数统计（全域统计）
     */
    async getWeeklyCodeStats(uid: number, weeks: number = 12): Promise<WeeklyCodeStats[]> {
        const stats = await this.getStudentStats(uid, true, false, weeks, 0);
        return stats?.weeklyCodeStats || [];
    }

    /**
     * 获取学生每月代码行数统计（全域统计）
     */
    async getMonthlyCodeStats(uid: number, months: number = 12): Promise<MonthlyCodeStats[]> {
        const stats = await this.getStudentStats(uid, false, true, 0, months);
        return stats?.monthlyCodeStats || [];
    }

    /**
     * 获取学生总代码行数（全域统计）
     */
    async getTotalCodeLines(uid: number): Promise<number> {
        const stats = await this.getStudentStats(uid, false, false, 0, 0);
        return stats?.totalCodeLines || 0;
    }

    /**
     * 获取提交统计（全域统计）
     */
    async getSubmissionStats(uid: number): Promise<SubmissionStats> {
        const stats = await this.getStudentStats(uid, false, false, 0, 0);
        return stats?.submissionStats || {
            totalSubmissions: 0,
            acCount: 0,
            waCount: 0,
            tleCount: 0,
            mleCount: 0,
            reCount: 0,
            ceCount: 0,
            acRate: 0,
            uniqueProblems: 0,
        };
    }

    /**
     * 获取题目完成情况统计（全域统计）
     */
    async getProblemCompletionStats(uid: number): Promise<ProblemCompletionStats> {
        const stats = await this.getStudentStats(uid, false, false, 0, 0);
        return stats?.problemCompletionStats || {
            totalProblems: 0,
            solvedProblems: 0,
            attemptedProblems: 0,
            completionRate: 0,
            starredProblems: 0,
        };
    }

    /**
     * 获取提交时间分布（全域统计）
     */
    async getSubmissionTimeDistribution(uid: number): Promise<SubmissionTimeDistribution[]> {
        const stats = await this.getStudentStats(uid, false, false, 0, 0);
        return stats?.submissionTimeDistribution || [];
    }

    /**
     * 获取提交状态分布（全域统计）
     */
    async getSubmissionStatusDistribution(uid: number): Promise<SubmissionStatusDistribution[]> {
        const stats = await this.getStudentStats(uid, false, false, 0, 0);
        return stats?.submissionStatusDistribution || [];
    }

    /**
     * 获取题目难度分布（全域统计）
     */
    async getProblemDifficultyDistribution(uid: number): Promise<ProblemDifficultyDistribution[]> {
        const stats = await this.getStudentStats(uid, false, false, 0, 0);
        return stats?.problemDifficultyDistribution || [];
    }

    /**
     * 获取题目标签分布（全域统计）
     */
    async getProblemTagDistribution(uid: number): Promise<ProblemTagDistribution[]> {
        const stats = await this.getStudentStats(uid, false, false, 0, 0);
        return stats?.problemTagDistribution || [];
    }
}
