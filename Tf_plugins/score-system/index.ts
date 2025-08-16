import {
    Context,
    RecordDoc,
    ProblemDoc,
    Schema,
    STATUS,
} from 'hydrooj';

// 导入服务层
import {
    ScoreService,
    type ScoreRecord,
    type UserScore,
    type LotteryPrize,
    type LotteryRecord,
    type UserLotteryStats,
    type ScoreConfig,
    type DiceGameRecord,
    type UserDiceStats,
    type RPSGameRecord,
    type UserRPSStats,
} from './src/services';

// 导入处理器
import {
    ScoreHallHandler,
    ScoreRankingHandler,
    UserScoreHandler,
    ScoreManageHandler,
    LotteryHallHandler,
    LotteryDrawHandler,
    LotteryClaimHandler,
    LotteryHistoryHandler,
    LotteryAdminHandler,
    DiceGameHandler,
    DicePlayHandler,
    DiceHistoryHandler,
    DiceAdminHandler,
    RPSGameHandler,
    RPSPlayHandler,
    RPSHistoryHandler,
    RPSAdminHandler
} from './src/handlers';

// 默认配置已移至各Handler文件中

// 积分系统配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用积分系统'),
});

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        'score.records': ScoreRecord;
        'score.users': UserScore;
        'lottery.prizes': LotteryPrize;
        'lottery.records': LotteryRecord;
        'lottery.stats': UserLotteryStats;
        'dice.records': DiceGameRecord;
        'dice.stats': UserDiceStats;
        'rps.records': RPSGameRecord;
        'rps.stats': UserRPSStats;
    }
}

// 插件主函数
export default function apply(ctx: Context, config: any = {}) {
    // 设置默认配置
    const defaultConfig: ScoreConfig = {
        enabled: true
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    console.log('Score System plugin loading...');
    console.log('Score System config:', JSON.stringify(finalConfig, null, 2));
    
    const scoreService = new ScoreService(finalConfig, ctx);

    // 监听判题完成事件
    console.log('Setting up event listeners...');
    
    // 主要事件监听
    ctx.on('record/judge', async (rdoc: RecordDoc, updated: boolean, pdoc?: ProblemDoc) => {
        try {
            // 只处理AC状态且为首次更新的记录
            if (!finalConfig.enabled || !updated || !pdoc) return;
            if (rdoc.status !== STATUS.STATUS_ACCEPTED) return;

            // 检查是否为首次AC
            const isFirstAC = await scoreService.isFirstAC(rdoc.domainId, rdoc.uid, rdoc.pid);
            if (!isFirstAC) {
                console.log(`[Score System] User ${rdoc.uid} already AC problem ${rdoc.pid}, skipping`);
                return;
            }

            // 计算积分
            const score = scoreService.calculateACScore(isFirstAC);
            if (score <= 0) return;

            // 记录积分
            await scoreService.addScoreRecord({
                uid: rdoc.uid,
                domainId: rdoc.domainId,
                pid: rdoc.pid,
                recordId: rdoc._id,
                score,
                reason: `AC题目 ${pdoc.title || rdoc.pid} 获得积分`,
                problemTitle: pdoc.title,
            });

            // 更新用户总积分
            await scoreService.updateUserScore(rdoc.domainId, rdoc.uid, score);

            console.log(`[Score System] ✅ User ${rdoc.uid} AC problem ${rdoc.pid} (${pdoc.title}), awarded ${score} points`);
        } catch (error) {
            console.error('[Score System] ❌ Error:', error);
        }
    });

    // 事件监听设置完成
    console.log('[Score System] Event listeners registered successfully!');

    // 注册路由
    ctx.Route('score_manage', '/score/manage', ScoreManageHandler);
    ctx.Route('score_ranking', '/score/ranking', ScoreRankingHandler);
    ctx.Route('user_score', '/score/me', UserScoreHandler);
    ctx.Route('score_hall', '/score/hall', ScoreHallHandler);
    
    // 抽奖系统路由
    ctx.Route('lottery_hall', '/score/lottery', LotteryHallHandler);
    ctx.Route('lottery_draw', '/score/lottery/draw', LotteryDrawHandler);
    ctx.Route('lottery_claim', '/score/lottery/claim', LotteryClaimHandler);
    ctx.Route('lottery_history', '/score/lottery/history', LotteryHistoryHandler);
    
    // 管理员路由
    ctx.Route('lottery_admin', '/score/lottery/admin', LotteryAdminHandler);
    
    // 掷骰子游戏路由
    ctx.Route('dice_game', '/score/dice', DiceGameHandler);
    ctx.Route('dice_play', '/score/dice/play', DicePlayHandler);
    ctx.Route('dice_history', '/score/dice/history', DiceHistoryHandler);
    ctx.Route('dice_admin', '/score/dice/admin', DiceAdminHandler);
    
    // 剪刀石头布游戏路由
    ctx.Route('rock_paper_scissors', '/score/rps', RPSGameHandler);
    ctx.Route('rps_play', '/score/rps/play', RPSPlayHandler);
    ctx.Route('rps_history', '/score/rps/history', RPSHistoryHandler);
    ctx.Route('rps_admin', '/score/rps/admin', RPSAdminHandler);

    // 注入导航栏
    ctx.injectUI('Nav', 'score_hall', {
        prefix: 'score',
        before: 'ranking', // 插入到排行榜前面
    });

    console.log('积分大厅路由已注册，可通过 /score/hall 访问');
    console.log('掷骰子游戏路由已注册，可通过 /score/dice 访问');
    console.log('剪刀石头布游戏路由已注册，可通过 /score/rps 访问');

    console.log('Score System plugin loaded successfully!');
}

// 导出配置Schema
export { Config };