/**
 * tf_plugins_core - 积分核心系统
 *
 * 这个文件只包含积分系统最核心的类型定义和功能。
 * 业务相关的类型定义应该在各自的业务插件中定义。
 */

import { ScoreCoreService } from '../services/ScoreCoreService';

// ============================================================================
// 错误类定义
// ============================================================================

/**
 * 积分核心系统基础错误类
 */
export class ScoreCoreError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 500,
        public readonly details?: any,
    ) {
        super(message);
        this.name = 'ScoreCoreError';
    }
}

/**
 * 参数验证错误
 */
export class ValidationError extends ScoreCoreError {
    constructor(field: string, reason: string, details?: any) {
        super(
            `参数验证失败 - ${field}: ${reason}`,
            'VALIDATION_ERROR',
            400,
            details,
        );
        this.name = 'ValidationError';
    }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends ScoreCoreError {
    constructor(resource: string, identifier: any, details?: any) {
        super(
            `${resource}不存在: ${identifier}`,
            'NOT_FOUND',
            404,
            details,
        );
        this.name = 'NotFoundError';
    }
}

/**
 * 并发冲突错误
 */
export class ConcurrencyError extends ScoreCoreError {
    constructor(operation: string, details?: any) {
        super(
            `并发操作冲突: ${operation}`,
            'CONCURRENCY_ERROR',
            409,
            details,
        );
        this.name = 'ConcurrencyError';
    }
}

/**
 * 权限不足错误
 */
export class PermissionError extends ScoreCoreError {
    constructor(operation: string, details?: any) {
        super(
            `权限不足: ${operation}`,
            'PERMISSION_ERROR',
            403,
            details,
        );
        this.name = 'PermissionError';
    }
}

/**
 * 系统内部错误
 */
export class SystemError extends ScoreCoreError {
    constructor(message: string, originalError?: Error) {
        super(
            `系统错误: ${message}`,
            'SYSTEM_ERROR',
            500,
            originalError,
        );
        this.name = 'SystemError';
    }
}

// ============================================================================
// 积分核心类型定义
// ============================================================================

/**
 * 积分分类枚举
 * 定义积分系统支持的核心积分类型
 */
export const ScoreCategory = {
    /** 题目通过奖励 */
    AC_PROBLEM: 'AC题目',
    /** 管理员操作 */
    ADMIN_OPERATION: '管理员操作',
    /** 积分转账 */
    TRANSFER: '积分转账',
} as const;

/**
 * 积分分类类型
 * 从 ScoreCategory 自动推导出的联合类型
 */
export type ScoreCategoryType = typeof ScoreCategory[keyof typeof ScoreCategory];

/**
 * 积分记录接口
 * 表示一次积分变动记录
 */
export interface ScoreRecord {
    /** MongoDB ObjectId */
    _id?: any;
    /** 用户ID */
    uid: number;
    /** 域ID */
    domainId: string;
    /** 题目ID或虚拟ID */
    pid: number;
    /** 关联记录ID（如提交记录ID） */
    recordId: any;
    /** 积分变动值（正数为增加，负数为减少） */
    score: number;
    /** 变动原因描述 */
    reason: string;
    /** 记录创建时间 */
    createdAt: Date;
    /** 积分分类 */
    category?: ScoreCategoryType;
    /** 可选标题 */
    title?: string;
}

/**
 * 用户积分信息接口
 * 表示用户的积分统计信息
 */
export interface UserScore {
    /** MongoDB ObjectId */
    _id?: any;
    /** 用户ID */
    uid: number;
    /** 域ID（可选，用于多域支持） */
    domainId?: string;
    /** 总积分 */
    totalScore: number;
    /** AC题目数量 */
    acCount: number;
    /** 最后更新时间 */
    lastUpdated: Date;
}

/**
 * 首次AC奖励参数接口
 */
export interface AwardIfFirstACParams {
    /** 用户ID */
    uid: number;
    /** 题目ID */
    pid: number;
    /** 域ID */
    domainId: string;
    /** 记录ID */
    recordId: any;
    /** 奖励积分 */
    score: number;
    /** 奖励原因 */
    reason: string;
    /** 积分分类 */
    category?: ScoreCategoryType;
    /** 题目标题 */
    title?: string;
}

/**
 * 首次AC奖励结果接口
 */
export interface AwardIfFirstACResult {
    /** 实际发放的积分 */
    awarded: number;
    /** 是否为首次AC */
    isFirstAC: boolean;
}

// ============================================================================
// 积分核心常量
// ============================================================================

/**
 * 积分系统核心常量
 * 只包含积分系统本身需要的配置
 */
export const SCORE_CONSTANTS = {
    // 数据库集合名称
    COLLECTIONS: {
        /** 用户积分集合 */
        USERS: 'score.users',
        /** 积分记录集合 */
        RECORDS: 'score.records',
    } as const,

    // 缓存配置
    CACHE: {
        /** 用户积分缓存时间（毫秒） */
        USER_SCORE_TTL: 300 * 1000, // 5分钟
        /** 排行榜缓存时间（毫秒） */
        RANKING_TTL: 60 * 1000, // 1分钟
        /** 统计数据缓存时间（毫秒） */
        STATS_TTL: 300 * 1000, // 5分钟
    } as const,

    // 验证规则
    VALIDATION: {
        /** 单次积分变动最大值 */
        MAX_SCORE_CHANGE: 10000,
        /** 单次积分变动最小值 */
        MIN_SCORE_CHANGE: -10000,
        /** 用户ID最小值 */
        MIN_USER_ID: 1,
        /** 分页查询最大限制 */
        MAX_PAGE_LIMIT: 1000,
        /** 分页查询最小限制 */
        MIN_PAGE_LIMIT: 1,
        /** 批量操作最大数量 */
        MAX_BATCH_SIZE: 1000,
    } as const,

    // 批量操作配置
    BATCH: {
        /** 并发处理限制 */
        CONCURRENT_LIMIT: 10,
        /** 单个批次最大处理数量 */
        CHUNK_SIZE: 50,
    } as const,
} as const;

// ============================================================================
// 积分核心辅助函数
// ============================================================================

/**
 * 类型守卫：检查值是否为有效的积分分类
 */
export function isValidScoreCategory(category: string): category is ScoreCategoryType {
    return Object.values(ScoreCategory).includes(category as ScoreCategoryType);
}

/**
 * 验证积分变动参数
 * @param score 要验证的积分值
 * @param config 验证配置，默认使用SCORE_CONSTANTS.VALIDATION
 */
export function validateScoreChange(
    score: number,
    config = SCORE_CONSTANTS.VALIDATION,
): { valid: boolean, error?: string } {
    if (!Number.isInteger(score)) {
        return { valid: false, error: '积分必须是整数' };
    }
    if (score > config.MAX_SCORE_CHANGE) {
        return { valid: false, error: `单次积分增加不能超过${config.MAX_SCORE_CHANGE}` };
    }
    if (score < config.MIN_SCORE_CHANGE) {
        return { valid: false, error: `单次积分减少不能超过${Math.abs(config.MIN_SCORE_CHANGE)}` };
    }
    return { valid: true };
}

/**
 * 格式化积分显示
 */
export function formatScore(score: number): string {
    return new Intl.NumberFormat('zh-CN').format(score);
}

/**
 * 生成唯一标识符
 */
export function generateUniqueId(prefix = 'score'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
}

/**
 * 计算分页信息
 */
export function calculatePagination(page: number, limit: number, total: number): {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    offset: number;
} {
    const currentPage = Math.max(1, page);
    const totalPages = Math.ceil(total / limit);
    const offset = (currentPage - 1) * limit;

    return {
        currentPage,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
        offset,
    };
}

/**
 * 安全的JSON序列化（处理BigInt等特殊类型）
 */
export function safeJsonStringify(obj: any): string {
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        if (value instanceof Date) {
            return value.toISOString();
        }
        return value;
    });
}

