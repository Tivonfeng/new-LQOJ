/**
 * 积分系统共享类型定义
 * 用于支持插件拆分和模块化架构
 */

// 积分记录接口
export interface ScoreRecord {
    _id?: any;
    uid: number;
    domainId: string;
    pid: number;
    recordId: any;
    score: number;
    reason: string;
    createdAt: Date;
    problemTitle?: string;
}

// 用户积分统计接口
export interface UserScore {
    _id?: any;
    uid: number;
    domainId?: string;
    totalScore: number;
    acCount: number;
    lastUpdated: Date;
    migratedFrom?: string[];
    migratedAt?: Date;
}

// 积分系统配置接口
export interface ScoreConfig {
    enabled: boolean;
}

// 积分事件数据类型
export interface ScoreEventData {
    uid: number;
    pid: number;
    domainId: string;
    score: number;
    isFirstAC: boolean;
    problemTitle?: string;
    recordId: any;
}

// 积分变更事件数据
export interface ScoreChangeEventData {
    uid: number;
    domainId: string;
    change: number;
    reason: string;
    oldScore?: number;
    newScore?: number;
}

// 积分不足事件数据
export interface ScoreInsufficientEventData {
    uid: number;
    domainId: string;
    required: number;
    current: number;
    action: string;
}

// 统计数据接口
export interface DailyStats {
    totalScore: number;
    activeUsers: number;
}

// 分页结果接口
export interface PaginatedResult<T> {
    records: T[];
    total: number;
    totalPages: number;
    currentPage: number;
}

// 排名信息接口
export interface UserRankInfo {
    uid: number;
    rank: number;
    totalScore: number;
    acCount: number;
}

// 积分操作结果接口
export interface ScoreOperationResult {
    success: boolean;
    message?: string;
    data?: any;
}
