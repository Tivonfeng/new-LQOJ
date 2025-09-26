/**
 * 积分服务核心接口
 * 定义积分系统的核心功能，供其他插件依赖使用
 */

import type {
    DailyStats,
    DuplicateRecordsGroup,
    PaginatedResult,
    ScoreOperationResult,
    ScoreRecord,
    UserScore,
} from '../types/shared';

export interface IScoreService {
    /**
     * 添加积分记录
     */
    addScoreRecord(record: Omit<ScoreRecord, '_id' | 'createdAt' | 'recordId'>): Promise<void>;

    /**
     * 更新用户积分
     */
    updateUserScore(domainId: string, uid: number, scoreChange: number): Promise<void>;

    /**
     * 获取用户积分
     */
    getUserScore(domainId: string, uid: number): Promise<UserScore | null>;

    /**
     * 获取积分排行榜
     */
    getScoreRanking(domainId: string, limit?: number): Promise<UserScore[]>;

    /**
     * 获取用户积分记录
     */
    getUserScoreRecords(domainId: string, uid: number, limit?: number): Promise<ScoreRecord[]>;

    /**
     * 获取用户排名
     */
    getUserRank(domainId: string, uid: number): Promise<number | null>;

    /**
     * 获取今日积分统计
     */
    getTodayStats(domainId: string): Promise<DailyStats>;

    /**
     * 分页获取积分记录
     */
    getScoreRecordsWithPagination(domainId: string, page: number, limit: number): Promise<PaginatedResult<ScoreRecord>>;

    /**
     * 检查用户积分是否足够
     */
    checkSufficientScore(domainId: string, uid: number, requiredScore: number): Promise<boolean>;

    /**
     * 扣除用户积分（带检查）
     */
    deductUserScore(domainId: string, uid: number, score: number, reason: string): Promise<ScoreOperationResult>;

    /**
     * 原子性处理首次AC奖励
     */
    processFirstACReward(record: Omit<ScoreRecord, '_id' | 'createdAt' | 'recordId'>): Promise<{
        isFirstAC: boolean;
        score: number;
    }>;

    /**
     * 增加用户积分
     */
    addUserScore(domainId: string, uid: number, score: number, reason: string): Promise<ScoreOperationResult>;

    /**
     * 格式化积分记录的日期
     */
    formatScoreRecords(records: ScoreRecord[], includeYear?: boolean): Array<Omit<ScoreRecord, 'createdAt'> & { createdAt: string }>;

    /**
     * 格式化用户积分数据的日期
     */
    formatUserScores(users: UserScore[], includeYear?: boolean): Array<Omit<UserScore, 'lastUpdated'> & { lastUpdated: string | null }>;

    /**
     * 分页获取积分排行榜
     */
    getScoreRankingWithPagination(domainId: string, page: number, limit: number): Promise<{
        users: UserScore[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;

    /**
     * 获取总用户数
     */
    getTotalUsersCount(domainId: string): Promise<number>;

    /**
     * 获取重复的积分记录
     */
    getDuplicateRecords(domainId: string): Promise<DuplicateRecordsGroup[]>;

    /**
     * 删除重复的积分记录
     */
    deleteDuplicateRecords(domainId: string): Promise<{
        duplicateGroups: number;
        deletedRecords: number;
    }>;

    /**
     * 获取系统总积分数
     */
    getTotalScoreSum(domainId: string): Promise<number>;

    /**
     * 初始化数据库索引
     */
    initializeIndexes(): Promise<void>;

    generateUniqueRecordId();
}
