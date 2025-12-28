/* eslint-disable no-await-in-loop */

// 立即输出，确保模块被加载
import {
    Context,
    PRIV,
    ProblemDoc,
    RecordDoc,
    Schema,
    STATUS } from 'hydrooj';
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
    RPSGameHandler,
    RPSHistoryHandler,
    RPSPlayHandler,
    RPSStatusHandler,
    ScoreHallHandler,
    ScoreManageHandler,
    ScoreRankingHandler,
    ScoreRecordsHandler,
    TransferAdminHandler,
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

console.log('📦 SCORE-SYSTEM MODULE LOADED');

// 积分系统配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用积分系统'),
});

// 积分事件数据类型
interface ScoreEventData {
    uid: number;
    pid: number;
    domainId: string;
    score: number;
    isFirstAC: boolean;
    category?: string;
    title?: string;
    recordId: any;
}

// 证书事件数据类型
interface CertificateEventData {
    uid: number;
    domainId: string;
    certificateId: any;
    weight: number;
    certificateName: string;
}

// 打字奖励事件数据类型
interface TypingBonusEventData {
    uid: number;
    domainId: string;
    bonus: number;
    reason: string;
    bonusType: 'progress' | 'level' | 'surpass';
    recordId?: any;
}

// 作品投币事件数据类型
interface TurtleWorkCoinedEventData {
    fromUid: number; // 投币者
    toUid: number; // 作品主人
    domainId: string;
    workId: string;
    workTitle: string;
    amount: number; // 投币数量（通常为1）
}

// AI 使用事件数据类型
interface AiHelperUsedEventData {
    uid: number;
    domainId: string;
    cost: number; // 本次使用消耗的积分（正数）
    reason?: string;
}

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

    interface EventMap {
        'score/ac-rewarded': (data: ScoreEventData) => void;
        'score/ac-repeated': (data: ScoreEventData) => void;
        'certificate/created': (data: CertificateEventData) => void;
        'certificate/deleted': (data: CertificateEventData) => void;
        'typing/bonus-awarded': (data: TypingBonusEventData) => void;
        'turtle/work-coined': (data: TurtleWorkCoinedEventData) => void;
        'ai/helper-used': (data: AiHelperUsedEventData) => void;
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

    // 注入 scoreCore 服务并存储到全局对象
    try {
        if (typeof ctx.inject === 'function') {
            ctx.inject(['scoreCore'], ({ scoreCore: _sc }: any) => {
                // 将注入的服务存储到全局对象，供处理器使用
                (global as any).scoreCoreService = _sc;
                console.log('[Score System] ✅ ScoreCore service injected and stored globally');
            });
        } else {
            console.warn('[Score System] ⚠️ ctx.inject not available, trying fallback');
            (global as any).scoreCoreService = (ctx as any).scoreCore;
        }
    } catch (e) {
        console.warn('[Score System] ⚠️ Failed to inject scoreCore:', (e as any)?.message || e);
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
        // 题目AC事件监听
        ctx.on('record/judge', async (rdoc: RecordDoc, _updated: boolean, pdoc?: ProblemDoc) => {
            try {
                if (!pdoc) return;
                if (rdoc.status !== STATUS.STATUS_ACCEPTED) return;

                const scoreToAward = 20;
                let isFirstAC = false;
                let awardedScore = 0;

                // 从全局对象获取 scoreCore
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
                    if (isFirstAC) {
                        console.log(`[Score System] ✅ User ${rdoc.uid} first AC problem ${rdoc.pid} (${pdoc.title}), awarded ${awardedScore} points via scoreCore`);
                    } else {
                        console.log(`[Score System] 🔄 User ${rdoc.uid} repeated AC problem ${rdoc.pid}, no points awarded via scoreCore`);
                    }
                } else {
                    console.warn('[Score System] ❌ scoreCore not available, skipping AC reward');
                }
                ctx.emit(isFirstAC ? 'score/ac-rewarded' : 'score/ac-repeated', {
                    uid: rdoc.uid, pid: rdoc.pid, domainId: rdoc.domainId, score: awardedScore,
                    isFirstAC, category: ScoreCategory.AC_PROBLEM, title: pdoc.title, recordId: rdoc._id,
                });
            } catch (error) {
                console.error('[Score System] ❌ Error in record/judge event:', error);
            }
        });

        // 注册处理器路由
        ctx.Route('score_manage', '/score/manage', ScoreManageHandler, PRIV.PRIV_MANAGE_ALL_DOMAIN);
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
        ctx.Route('redemption_admin', '/lottery/admin/redeem', RedemptionAdminHandler, PRIV.PRIV_MANAGE_ALL_DOMAIN);
        ctx.Route('redemption_list_api', '/lottery/admin/redeem/list', RedemptionListApiHandler);
        ctx.Route('redemption_redeem_api', '/lottery/admin/redeem/redeem', RedemptionRedeemApiHandler);
        ctx.Route('redemption_cancel_api', '/lottery/admin/redeem/cancel', RedemptionCancelApiHandler);
        ctx.Route('redemption_history_api', '/lottery/admin/redeem/history', RedemptionHistoryApiHandler);

        ctx.Route('wallet', '/wallet', WalletHandler);
        ctx.Route('transfer_create', '/transfer/create', TransferCreateHandler);
        ctx.Route('transfer_history', '/transfer/history', TransferHistoryHandler);
        ctx.Route('transfer_admin', '/transfer/admin', TransferAdminHandler, PRIV.PRIV_MANAGE_ALL_DOMAIN);

        ctx.Route('checkin', '/checkin', CheckInHandler);

        // 注入导航栏 - 添加权限检查，只有内部用户可见
        ctx.injectUI('Nav', 'score_hall', {
            prefix: 'score',
            before: 'ranking', // 插入到排行榜前面
        }, PRIV.PRIV_USER_PROFILE);

        console.log('[Score System] ✅ All routes registered');
    }

    console.log('[Score System] 🎉 Score system plugin loaded successfully');
}

// 导出配置Schema
export { Config };
