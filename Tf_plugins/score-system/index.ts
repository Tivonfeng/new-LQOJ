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
    DiceStatusHandler,
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
    TransferExchangeHandler,
    TransferHistoryHandler,
    UserScoreHandler } from './src/handlers';
// 导入服务层
import {
    type DailyCheckInRecord,
    type DiceGameRecord,
    type RPSGameRecord,
    type ScoreConfig,
    type ScoreRecord,
    ScoreCategory,
    ScoreService,
    type TransferRecord,
    type UserCheckInStats,
    type UserDiceStats,
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
        const msg = (error as Error).message || '';
        // 索引已存在或配置兼容时，视为成功，避免重复报错
        if (msg.includes('already exists') || msg.includes('same name as the requested index')) {
            console.log('[Score System] ✅ 唯一索引已存在或配置兼容，跳过创建');
        } else if (msg.includes('E11000') || msg.includes('duplicate key')) {
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
                    category: ScoreCategory.AC_PROBLEM,
                    title: pdoc.title,
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
                category: ScoreCategory.AC_PROBLEM,
                title: pdoc.title,
                recordId: rdoc._id,
            });
        } catch (error) {
            console.error('[Score System] ❌ Error:', error);
        }
    });

    // 📜 监听证书事件，自动处理积分
    ctx.on('certificate/created', async (data: CertificateEventData) => {
        try {
            if (!finalConfig.enabled) return;
            if (data.weight <= 0) return;

            const scoreToAdd = Math.round(data.weight * 10);
            await scoreService.updateUserScore(data.domainId, data.uid, scoreToAdd);
            // 生成唯一的 pid 值，避免唯一索引冲突（证书积分使用 -3000000 范围）
            const uniquePid = -3000000 - Date.now();
            await scoreService.addScoreRecord({
                uid: data.uid,
                domainId: data.domainId,
                pid: uniquePid,
                recordId: data.certificateId,
                score: scoreToAdd,
                reason: `获得证书 ${data.certificateName}，权重 ${data.weight}，获得积分 ${scoreToAdd}`,
                category: ScoreCategory.CERTIFICATE,
                title: data.certificateName,
            });
            console.log(`[Score System] ✅ 用户 ${data.uid} 获得证书积分 ${scoreToAdd}（权重 ${data.weight}）`);
        } catch (err: any) {
            console.error(`[Score System] ❌ 处理证书创建事件失败: ${err.message}`);
        }
    });

    ctx.on('certificate/deleted', async (data: CertificateEventData) => {
        try {
            if (!finalConfig.enabled) return;
            if (data.weight <= 0) return;

            const scoreToDeduct = Math.round(data.weight * 10);
            await scoreService.updateUserScore(data.domainId, data.uid, -scoreToDeduct);
            // 生成唯一的 pid 值，避免唯一索引冲突（证书积分使用 -3000000 范围）
            const uniquePid = -3000000 - Date.now();
            await scoreService.addScoreRecord({
                uid: data.uid,
                domainId: data.domainId,
                pid: uniquePid,
                recordId: data.certificateId,
                score: -scoreToDeduct,
                reason: `删除证书 ${data.certificateName}，权重 ${data.weight}，扣除积分 ${scoreToDeduct}`,
                category: ScoreCategory.CERTIFICATE,
                title: data.certificateName,
            });
            console.log(`[Score System] ✅ 用户 ${data.uid} 删除证书扣除积分 ${scoreToDeduct}（权重 ${data.weight}）`);
        } catch (err: any) {
            console.error(`[Score System] ❌ 处理证书删除事件失败: ${err.message}`);
        }
    });

    // 📜 监听打字奖励事件，自动处理积分
    ctx.on('typing/bonus-awarded', async (data: TypingBonusEventData) => {
        try {
            if (!finalConfig.enabled) return;
            if (data.bonus <= 0) return;

            await scoreService.updateUserScore(data.domainId, data.uid, data.bonus);
            // 生成唯一的 pid 值，避免唯一索引冲突（打字奖励使用 -4000000 范围）
            const uniquePid = -4000000 - Date.now();
            await scoreService.addScoreRecord({
                uid: data.uid,
                domainId: data.domainId,
                pid: uniquePid,
                recordId: data.recordId || null,
                score: data.bonus,
                reason: data.reason,
                category: ScoreCategory.TYPING_CHALLENGE,
            });
            console.log(`[Score System] ✅ 用户 ${data.uid} 获得打字奖励积分 ${data.bonus}（${data.bonusType}）`);
        } catch (err: any) {
            console.error(`[Score System] ❌ 处理打字奖励事件失败: ${err.message}`);
        }
    });

    // 🐢 监听作品投币事件，自动处理积分
    ctx.on('turtle/work-coined', async (data: TurtleWorkCoinedEventData) => {
        try {
            if (!finalConfig.enabled) return;
            if (data.amount <= 0) return;

            // 生成唯一的 pid 值，避免唯一索引冲突（作品投币使用 -5000000 范围）
            const timestamp = Date.now();
            const uniquePidFrom = -5000000 - timestamp;
            const uniquePidTo = -5000000 - timestamp - 1;

            // 扣除投币者积分
            await scoreService.updateUserScore(data.domainId, data.fromUid, -data.amount);
            await scoreService.addScoreRecord({
                uid: data.fromUid,
                domainId: data.domainId,
                pid: uniquePidFrom,
                recordId: data.workId,
                score: -data.amount,
                reason: `给作品「${data.workTitle}」投币`,
                category: ScoreCategory.WORK_INTERACTION,
                title: data.workTitle,
            });

            // 给作品主人加积分
            await scoreService.updateUserScore(data.domainId, data.toUid, data.amount);
            await scoreService.addScoreRecord({
                uid: data.toUid,
                domainId: data.domainId,
                pid: uniquePidTo,
                recordId: data.workId,
                score: data.amount,
                reason: `收到作品「${data.workTitle}」的投币`,
                category: ScoreCategory.WORK_INTERACTION,
                title: data.workTitle,
            });

            console.log(`[Score System] ✅ 用户 ${data.fromUid} 给作品「${data.workTitle}」投币 ${data.amount}，作品主人 ${data.toUid} 获得积分`);
        } catch (err: any) {
            console.error(`[Score System] ❌ 处理作品投币事件失败: ${err.message}`);
        }
    });

    // 🤖 监听 AI 助手使用事件，每次扣除一定积分
    ctx.on('ai/helper-used', async (data: AiHelperUsedEventData) => {
        try {
            if (!finalConfig.enabled) return;
            if (!data.cost || data.cost <= 0) return;

            const cost = Math.round(data.cost);

            // 生成唯一的 pid 值，避免唯一索引冲突（AI使用使用 -6000000 范围）
            const uniquePid = -6000000 - Date.now();
            // 扣除用户积分
            await scoreService.updateUserScore(data.domainId, data.uid, -cost);
            await scoreService.addScoreRecord({
                uid: data.uid,
                domainId: data.domainId,
                pid: uniquePid,
                recordId: null,
                score: -cost,
                reason: data.reason || `使用 AI 辅助解题，消耗积分 ${cost}`,
                category: ScoreCategory.AI_ASSISTANT,
            });

            console.log(`[Score System] 🤖 用户 ${data.uid} 使用 AI 辅助一次，扣除积分 ${cost}`);
        } catch (err: any) {
            console.error(`[Score System] ❌ 处理 AI 使用事件失败: ${err.message}`);
        }
    });

    // 注册路由
    ctx.Route('score_manage', '/score/manage', ScoreManageHandler);
    ctx.Route('score_records', '/score/records', ScoreRecordsHandler);
    ctx.Route('score_ranking', '/score/ranking', ScoreRankingHandler);
    ctx.Route('user_score', '/score/me', UserScoreHandler);
    ctx.Route('score_hall', '/score/hall', ScoreHallHandler);

    // 掷骰子游戏路由
    ctx.Route('dice_game', '/score/dice', DiceGameHandler);
    ctx.Route('dice_status', '/score/dice/status', DiceStatusHandler);
    ctx.Route('dice_play', '/score/dice/play', DicePlayHandler);
    ctx.Route('dice_history', '/score/dice/history', DiceHistoryHandler);
    ctx.Route('dice_admin', '/score/dice/admin', DiceAdminHandler);

    // 剪刀石头布游戏路由
    ctx.Route('rock_paper_scissors', '/score/rps', RPSGameHandler);
    ctx.Route('rps_status', '/score/rps/status', RPSStatusHandler);
    ctx.Route('rps_play', '/score/rps/play', RPSPlayHandler);
    ctx.Route('rps_history', '/score/rps/history', RPSHistoryHandler);

    // 转账系统路由
    ctx.Route('transfer_exchange', '/score/transfer', TransferExchangeHandler);
    ctx.Route('transfer_create', '/score/transfer/create', TransferCreateHandler);
    ctx.Route('transfer_history', '/score/transfer/history', TransferHistoryHandler);
    ctx.Route('transfer_admin', '/score/transfer/admin', TransferAdminHandler);

    // 签到系统路由
    ctx.Route('daily_checkin', '/score/checkin', CheckInHandler);

    // 注入导航栏 - 添加权限检查，只有内部用户可见
    ctx.injectUI('Nav', 'score_hall', {
        prefix: 'score',
        before: 'ranking', // 插入到排行榜前面
    }, PRIV.PRIV_USER_PROFILE);
    console.log('Score System plugin loaded successfully!');
}

// 导出配置Schema
export { Config };
