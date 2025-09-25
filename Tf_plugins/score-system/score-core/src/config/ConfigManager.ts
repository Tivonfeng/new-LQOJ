/**
 * 配置管理器
 * 集中管理积分系统的所有配置项
 */

import type { ScoreConfig } from '../types';

/**
 * 系统默认配置
 */
export const DEFAULT_SYSTEM_CONFIG = {
    // 积分相关
    AC_REWARD_MIN: 1,
    AC_REWARD_MAX: 100,
    AC_REWARD_DEFAULT: 10,

    // 分页相关
    RANKING_PAGE_SIZE: 50,
    RECORDS_PAGE_SIZE: 20,
    MANAGEMENT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,

    // 查询限制
    MAX_RANKING_LIMIT: 200,
    MAX_RECORDS_LIMIT: 100,

    // 性能相关
    CACHE_TTL_RANKING: 300, // 5分钟
    CACHE_TTL_USER_SCORE: 60, // 1分钟
    CACHE_TTL_STATS: 180, // 3分钟

    // 业务限制
    MAX_SCORE_ADJUSTMENT: 10000, // 管理员单次调整积分上限
    MIN_REASON_LENGTH: 2, // 积分调整原因最小长度
} as const;

/**
 * 配置验证器
 */
export class ConfigValidator {
    /**
     * 验证积分配置
     */
    static validateScoreConfig(config: Partial<ScoreConfig>): string[] {
        const errors: string[] = [];

        if (config.acReward !== undefined) {
            if (typeof config.acReward !== 'number') {
                errors.push('acReward must be a number');
            } else if (config.acReward < DEFAULT_SYSTEM_CONFIG.AC_REWARD_MIN) {
                errors.push(`acReward must be at least ${DEFAULT_SYSTEM_CONFIG.AC_REWARD_MIN}`);
            } else if (config.acReward > DEFAULT_SYSTEM_CONFIG.AC_REWARD_MAX) {
                errors.push(`acReward must be at most ${DEFAULT_SYSTEM_CONFIG.AC_REWARD_MAX}`);
            }
        }

        if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
            errors.push('enabled must be a boolean');
        }

        return errors;
    }

    /**
     * 验证分页参数
     */
    static validatePaginationParams(page: number, limit: number): string[] {
        const errors: string[] = [];

        if (!Number.isInteger(page) || page < 1) {
            errors.push('page must be a positive integer');
        }

        if (!Number.isInteger(limit) || limit < 1) {
            errors.push('limit must be a positive integer');
        } else if (limit > DEFAULT_SYSTEM_CONFIG.MAX_PAGE_SIZE) {
            errors.push(`limit must be at most ${DEFAULT_SYSTEM_CONFIG.MAX_PAGE_SIZE}`);
        }

        return errors;
    }

    /**
     * 验证积分调整参数
     */
    static validateScoreAdjustment(scoreChange: number, reason: string): string[] {
        const errors: string[] = [];

        if (!Number.isInteger(scoreChange)) {
            errors.push('scoreChange must be an integer');
        } else if (Math.abs(scoreChange) > DEFAULT_SYSTEM_CONFIG.MAX_SCORE_ADJUSTMENT) {
            errors.push(`scoreChange must be within ±${DEFAULT_SYSTEM_CONFIG.MAX_SCORE_ADJUSTMENT}`);
        }

        if (!reason || typeof reason !== 'string') {
            errors.push('reason is required and must be a string');
        } else if (reason.length < DEFAULT_SYSTEM_CONFIG.MIN_REASON_LENGTH) {
            errors.push(`reason must be at least ${DEFAULT_SYSTEM_CONFIG.MIN_REASON_LENGTH} characters`);
        }

        return errors;
    }
}

/**
 * 配置管理器
 * 提供配置的获取、验证和热更新功能
 */
export class ConfigManager {
    private config: ScoreConfig;
    private listeners: Array<(config: ScoreConfig) => void> = [];

    constructor(initialConfig: ScoreConfig) {
        this.config = { ...initialConfig };
    }

    /**
     * 获取当前配置
     */
    getConfig(): Readonly<ScoreConfig> {
        return { ...this.config };
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<ScoreConfig>): { success: boolean, errors?: string[] } {
        const errors = ConfigValidator.validateScoreConfig(newConfig);

        if (errors.length > 0) {
            return { success: false, errors };
        }

        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };

        // 通知所有监听器
        this.listeners.forEach((listener) => {
            try {
                listener(this.config);
            } catch (error) {
                console.error('[ConfigManager] Error in config change listener:', error);
            }
        });

        console.log('[ConfigManager] Configuration updated:', {
            old: oldConfig,
            new: this.config,
        });

        return { success: true };
    }

    /**
     * 添加配置变更监听器
     */
    addChangeListener(listener: (config: ScoreConfig) => void): void {
        this.listeners.push(listener);
    }

    /**
     * 移除配置变更监听器
     */
    removeChangeListener(listener: (config: ScoreConfig) => void): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * 获取AC奖励积分
     */
    getAcReward(): number {
        return this.config.acReward;
    }

    /**
     * 检查系统是否启用
     */
    isEnabled(): boolean {
        return this.config.enabled;
    }
}

// 导出常量供其他模块使用
export const SYSTEM_CONFIG = DEFAULT_SYSTEM_CONFIG;
