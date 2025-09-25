/**
 * Handler 公共工具函数
 * 提供分页、用户信息获取等通用功能
 */

import type { Handler } from 'hydrooj';
import { SYSTEM_CONFIG } from '../config/ConfigManager';
import { getScoreService } from '../registry/ServiceRegistry';

/**
 * 分页配置常量（从系统配置获取）
 */
export const PAGINATION_CONFIG = {
    RANKING_PAGE_SIZE: SYSTEM_CONFIG.RANKING_PAGE_SIZE,
    RECORDS_PAGE_SIZE: SYSTEM_CONFIG.RECORDS_PAGE_SIZE,
    MANAGEMENT_PAGE_SIZE: SYSTEM_CONFIG.MANAGEMENT_PAGE_SIZE,
    MAX_PAGE_SIZE: SYSTEM_CONFIG.MAX_PAGE_SIZE,
} as const;

/**
 * 解析分页参数
 * @param request HTTP请求对象
 * @param defaultLimit 默认每页大小
 * @returns 分页参数
 */
export function parsePaginationParams(request: any, defaultLimit: number = 20): {
    page: number;
    limit: number;
} {
    const page = Math.max(1, Number.parseInt(request.query.page as string) || 1);
    const limit = Math.min(
        Math.max(1, Number.parseInt(request.query.limit as string) || defaultLimit),
        PAGINATION_CONFIG.MAX_PAGE_SIZE,
    );
    return { page, limit };
}

/**
 * 获取积分服务实例（带错误检查）
 * @returns 积分服务实例
 * @throws 如果服务不可用则抛出错误
 */
export function getScoreServiceOrThrow() {
    const scoreService = getScoreService();
    if (!scoreService) {
        throw new Error('积分核心服务不可用');
    }
    return scoreService;
}

/**
 * 批量获取用户信息
 * @param handler Handler实例
 * @param uids 用户ID数组
 * @returns 用户信息字典
 */
export async function fetchUserInfoBatch(handler: Handler, uids: number[]) {
    if (uids.length === 0) return {};

    const uniqueUids = [...new Set(uids)]; // 去重
    const UserModel = global.Hydro.model.user;
    return await UserModel.getList(handler.domain._id, uniqueUids);
}

/**
 * 检查用户管理权限
 * @param handler Handler实例
 * @returns 是否有管理权限
 */
export function checkManagePermission(handler: Handler): boolean {
    // 动态获取PRIV常量
    const { PRIV } = require('hydrooj');
    return !!(handler.user?.priv && handler.user.priv & PRIV.PRIV_EDIT_SYSTEM);
}

/**
 * 分页响应辅助函数
 * @param data 数据列表
 * @param total 总数
 * @param page 当前页
 * @param limit 每页大小
 * @returns 分页响应对象
 */
export function createPaginationResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
) {
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}
