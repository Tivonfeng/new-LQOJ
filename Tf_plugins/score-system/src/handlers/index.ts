// 处理器统一导出

// 签到相关处理器
export {
    CheckInHandler,
} from './CheckInHandlers';

// 掷骰子游戏相关处理器
export {
    DiceAdminHandler,
    DiceGameHandler,
    DiceHistoryHandler,
    DicePlayHandler,
    DiceStatusHandler,
} from './DiceGameHandlers';

// 九宫格抽奖游戏相关处理器
export {
    LotteryGameHandler,
    LotteryHistoryHandler,
    LotteryPlayHandler,
    LotteryStatusHandler,
} from './LotteryHandlers';

// 九宫格抽奖核销相关处理器
export {
    MyPrizesApiHandler,
    MyPrizesHandler,
    RedemptionAdminHandler,
    RedemptionCancelApiHandler,
    RedemptionHistoryApiHandler,
    RedemptionListApiHandler,
    RedemptionRedeemApiHandler,
} from './LotteryRedemptionHandlers';

// 剪刀石头布游戏相关处理器
export {
    RPSGameHandler,
    RPSHistoryHandler,
    RPSPlayHandler,
    RPSStatusHandler,
} from './RPSHandlers';

// 积分相关处理器
export {
    ScoreHallHandler,
    ScoreManageHandler,
    ScoreRankingHandler,
    ScoreRecordsHandler,
    UserScoreHandler,
} from './ScoreHandlers';

// 思考时间处理器（来自 confetti-thinking-time 插件）
export { ThinkingTimeHandler } from './ThinkingTimeHandler';

// 转账相关处理器
export {
    TransferAdminHandler,
    TransferCreateHandler,
    TransferHistoryHandler,
    WalletHandler,
} from './WalletHandlers';

// 红包相关处理器
export {
    RedEnvelopeClaimHandler,
    RedEnvelopeCreateHandler,
    RedEnvelopeDetailHandler,
    RedEnvelopeHallPageHandler,
    RedEnvelopeListHandler,
    RedEnvelopeMyClaimedHandler,
    RedEnvelopeMySentHandler,
    RedEnvelopeStatsHandler,
} from './RedEnvelopeHandler';

// 红包 WebSocket 处理器
export {
    RedEnvelopeWSHandler,
    broadcastNewRedEnvelope,
    broadcastToAllClients,
} from './RedEnvelopeWSHandler';
