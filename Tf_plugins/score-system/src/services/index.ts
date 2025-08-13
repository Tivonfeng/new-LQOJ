// 服务层统一导出

// 积分服务
export { 
    ScoreService,
    type ScoreRecord,
    type UserScore,
    type ScoreConfig
} from './ScoreService';

// 抽奖服务
export {
    LotteryService,
    type LotteryPrize,
    type LotteryRecord,
    type UserLotteryStats,
    LOTTERY_TYPES,
    PRIZE_RARITY
} from './LotteryService';

// 统计服务
export {
    StatisticsService
} from './StatisticsService';

// 权重计算服务
export {
    WeightCalculationService
} from './WeightCalculationService';

// 掷骰子游戏服务
export {
    DiceGameService,
    type DiceGameRecord,
    type UserDiceStats
} from './DiceGameService';