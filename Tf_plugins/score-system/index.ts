// 立即输出，确保模块被加载
import {
    Context,
    db,
    PRIV,
    ProblemDoc,
    ProblemModel,
    RecordDoc,
    RecordModel,
    Schema,
    STATUS,
} from 'hydrooj';
// 导入处理器
import {
    CheckInHandler,
    DiceAdminHandler,
    DiceGameHandler,
    DiceHistoryHandler,
    DicePlayHandler,
    DiceStatusHandler,
    LotteryGameHandler,
    LotteryHistoryHandler,
    LotteryPlayHandler,
    LotteryStatusHandler,
    MyPrizesApiHandler,
    MyPrizesHandler,
    RedemptionAdminHandler,
    RedemptionCancelApiHandler,
    RedemptionHistoryApiHandler,
    RedemptionListApiHandler,
    RedemptionRedeemApiHandler,
    RedEnvelopeClaimHandler,
    RedEnvelopeCreateHandler,
    RedEnvelopeDetailHandler,
    RedEnvelopeHallPageHandler,
    RedEnvelopeListHandler,
    RedEnvelopeMyClaimedHandler,
    RedEnvelopeMySentHandler,
    RedEnvelopeStatsHandler,
    RedEnvelopeWSHandler,
    RPSGameHandler,
    RPSHistoryHandler,
    RPSPlayHandler,
    RPSStatusHandler,
    ScoreHallHandler,
    ScoreManageHandler,
    ScoreRankingHandler,
    ScoreRecordsHandler,
    ThinkingTimeHandler, TransferAdminHandler,
    TransferCreateHandler,
    TransferHistoryHandler,
    UserScoreHandler, WalletHandler } from './src/handlers';
import { ScoreConfig } from './src/handlers/config';
// 导入服务层
import {
    CheckInService,
    type DailyCheckInRecord,
    DailyGameLimitService,
    type DiceGameRecord,
    DiceGameService,
    LotteryGameRecord,
    LotteryRedemptionService,
    LotteryService,
    RedEnvelopeService,
    type RPSGameRecord,
    RPSGameService,
    ScoreCategory,
    type ScoreRecord,
    StatisticsService,
    ThinkingTimeService,
    type TransferRecord,
    TransferService,
    type UserCheckInStats,
    type UserDiceStats,
    UserLotteryStats,
    type UserRPSStats,
    type UserScore,
} from './src/services';

// 积分系统配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用积分系统'),
});

// 声明数据库集合类型和事件类型
declare module 'hydrooj' {
    interface Collections {
        'score.records': ScoreRecord;
        'score.users': UserScore;
        'dice.records': DiceGameRecord;
        'dice.stats': UserDiceStats;
        'lottery.records': LotteryGameRecord;
        'lottery.stats': UserLotteryStats;
        'rps.records': RPSGameRecord;
        'rps.stats': UserRPSStats;
        'transfer.records': TransferRecord;
        'checkin.records': DailyCheckInRecord;
        'checkin.stats': UserCheckInStats;
    }

    interface Context {
        scoreCore?: any;
        qiniuCore?: any;
        checkInService?: import('./src/services/CheckInService').CheckInService;
        diceGameService?: import('./src/services/DiceGameService').DiceGameService;
        dailyGameLimitService?: import('./src/services/DailyGameLimitService').DailyGameLimitService;
        rpsGameService?: import('./src/services/RPSGameService').RPSGameService;
        lotteryService?: import('./src/services/LotteryService').LotteryService;
        lotteryRedemptionService?: import('./src/services/LotteryRedemptionService').LotteryRedemptionService;
        transferService?: import('./src/services/TransferService').TransferService;
        redEnvelopeService?: import('./src/services/RedEnvelopeService').RedEnvelopeService;
        thinkingTimeService?: import('./src/services/ThinkingTimeService').ThinkingTimeService;
        statisticsService?: import('./src/services/StatisticsService').StatisticsService;
    }
}

