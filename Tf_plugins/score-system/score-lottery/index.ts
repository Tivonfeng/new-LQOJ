import {
    Context,
    Schema,
} from 'hydrooj';
import { getScoreServiceOrThrow, ServiceRegistry } from '../score-core';

// 抽奖系统配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用抽奖系统'),
    basicLotteryCost: Schema.number().default(50).description('基础抽奖费用'),
    premiumLotteryCost: Schema.number().default(200).description('高级抽奖费用'),
    dailyLotteryLimit: Schema.number().default(20).description('每日抽奖次数限制'),
    enableWeightCalculation: Schema.boolean().default(true).description('是否启用权重计算'),
});

// 抽奖配置接口
export interface LotteryConfig {
    enabled: boolean;
    basicLotteryCost: number;
    premiumLotteryCost: number;
    dailyLotteryLimit: number;
    enableWeightCalculation: boolean;
}

// 插件主函数
export default async function apply(ctx: Context, config: any = {}) {
    const defaultConfig: LotteryConfig = {
        enabled: true,
        basicLotteryCost: 50,
        premiumLotteryCost: 200,
        dailyLotteryLimit: 20,
        enableWeightCalculation: true,
    };

    const finalConfig = { ...defaultConfig, ...config };

    if (!finalConfig.enabled) {
        console.log('[Score Lottery] ⚠️ 抽奖系统已禁用');
        return;
    }

    console.log('[Score Lottery] 🎰 抽奖系统加载中...');

    // 检查积分核心服务是否可用
    const scoreService = getScoreServiceOrThrow();

    // TODO: 初始化抽奖服务和路由
    // const lotteryService = new LotteryService(finalConfig, ctx, scoreService);
    // serviceRegistry.register('lottery', lotteryService);

    console.log('[Score Lottery] ✅ 抽奖系统加载完成！');
    console.log(`[Score Lottery] 📊 配置: 基础抽奖${finalConfig.basicLotteryCost}积分, 高级抽奖${finalConfig.premiumLotteryCost}积分`);
}

// 导出配置Schema
export { Config };