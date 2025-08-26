import { Handler, param, query, Types, ValidationError, PRIV } from 'hydrooj';
import {
    TypingResult,
    TypingRecord,
    DifficultyLevel,
    TextType,
    TypingConfig,
    TypingPracticeResponse
} from '../types/typing';
import { TypingService } from '../services/TypingService';
import { TextGeneratorService } from '../services/TextGeneratorService';
import { ScoreIntegrationService } from '../services/ScoreIntegrationService';
import { DEFAULT_CONFIG } from './config';

export class TypingPracticeHandler extends Handler {
    private get typingService(): TypingService {
        return new TypingService(DEFAULT_CONFIG, this.ctx);
    }
    
    private get textGeneratorService(): TextGeneratorService {
        return new TextGeneratorService(DEFAULT_CONFIG);
    }
    
    private get scoreIntegrationService(): ScoreIntegrationService | null {
        try {
            const typingService = new TypingService(DEFAULT_CONFIG, this.ctx);
            return new ScoreIntegrationService(typingService, this.ctx);
        } catch (error) {
            console.warn('Score system not available:', error.message);
            return null;
        }
    }
    
    private get config(): TypingConfig {
        return DEFAULT_CONFIG;
    }

    /**
     * GET /typing - 显示打字练习页面
     * GET /typing/data - 返回JSON数据
     */
    async get() {
        // 检查用户是否登录
        this.checkPriv(PRIV.PRIV_USER_PROFILE);

        // 如果是数据API请求，返回JSON
        if (this.request.path === '/typing/data') {
            return this.getData();
        }

        try {
            // 获取用户统计信息
            const userStats = await this.typingService.getUserStats(this.domain._id, this.user._id);
            
            // 获取排行榜信息
            const leaderboard = await this.typingService.getLeaderboard(this.domain._id, 'wpm', 10);
            
            // 获取积分系统状态
            const scoreSystemStatus = this.scoreIntegrationService?.getScoreSystemStatus() || {
                available: false,
                integration: 'disabled'
            };

            // 获取推荐文本
            const recommendedTextData = this.textGeneratorService.getRecommendedText({
                averageWPM: userStats.averageWPM,
                averageAccuracy: userStats.averageAccuracy,
                level: userStats.level
            });

            // 确保推荐文本有正确的数据结构
            const recommendedText = {
                text: recommendedTextData.text || "The quick brown fox jumps over the lazy dog.",
                difficulty: recommendedTextData.difficulty || DifficultyLevel.BEGINNER,
                type: recommendedTextData.type || TextType.ENGLISH,
                reason: recommendedTextData.reason || "Default text for beginners"
            };

            // 构建难度选项（带有友好名称）
            const difficultyOptions = Object.values(DifficultyLevel).map(level => ({
                value: level,
                title: level.charAt(0).toUpperCase() + level.slice(1).replace('_', ' ')
            }));

            // 构建文本类型选项
            const textTypeOptions = Object.values(TextType).map(type => ({
                value: type,
                title: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
            }));

            // Ensure all data has safe defaults for JSON serialization
            const cleanUserStats = JSON.parse(JSON.stringify({
                ...userStats,
                achievements: userStats.achievements || [],
                practiceHistory: userStats.practiceHistory || [],
                commonErrors: userStats.commonErrors || [],
                progressChart: userStats.progressChart || [],
                createdAt: userStats.createdAt ? userStats.createdAt.toISOString() : new Date().toISOString(),
                updatedAt: userStats.updatedAt ? userStats.updatedAt.toISOString() : new Date().toISOString(),
                lastPracticeAt: userStats.lastPracticeAt ? userStats.lastPracticeAt.toISOString() : null
            }));

            const cleanLeaderboard = JSON.parse(JSON.stringify(leaderboard || []));
            
            this.response.template = 'typing_practice.html';
            this.response.body = {
                userStats: cleanUserStats,
                leaderboard: cleanLeaderboard,
                scoreSystemStatus,
                recommendedText,
                config: this.config,
                difficulties: difficultyOptions,
                textTypes: textTypeOptions,
                page_name: 'typing_practice'
            };
        } catch (error) {
            console.error('[TypingPracticeHandler] Error loading practice page:', error);
            throw new Error('Failed to load typing practice page');
        }
    }

