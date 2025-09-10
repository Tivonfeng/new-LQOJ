// 学情分析系统的数据类型定义

import { ObjectId } from 'mongodb';

// 学习记录接口
export interface LearningRecord {
    _id?: ObjectId;
    uid: number; // 用户ID
    domainId: string; // 域ID
    problemId: number; // 题目ID
    submissionId?: ObjectId; // 提交记录ID
    submissionTime: Date; // 提交时间
    solutionTime: number; // 解题用时（秒）
    attemptCount: number; // 尝试次数
    status: string; // 提交状态
    codeQuality?: number; // 代码质量分数 (0-100)
    knowledgePoints: string[]; // 涉及知识点
    difficulty: number; // 题目难度等级
    language: string; // 编程语言
    codeLength: number; // 代码长度
    memoryUsage?: number; // 内存使用量
    timeUsage?: number; // 时间使用量
    createdAt: Date; // 记录创建时间
}

// 知识点掌握度接口
export interface KnowledgePoint {
    _id?: ObjectId;
    uid: number; // 用户ID
    domainId: string; // 域ID
    topic: string; // 知识点名称
    category: string; // 知识点类别
    masteryLevel: number; // 掌握程度 (0-100)
    confidence: number; // 置信度 (0-1)
    lastPracticed: Date; // 最后练习时间
    problemsSolved: number; // 相关题目解决数量
    problemsAttempted: number; // 相关题目尝试数量
    averageScore: number; // 平均得分
    averageTime: number; // 平均用时
    strengthAreas: string[]; // 优势子领域
    weaknessAreas: string[]; // 薄弱子领域
    updatedAt: Date; // 更新时间
}

// 学习分析结果缓存
export interface AnalysisCache {
    _id?: ObjectId;
    uid: number; // 用户ID
    domainId: string; // 域ID
    analysisType: string; // 分析类型
    timeRange: string; // 时间范围
    result: any; // 分析结果JSON
    computedAt: Date; // 计算时间
    expiresAt: Date; // 过期时间
}

// 推荐记录接口
export interface RecommendationRecord {
    _id?: ObjectId;
    uid: number; // 用户ID
    domainId: string; // 域ID
    recommendationType: string; // 推荐类型
    problemIds: number[]; // 推荐题目ID列表
    reasons: string[]; // 推荐理由
    priority: number; // 优先级 (1-10)
    status: 'pending' | 'viewed' | 'attempted' | 'completed'; // 状态
    generatedAt: Date; // 生成时间
    viewedAt?: Date; // 查看时间
    completedAt?: Date; // 完成时间
}

// 学习统计摘要
export interface LearningStatsSummary {
    uid: number;
    domainId: string;
    totalProblems: number; // 总题目数
    solvedProblems: number; // 已解决题目数
    successRate: number; // 成功率
    averageAttempts: number; // 平均尝试次数
    averageSolutionTime: number; // 平均解题时间
    favoriteLanguage: string; // 偏好编程语言
    activeDays: number; // 活跃天数
    totalStudyTime: number; // 总学习时间
    streakDays: number; // 连续学习天数
    lastActiveDate: Date; // 最后活跃时间
}

// 学习进度趋势
export interface LearningProgressTrend {
    date: string; // 日期 YYYY-MM-DD
    problemsSolved: number; // 当日解决题目数
    successRate: number; // 当日成功率
    averageTime: number; // 当日平均用时
    studyTime: number; // 当日学习时长
    knowledgeGrowth: number; // 知识点增长数
}

// 错误模式分析
export interface ErrorPattern {
    errorType: string; // 错误类型
    frequency: number; // 出现频率
    description: string; // 错误描述
    suggestions: string[]; // 改进建议
    relatedKnowledgePoints: string[]; // 相关知识点
    examples: string[]; // 错误示例
}

// 学习效率分析
export interface EfficiencyAnalysis {
    uid: number;
    domainId: string;
    timeDistribution: { // 时间分布分析
        peakHours: number[]; // 高效时段
        totalHours: number; // 总学习时间
        effectiveHours: number; // 有效学习时间
    };
    difficultyProgression: { // 难度进阶分析
        currentLevel: number; // 当前水平
        recommendedLevel: number; // 建议水平
        progressRate: number; // 进步速度
    };
    learningVelocity: { // 学习速度分析
        problemsPerHour: number; // 每小时解题数
        conceptsPerWeek: number; // 每周掌握概念数
        improvementRate: number; // 改进速度
    };
}

// 同伴对比分析
export interface PeerComparison {
    uid: number;
    domainId: string;
    userRank: number; // 用户排名
    totalUsers: number; // 总用户数
    percentile: number; // 百分位数
    strongerAreas: string[]; // 优势领域
    weakerAreas: string[]; // 劣势领域
    similarPeers: number[]; // 相似水平同伴ID
    benchmarkMetrics: { // 基准指标对比
        avgSolutionTime: number; // 平均解题时间
        avgSuccessRate: number; // 平均成功率
        avgProblemsSolved: number; // 平均解题数量
    };
}

// 智能推荐配置
export interface RecommendationConfig {
    enabled: boolean; // 是否启用
    maxRecommendations: number; // 最大推荐数量
    refreshInterval: number; // 刷新间隔（小时）
    algorithms: { // 推荐算法配置
        knowledgeBased: boolean; // 基于知识点推荐
        difficultyBased: boolean; // 基于难度推荐
        peerBased: boolean; // 基于同伴推荐
        sequenceBased: boolean; // 基于学习序列推荐
    };
    weights: { // 推荐权重配置
        masteryLevel: number; // 掌握程度权重
        recentPerformance: number; // 最近表现权重
        errorPattern: number; // 错误模式权重
        timeSpent: number; // 时间投入权重
    };
}

// 学情分析配置
export interface LearningAnalysisConfig {
    enabled: boolean; // 是否启用
    dataRetention: number; // 数据保留天数
    cacheExpiration: number; // 缓存过期时间（分钟）
    analysisDepth: 'basic' | 'advanced' | 'comprehensive'; // 分析深度
    updateFrequency: 'realtime' | 'hourly' | 'daily'; // 更新频率
    recommendation: RecommendationConfig; // 推荐配置
}
