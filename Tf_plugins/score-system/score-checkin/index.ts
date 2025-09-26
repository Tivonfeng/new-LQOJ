import { getScoreServiceOrThrow, ServiceRegistry } from '@tivonfeng/score-core';
import {
    Context,
    Schema,
} from 'hydrooj';
import { CheckInHandler } from './src/handlers/CheckInHandlers';
import { CheckInService } from './src/services/CheckInService';

// 签到系统配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用签到系统'),
    dailyReward: Schema.number().default(5).description('每日签到积分奖励'),
    consecutiveBonus: Schema.boolean().default(true).description('是否启用连续签到奖励'),
    maxConsecutiveBonus: Schema.number().default(10).description('连续签到最大奖励倍数'),
});

// 签到配置接口
export interface CheckInConfig {
    enabled: boolean;
    dailyReward: number;
    consecutiveBonus: boolean;
    maxConsecutiveBonus: number;
}

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        'checkin.records': import('./src/services/CheckInService').DailyCheckInRecord;
        'checkin.stats': import('./src/services/CheckInService').UserCheckInStats;
    }
}

// 插件主函数
export default async function apply(ctx: Context, config: any = {}) {
    // 设置默认配置
    const defaultConfig: CheckInConfig = {
        enabled: true,
        dailyReward: 5,
        consecutiveBonus: true,
        maxConsecutiveBonus: 10,
    };

    const finalConfig = { ...defaultConfig, ...config };

    if (!finalConfig.enabled) {
        console.log('[Score CheckIn] ⚠️ 签到系统已禁用');
        return;
    }

    console.log('[Score CheckIn] 📅 签到系统加载中...');

    // 检查积分核心服务是否可用
    const scoreService = getScoreServiceOrThrow();
    if (!scoreService) {
        console.error('[Score CheckIn] ❌ 积分核心服务未找到，请确保 score-core 插件已加载');
        return;
    }

    // 初始化签到服务
    const checkinService = new CheckInService(finalConfig, ctx, scoreService);

    // 将签到服务注册到服务注册器
    const serviceRegistry = ServiceRegistry.getInstance();
    serviceRegistry.register('checkin', checkinService);

    // 注册路由
    ctx.Route('daily_checkin', '/score/checkin', CheckInHandler);
    console.log('[Score CheckIn] ✅ 签到系统加载完成！');
    console.log(`[Score CheckIn] 📊 配置: 每日奖励${finalConfig.dailyReward}积分, 连续奖励${finalConfig.consecutiveBonus ? '启用' : '禁用'}`);
}

// 导出配置Schema
export { Config };
