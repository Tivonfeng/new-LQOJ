/**
 * 积分系统事件定义
 * 定义插件间通信的事件接口
 */

import type {
    ScoreChangeEventData,
    ScoreEventData,
    ScoreInsufficientEventData,
} from '../types/shared';

// 积分系统事件映射
export interface ScoreEventMap {
    // AC奖励事件
    'score/ac-rewarded': (data: ScoreEventData) => void;

    // 重复AC事件
    'score/ac-repeated': (data: ScoreEventData) => void;

    // 积分变更事件
    'score/change': (data: ScoreChangeEventData) => void;

    // 积分不足事件
    'score/insufficient': (data: ScoreInsufficientEventData) => void;

    // 用户积分更新事件
    'score/user-updated': (data: { uid: number, domainId: string, totalScore: number }) => void;

    // 排行榜更新事件
    'score/ranking-updated': (data: { domainId: string }) => void;
}

// 事件常量
export const SCORE_EVENTS = {
    AC_REWARDED: 'score/ac-rewarded' as const,
    AC_REPEATED: 'score/ac-repeated' as const,
    SCORE_CHANGE: 'score/change' as const,
    SCORE_INSUFFICIENT: 'score/insufficient' as const,
    USER_UPDATED: 'score/user-updated' as const,
    RANKING_UPDATED: 'score/ranking-updated' as const,
} as const;

// 扩展HydroOJ的EventMap
declare module 'hydrooj' {
    interface EventMap extends ScoreEventMap {}
}
