/**
 * 服务注册器
 * 用于插件间服务共享和依赖注入
 */

import type { Context } from 'hydrooj';
import type { IScoreService } from '../interfaces/IScoreService';

// 服务常量
export const SERVICE_NAMES = {
    SCORE: 'score', // 核心积分系统
    LOTTERY: 'lottery', // 抽奖系统
    TRANSFER: 'transfer', // 转账系统
    CHECKIN: 'checkin', // 签到系统
    GAMES: 'games', // 游戏系统
} as const;

// 服务注册表
const services = new Map<string, any>();

export class ServiceRegistry {
    public static instance: ServiceRegistry;
    private ctx: Context;

    private constructor(ctx: Context) {
        this.ctx = ctx;
    }

    static getInstance(ctx?: Context): ServiceRegistry {
        if (!ServiceRegistry.instance && ctx) {
            ServiceRegistry.instance = new ServiceRegistry(ctx);
        }
        return ServiceRegistry.instance;
    }

    /**
     * 注册服务
     */
    register<T>(name: string, service: T): void {
        services.set(name, service);
        console.log(`[ServiceRegistry] Service '${name}' registered`);
    }

    /**
     * 获取服务
     */
    get<T>(name: string): T | null {
        return services.get(name) || null;
    }

    /**
     * 检查服务是否已注册
     */
    has(name: string): boolean {
        return services.has(name);
    }

    /**
     * 获取积分服务
     */
    getScoreService(): IScoreService | null {
        return this.get<IScoreService>('score');
    }

    /**
     * 注册积分服务
     */
    registerScoreService(service: IScoreService): void {
        this.register(SERVICE_NAMES.SCORE, service);
    }

    /**
     * 清理所有服务（用于测试）
     */
    clear(): void {
        services.clear();
    }
}

/**
 * 获取积分服务实例
 * 这是推荐的获取积分服务的方式，确保服务可用性
 * @returns 积分服务实例
 * @throws 如果服务注册器未初始化或积分服务不可用
 */
export function getScoreServiceOrThrow(): IScoreService {
    const registry = ServiceRegistry.instance;
    if (!registry) {
        throw new Error('ServiceRegistry 未初始化，请确保 score-core 插件已正确加载');
    }

    const scoreService = registry.getScoreService();
    if (!scoreService) {
        throw new Error('积分核心服务不可用，请检查服务注册状态');
    }

    return scoreService;
}
