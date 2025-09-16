import {
    Context,
    ProblemDoc,
    RecordDoc,
    Schema,
    STATUS,
} from 'hydrooj';
// 导入处理器
import {
    CheckFirstACHandler,
    CheckInHandler,
    DiceAdminHandler,
    DiceGameHandler,
    DiceHistoryHandler,
    DicePlayHandler,
    LotteryAdminHandler,
    LotteryClaimHandler,
    LotteryDrawHandler,
    LotteryHallHandler,
    LotteryHistoryHandler,
    RPSAdminHandler,
    RPSGameHandler,
    RPSHistoryHandler,
    RPSPlayHandler,
    ScoreHallHandler,
    ScoreManageHandler,
    ScoreRankingHandler,
    ScoreRecordsHandler,
    TransferAdminHandler,
    TransferCreateHandler,
    TransferExchangeHandler,
    TransferHistoryHandler,
    UserScoreHandler } from './src/handlers';
// 导入服务层
import {
    type DailyCheckInRecord,
    type DiceGameRecord,
    type LotteryPrize,
    type LotteryRecord,
    type RPSGameRecord,
    type ScoreConfig,
    type ScoreRecord,
    ScoreService,
    type TransferRecord,
    type UserCheckInStats,
    type UserDiceStats,
    type UserLotteryStats,
    type UserRPSStats,
    type UserScore,
} from './src/services';

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
        'transfer.records': TransferRecord;
        'checkin.records': DailyCheckInRecord;
        'checkin.stats': UserCheckInStats;
    }
}

// 插件主函数
export default function apply(ctx: Context, config: any = {}) {
    // 设置默认配置
    const defaultConfig: ScoreConfig = {
        enabled: true,
    };

    const finalConfig = { ...defaultConfig, ...config };

    console.log('Score System plugin loading...');
    const scoreService = new ScoreService(finalConfig, ctx);

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

    // 注册路由
    ctx.Route('score_manage', '/score/manage', ScoreManageHandler);
    ctx.Route('score_ranking', '/score/ranking', ScoreRankingHandler);
    ctx.Route('score_records', '/score/records', ScoreRecordsHandler);
    ctx.Route('user_score', '/score/me', UserScoreHandler);
    ctx.Route('score_hall', '/score/hall', ScoreHallHandler);
    ctx.Route('check_first_ac', '/score/check-first-ac', CheckFirstACHandler);

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

    // 转账系统路由
    ctx.Route('transfer_exchange', '/score/transfer', TransferExchangeHandler);
    ctx.Route('transfer_create', '/score/transfer/create', TransferCreateHandler);
    ctx.Route('transfer_history', '/score/transfer/history', TransferHistoryHandler);
    ctx.Route('transfer_admin', '/score/transfer/admin', TransferAdminHandler);

    // 签到系统路由
    ctx.Route('daily_checkin', '/score/checkin', CheckInHandler);

    // 注入导航栏
    ctx.injectUI('Nav', 'score_hall', {
        prefix: 'score',
        before: 'ranking', // 插入到排行榜前面
    });
    console.log('Score System plugin loaded successfully!');
}

// 导出配置Schema
export { Config };
