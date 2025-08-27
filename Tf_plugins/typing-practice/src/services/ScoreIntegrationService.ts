import { Context } from 'hydrooj';
import {
    DifficultyLevel,
    TypingAchievement,
    TypingResult,
    TypingUserStats } from '../types/typing';
import { TypingService } from './TypingService';

// 定义积分记录类型（与score-system插件兼容）
interface ScoreRecord {
    uid: number;
    domainId: string;
    score: number;
    reason: string;
    source?: string;
    createdAt?: Date;
}

export class ScoreIntegrationService {
    private scoreService: any = null;
    private isScoreSystemAvailable = false;

    constructor(private typingService: TypingService, private ctx: Context) {
        this.initializeScoreSystem();
    }

    /**
     * 初始化积分系统集成
     */
    private async initializeScoreSystem(): Promise<void> {
        try {
            // 尝试检测score-system插件是否可用
            // 这里我们检查是否存在相关的数据库集合
            const collections = await this.ctx.db.db.listCollections().toArray();
            const hasScoreCollections = collections.some((col) =>
                col.name === 'score.records' || col.name === 'score.users',
            );

            if (hasScoreCollections) {
                this.isScoreSystemAvailable = true;
                console.log('[ScoreIntegrationService] Score system detected and enabled');
            } else {
                console.log('[ScoreIntegrationService] Score system not available, using standalone mode');
            }
        } catch (error) {
            console.warn('[ScoreIntegrationService] Error initializing score system:', error.message);
            this.isScoreSystemAvailable = false;
        }
    }

    /**
     * 处理打字练习完成，计算和分配积分
     */
    public async processTypingCompletion(
        uid: number,
        domainId: string,
        result: TypingResult,
        originalText: string,
        userInput: string,
    ): Promise<{
        score: number;
        achievements: TypingAchievement[];
        totalScore: number;
        levelUp?: boolean;
        newLevel?: number;
    }> {
        try {
            // 验证结果的合理性
            if (!this.typingService.validateResult(result, originalText, userInput)) {
                throw new Error('Invalid typing result data');
            }

            // 计算基础积分
            const baseScore = this.typingService.calculateScore(result);

            // 获取用户当前统计
            const userStats = await this.typingService.getUserStats(domainId, uid);
            const oldLevel = userStats.level;

            // 检查成就
            const achievements = await this.typingService.checkAchievements(domainId, uid, result, userStats);
            const achievementScore = achievements.reduce((sum, ach) => sum + ach.reward.score, 0);

            // 检查连续练习奖励
            const streakBonus = await this.calculateStreakBonus(userStats);

            // 检查完美练习奖励
            const perfectionBonus = this.calculatePerfectionBonus(result);

            // 检查个人记录突破奖励
            const recordBonus = this.calculateRecordBonus(result, userStats);

            const totalEarned = baseScore + achievementScore + streakBonus + perfectionBonus + recordBonus;

            // 更新用户统计（这会更新总积分和等级）
            const updatedStats = await this.typingService.updateUserStats(domainId, uid, result, totalEarned);

            // 如果积分系统可用，同步积分到主积分系统
            if (this.isScoreSystemAvailable && totalEarned > 0) {
                await this.syncScoreToMainSystem(domainId, uid, totalEarned, result);
            }

            // 记录积分详情日志
            this.logScoreBreakdown(uid, {
                baseScore,
                achievementScore,
                streakBonus,
                perfectionBonus,
                recordBonus,
                totalEarned,
            });

            return {
                score: totalEarned,
                achievements,
                totalScore: updatedStats.totalScore,
                levelUp: updatedStats.level > oldLevel,
                newLevel: updatedStats.level > oldLevel ? updatedStats.level : undefined,
            };
        } catch (error) {
            console.error('[ScoreIntegrationService] Error processing typing completion:', error);
            throw error;
        }
    }

