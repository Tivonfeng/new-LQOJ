/**
 * 服务注册器
 * 用于插件间服务共享和依赖注入
 */

import type { Context } from 'hydrooj';
import type { IScoreService } from '../interfaces/IScoreService';

// 服务注册表
const services = new Map<string, any>();

export class ServiceRegistry {
    private static instance: ServiceRegistry;
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
        this.register('score', service);
    }

    /**
     * 清理所有服务（用于测试）
     */
    clear(): void {
        services.clear();
    }
}

// 便捷的全局访问方法
export function getScoreService(): IScoreService | null {
    const registry = ServiceRegistry.getInstance();
    return registry ? registry.getScoreService() : null;
}

// 服务常量
export const SERVICE_NAMES = {
    SCORE: 'score',
    LOTTERY: 'lottery',
    TRANSFER: 'transfer',
    CHECKIN: 'checkin',
    GAMES: 'games',
} as const;
