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

// 转账相关处理器
export {
    TransferAdminHandler,
    TransferCreateHandler,
    WalletHandler,
    TransferHistoryHandler,
} from './WalletHandlers';