    /**
     * 计算连续练习奖励
     */
    private async calculateStreakBonus(userStats: TypingUserStats): Promise<number> {
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = userStats.practiceHistory.find((h) => h.date === today);
        const practiceToday = todayRecord ? todayRecord.practices : 0;

        // 计算当前连续天数
        let currentStreak = 0;
        let checkDate = today;

        for (const record of userStats.practiceHistory.sort((a, b) => b.date.localeCompare(a.date))) {
            if (record.date === checkDate && record.practices > 0) {
                currentStreak++;
                const currentDate = new Date(checkDate);
                currentDate.setDate(currentDate.getDate() - 1);
                checkDate = currentDate.toISOString().split('T')[0];
            } else {
                break;
            }
        }

        // 连续练习奖励规则
        const streakBonusMap: Record<number, number> = {
            3: 10, // 连续3天
            7: 25, // 连续7天
            14: 50, // 连续14天
            30: 100, // 连续30天
        };

        // 只在达到里程碑的那一天给奖励，且今天是第一次练习
        if (practiceToday === 1) {
            return streakBonusMap[currentStreak] || 0;
        }

        return 0;
    }

    /**
     * 计算完美练习奖励
     */
    private calculatePerfectionBonus(result: TypingResult): number {
        let bonus = 0;

        // 完美准确率奖励
        if (result.accuracy === 100) {
            bonus += 20;
        } else if (result.accuracy >= 99) {
            bonus += 10;
        } else if (result.accuracy >= 98) {
            bonus += 5;
        }

        // 高速度+高准确率组合奖励
        if (result.wpm >= 60 && result.accuracy >= 95) {
            bonus += 15;
        } else if (result.wpm >= 80 && result.accuracy >= 90) {
            bonus += 25;
        } else if (result.wpm >= 100 && result.accuracy >= 85) {
            bonus += 35;
        }

        return bonus;
    }

    /**
     * 计算个人记录突破奖励
     */
    private calculateRecordBonus(result: TypingResult, userStats: TypingUserStats): number {
        let bonus = 0;

        // WPM个人记录突破
        if (result.wpm > userStats.bestWPM) {
            const improvement = result.wpm - userStats.bestWPM;
            bonus += Math.floor(improvement / 5) * 5; // 每提高5WPM奖励5分
        }

        // 准确率个人记录突破
        if (result.accuracy > userStats.bestAccuracy) {
            const improvement = result.accuracy - userStats.bestAccuracy;
            bonus += Math.floor(improvement) * 2; // 每提高1%准确率奖励2分
        }

        return bonus;
    }

    /**
     * 同步积分到主积分系统
     */
    private async syncScoreToMainSystem(
        domainId: string,
        uid: number,
        score: number,
        result: TypingResult,
    ): Promise<void> {
        try {
            const scoreRecord: ScoreRecord = {
                uid,
                domainId,
                score,
                reason: `打字练习完成 - WPM:${result.wpm} 准确率:${result.accuracy.toFixed(1)}% 难度:${result.difficulty}`,
                source: 'typing_practice',
                createdAt: new Date(),
            };

            // 添加积分记录
            await this.ctx.db.collection('score.records' as any).insertOne(scoreRecord);

            // 更新用户总积分
            // 更新用户总积分
            await this.ctx.db.collection('score.users' as any).updateOne(
                { domainId, uid },
                {
                    $inc: { totalScore: score },
                    $set: { lastUpdated: new Date() },
                },
                { upsert: true },
            );

            console.log(`[ScoreIntegrationService] Synced ${score} points to main score system for user ${uid}`);
        } catch (error) {
            console.error('[ScoreIntegrationService] Error syncing score to main system:', error);
            // 不抛出错误，因为这只是同步功能，不应影响主流程
        }
    }

