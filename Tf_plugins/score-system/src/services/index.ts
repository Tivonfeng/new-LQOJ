// 服务层统一导出

// 签到服务
export {
    type CheckInResult,
    CheckInService,
    type DailyCheckInRecord,
    type UserCheckInStats,
} from './CheckInService';

// 每日游戏限制服务
export {
    type DailyGameLimit,
    DailyGameLimitService,
} from './DailyGameLimitService';

// 掷骰子游戏服务
export {
    type DiceGameRecord,
    DiceGameService,
    type UserDiceStats,
} from './DiceGameService';


// 剪刀石头布游戏服务
export {
    type RPSGameRecord,
    RPSGameService,
    type UserChoiceStats,
    type UserRPSStats,
} from './RPSGameService';

// 积分服务
export {
    type ScoreConfig,
    type ScoreRecord,
    ScoreService,
    type UserScore,
} from './ScoreService';

// 统计服务
export {
    StatisticsService,
} from './StatisticsService';

// 转账服务
export {
    type TransferConfig,
    type TransferRecord,
    TransferService,
} from './TransferService';

