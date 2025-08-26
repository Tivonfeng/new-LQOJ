import { ObjectId } from 'mongodb';

// 插件配置接口
export interface TypingConfig {
    enabled: boolean;
    scoreIntegration: boolean;
    defaultDifficulty: string;
    enableAchievements: boolean;
    enableSoundEffects: boolean;
    maxTextLength: number;
    minAccuracy: number;
}

// 难度级别
export enum DifficultyLevel {
    BEGINNER = 'beginner',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced',
    EXPERT = 'expert'
}

// 文本类型
export enum TextType {
    BASIC_KEYS = 'basic_keys',        // 基础键位练习
    PROGRAMMING_WORDS = 'programming_words',  // 编程词汇练习
    PROGRAMMING = 'programming',       // 编程代码练习
    ENGLISH = 'english',              // 英文文章
    CHINESE = 'chinese',              // 中文文章
    MIXED = 'mixed',                  // 混合内容
    CUSTOM = 'custom'                 // 自定义文本
}

// 练习结果
export interface TypingResult {
    wpm: number;              // 每分钟字数
    accuracy: number;         // 准确率 (0-100)
    errors: number;           // 错误次数
    timeSpent: number;        // 用时（秒）
    textLength: number;       // 文本长度
    difficulty: DifficultyLevel;
    textType: TextType;
    completedWords: number;   // 完成的单词数
    keystrokeCount: number;   // 总按键次数
    correctKeystrokes: number; // 正确按键次数
}

// 打字练习记录
export interface TypingRecord {
    _id?: ObjectId;
    uid: number;              // 用户ID
    domainId: string;         // 域ID
    sessionId?: string;       // 会话ID（可选）
    
    // 练习信息
    originalText: string;     // 原文本
    userInput: string;        // 用户输入
    difficulty: DifficultyLevel;
    textType: TextType;
    
    // 统计数据
    result: TypingResult;
    
    // 积分相关
    scoreEarned: number;      // 获得积分
    achievementsUnlocked: string[]; // 解锁的成就
    
    // 时间戳
    createdAt: Date;
    completedAt?: Date;
    
    // 额外数据
    metadata?: {
        userAgent?: string;
        screen?: {
            width: number;
            height: number;
        };
        language?: string;
    };
}

// 用户打字统计
export interface TypingUserStats {
    _id?: ObjectId;
    uid: number;
    domainId: string;
    
    // 总体统计
    totalPractices: number;       // 总练习次数
    totalTimeSpent: number;       // 总用时（秒）
    totalScore: number;           // 总获得积分
    totalKeystrokes: number;      // 总按键次数
    
    // 最佳记录
    bestWPM: number;              // 最高WPM
    bestAccuracy: number;         // 最高准确率
    longestStreak: number;        // 最长连续天数
    
    // 平均统计
    averageWPM: number;           // 平均WPM
    averageAccuracy: number;      // 平均准确率
    averageTimePerPractice: number; // 平均每次练习时间
    
    // 成就和等级
    achievements: string[];       // 已获得成就
    level: number;               // 用户等级
    experiencePoints: number;    // 经验值
    
    // 练习偏好
    preferredDifficulty: DifficultyLevel;
    preferredTextType: TextType;
    
    // 日期统计
    practiceHistory: {
        date: string;            // YYYY-MM-DD格式
        practices: number;       // 当天练习次数
        totalTime: number;       // 当天练习时间
        bestWPM: number;         // 当天最佳WPM
        score: number;           // 当天获得积分
    }[];
    
    // 错误分析
    commonErrors: {
        character: string;       // 经常打错的字符
        errorCount: number;      // 错误次数
        accuracy: number;        // 该字符的准确率
    }[];
    
    // 进步曲线
    progressChart: {
        date: string;
        wpm: number;
        accuracy: number;
    }[];
    
    // 时间戳
    createdAt: Date;
    updatedAt: Date;
    lastPracticeAt?: Date;
}

