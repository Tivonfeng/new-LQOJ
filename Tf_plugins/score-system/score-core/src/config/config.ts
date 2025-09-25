/**
 * 积分系统配置文件
 * 集中管理所有配置项
 */

export const config = {
    // 积分系统核心配置
    score: {
        // AC奖励相关配置
        AC_REWARD_DEFAULT: 10,
        AC_REWARD_MIN: 1,
        AC_REWARD_MAX: 100,

        // 系统配置
        ENABLED: true,

        // 积分调整配置
        MAX_SCORE_ADJUSTMENT: 10000,
        MIN_REASON_LENGTH: 2,
    },

    // 分页配置
    pagination: {
        MAX_PAGE_SIZE: 100,
        DEFAULT_PAGE_SIZE: 20,
        RECORDS_PAGE_SIZE: 50,
        RANKING_PAGE_SIZE: 20,
    },

    // 系统配置
    system: {
        DEBUG: false,
        LOG_LEVEL: 'info',
    },
} as const;
