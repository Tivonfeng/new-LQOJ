// Types and module augmentation for tf_plugins_core
import { ScoreCoreService } from '../services/ScoreCoreService';

// 积分相关核心类型定义
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

export interface AwardIfFirstACParams {
    uid: number;
    pid: number;
    domainId: string;
    recordId: any;
    score: number;
    reason: string;
    category?: ScoreCategoryType;
    title?: string;
}

export interface AwardIfFirstACResult {
    awarded: number;
    isFirstAC: boolean;
}

// 游戏和积分系统常量配置
export const SCORE_CONSTANTS = {
    // 基础奖励
    AC: {
        BASE_REWARD: 20,
        FIRST_BONUS_MULTIPLIER: 0, // 首AC不再额外奖励
    },

    // 游戏常量
    DICE: {
        AVAILABLE_BETS: [10, 20, 50] as const,
        WIN_MULTIPLIER: 2,
        MAX_DAILY_PLAYS: 10,
    },

    RPS: {
        BASE_COST: 15,
        WIN_REWARD: 30,
        DRAW_REWARD: 15,
        STREAK_BONUS: 5,
        MAX_DAILY_PLAYS: 20,
        CHOICES: ['rock', 'paper', 'scissors'] as const,
    },

    LOTTERY: {
        BET_AMOUNT: 10,
        MAX_DAILY_PLAYS: 5,
    },

    // 签到奖励
    CHECKIN: {
        BASE_REWARD: 10,
        STREAK_MULTIPLIER: 2,
        MAX_STREAK_DAYS: 30,
    },

    // 转账
    TRANSFER: {
        MIN_AMOUNT: 1,
        MAX_AMOUNT: 1000,
        FEE_PERCENTAGE: 0.01, // 1%
        DAILY_LIMIT: 100,
    },

    // 缓存配置
    CACHE: {
        USER_SCORE_TTL: 300, // 5分钟
        RANKING_TTL: 60, // 1分钟
        STATS_TTL: 300, // 5分钟
    },

    // 数据库集合名称
    COLLECTIONS: {
        USERS: 'score.users',
        RECORDS: 'score.records',
        DICE_RECORDS: 'dice.records',
        RPS_RECORDS: 'rps.records',
        LOTTERY_RECORDS: 'lottery.records',
        LOTTERY_REDEMPTIONS: 'lottery.redemptions',
        TRANSFER_RECORDS: 'transfer.records',
        CHECKIN_RECORDS: 'checkin.records',
    },
} as const;

declare module 'hydrooj' {
    interface Context {
        // Optional provider - prefer using ctx.inject rather than direct property access
        scoreCore?: ScoreCoreService;
    }

}

export {};