// 成就定义
export interface TypingAchievement {
    _id?: ObjectId;
    id: string;                  // 成就唯一标识
    name: string;               // 成就名称
    description: string;        // 成就描述
    icon: string;               // 成就图标
    category: string;           // 成就类别
    
    // 解锁条件
    requirements: {
        type: 'wpm' | 'accuracy' | 'practice_count' | 'streak' | 'time_spent' | 'custom';
        value: number;
        comparison: 'gte' | 'lte' | 'eq';
        additional?: any;        // 额外条件
    }[];
    
    // 奖励
    reward: {
        score: number;          // 积分奖励
        title?: string;         // 称号奖励
        badge?: string;         // 徽章奖励
    };
    
    // 稀有度
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    
    // 是否隐藏（直到解锁才显示）
    hidden: boolean;
    
    // 创建时间
    createdAt: Date;
}

// 文本模板
export interface TextTemplate {
    id: string;
    name: string;
    content: string;
    difficulty: DifficultyLevel;
    type: TextType;
    language: string;
    tags: string[];
    length: number;
    estimatedTime: number;      // 预计完成时间（秒）
    createdAt: Date;
    createdBy?: number;         // 创建者ID
    isActive: boolean;
}

// 练习会话状态
export interface TypingSession {
    sessionId: string;
    uid: number;
    domainId: string;
    
    // 会话信息
    startTime: number;
    currentText: string;
    currentPosition: number;
    userInput: string;
    
    // 实时统计
    realTimeWPM: number;
    realTimeAccuracy: number;
    currentErrors: number;
    
    // 会话配置
    difficulty: DifficultyLevel;
    textType: TextType;
    enableHints: boolean;
    enableSoundEffects: boolean;
    
    // 状态
    isActive: boolean;
    isPaused: boolean;
    isCompleted: boolean;
    
    createdAt: Date;
    updatedAt: Date;
}

// API响应类型
export interface TypingPracticeResponse {
    success: boolean;
    data?: {
        text?: string;
        result?: TypingResult;
        score?: number;
        achievements?: TypingAchievement[];
        stats?: TypingUserStats;
        session?: TypingSession;
        // Admin-specific response data
        message?: string;
        deletedRecords?: number;
        cutoffDate?: string;
        [key: string]: any; // Allow additional properties
    };
    error?: {
        code: string;
        message: string;
    };
}

// 排行榜条目
export interface TypingLeaderboardEntry {
    uid: number;
    username: string;
    avatar?: string;
    
    // 统计数据
    bestWPM: number;
    averageWPM: number;
    totalPractices: number;
    totalScore: number;
    accuracy: number;
    level: number;
    
    // 排名
    rank: number;
    
    // 成就数量
    achievementCount: number;
    
    // 最后活跃时间
    lastActiveAt: Date;
}

// 练习挑战
export interface TypingChallenge {
    _id?: ObjectId;
    id: string;
    name: string;
    description: string;
    
    // 挑战配置
    difficulty: DifficultyLevel;
    textType: TextType;
    targetWPM?: number;
    targetAccuracy?: number;
    timeLimit?: number;
    textContent: string;
    
    // 奖励
    reward: {
        score: number;
        achievements?: string[];
    };
    
    // 状态
    isActive: boolean;
    startDate: Date;
    endDate: Date;
    
    // 统计
    participantCount: number;
    completionCount: number;
    
    createdAt: Date;
    createdBy: number;
}

// 用户挑战记录
export interface UserChallengeRecord {
    _id?: ObjectId;
    uid: number;
    domainId: string;
    challengeId: string;
    
    // 结果
    result: TypingResult;
    completed: boolean;
    score: number;
    
    // 排名
    rank?: number;
    
    createdAt: Date;
    completedAt?: Date;
}

// 所有类型已在定义时导出，枚举也已导出，无需重复导出