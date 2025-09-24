/* eslint-disable max-len */
import { getScoreService, ServiceRegistry } from '@tivonfeng/score-core';
import {
    Context,
    Schema,
} from 'hydrooj';
import {
    TransferAdminHandler,
    TransferCreateHandler,
    TransferExchangeHandler,
    TransferHistoryHandler,
} from './src/handlers/TransferHandlers';
import { TransferService } from './src/services/TransferService';

// 转账系统配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用转账系统'),
    minTransferAmount: Schema.number().default(1).description('最小转账金额'),
    maxTransferAmount: Schema.number().default(1000).description('最大转账金额'),
    transferFeeRate: Schema.number().default(0).description('转账手续费率 (0-1)'),
    dailyTransferLimit: Schema.number().default(5000).description('每日转账限额'),
    enableTransferFee: Schema.boolean().default(false).description('是否启用转账手续费'),
});

// 转账配置接口
export interface TransferConfig {
    enabled: boolean;
    minTransferAmount: number;
    maxTransferAmount: number;
    transferFeeRate: number;
    dailyTransferLimit: number;
    enableTransferFee: boolean;
}

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        'transfer.records': import('./src/services/TransferService').TransferRecord;
    }
}

// 插件主函数
export default async function apply(ctx: Context, config: any = {}) {
    // 设置默认配置
    const defaultConfig: TransferConfig = {
        enabled: true,
        minTransferAmount: 1,
        maxTransferAmount: 1000,
        transferFeeRate: 0,
        dailyTransferLimit: 5000,
        enableTransferFee: false,
    };

    const finalConfig = { ...defaultConfig, ...config };

    if (!finalConfig.enabled) {
        console.log('[Score Transfer] ⚠️ 转账系统已禁用');
        return;
    }

    console.log('[Score Transfer] 💸 转账系统加载中...');

    // 检查积分核心服务是否可用
    const scoreService = getScoreService();
    if (!scoreService) {
        console.error('[Score Transfer] ❌ 积分核心服务未找到，请确保 @tivonfeng/score-system/score-core 插件已加载');
        return;
    }

    // 初始化转账服务
    const transferService = new TransferService(finalConfig, ctx, scoreService);

    // 将转账服务注册到服务注册器
    const serviceRegistry = ServiceRegistry.getInstance();
    serviceRegistry.register('transfer', transferService);

    // 注册路由
    ctx.Route('transfer_exchange', '/score/transfer', TransferExchangeHandler);
    ctx.Route('transfer_create', '/score/transfer/create', TransferCreateHandler);
    ctx.Route('transfer_history', '/score/transfer/history', TransferHistoryHandler);
    ctx.Route('transfer_admin', '/score/transfer/admin', TransferAdminHandler);

    // 监听积分变更事件（用于转账统计）
    ctx.on('score/change', (data) => {
        if (data.reason.includes('转账')) {
            console.log(`[Score Transfer] 💰 转账记录: ${data.reason}`);
        }
    });

    // 监听积分不足事件（转账失败时触发）
    ctx.on('score/insufficient', (data) => {
        if (data.action.includes('转账')) {
            console.log(`[Score Transfer] ⚠️ 转账失败: 用户 ${data.uid} 积分不足 (需要${data.required}, 当前${data.current})`);
        }
    });

    console.log('[Score Transfer] ✅ 转账系统加载完成！');
    console.log(`[Score Transfer] 📊 配置: 转账范围${finalConfig.minTransferAmount}-${finalConfig.maxTransferAmount}积分, 手续费${finalConfig.enableTransferFee ? `${finalConfig.transferFeeRate * 100}%` : '无'}`);
}

// 导出配置Schema
export { Config };
