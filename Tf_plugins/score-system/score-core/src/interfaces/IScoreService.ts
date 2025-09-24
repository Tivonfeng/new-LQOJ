/**
 * 积分服务核心接口
 * 定义积分系统的核心功能，供其他插件依赖使用
 */

import type {
    DailyStats,
    PaginatedResult,
    ScoreOperationResult,
    ScoreRecord,
    UserScore,
} from '../types/shared';

export interface IScoreService {
    /**
     * 添加积分记录
     */
    addScoreRecord(record: Omit<ScoreRecord, '_id' | 'createdAt'>): Promise<void>;

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
     * 增加用户积分
     */
    addUserScore(domainId: string, uid: number, score: number, reason: string): Promise<ScoreOperationResult>;

    /**
     * 格式化积分记录的日期
     */
    formatScoreRecords(records: ScoreRecord[]): Array<Omit<ScoreRecord, 'createdAt'> & { createdAt: string }>;
}
