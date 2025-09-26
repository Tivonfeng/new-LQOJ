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
        this._config = {
            ...config,
            plugins: {}, // 初始化插件配置命名空间
        };
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
     * 设置配置项的值，支持路径访问
     * @param keyPath 配置路径，如 'score.AC_REWARD_DEFAULT' 或 'plugins.myPlugin.enabled'
     * @param value 配置值
     */
    set(keyPath: string, value: any): void {
        const oldConfig = { ...this._config };
        this.setValueByPath(this._config, keyPath, value);

        // 通知所有监听器
        this.notifyListeners(oldConfig);
    }

    /**
     * 获取配置项的值，支持路径访问
     * @param keyPath 配置路径，如 'score.AC_REWARD_DEFAULT'
     * @param defaultValue 默认值
     * @returns 配置值
     */
    get<T = any>(keyPath: string, defaultValue?: T): T {
        return this.getValueByPath(this._config, keyPath, defaultValue);
    }

    /**
     * 通过路径获取值的私有方法
     */
    private getValueByPath<T>(obj: any, path: string, defaultValue?: T): T {
        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current == null || typeof current !== 'object') {
                return defaultValue as T;
            }
            current = current[key];
        }

        return current !== undefined ? current : (defaultValue as T);
    }

    /**
     * 通过路径设置值的私有方法
     */
    private setValueByPath(obj: any, path: string, value: any): void {
        const keys = path.split('.');
        const lastKey = keys.pop()!;
        let current = obj;

        for (const key of keys) {
            if (current[key] == null || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[lastKey] = value;
    }

    /**
     * 批量添加配置项（供插件使用）
     * 使用嵌套结构避免命名冲突
     */
    addConfig(pluginName: string, pluginConfig: Record<string, any>): void {
        const oldConfig = { ...this._config };

        // 将插件配置添加到plugins命名空间下
        this._config.plugins ||= {};
        this._config.plugins[pluginName] = { ...pluginConfig };

        console.log(`[ConfigManager] Added config for plugin '${pluginName}':`, pluginConfig);

        // 通知所有监听器
        this.notifyListeners(oldConfig);
    }

    /**
     * 移除插件配置
     */
    removePluginConfig(pluginName: string): boolean {
        if (!this._config.plugins || !this._config.plugins[pluginName]) {
            return false;
        }

        const oldConfig = { ...this._config };
        delete this._config.plugins[pluginName];

        console.log(`[ConfigManager] Removed config for plugin '${pluginName}'`);

        // 通知所有监听器
        this.notifyListeners(oldConfig);
        return true;
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
        return this.get<number>('score.AC_REWARD_DEFAULT', 10);
    }

    /**
     * 检查系统是否启用
     */
    isEnabled(): boolean {
        return this.get<boolean>('score.ENABLED', true);
    }

    /**
     * 获取插件特定配置项
     */
    getPluginConfig<T = any>(pluginName: string, key?: string): T {
        const basePath = `plugins.${pluginName}`;
        return key ? this.get<T>(`${basePath}.${key}`) : this.get<T>(basePath);
    }

    /**
     * 设置插件特定配置项
     */
    setPluginConfig(pluginName: string, key: string, value: any): void {
        this.set(`plugins.${pluginName}.${key}`, value);
    }

    /**
     * 获取所有插件配置
     */
    getAllPluginConfigs(): Record<string, any> {
        return this.get<Record<string, any>>('plugins', {});
    }

    /**
     * 检查配置项是否存在，支持路径访问
     */
    has(keyPath: string): boolean {
        const value = this.getValueByPath(this._config, keyPath, undefined);
        return value !== undefined;
    }

    /**
     * 移除配置项，支持路径访问
     */
    remove(keyPath: string): boolean {
        if (!this.has(keyPath)) {
            return false;
        }

        const oldConfig = { ...this._config };
        this.removeValueByPath(this._config, keyPath);
        this.notifyListeners(oldConfig);
        return true;
    }

    /**
     * 通过路径移除值的私有方法
     */
    private removeValueByPath(obj: any, path: string): void {
        const keys = path.split('.');
        const lastKey = keys.pop()!;
        let current = obj;

        for (const key of keys) {
            if (current[key] == null || typeof current[key] !== 'object') {
                return; // 路径不存在
            }
            current = current[key];
        }

        delete current[lastKey];
    }

    /**
     * 获取所有配置项的键名
     */
    keys(): string[] {
        return Object.keys(this._config);
    }
}