    /**
     * POST /typing - 提交打字练习结果
     */
    @param('originalText', Types.String)
    @param('userInput', Types.String)
    @param('result', Types.ObjectId)
    async postSubmitResult(domainId: string, originalText: string, userInput: string, result: TypingResult) {
        this.checkPriv(PRIV.PRIV_USER_PROFILE);

        try {
            // 验证输入数据
            if (!originalText || !userInput || !result) {
                throw new ValidationError('Missing required data');
            }

            // 验证结果的合理性
            if (!this.typingService.validateResult(result, originalText, userInput)) {
                throw new ValidationError('Invalid typing result data');
            }

            // 检查文本长度限制
            if (originalText.length > this.config.maxTextLength) {
                throw new ValidationError(`Text length exceeds maximum limit of ${this.config.maxTextLength} characters`);
            }

            // 检查最低准确率要求
            if (result.accuracy < this.config.minAccuracy) {
                throw new ValidationError(`Accuracy must be at least ${this.config.minAccuracy}%`);
            }

            let scoreResult = {
                score: 0,
                achievements: [] as any[],
                totalScore: 0,
                levelUp: false,
                newLevel: undefined
            };

            // 如果启用积分集成，处理积分奖励
            if (this.config.scoreIntegration && this.scoreIntegrationService) {
                scoreResult = await this.scoreIntegrationService.processTypingCompletion(
                    this.user._id,
                    domainId,
                    result,
                    originalText,
                    userInput
                );
            } else {
                // 即使不集成积分系统，也要更新基本统计
                const baseScore = this.typingService.calculateScore(result);
                const updatedStats = await this.typingService.updateUserStats(domainId, this.user._id, result, baseScore);
                const achievements = await this.typingService.checkAchievements(domainId, this.user._id, result, updatedStats);
                
                scoreResult = {
                    score: baseScore,
                    achievements: achievements as any[],
                    totalScore: updatedStats.totalScore,
                    levelUp: false,
                    newLevel: undefined
                };
            }

            // 创建练习记录
            const record: TypingRecord = {
                uid: this.user._id,
                domainId,
                originalText,
                userInput,
                difficulty: result.difficulty,
                textType: result.textType,
                result,
                scoreEarned: scoreResult.score,
                achievementsUnlocked: scoreResult.achievements.map((a: any) => a.id),
                createdAt: new Date(),
                completedAt: new Date(),
                metadata: {
                    userAgent: this.request.headers['user-agent'],
                    screen: this.request.body.screenInfo || undefined
                }
            };

            // 保存练习记录
            await this.typingService.savePracticeRecord(record);

            const response: TypingPracticeResponse = {
                success: true,
                data: {
                    result,
                    score: scoreResult.score,
                    achievements: scoreResult.achievements,
                    stats: await this.typingService.getUserStats(domainId, this.user._id)
                }
            };

            this.response.body = response;

            // 记录成功日志
            console.log(`[TypingPracticeHandler] User ${this.user._id} completed practice: ${result.wpm}WPM, ${result.accuracy}% accuracy, earned ${scoreResult.score} points`);
        } catch (error) {
            console.error('[TypingPracticeHandler] Error processing practice result:', error);
            
            const response: TypingPracticeResponse = {
                success: false,
                error: {
                    code: error.name || 'PROCESSING_ERROR',
                    message: error.message || 'Failed to process typing result'
                }
            };
            
            this.response.body = response;
        }
    }

    /**
     * POST /typing/text - 生成新的练习文本
     */
    @query('difficulty', Types.String, true)
    @query('textType', Types.String, true)
    @query('customText', Types.String, true)
    @query('minLength', Types.Int, true)
    @query('maxLength', Types.Int, true)
    async postGenerateText(domainId: string, difficulty?: string, textType?: string, customText?: string, minLength?: number, maxLength?: number) {
        this.checkPriv(PRIV.PRIV_USER_PROFILE);

        try {
            // 验证和设置默认参数
            const validDifficulty = Object.values(DifficultyLevel).includes(difficulty as DifficultyLevel) 
                ? (difficulty as DifficultyLevel) 
                : DifficultyLevel.BEGINNER;
            
            const validTextType = Object.values(TextType).includes(textType as TextType)
                ? (textType as TextType)
                : TextType.ENGLISH;

            let generatedText: string;

            if (customText && customText.trim()) {
                // 验证自定义文本
                const validation = this.textGeneratorService.validateText(customText.trim());
                if (!validation.valid) {
                    throw new ValidationError(`Invalid custom text: ${validation.issues.join(', ')}`);
                }
                generatedText = customText.trim();
            } else if (minLength && maxLength) {
                // 根据长度要求生成文本
                generatedText = this.textGeneratorService.generateTextByLength(
                    minLength,
                    Math.min(maxLength, this.config.maxTextLength),
                    validDifficulty,
                    validTextType
                );
            } else {
                // 标准文本生成
                generatedText = this.textGeneratorService.generateText(validDifficulty, validTextType);
            }

            // 分析文本难度
            const textAnalysis = this.textGeneratorService.analyzeTextDifficulty(generatedText);

            const response: TypingPracticeResponse = {
                success: true,
                data: {
                    text: generatedText,
                    difficulty: textAnalysis.estimatedDifficulty,
                    textType: validTextType,
                    analysis: textAnalysis.metrics
                }
            };

            this.response.body = response;
        } catch (error) {
            console.error('[TypingPracticeHandler] Error generating text:', error);
            
            const response: TypingPracticeResponse = {
                success: false,
                error: {
                    code: error.name || 'TEXT_GENERATION_ERROR',
                    message: error.message || 'Failed to generate practice text'
                }
            };
            
            this.response.body = response;
        }
    }

