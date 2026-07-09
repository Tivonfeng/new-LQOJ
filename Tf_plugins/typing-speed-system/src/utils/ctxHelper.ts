/**
 * Hydro ctx 安全读取工具
 *
 * Hydro 框架对 ctx 做了 Proxy 保护，直接读取 provide 注册的属性
 * 会抛出 "cannot get property 'xxx' without inject" 异常。
 * 此工具函数提供安全读取方式，避免崩溃。
 */

/**
 * 安全读取 ctx 上 provide 注册的服务
 * @param ctx Hydro 上下文
 * @param name 服务名称
 * @returns 服务实例或 undefined
 */
export function safeGetService<T = any>(ctx: any, name: string): T | undefined {
    try {
        return ctx[name];
    } catch {
        return undefined;
    }
}

/**
 * 安全获取打字系统所有服务
 * @param ctx Hydro 上下文
 * @returns 服务对象集合，任一缺失则对应字段为 undefined
 */
export function getTypingServices(ctx: any) {
    return {
        recordService: safeGetService(ctx, 'typingRecordService'),
        statsService: safeGetService(ctx, 'typingStatsService'),
        analyticsService: safeGetService(ctx, 'typingAnalyticsService'),
        bonusService: safeGetService(ctx, 'typingBonusService'),
        scoreCore: safeGetService(ctx, 'scoreCore'),
    };
}