// 插件主函数
export default async function apply(ctx: Context, config: any = {}) {
    console.log('🚀 SCORE-SYSTEM: Plugin apply function called!');

    // 设置默认配置
    const defaultConfig: ScoreConfig = {
        enabled: true,
    };

    const finalConfig = { ...defaultConfig, ...config };

    console.log('📋 SCORE-SYSTEM: Config loaded:', finalConfig);
    console.log('🔧 SCORE-SYSTEM: Starting full initialization...');

    // 创建核销相关数据库索引
    try {
        // lottery.records 集合索引
        try {
            await ctx.db.collection('lottery.records' as any).createIndex(
                { domainId: 1, prizeType: 1, redeemStatus: 1 },
                { name: 'lottery_records_domain_prize_status' },
            );
        } catch (indexError: any) {
            // 如果索引已存在但名称不同，尝试重命名或忽略
            if (indexError.code === 85 || indexError.message?.includes('Index already exists')) {
                console.log('[Score System] ✅ Lottery records index already exists, skipping creation');
            } else {
                throw indexError;
            }
        }

        // transfer.records 集合索引
        try {
            await ctx.db.collection('transfer.records' as any).createIndex(
                { fromUid: 1, toUid: 1, createdAt: -1 },
                { name: 'transfer_records_users_time' },
            );
        } catch (indexError: any) {
            if (indexError.code === 85 || indexError.message?.includes('Index already exists')) {
                console.log('[Score System] ✅ Transfer records time index already exists, skipping creation');
            } else {
                throw indexError;
            }
        }

        try {
            await ctx.db.collection('transfer.records' as any).createIndex(
                { transactionId: 1 },
                { name: 'transfer_records_transaction', unique: true },
            );
        } catch (indexError: any) {
            if (indexError.code === 85 || indexError.message?.includes('Index already exists')) {
                console.log('[Score System] ✅ Transfer records transaction index already exists, skipping creation');
            } else {
                throw indexError;
            }
        }

        console.log('[Score System] ✅ Database indexes created');
    } catch (error) {
        console.warn('[Score System] ⚠️ Failed to create indexes:', error);
    }

    // 注册积分相关事件监听器
    if (finalConfig.enabled) {
        // 通过 ctx.inject 声明对 scoreCore 的依赖
        // Cordis 的 ctx.inject 会创建子 fiber，子 fiber 的 ctx 能访问被注入的服务
        // 因此将路由注册和事件监听都放在 inject 回调内，确保 Handler 中 this.ctx.scoreCore 可用
        ctx.inject(['scoreCore'], (ctx2: Context) => {
            console.log('[Score System] ✅ scoreCore injected, registering routes');

            // 注册服务单例
            const checkInService = new CheckInService(ctx2);
            const diceGameService = new DiceGameService(ctx2);
            const dailyGameLimitService = new DailyGameLimitService(ctx2);
            const rpsGameService = new RPSGameService(ctx2);
            const lotteryService = new LotteryService(ctx2);
            const lotteryRedemptionService = new LotteryRedemptionService(ctx2);
            const transferService = new TransferService(ctx2);
            const thinkingTimeService = new ThinkingTimeService(ctx2);
            const statisticsService = new StatisticsService(ctx2);

            ctx2.provide('checkInService', checkInService);
            ctx2.provide('diceGameService', diceGameService);
            ctx2.provide('dailyGameLimitService', dailyGameLimitService);
            ctx2.provide('rpsGameService', rpsGameService);
            ctx2.provide('lotteryService', lotteryService);
            ctx2.provide('lotteryRedemptionService', lotteryRedemptionService);
            ctx2.provide('transferService', transferService);
            ctx2.provide('thinkingTimeService', thinkingTimeService);
            ctx2.provide('statisticsService', statisticsService);

            // 在插件内注册系统设置：score.max_daily_plays（仅当 model.setting 可用时）
            try {
                const settingModel = (global as any).Hydro?.model?.setting;
                if (settingModel && typeof settingModel.SystemSetting === 'function' && typeof settingModel.Setting === 'function') {
                    settingModel.SystemSetting(
                        settingModel.Setting(
                            'setting_score',
                            'score.max_daily_plays',
                            10,
                            'number',
                            'score.max_daily_plays',
                            'Maximum daily plays for score system games',
                        ),
                    );
                    console.log('[Score System] ✅ Registered system setting: score.max_daily_plays');
                } else {
                    console.warn('[Score System] ⚠️ setting model not available; cannot register system settings locally');
                }
            } catch (e) {
                console.warn('[Score System] ⚠️ Failed to register system setting:', e);
            }
            // 题目AC事件监听
            ctx2.on('record/judge', async (rdoc: RecordDoc, _updated: boolean, pdoc?: ProblemDoc) => {
                try {
                    if (!pdoc) return;
                    if (rdoc.status !== STATUS.STATUS_ACCEPTED) return;

                    const scoreToAward = 20;
                    let isFirstAC = false;
                    let awardedScore = 0;

                    const currentScoreCore = ctx2.scoreCore!;
                    if (currentScoreCore) {
                        const result = await currentScoreCore.awardIfFirstAC({
                            uid: rdoc.uid,
                            pid: rdoc.pid,
                            domainId: rdoc.domainId,
                            recordId: rdoc._id,
                            score: scoreToAward,
                            reason: `AC题目 ${pdoc.title || rdoc.pid} 获得积分`,
                            category: ScoreCategory.AC_PROBLEM,
                            title: pdoc.title,
                        });
                        isFirstAC = result.isFirstAC;
                        awardedScore = result.awarded;

                        // Broadcast an augmented record/change event so frontends can show accurate first-AC/score info.
                        try {
                            const broadcastRdoc = {
                                ...rdoc,
                                scoreAwardInfo: {
                                    isFirstAC,
                                    awardedScore,
                                },
                            };
                            // Use ctx2.broadcast to propagate through the system event bus
                            (ctx2 as any).broadcast('record/change', broadcastRdoc);
                            console.log(`[Score System] 🔔 broadcasted record/change with scoreAwardInfo for rid ${rdoc._id}`);
                        } catch (e) {
                            console.warn('[Score System] ⚠️ Failed to broadcast scoreAwardInfo:', e);
                        }

                        if (isFirstAC) {
                            console.log(`[Score System] ✅ User ${rdoc.uid} first AC problem ${rdoc.pid}`,
                                `(${pdoc.title}), awarded ${awardedScore} points via scoreCore`);
                        } else {
                            console.log(`[Score System] 🔄 User ${rdoc.uid} repeated AC problem ${rdoc.pid}, no points awarded via scoreCore`);
                        }
                    } else {
                        console.warn('[Score System] ❌ scoreCore not available, skipping AC reward');
                    }
                } catch (error) {
                    console.error('[Score System] ❌ Error in record/judge event:', error);
                }
            });

            // 注册处理器路由
            ctx2.Route('score_manage', '/score/manage', ScoreManageHandler);
            ctx2.Route('score_records', '/score/records', ScoreRecordsHandler);
            ctx2.Route('score_ranking', '/score/ranking', ScoreRankingHandler);
            ctx2.Route('user_score', '/score/me', UserScoreHandler);
            ctx2.Route('score_hall', '/score/hall', ScoreHallHandler);

            // 游戏相关路由
            ctx2.Route('dice_game', '/dice/play', DiceGameHandler);
            ctx2.Route('dice_status', '/dice/status', DiceStatusHandler);
            ctx2.Route('dice_play', '/dice/do', DicePlayHandler);
            ctx2.Route('dice_history', '/dice/history', DiceHistoryHandler);
            ctx2.Route('dice_admin', '/dice/admin', DiceAdminHandler, PRIV.PRIV_MANAGE_ALL_DOMAIN);

            ctx2.Route('rps_game', '/rps/play', RPSGameHandler);
            ctx2.Route('rps_status', '/rps/status', RPSStatusHandler);
            ctx2.Route('rps_play', '/rps/do', RPSPlayHandler);
            ctx2.Route('rps_history', '/rps/history', RPSHistoryHandler);

            ctx2.Route('lottery_game', '/lottery/play', LotteryGameHandler);
            ctx2.Route('lottery_status', '/lottery/status', LotteryStatusHandler);
            ctx2.Route('lottery_play', '/lottery/do', LotteryPlayHandler);
            ctx2.Route('lottery_history', '/lottery/history', LotteryHistoryHandler);

            // 九宫格抽奖核销路由
            ctx2.Route('my_prizes', '/lottery/my-prizes', MyPrizesHandler);
            ctx2.Route('my_prizes_api', '/lottery/my-prizes/api', MyPrizesApiHandler);
            ctx2.Route('redemption_admin', '/score/lottery/admin/redeem', RedemptionAdminHandler);
            ctx2.Route('redemption_list_api', '/score/lottery/admin/redeem/list', RedemptionListApiHandler);
            ctx2.Route('redemption_redeem_api', '/score/lottery/admin/redeem/redeem', RedemptionRedeemApiHandler);
            ctx2.Route('redemption_cancel_api', '/score/lottery/admin/redeem/cancel', RedemptionCancelApiHandler);
            ctx2.Route('redemption_history_api', '/score/lottery/admin/redeem/history', RedemptionHistoryApiHandler);

            ctx2.Route('wallet', '/wallet', WalletHandler);
            ctx2.Route('transfer_create', '/score/transfer/create', TransferCreateHandler);
            ctx2.Route('transfer_history', '/score/transfer/history', TransferHistoryHandler);
            ctx2.Route('transfer_admin', '/score/transfer/admin', TransferAdminHandler);

            ctx2.Route('checkin', '/score/checkin', CheckInHandler);

            // 红包相关路由
            ctx2.Route('red_envelope_hall', '/score/red-envelope/hall', RedEnvelopeHallPageHandler);
            ctx2.Route('red_envelope_create', '/score/red-envelope/create', RedEnvelopeCreateHandler);
            ctx2.Route('red_envelope_list', '/score/red-envelope/list', RedEnvelopeListHandler);
            ctx2.Route('red_envelope_claim', '/score/red-envelope/:envelopeId/claim', RedEnvelopeClaimHandler);
            ctx2.Route('red_envelope_detail', '/score/red-envelope/:envelopeId', RedEnvelopeDetailHandler);
            ctx2.Route('red_envelope_my_sent', '/score/red-envelope/my/sent', RedEnvelopeMySentHandler);
            ctx2.Route('red_envelope_my_claimed', '/score/red-envelope/my/claimed', RedEnvelopeMyClaimedHandler);
            ctx2.Route('red_envelope_stats', '/score/red-envelope/stats', RedEnvelopeStatsHandler);

            // 注册红包 WebSocket 路由
            ctx2.Connection(
                'red_envelope_ws',
                '/ws/red-envelope',
                RedEnvelopeWSHandler,
            );

            // 红包过期检查定时任务（每分钟执行一次）
            // 确保只在主实例执行，避免分布式环境下重复执行
            if (process.env.NODE_APP_INSTANCE === '0' && !process.env.HYDRO_CLI) {
                ctx2.effect(() => ctx2.setInterval(async () => {
                    try {
                        const service = new RedEnvelopeService(ctx2, ctx2.domain?._id || 'default');
                        const result = await service.checkAndExpireWithRefund();
                        if (result.expired > 0) {
                            console.log(
                                `[RedEnvelope] 定时任务：处理了 ${result.expired} 个过期红包，`
                                + `退回 ${result.refunded} 个，共 ${result.totalRefundedAmount} 积分`,
                            );
                        }
                    } catch (error) {
                        console.error('[RedEnvelope] 定时任务执行失败:', error);
                    }
                }, 60000)); // 60秒
            }

            // 思考时间记录接口（来自 confetti-thinking-time 插件）
            try {
                ctx2.Route('thinking_time', '/thinking-time', ThinkingTimeHandler);
                console.log('[Score System] ✅ thinking-time route registered');
            } catch (e) {
                console.warn('[Score System] ⚠️ Failed to register thinking-time route:', e);
            }

            // 注入导航栏 - 添加权限检查，只有内部用户可见
            ctx2.injectUI('Nav', 'score_hall', {
                prefix: 'score',
                before: 'ranking', // 插入到排行榜前面
            }, PRIV.PRIV_USER_PROFILE);

            console.log('[Score System] ✅ All routes registered');
        });
    }

    ctx.on('app/started' as any, async () => {
        try {
            if (RecordModel && RecordModel.PROJECTION_LIST) {
                if (!RecordModel.PROJECTION_LIST.includes('thinkingTime' as any)) {
                    RecordModel.PROJECTION_LIST.push('thinkingTime' as any);
                    console.log('✅ 已添加 thinkingTime 到 RecordModel PROJECTION_LIST');
                }
            } else {
                console.warn('⚠️ 无法找到 RecordModel 或 PROJECTION_LIST');
            }

            if (ProblemModel) {
                const projectionLists = ['PROJECTION_LIST', 'PROJECTION_PUBLIC', 'PROJECTION_CONTEST_LIST'];
                for (const listName of projectionLists) {
                    if (ProblemModel[listName] && Array.isArray(ProblemModel[listName])) {
                        if (!ProblemModel[listName].includes('thinkingTimeStats' as any)) {
                            ProblemModel[listName].push('thinkingTimeStats' as any);
                            console.log(`✅ 已添加 thinkingTimeStats 到 ProblemModel.${listName}`);
                        }
                    }
                }
            } else {
                console.warn('⚠️ 无法找到 ProblemModel');
            }

            const recordColl = db.collection('record');

            await recordColl.createIndex(
                { uid: 1, domainId: 1, thinkingTime: 1 },
                {
                    name: 'thinking_time_user_stats',
                    background: true,
                    sparse: true,
                },
            );

            await recordColl.createIndex(
                { pid: 1, domainId: 1, thinkingTime: 1 },
                {
                    name: 'thinking_time_problem_stats',
                    background: true,
                    sparse: true,
                },
            );

            console.log('✅ 思考时间插件索引创建成功');

            // 创建红包相关数据库索引
            try {
                const service = new RedEnvelopeService(ctx);
                await service.createIndexes();
                console.log('✅ 红包插件索引创建成功');
            } catch (error) {
                console.warn('⚠️ 红包插件索引创建失败:', error);
            }
        } catch (error) {
            console.warn('⚠️ 思考时间插件索引创建失败:', error);
        }
    });

    console.log('[Score System] 🎉 Score system plugin loaded successfully');
}

// 导出配置Schema
export { Config };