    /**
     * GET /typing/leaderboard - 获取排行榜
     */
    @query('type', Types.String, true)
    @query('limit', Types.Int, true)
    async getLeaderboard(domainId: string, type: string = 'wpm', limit: number = 10) {
        try {
            // 验证排行榜类型
            const validTypes = ['wpm', 'accuracy', 'score'];
            const leaderboardType = validTypes.includes(type) ? type : 'wpm';
            
            // 限制查询数量
            const queryLimit = Math.min(Math.max(limit, 1), 50);
            
            const leaderboard = await this.typingService.getLeaderboard(
                domainId, 
                leaderboardType as 'wpm' | 'accuracy' | 'score', 
                queryLimit
            );

            const response: TypingPracticeResponse = {
                success: true,
                data: {
                    leaderboard,
                    type: leaderboardType,
                    total: leaderboard.length
                }
            };

            this.response.body = response;
        } catch (error) {
            console.error('[TypingPracticeHandler] Error fetching leaderboard:', error);
            
            const response: TypingPracticeResponse = {
                success: false,
                error: {
                    code: 'LEADERBOARD_ERROR',
                    message: 'Failed to fetch leaderboard data'
                }
            };
            
            this.response.body = response;
        }
    }

    /**
     * GET /typing/history - 获取用户练习历史
     */
    @query('limit', Types.Int, true)
    async getHistory(domainId: string, limit: number = 20) {
        this.checkPriv(PRIV.PRIV_USER_PROFILE);

        try {
            const queryLimit = Math.min(Math.max(limit, 1), 100);
            const history = await this.typingService.getUserPracticeHistory(
                domainId,
                this.user._id,
                queryLimit
            );

            const response: TypingPracticeResponse = {
                success: true,
                data: {
                    history,
                    total: history.length
                }
            };

            this.response.body = response;
        } catch (error) {
            console.error('[TypingPracticeHandler] Error fetching practice history:', error);
            
            const response: TypingPracticeResponse = {
                success: false,
                error: {
                    code: 'HISTORY_ERROR',
                    message: 'Failed to fetch practice history'
                }
            };
            
            this.response.body = response;
        }
    }

    /**
     * GET /typing/data - 获取页面数据API
     */
    async getData() {
        this.checkPriv(PRIV.PRIV_USER_PROFILE);

        try {
            const domainId = this.domain._id;
            const uid = this.user._id;

            // 获取用户统计信息
            const userStats = await this.typingService.getUserStats(domainId, uid);
            
            // 获取排行榜信息
            const leaderboard = await this.typingService.getLeaderboard(domainId, 'wpm', 10);

            const response: TypingPracticeResponse = {
                success: true,
                data: {
                    userStats,
                    leaderboard
                }
            };

            this.response.body = response;
        } catch (error) {
            console.error('[TypingPracticeHandler] Error fetching data:', error);
            
            const response: TypingPracticeResponse = {
                success: false,
                error: {
                    code: 'DATA_FETCH_ERROR',
                    message: 'Failed to fetch typing practice data'
                }
            };
            
            this.response.body = response;
        }
    }

    /**
     * GET /typing/recommendations - 获取个性化推荐
     */
    async getRecommendations(domainId: string) {
        this.checkPriv(PRIV.PRIV_USER_PROFILE);

        try {
            const userStats = await this.typingService.getUserStats(domainId, this.user._id);
            
            // 获取推荐文本
            const recommendation = this.textGeneratorService.getRecommendedText({
                averageWPM: userStats.averageWPM,
                averageAccuracy: userStats.averageAccuracy,
                level: userStats.level
            });

            // 获取潜在积分信息（如果启用积分系统）
            let potentialScore = null;
            if (this.config.scoreIntegration && this.scoreIntegrationService) {
                // 创建一个虚拟结果用于计算潜在积分
                const mockResult: TypingResult = {
                    wpm: userStats.averageWPM,
                    accuracy: userStats.averageAccuracy,
                    errors: 0,
                    timeSpent: 60,
                    textLength: recommendation.text.length,
                    difficulty: recommendation.difficulty,
                    textType: recommendation.type,
                    completedWords: Math.floor(recommendation.text.length / 5),
                    keystrokeCount: recommendation.text.length,
                    correctKeystrokes: Math.floor(recommendation.text.length * userStats.averageAccuracy / 100)
                };
                
                potentialScore = this.scoreIntegrationService.calculatePotentialScore(mockResult, userStats) as any;
            }

            const response: TypingPracticeResponse = {
                success: true,
                data: {
                    text: recommendation.text,
                    difficulty: recommendation.difficulty,
                    textType: recommendation.type,
                    reason: recommendation.reason,
                    userStats: {
                        level: userStats.level,
                        averageWPM: userStats.averageWPM,
                        averageAccuracy: userStats.averageAccuracy,
                        totalPractices: userStats.totalPractices
                    },
                    potentialScore
                }
            };

            this.response.body = response;
        } catch (error) {
            console.error('[TypingPracticeHandler] Error generating recommendations:', error);
            
            const response: TypingPracticeResponse = {
                success: false,
                error: {
                    code: 'RECOMMENDATION_ERROR',
                    message: 'Failed to generate recommendations'
                }
            };
            
            this.response.body = response;
        }
    }
}