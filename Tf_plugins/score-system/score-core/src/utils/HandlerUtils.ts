/**
 * Handler 公共工具函数
 * 提供分页、用户信息获取等通用功能
 */

import type { Handler } from 'hydrooj';
import { ConfigManager } from '../config/ConfigManager';

/**
 * 解析分页参数
 *
 * 安全地解析HTTP请求中的分页参数，确保参数在合理范围内
 *
 * @param request HTTP请求对象
 * @param request.query 查询参数对象
 * @param defaultLimit 默认每页大小
 * @returns 安全的分页参数
 *
 * @example
 * const { page, limit } = parsePaginationParams(this.request, 20);
 */
export function parsePaginationParams(
    request: { query: Record<string, string | string[]> },
    defaultLimit: number = 20,
): { page: number, limit: number } {
    // 解析页码，确保 >= 1
    const page = Math.max(1, Number.parseInt(String(request.query.page)) || 1);

    // 解析每页大小，确保在 [1, MAX_PAGE_SIZE] 范围内
    const requestLimit = Number.parseInt(String(request.query.limit)) || defaultLimit;
    const maxPageSize = ConfigManager.getInstance().config.pagination.MAX_PAGE_SIZE;
    const limit = Math.min(Math.max(1, requestLimit), maxPageSize);

    return { page, limit };
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
