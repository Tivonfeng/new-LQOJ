// handlers共享的默认配置接口
export interface ScoreConfig {
    enabled: boolean;
}

// handlers共享的默认配置
export const DEFAULT_CONFIG: ScoreConfig = {
    enabled: true,
};
