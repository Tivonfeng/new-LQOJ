// 服务层统一导出

// 积分相关类型定义（避免耦合，独立定义）
export const ScoreCategory = {
    AC_PROBLEM: 'AC题目',
    GAME_ENTERTAINMENT: '游戏娱乐',
    TYPING_CHALLENGE: '打字挑战',
    WORK_INTERACTION: '作品互动',
    AI_ASSISTANT: 'AI辅助',
    TRANSFER: '积分转账',
    DAILY_CHECKIN: '每日签到',
    CERTIFICATE: '证书奖励',
    ADMIN_OPERATION: '管理员操作',
} as const;

export type ScoreCategoryType = typeof ScoreCategory[keyof typeof ScoreCategory];

export interface ScoreRecord {
    _id?: any;
    uid: number;
    domainId: string;
    pid: number;
    recordId: any;
    score: number;
    reason: string;
    createdAt: Date;
    category?: ScoreCategoryType;
    title?: string;
}

export interface UserScore {
    _id?: any;
    uid: number;
    domainId?: string;
    totalScore: number;
    acCount: number;
    lastUpdated: Date;
}

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

// 九宫格抽奖核销服务
export {
    LotteryRedemptionService,
    type RedemptionRecord,
} from './LotteryRedemptionService';

// 九宫格抽奖游戏服务
export {
    type LotteryGameRecord,
    LotteryService,
    type PhysicalPrizeInfo,
    type PrizeConfig,
    type UserLotteryStats,
} from './LotteryService';

// 剪刀石头布游戏服务
export {
    type RPSGameRecord,
    RPSGameService,
    type UserChoiceStats,
    type UserRPSStats,
} from './RPSGameService';

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

// 红包服务
export {
    RedEnvelopeService,
} from './RedEnvelopeService';

export * from '../models/RedEnvelope';
