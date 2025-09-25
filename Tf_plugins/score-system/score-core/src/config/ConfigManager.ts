/* eslint-disable github/array-foreach */
/**
 * 配置管理器
 * 集中管理积分系统的所有配置项
 */

import { config } from './config';

/**
 * 配置管理器
 * 提供配置的获取、验证和热更新功能
 * 支持插件动态添加配置项
 */
export class ConfigManager {
    private static instance: ConfigManager;
    private _config: Record<string, any>;
    private listeners: Array<(config: Record<string, any>) => void> = [];

    private constructor() {
        // 直接使用配置对象，保持层级结构
        this._config = { ...config };
    }

    /**
     * 获取配置管理器实例
     */
    static getInstance(): ConfigManager {
        ConfigManager.instance ||= new ConfigManager();
        return ConfigManager.instance;
    }

    /**
     * 获取配置对象，支持直接属性访问
     * 如：configManager.config.score.AC_REWARD_DEFAULT
     */
    get config() {
        return this._config;
    }

    /**
     * 设置配置项的值
     */
    set(key: string, value: any): void {
        const oldConfig = { ...this._config };
        this._config[key] = value;

        // 通知所有监听器
        this.notifyListeners(oldConfig);
    }

    /**
     * 批量添加配置项（供插件使用）
     */
    addConfig(pluginName: string, pluginConfig: Record<string, any>): void {
        const oldConfig = { ...this._config };

        // 为插件配置添加命名空间前缀，避免冲突
        Object.keys(pluginConfig).forEach((key) => {
            const namespacedKey = `${pluginName.toUpperCase()}_${key}`;
            this._config[namespacedKey] = pluginConfig[key];
        });

        console.log(`[ConfigManager] Added config for plugin '${pluginName}':`, pluginConfig);

        // 通知所有监听器
        this.notifyListeners(oldConfig);
    }

    /**
     * 获取当前所有配置
     */
    getConfig(): Readonly<Record<string, any>> {
        return { ...this._config };
    }

    /**
     * 批量更新配置
     */
    updateConfig(newConfig: Partial<Record<string, any>>): { success: boolean, errors?: string[] } {
        const oldConfig = { ...this._config };
        this._config = { ...this._config, ...newConfig };

        console.log('[ConfigManager] Configuration updated:', {
            old: oldConfig,
            new: this._config,
        });

        // 通知所有监听器
        this.notifyListeners(oldConfig);

        return { success: true };
    }

    /**
     * 通知所有监听器
     */
    private notifyListeners(_oldConfig: Record<string, any>): void {
        this.listeners.forEach((listener) => {
            try {
                listener(this._config);
            } catch (error) {
                console.error('[ConfigManager] Error in config change listener:', error);
            }
        });
    }

    /**
     * 添加配置变更监听器
     */
    addChangeListener(listener: (config: Record<string, any>) => void): void {
        this.listeners.push(listener);
    }

    /**
     * 移除配置变更监听器
     */
    removeChangeListener(listener: (config: Record<string, any>) => void): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * 获取AC奖励积分
     */
    getAcReward(): number {
        return this._config.score.AC_REWARD_DEFAULT;
    }

    /**
     * 检查系统是否启用
     */
    isEnabled(): boolean {
        return this._config.score.ENABLED ?? true; // 默认启用
    }

    /**
     * 获取插件特定配置项
     */
    getPluginConfig<T = any>(pluginName: string, key: string): T {
        const namespacedKey = `${pluginName.toUpperCase()}_${key}`;
        return this._config[namespacedKey];
    }

    /**
     * 检查配置项是否存在
     */
    has(key: string): boolean {
        return key in this._config;
    }

    /**
     * 移除配置项
     */
    remove(key: string): boolean {
        if (this.has(key)) {
            const oldConfig = { ...this._config };
            delete this._config[key];
            this.notifyListeners(oldConfig);
            return true;
        }
        return false;
    }

    /**
     * 获取所有配置项的键名
     */
    keys(): string[] {
        return Object.keys(this._config);
    }
}
