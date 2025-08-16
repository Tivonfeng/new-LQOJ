// 处理器统一导出

// 积分相关处理器
export {
    ScoreHallHandler,
    ScoreRankingHandler,
    UserScoreHandler,
    ScoreManageHandler
} from './ScoreHandlers';

// 抽奖相关处理器
export {
    LotteryHallHandler,
    LotteryDrawHandler,
    LotteryClaimHandler,
    LotteryHistoryHandler,
    LotteryAdminHandler
} from './LotteryHandlers';

// 掷骰子游戏相关处理器
export {
    DiceGameHandler,
    DicePlayHandler,
    DiceHistoryHandler,
    DiceAdminHandler
} from './DiceGameHandlers';

// 剪刀石头布游戏相关处理器
export {
    RPSGameHandler,
    RPSPlayHandler,
    RPSHistoryHandler,
    RPSAdminHandler
} from './RPSHandlers';