/**
 * 格式化时间显示
 */
export function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
        return '刚刚';
    } else if (diffMinutes < 60) {
        return `${diffMinutes}分钟前`;
    } else if (diffHours < 24) {
        return `${diffHours}小时前`;
    } else if (diffDays < 30) {
        return `${diffDays}天前`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

/**
 * 验证用户ID列表
 */
export function validateUserIds(uids: number[]): { valid: boolean, invalidIds: number[] } {
    const invalidIds = uids.filter((uid) => !Number.isInteger(uid) || uid < SCORE_CONSTANTS.VALIDATION.MIN_USER_ID);
    return {
        valid: invalidIds.length === 0,
        invalidIds,
    };
}

/**
 * 批量验证积分变动
 */
export function validateBulkScoreChanges(
    changes: Array<{ uid: number, amount: number }>,
): { valid: boolean, errors: Array<{ uid: number, error: string }> } {
    const errors: Array<{ uid: number, error: string }> = [];

    for (const change of changes) {
        if (change.uid < SCORE_CONSTANTS.VALIDATION.MIN_USER_ID) {
            errors.push({ uid: change.uid, error: '用户ID无效' });
            continue;
        }

        const validation = validateScoreChange(change.amount);
        if (!validation.valid) {
            errors.push({ uid: change.uid, error: validation.error! });
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// ============================================================================
// Hydro框架模块扩展
// ============================================================================

/**
 * 扩展 Hydro 框架的 Context 接口
 * 添加 tf_plugins_core 相关的属性和方法
 */
declare module 'hydrooj' {
    interface Context {
        /** ScoreCoreService 实例（可选，通过 ctx.inject 获取更安全） */
        scoreCore?: ScoreCoreService;
    }

    /**
     * 业务相关的事件类型由各自的插件定义
     * 这里只保留积分系统内部可能用到的事件
     */
}

// ============================================================================
// 导出声明
// ============================================================================

export {};
