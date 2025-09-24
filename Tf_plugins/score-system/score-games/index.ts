import { getScoreService, ServiceRegistry } from '@tivonfeng/score-core';
import {
    Context,
    Schema,
} from 'hydrooj';
import {
    DiceAdminHandler,
    DiceGameHandler,
    DiceHistoryHandler,
    DicePlayHandler,
} from './src/handlers/DiceGameHandlers';
import {
    RPSAdminHandler,
    RPSGameHandler,
    RPSHistoryHandler,
    RPSPlayHandler,
} from './src/handlers/RPSHandlers';
import { DailyGameLimitService } from './src/services/DailyGameLimitService';
import { DiceGameService } from './src/services/DiceGameService';
import { RPSGameService } from './src/services/RPSGameService';

// 游戏系统配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用游戏系统'),
    diceEnabled: Schema.boolean().default(true).description('是否启用掷骰子游戏'),
    rpsEnabled: Schema.boolean().default(true).description('是否启用剪刀石头布游戏'),
    diceCost: Schema.number().default(10).description('掷骰子游戏费用'),
    rpsCost: Schema.number().default(5).description('剪刀石头布游戏费用'),
    maxWinMultiplier: Schema.number().default(5).description('最大获胜倍数'),
    dailyGameLimit: Schema.number().default(50).description('每日游戏次数限制'),
});

// 游戏配置接口
export interface GamesConfig {
    enabled: boolean;
    diceEnabled: boolean;
    rpsEnabled: boolean;
    diceCost: number;
    rpsCost: number;
    maxWinMultiplier: number;
    dailyGameLimit: number;
}

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        'dice.records': import('./src/services/DiceGameService').DiceGameRecord;
        'dice.stats': import('./src/services/DiceGameService').UserDiceStats;
        'rps.records': import('./src/services/RPSGameService').RPSGameRecord;
        'rps.stats': import('./src/services/RPSGameService').UserRPSStats;
        'daily_game_limits': import('./src/services/DailyGameLimitService').DailyGameLimit;
    }
}

// 插件主函数
export default async function apply(ctx: Context, config: any = {}) {
    // 设置默认配置
    const defaultConfig: GamesConfig = {
        enabled: true,
        diceEnabled: true,
        rpsEnabled: true,
        diceCost: 10,
        rpsCost: 5,
        maxWinMultiplier: 5,
        dailyGameLimit: 50,
    };

    const finalConfig = { ...defaultConfig, ...config };

    if (!finalConfig.enabled) {
        console.log('[Score Games] ⚠️ 游戏系统已禁用');
        return;
    }

    console.log('[Score Games] 🎮 游戏系统加载中...');

    // 检查积分核心服务是否可用
    const scoreService = getScoreService();
    if (!scoreService) {
        console.error('[Score Games] ❌ 积分核心服务未找到，请确保 ../score-core 插件已加载');
        return;
    }

    // 初始化服务
    const gameLimitService = new DailyGameLimitService(ctx);

    let diceService: DiceGameService | null = null;
    let rpsService: RPSGameService | null = null;

    // 将服务注册到服务注册器
    const serviceRegistry = ServiceRegistry.getInstance();

    if (finalConfig.diceEnabled) {
        diceService = new DiceGameService(finalConfig, ctx, scoreService, gameLimitService);
        serviceRegistry.register('dice', diceService);

        // 注册掷骰子游戏路由
        ctx.Route('dice_game', '/score/dice', DiceGameHandler);
        ctx.Route('dice_play', '/score/dice/play', DicePlayHandler);
        ctx.Route('dice_history', '/score/dice/history', DiceHistoryHandler);
        ctx.Route('dice_admin', '/score/dice/admin', DiceAdminHandler);

        console.log('[Score Games] 🎲 掷骰子游戏已启用');
    }

    if (finalConfig.rpsEnabled) {
        rpsService = new RPSGameService(ctx, scoreService);
        serviceRegistry.register('rps', rpsService);

        // 注册剪刀石头布游戏路由
        ctx.Route('rock_paper_scissors', '/score/rps', RPSGameHandler);
        ctx.Route('rps_play', '/score/rps/play', RPSPlayHandler);
        ctx.Route('rps_history', '/score/rps/history', RPSHistoryHandler);
        ctx.Route('rps_admin', '/score/rps/admin', RPSAdminHandler);

        console.log('[Score Games] ✂️ 剪刀石头布游戏已启用');
    }

    // 注册游戏限制服务
    serviceRegistry.register('gameLimit', gameLimitService);

    // 监听积分变更事件（用于游戏统计）
    ctx.on('score/change', (data) => {
        if (data.reason.includes('掷骰子') || data.reason.includes('剪刀石头布')) {
            console.log(`[Score Games] 🎮 游戏结果: ${data.reason}`);
        }
    });

    // 监听积分不足事件（游戏失败时触发）
    ctx.on('score/insufficient', (data) => {
        if (data.action.includes('游戏')) {
            console.log(`[Score Games] ⚠️ 游戏失败: 用户 ${data.uid} 积分不足 (需要${data.required}, 当前${data.current})`);
        }
    });

    console.log('[Score Games] ✅ 游戏系统加载完成！');
    console.log(`[Score Games] 📊 配置: 掷骰子${finalConfig.diceCost}积分, 剪刀石头布${finalConfig.rpsCost}积分, 每日限制${finalConfig.dailyGameLimit}次`);
}

// 导出配置Schema
export { Config };
