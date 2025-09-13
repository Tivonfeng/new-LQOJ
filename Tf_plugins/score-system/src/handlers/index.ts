// 处理器统一导出

// 掷骰子游戏相关处理器
export {
    DiceAdminHandler,
    DiceGameHandler,
    DiceHistoryHandler,
    DicePlayHandler,
} from './DiceGameHandlers';

// 抽奖相关处理器
export {
    LotteryAdminHandler,
    LotteryClaimHandler,
    LotteryDrawHandler,
    LotteryHallHandler,
    LotteryHistoryHandler,
} from './LotteryHandlers';

// 剪刀石头布游戏相关处理器
export {
    RPSAdminHandler,
    RPSGameHandler,
    RPSHistoryHandler,
    RPSPlayHandler,
} from './RPSHandlers';

// 积分相关处理器
export {
    ScoreHallHandler,
    ScoreManageHandler,
    ScoreRankingHandler,
    UserScoreHandler,
} from './ScoreHandlers';

// 转账相关处理器
export {
    TransferAdminHandler,
    TransferCreateHandler,
    TransferExchangeHandler,
    TransferHistoryHandler,
} from './TransferHandlers';
