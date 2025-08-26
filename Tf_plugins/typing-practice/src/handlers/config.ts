import { TypingConfig } from '../types/typing';

// 默认配置，供Handler使用
export const DEFAULT_CONFIG: TypingConfig = {
    enabled: true,
    scoreIntegration: true,
    defaultDifficulty: 'beginner',
    enableAchievements: true,
    enableSoundEffects: true,
    maxTextLength: 500,
    minAccuracy: 60,
};