    /**
     * 记录积分分解日志
     */
    private logScoreBreakdown(uid: number, breakdown: {
        baseScore: number;
        achievementScore: number;
        streakBonus: number;
        perfectionBonus: number;
        recordBonus: number;
        totalEarned: number;
    }): void {
        console.log(`[ScoreIntegrationService] Score breakdown for user ${uid}:`);
        console.log(`  Base Score: ${breakdown.baseScore}`);

        if (breakdown.achievementScore > 0) {
            console.log(`  Achievement Bonus: ${breakdown.achievementScore}`);
        }

        if (breakdown.streakBonus > 0) {
            console.log(`  Streak Bonus: ${breakdown.streakBonus}`);
        }

        if (breakdown.perfectionBonus > 0) {
            console.log(`  Perfection Bonus: ${breakdown.perfectionBonus}`);
        }

        if (breakdown.recordBonus > 0) {
            console.log(`  Record Bonus: ${breakdown.recordBonus}`);
        }

        console.log(`  Total Earned: ${breakdown.totalEarned}`);
    }

    /**
     * 获取积分系统状态
     */
    public getScoreSystemStatus(): {
        available: boolean;
        integration: 'full' | 'standalone' | 'disabled';
    } {
        return {
            available: this.isScoreSystemAvailable,
            integration: this.isScoreSystemAvailable ? 'full' : 'standalone',
        };
    }

    /**
     * 计算用户在打字练习中的积分排名
     */
    public async getUserScoreRank(domainId: string, uid: number): Promise<{
        rank: number;
        totalUsers: number;
        percentile: number;
    }> {
        try {
            const pipeline = [
                { $match: { domainId } },
                { $sort: { totalScore: -1 } },
                {
                    $group: {
                        _id: null,
                        users: { $push: { uid: '$uid', totalScore: '$totalScore' } },
                        totalUsers: { $sum: 1 },
                    },
                },
            ];

            const result = await this.ctx.db.collection('typing.stats' as any).aggregate(pipeline).toArray();

            if (!result || result.length === 0) {
                return { rank: 1, totalUsers: 1, percentile: 100 };
            }

            const data = result[0];
            const userIndex = data.users.findIndex((u: any) => u.uid === uid);

            if (userIndex === -1) {
                return { rank: data.totalUsers, totalUsers: data.totalUsers, percentile: 0 };
            }

            const rank = userIndex + 1;
            const percentile = Math.round(((data.totalUsers - rank) / data.totalUsers) * 100);

            return { rank, totalUsers: data.totalUsers, percentile };
        } catch (error) {
            console.error('[ScoreIntegrationService] Error calculating user rank:', error);
            return { rank: 1, totalUsers: 1, percentile: 100 };
        }
    }

    /**
     * 获取用户可获得的潜在积分（基于当前表现）
     */
    public calculatePotentialScore(result: TypingResult, _userStats: TypingUserStats): {
        current: number;
        potential: number;
        improvementTips: string[];
    } {
        const current = this.typingService.calculateScore(result);
        let potential = current;
        const tips: string[] = [];

        // 准确率改进建议
        if (result.accuracy < 95) {
            const accuracyImprovement = 95 - result.accuracy;
            potential += Math.floor(accuracyImprovement / 5) * 5;
            tips.push(`提高准确率到95%可额外获得${Math.floor(accuracyImprovement / 5) * 5}积分`);
        }

        // 速度改进建议
        const nextSpeedMilestone = result.wpm < 40 ? 40 : result.wpm < 60 ? 60 : result.wpm < 80 ? 80 : 100;
        if (result.wpm < nextSpeedMilestone) {
            const speedBonus = nextSpeedMilestone === 40 ? 5 : nextSpeedMilestone === 60 ? 10 : nextSpeedMilestone === 80 ? 15 : 20;
            potential += speedBonus;
            tips.push(`提高速度到${nextSpeedMilestone}WPM可额外获得${speedBonus}积分`);
        }

        // 难度提升建议
        if (result.difficulty !== DifficultyLevel.EXPERT) {
            const difficultyBonus = Math.floor(current * 0.5);
            potential += difficultyBonus;
            tips.push(`尝试更高难度文本可额外获得${difficultyBonus}积分`);
        }

        return { current, potential, improvementTips: tips };
    }
}
