// 服务层统一导出

// 主服务（优化版，使用聚合管道 + 缓存）
export * from './StudentAnalyticsService';

// 缓存服务
export * from './StatsCacheService';

// 全局统计服务
export * from './GlobalStatsService';

// 聚合服务
export * from './RecordAggregationService';
export * from './ProblemAggregationService';

// 导出类型
export type {
    WeeklyCodeStats,
    MonthlyCodeStats,
    SubmissionStats,
    SubmissionTimeDistribution,
    SubmissionStatusDistribution,
    ProblemCompletionStats,
    ProblemDifficultyDistribution,
    ProblemTagDistribution,
    StudentAnalyticsStats,
    StudentAnalyticsRecord,
} from './StudentAnalyticsService';

// 聚合结果类型
export type {
    AggregatedRecordStats,
    WeeklyAggregation,
    MonthlyAggregation,
    TotalAggregation,
    StatusAggregation,
    HourAggregation,
} from './RecordAggregationService';

export type {
    AggregatedProblemStats,
    ProblemCompletionAggregation,
    DifficultyAggregation,
    TagAggregation,
} from './ProblemAggregationService';

// 全局统计类型
export type { GlobalStats } from './GlobalStatsService';
