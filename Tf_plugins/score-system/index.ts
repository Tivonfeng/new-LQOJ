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
    type DailyCheckInRecord,
    type DiceGameRecord,
    LotteryGameRecord,
    type RPSGameRecord,
    ScoreCategory,
    type ScoreRecord,
    type TransferRecord,
    type UserCheckInStats,
    type UserDiceStats,
    UserLotteryStats,
    type UserRPSStats,
    type UserScore,
} from './src/services';

// 【关键】初始化 WebSocket 客户端 Map，确保在模块加载时就创建
// 使用 global 并保存直接引用，确保热重载时不会丢失
const WS_CLIENTS_KEY = 'hydro_redEnvelope_wsClients';
let wsClientsMap: Map<string, any> | null = null;

// 在 global 上保存引用的同时保存本地变量
if (!(global as any)[WS_CLIENTS_KEY]) {
    wsClientsMap = new Map();
    (global as any)[WS_CLIENTS_KEY] = wsClientsMap;
    console.log('[Score System] WebSocket 客户端 Map 已初始化');
} else {
    wsClientsMap = (global as any)[WS_CLIENTS_KEY];
    console.log('[Score System] 使用已有的 WebSocket 客户端 Map');
}

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

    // 通过 inject 获取 scoreCore 服务并存储到 global
    try {
        if (typeof ctx.inject === 'function') {
            ctx.inject(['scoreCore'], ({ scoreCore }: any) => {
                (global as any).scoreCoreService = scoreCore;
                if (scoreCore) {
                    console.log('[Score System] ✅ scoreCore service injected to global');
                } else {
                    console.warn('[Score System] ⚠️ scoreCore service injected but is null');
                }
            });
        } else if ((ctx as any).scoreCore) {
            (global as any).scoreCoreService = (ctx as any).scoreCore;
            console.log('[Score System] ✅ scoreCore service available via ctx');
        } else {
            console.warn('[Score System] ⚠️ ctx.inject not available and ctx.scoreCore not found');
        }
    } catch (e) {
        console.warn('[Score System] ⚠️ Failed to inject scoreCore:', e);
    }

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
        ctx.on('record/judge', async (rdoc: RecordDoc, _updated: boolean, pdoc?: ProblemDoc) => {
            try {
                if (!pdoc) return;
                if (rdoc.status !== STATUS.STATUS_ACCEPTED) return;

                const scoreToAward = 20;
                let isFirstAC = false;
                let awardedScore = 0;

                // 使用 global 中的 scoreCore 服务
                const currentScoreCore = (global as any).scoreCoreService;
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
                        // Use ctx.broadcast to propagate through the system event bus
                        (ctx as any).broadcast('record/change', broadcastRdoc);
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
                    console.warn('[Score System] ❌ cachedScoreCore not available, skipping AC reward');
                }
            } catch (error) {
                console.error('[Score System] ❌ Error in record/judge event:', error);
            }
        });

        // 注册处理器路由
        ctx.Route('score_manage', '/score/manage', ScoreManageHandler);
        ctx.Route('score_records', '/score/records', ScoreRecordsHandler);
        ctx.Route('score_ranking', '/score/ranking', ScoreRankingHandler);
        ctx.Route('user_score', '/score/me', UserScoreHandler);
        ctx.Route('score_hall', '/score/hall', ScoreHallHandler);

        // 游戏相关路由
        ctx.Route('dice_game', '/dice/play', DiceGameHandler);
        ctx.Route('dice_status', '/dice/status', DiceStatusHandler);
        ctx.Route('dice_play', '/dice/do', DicePlayHandler);
        ctx.Route('dice_history', '/dice/history', DiceHistoryHandler);
        ctx.Route('dice_admin', '/dice/admin', DiceAdminHandler, PRIV.PRIV_MANAGE_ALL_DOMAIN);

        ctx.Route('rps_game', '/rps/play', RPSGameHandler);
        ctx.Route('rps_status', '/rps/status', RPSStatusHandler);
        ctx.Route('rps_play', '/rps/do', RPSPlayHandler);
        ctx.Route('rps_history', '/rps/history', RPSHistoryHandler);

        ctx.Route('lottery_game', '/lottery/play', LotteryGameHandler);
        ctx.Route('lottery_status', '/lottery/status', LotteryStatusHandler);
        ctx.Route('lottery_play', '/lottery/do', LotteryPlayHandler);
        ctx.Route('lottery_history', '/lottery/history', LotteryHistoryHandler);

        // 九宫格抽奖核销路由
        ctx.Route('my_prizes', '/lottery/my-prizes', MyPrizesHandler);
        ctx.Route('my_prizes_api', '/lottery/my-prizes/api', MyPrizesApiHandler);
        ctx.Route('redemption_admin', '/score/lottery/admin/redeem', RedemptionAdminHandler);
        ctx.Route('redemption_list_api', '/score/lottery/admin/redeem/list', RedemptionListApiHandler);
        ctx.Route('redemption_redeem_api', '/score/lottery/admin/redeem/redeem', RedemptionRedeemApiHandler);
        ctx.Route('redemption_cancel_api', '/score/lottery/admin/redeem/cancel', RedemptionCancelApiHandler);
        ctx.Route('redemption_history_api', '/score/lottery/admin/redeem/history', RedemptionHistoryApiHandler);

        ctx.Route('wallet', '/wallet', WalletHandler);
        ctx.Route('transfer_create', '/score/transfer/create', TransferCreateHandler);
        ctx.Route('transfer_history', '/score/transfer/history', TransferHistoryHandler);
        ctx.Route('transfer_admin', '/score/transfer/admin', TransferAdminHandler);

        ctx.Route('checkin', '/score/checkin', CheckInHandler);

        // 红包相关路由
        ctx.Route('red_envelope_hall', '/score/red-envelope/hall', RedEnvelopeHallPageHandler);
        ctx.Route('red_envelope_create', '/score/red-envelope/create', RedEnvelopeCreateHandler);
        ctx.Route('red_envelope_list', '/score/red-envelope/list', RedEnvelopeListHandler);
        ctx.Route('red_envelope_claim', '/score/red-envelope/:envelopeId/claim', RedEnvelopeClaimHandler);
        ctx.Route('red_envelope_detail', '/score/red-envelope/:envelopeId', RedEnvelopeDetailHandler);
        ctx.Route('red_envelope_my_sent', '/score/red-envelope/my/sent', RedEnvelopeMySentHandler);
        ctx.Route('red_envelope_my_claimed', '/score/red-envelope/my/claimed', RedEnvelopeMyClaimedHandler);
        ctx.Route('red_envelope_stats', '/score/red-envelope/stats', RedEnvelopeStatsHandler);

        // 注册红包 WebSocket 路由
        ctx.Connection(
            'red_envelope_ws',
            '/ws/red-envelope',
            RedEnvelopeWSHandler,
        );

        // 红包过期检查定时任务（每分钟执行一次）
        // 确保只在主实例执行，避免分布式环境下重复执行
        if (process.env.NODE_APP_INSTANCE === '0' && !process.env.HYDRO_CLI) {
            ctx.effect(() => ctx.setInterval(async () => {
                try {
                    const { RedEnvelopeService } = await import('./src/services/RedEnvelopeService');
                    const service = new RedEnvelopeService(ctx, ctx.domain?._id || 'default');
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
            ctx.Route('thinking_time', '/thinking-time', ThinkingTimeHandler);
            console.log('[Score System] ✅ thinking-time route registered');
        } catch (e) {
            console.warn('[Score System] ⚠️ Failed to register thinking-time route:', e);
        }

        // 注入导航栏 - 添加权限检查，只有内部用户可见
        ctx.injectUI('Nav', 'score_hall', {
            prefix: 'score',
            before: 'ranking', // 插入到排行榜前面
        }, PRIV.PRIV_USER_PROFILE);

        console.log('[Score System] ✅ All routes registered');
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
                const { RedEnvelopeService } = await import('./src/services/RedEnvelopeService');
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
