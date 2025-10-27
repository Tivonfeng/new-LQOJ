/* eslint-disable no-await-in-loop */
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
    GoldMinerAdminHandler,
    GoldMinerGameHandler,
    GoldMinerHistoryHandler,
    GoldMinerStartHandler,
    GoldMinerSubmitHandler,
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
    type GoldMinerRecord,
    type LotteryPrize,
    type LotteryRecord,
    type RPSGameRecord,
    type ScoreConfig,
    type ScoreRecord,
    ScoreService,
    type TransferRecord,
    type UserCheckInStats,
    type UserDiceStats,
    type UserGoldMinerStats,
    type UserLotteryStats,
    type UserRPSStats,
    type UserScore,
} from './src/services';

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
    problemTitle?: string;
    recordId: any;
}

// 声明数据库集合类型和事件类型
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
        'goldminer.records': GoldMinerRecord;
        'goldminer.stats': UserGoldMinerStats;
    }

    interface EventMap {
        'score/ac-rewarded': (data: ScoreEventData) => void;
        'score/ac-repeated': (data: ScoreEventData) => void;
    }
}

// 插件主函数
export default async function apply(ctx: Context, config: any = {}) {
    // 设置默认配置
    const defaultConfig: ScoreConfig = {
        enabled: true,
    };

    const finalConfig = { ...defaultConfig, ...config };

    console.log('Score System plugin loading...');
    const scoreService = new ScoreService(finalConfig, ctx);

    // 🔒 确保积分记录的唯一索引，防止并发竞态条件
    try {
        await ctx.db.collection('score.records' as any).createIndex(
            { uid: 1, pid: 1, domainId: 1 },
            { unique: true, background: false }, // 同步创建索引
        );
        console.log('[Score System] ✅ 唯一索引创建成功');
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('[Score System] ✅ 唯一索引已存在');
        } else if (error.message.includes('E11000') || error.message.includes('duplicate key')) {
            console.error('[Score System] ❌ 数据库中存在重复记录，无法创建唯一索引');
            console.log('[Score System] 🧹 正在清理重复记录...');

            // 清理重复记录，保留最早的那条
            const pipeline = [
                {
                    $group: {
                        _id: { uid: '$uid', pid: '$pid', domainId: '$domainId' },
                        docs: { $push: '$$ROOT' },
                        count: { $sum: 1 },
                    },
                },
                {
                    $match: { count: { $gt: 1 } },
                },
            ];

            const duplicates = await ctx.db.collection('score.records' as any).aggregate(pipeline).toArray();
            console.log(`[Score System] 📊 发现 ${duplicates.length} 组重复记录`);

            for (const dup of duplicates) {
                // 保留最早的记录（createdAt最小的），删除其他的
                const docsToDelete = dup.docs.slice(1); // 除了第一个，其他都删除
                const deletePromises = docsToDelete.map((doc: any) =>
                    ctx.db.collection('score.records' as any).deleteOne({ _id: doc._id }),
                );
                await Promise.all(deletePromises);
                console.log(`[Score System] 🗑️ 清理了 ${docsToDelete.length} 条重复记录 (uid: ${dup._id.uid}, pid: ${dup._id.pid})`);
            }

            // 重新尝试创建索引
            try {
                await ctx.db.collection('score.records' as any).createIndex(
                    { uid: 1, pid: 1, domainId: 1 },
                    { unique: true, background: false },
                );
                console.log('[Score System] ✅ 重复记录清理完成，唯一索引创建成功');
            } catch (retryError) {
                console.error('[Score System] ❌ 清理后仍无法创建索引:', retryError.message);
            }
        } else {
            console.error('[Score System] ❌ 索引创建失败:', error.message);
        }
    }

    // ⭐ 基于积分记录的准确首次AC检测
    ctx.on('record/judge', async (rdoc: RecordDoc, _updated: boolean, pdoc?: ProblemDoc) => {
        try {
            // 只处理启用状态且有题目信息的记录
            if (!finalConfig.enabled || !pdoc) return;
            if (rdoc.status !== STATUS.STATUS_ACCEPTED) return;

            // 🔒 使用原子操作避免并发竞态条件
            // 尝试插入记录，如果已存在则会失败（利用唯一索引）
            let isFirstAC = false;
            let score = 0;

            try {
                // 先尝试插入积分记录，如果成功说明是首次AC
                await scoreService.addScoreRecord({
                    uid: rdoc.uid,
                    domainId: rdoc.domainId,
                    pid: rdoc.pid,
                    recordId: rdoc._id,
                    score: 10,
                    reason: `AC题目 ${pdoc.title || rdoc.pid} 获得积分`,
                    problemTitle: pdoc.title,
                });

                // 插入成功，说明是首次AC
                isFirstAC = true;
                score = 10;

                await scoreService.updateUserScore(rdoc.domainId, rdoc.uid, score);
                console.log(`[Score System] ✅ User ${rdoc.uid} first AC problem ${rdoc.pid} (${pdoc.title}), awarded ${score} points`);
            } catch (error) {
                // 插入失败（重复键错误），说明已经存在记录，是重复AC
                if (error.code === 11000 || error.message.includes('E11000')) {
                    isFirstAC = false;
                    score = 0;
                    console.log(`[Score System] 🔄 User ${rdoc.uid} repeated AC problem ${rdoc.pid}, no points awarded`);
                } else {
                    console.error('[Score System] ❌ Unexpected error:', error);
                    throw error;
                }
            }

            // 统一发布事件（无论首次还是重复）
            ctx.emit(isFirstAC ? 'score/ac-rewarded' : 'score/ac-repeated', {
                uid: rdoc.uid,
                pid: rdoc.pid,
                domainId: rdoc.domainId,
                score,
                isFirstAC,
                problemTitle: pdoc.title,
                recordId: rdoc._id,
            });
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

    // 黄金矿工游戏路由
    ctx.Route('gold_miner', '/score/goldminer', GoldMinerGameHandler);
    ctx.Route('gold_miner_start', '/score/goldminer/start', GoldMinerStartHandler);
    ctx.Route('gold_miner_submit', '/score/goldminer/submit', GoldMinerSubmitHandler);
    ctx.Route('gold_miner_history', '/score/goldminer/history', GoldMinerHistoryHandler);
    ctx.Route('gold_miner_admin', '/score/goldminer/admin', GoldMinerAdminHandler);

    // 注入导航栏 - 添加权限检查，只有内部用户可见
    ctx.injectUI('Nav', 'score_hall', {
        prefix: 'score',
        before: 'ranking', // 插入到排行榜前面
    }, PRIV.PRIV_USER_PROFILE);
    console.log('Score System plugin loaded successfully!');
}

// 导出配置Schema
export { Config };
