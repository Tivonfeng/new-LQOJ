import { Context } from 'hydrooj';
import {
    TypingConfig,
    TypingResult,
    TypingRecord,
    TypingUserStats,
    TypingAchievement,
    TypingSession,
    DifficultyLevel,
    TextType,
    TypingLeaderboardEntry
} from '../types/typing';

export class TypingService {
    constructor(private config: TypingConfig, private ctx: Context) {}

    /**
     * 计算打字结果分数
     */
    public calculateScore(result: TypingResult): number {
        let baseScore = 10; // 基础完成积分
        
        // 准确率奖励
        if (result.accuracy >= 98) {
            baseScore += 20; // 极高准确率
        } else if (result.accuracy >= 95) {
            baseScore += 15; // 高准确率
        } else if (result.accuracy >= 90) {
            baseScore += 10; // 良好准确率
        } else if (result.accuracy >= 85) {
            baseScore += 5; // 基本准确率
        } else if (result.accuracy < this.config.minAccuracy) {
            baseScore = Math.max(1, baseScore - 5); // 准确率过低扣分
        }
        
        // 速度奖励
        if (result.wpm >= 100) {
            baseScore += 25; // 极高速度
        } else if (result.wpm >= 80) {
            baseScore += 20; // 高速度
        } else if (result.wpm >= 60) {
            baseScore += 15; // 良好速度
        } else if (result.wpm >= 40) {
            baseScore += 10; // 中等速度
        } else if (result.wpm >= 20) {
            baseScore += 5; // 基础速度
        }
        
        // 难度奖励
        const difficultyMultiplier = {
            [DifficultyLevel.BEGINNER]: 1.0,
            [DifficultyLevel.INTERMEDIATE]: 1.2,
            [DifficultyLevel.ADVANCED]: 1.5,
            [DifficultyLevel.EXPERT]: 2.0
        };
        baseScore *= difficultyMultiplier[result.difficulty] || 1.0;
        
        // 文本长度奖励（每50个字符+1分）
        const lengthBonus = Math.floor(result.textLength / 50);
        baseScore += lengthBonus;
        
        // 文本类型奖励
        if (result.textType === TextType.PROGRAMMING) {
            baseScore *= 1.3; // 编程文本额外奖励
        } else if (result.textType === TextType.CHINESE) {
            baseScore *= 1.2; // 中文文本额外奖励
        }
        
        return Math.round(baseScore);
    }

    /**
     * 保存打字练习记录
     */
    public async savePracticeRecord(record: TypingRecord): Promise<string> {
        try {
            const insertResult = await this.ctx.db.collection('typing.records' as any).insertOne({
                ...record,
                createdAt: new Date(),
            });
            
            console.log(`[TypingService] Practice record saved for user ${record.uid}`);
            return insertResult.insertedId.toString();
        } catch (error) {
            console.error('[TypingService] Error saving practice record:', error);
            throw new Error('Failed to save practice record');
        }
    }

    /**
     * 获取或创建用户统计信息
     */
    public async getUserStats(domainId: string, uid: number): Promise<TypingUserStats> {
        try {
            const existingStats = await this.ctx.db.collection('typing.stats' as any).findOne({
                domainId,
                uid
            });
            
            if (existingStats) {
                return existingStats as TypingUserStats;
            }
        } catch (error) {
            // 如果不存在，创建新的统计记录
        }

        // 创建新的用户统计
        const newStats: TypingUserStats = {
            uid,
            domainId,
            totalPractices: 0,
            totalTimeSpent: 0,
            totalScore: 0,
            totalKeystrokes: 0,
            bestWPM: 0,
            bestAccuracy: 0,
            longestStreak: 0,
            averageWPM: 0,
            averageAccuracy: 0,
            averageTimePerPractice: 0,
            achievements: [],
            level: 1,
            experiencePoints: 0,
            preferredDifficulty: DifficultyLevel.BEGINNER,
            preferredTextType: TextType.ENGLISH,
            practiceHistory: [],
            commonErrors: [],
            progressChart: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await this.ctx.db.collection('typing.stats' as any).insertOne({
            ...newStats,
            domainId,
            uid
        });

        return newStats;
    }

    /**
     * 更新用户统计信息
     */
    public async updateUserStats(
        domainId: string,
        uid: number,
        result: TypingResult,
        scoreEarned: number
    ): Promise<TypingUserStats> {
        const stats = await this.getUserStats(domainId, uid);
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // 更新基本统计
        stats.totalPractices += 1;
        stats.totalTimeSpent += result.timeSpent;
        stats.totalScore += scoreEarned;
        stats.totalKeystrokes += result.keystrokeCount;

        // 更新最佳记录
        if (result.wpm > stats.bestWPM) {
            stats.bestWPM = result.wpm;
        }
        if (result.accuracy > stats.bestAccuracy) {
            stats.bestAccuracy = result.accuracy;
        }

        // 重新计算平均值
        stats.averageWPM = Math.round(
            (stats.averageWPM * (stats.totalPractices - 1) + result.wpm) / stats.totalPractices
        );
        stats.averageAccuracy = Math.round(
            (stats.averageAccuracy * (stats.totalPractices - 1) + result.accuracy) / stats.totalPractices
        );
        stats.averageTimePerPractice = Math.round(stats.totalTimeSpent / stats.totalPractices);

        // 更新等级和经验值
        stats.experiencePoints += scoreEarned;
        const newLevel = Math.floor(stats.experiencePoints / 100) + 1;
        if (newLevel > stats.level) {
            stats.level = newLevel;
            console.log(`[TypingService] User ${uid} leveled up to ${newLevel}!`);
        }

        // 更新偏好设置
        stats.preferredDifficulty = result.difficulty;
        stats.preferredTextType = result.textType;

        // 更新练习历史
        let todayRecord = stats.practiceHistory.find(h => h.date === today);
        if (!todayRecord) {
            todayRecord = {
                date: today,
                practices: 0,
                totalTime: 0,
                bestWPM: 0,
                score: 0
            };
            stats.practiceHistory.push(todayRecord);
        }
        
        todayRecord.practices += 1;
        todayRecord.totalTime += result.timeSpent;
        todayRecord.bestWPM = Math.max(todayRecord.bestWPM, result.wpm);
        todayRecord.score += scoreEarned;

        // 保持历史记录最多30天
        stats.practiceHistory = stats.practiceHistory
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 30);

        // 更新进步曲线
        stats.progressChart.push({
            date: today,
            wpm: result.wpm,
            accuracy: result.accuracy
        });
        
        // 保持进步曲线最多100个记录点
        if (stats.progressChart.length > 100) {
            stats.progressChart = stats.progressChart.slice(-100);
        }

        // 更新连续练习天数
        await this.updatePracticeStreak(stats);

        // 更新时间戳
        stats.updatedAt = now;
        stats.lastPracticeAt = now;

        // 保存更新后的统计
        await this.ctx.db.collection('typing.stats' as any).updateOne(
            { domainId, uid },
            { $set: stats },
            { upsert: true }
        );

        return stats;
    }

    /**
     * 更新用户连续练习天数
     */
    private async updatePracticeStreak(stats: TypingUserStats): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // 按日期排序历史记录
        const sortedHistory = stats.practiceHistory.sort((a, b) => b.date.localeCompare(a.date));
        
        let currentStreak = 0;
        let checkDate = today;
        
        for (const record of sortedHistory) {
            if (record.date === checkDate && record.practices > 0) {
                currentStreak++;
                // 检查前一天
                const currentDate = new Date(checkDate);
                currentDate.setDate(currentDate.getDate() - 1);
                checkDate = currentDate.toISOString().split('T')[0];
            } else {
                break;
            }
        }
        
        if (currentStreak > stats.longestStreak) {
            stats.longestStreak = currentStreak;
        }
    }

    /**
     * 检查并解锁成就
     */
    public async checkAchievements(
        domainId: string,
        uid: number,
        result: TypingResult,
        stats: TypingUserStats
    ): Promise<TypingAchievement[]> {
        const unlockedAchievements: TypingAchievement[] = [];
        
        // 预定义的成就列表
        const achievements = await this.getAchievementDefinitions();
        
        for (const achievement of achievements) {
            // 检查用户是否已经拥有这个成就
            if (stats.achievements.includes(achievement.id)) {
                continue;
            }
            
            // 检查成就条件
            const meetsRequirements = achievement.requirements.every(req => {
                switch (req.type) {
                    case 'wpm':
                        return this.compareValue(result.wpm, req.value, req.comparison);
                    case 'accuracy':
                        return this.compareValue(result.accuracy, req.value, req.comparison);
                    case 'practice_count':
                        return this.compareValue(stats.totalPractices, req.value, req.comparison);
                    case 'streak':
                        return this.compareValue(stats.longestStreak, req.value, req.comparison);
                    case 'time_spent':
                        return this.compareValue(stats.totalTimeSpent, req.value, req.comparison);
                    default:
                        return false;
                }
            });
            
            if (meetsRequirements) {
                unlockedAchievements.push(achievement);
                stats.achievements.push(achievement.id);
                
                console.log(`[TypingService] User ${uid} unlocked achievement: ${achievement.name}`);
            }
        }
        
        return unlockedAchievements;
    }

    /**
     * 比较数值
     */
    private compareValue(actual: number, target: number, comparison: string): boolean {
        switch (comparison) {
            case 'gte':
                return actual >= target;
            case 'lte':
                return actual <= target;
            case 'eq':
                return actual === target;
            default:
                return false;
        }
    }

    /**
     * 获取成就定义
     */
    private async getAchievementDefinitions(): Promise<TypingAchievement[]> {
        return [
            {
                id: 'first_practice',
                name: '初次尝试',
                description: '完成第一次打字练习',
                icon: '🌟',
                category: 'milestone',
                requirements: [
                    { type: 'practice_count', value: 1, comparison: 'gte' }
                ],
                reward: { score: 10 },
                rarity: 'common',
                hidden: false,
                createdAt: new Date()
            },
            {
                id: 'speed_demon_40',
                name: '速度新手',
                description: 'WPM达到40',
                icon: '⚡',
                category: 'speed',
                requirements: [
                    { type: 'wpm', value: 40, comparison: 'gte' }
                ],
                reward: { score: 50 },
                rarity: 'common',
                hidden: false,
                createdAt: new Date()
            },
            {
                id: 'speed_demon_60',
                name: '打字快手',
                description: 'WPM达到60',
                icon: '🚀',
                category: 'speed',
                requirements: [
                    { type: 'wpm', value: 60, comparison: 'gte' }
                ],
                reward: { score: 100 },
                rarity: 'rare',
                hidden: false,
                createdAt: new Date()
            },
            {
                id: 'speed_demon_80',
                name: '键盘飞侠',
                description: 'WPM达到80',
                icon: '💨',
                category: 'speed',
                requirements: [
                    { type: 'wpm', value: 80, comparison: 'gte' }
                ],
                reward: { score: 200 },
                rarity: 'epic',
                hidden: false,
                createdAt: new Date()
            },
            {
                id: 'accuracy_master',
                name: '精准大师',
                description: '准确率达到98%',
                icon: '🎯',
                category: 'accuracy',
                requirements: [
                    { type: 'accuracy', value: 98, comparison: 'gte' }
                ],
                reward: { score: 150 },
                rarity: 'epic',
                hidden: false,
                createdAt: new Date()
            },
            {
                id: 'persistent_learner',
                name: '坚持不懈',
                description: '连续练习7天',
                icon: '🔥',
                category: 'streak',
                requirements: [
                    { type: 'streak', value: 7, comparison: 'gte' }
                ],
                reward: { score: 100 },
                rarity: 'rare',
                hidden: false,
                createdAt: new Date()
            },
            {
                id: 'practice_addict',
                name: '练习狂人',
                description: '完成100次练习',
                icon: '💪',
                category: 'milestone',
                requirements: [
                    { type: 'practice_count', value: 100, comparison: 'gte' }
                ],
                reward: { score: 500 },
                rarity: 'legendary',
                hidden: false,
                createdAt: new Date()
            }
        ];
    }

    /**
     * 获取排行榜
     */
    public async getLeaderboard(
        domainId: string,
        type: 'wpm' | 'accuracy' | 'score' = 'wpm',
        limit: number = 10
    ): Promise<TypingLeaderboardEntry[]> {
        try {
            const pipeline = [
                { $match: { domainId } },
                {
                    $lookup: {
                        from: 'user',
                        localField: 'uid',
                        foreignField: '_id',
                        as: 'userInfo'
                    }
                },
                { $unwind: '$userInfo' },
                {
                    $project: {
                        uid: 1,
                        username: '$userInfo.uname',
                        avatar: '$userInfo.avatar',
                        bestWPM: 1,
                        averageWPM: 1,
                        bestAccuracy: 1,
                        totalPractices: 1,
                        totalScore: 1,
                        level: 1,
                        achievements: 1,
                        lastPracticeAt: 1,
                        sortField: type === 'wpm' ? '$bestWPM' : 
                                  type === 'accuracy' ? '$bestAccuracy' : '$totalScore'
                    }
                },
                { $sort: { sortField: -1, totalPractices: -1 } },
                { $limit: limit }
            ];

            const results = await this.ctx.db.collection('typing.stats' as any).aggregate(pipeline).toArray();

            return results.map((result, index) => ({
                uid: result.uid,
                username: result.username,
                avatar: result.avatar,
                bestWPM: result.bestWPM || 0,
                averageWPM: result.averageWPM || 0,
                totalPractices: result.totalPractices || 0,
                totalScore: result.totalScore || 0,
                accuracy: result.bestAccuracy || 0,
                level: result.level || 1,
                rank: index + 1,
                achievementCount: (result.achievements || []).length,
                lastActiveAt: result.lastPracticeAt || new Date()
            }));
        } catch (error) {
            console.error('[TypingService] Error fetching leaderboard:', error);
            return [];
        }
    }

    /**
     * 获取用户练习历史
     */
    public async getUserPracticeHistory(
        domainId: string,
        uid: number,
        limit: number = 20
    ): Promise<TypingRecord[]> {
        try {
            const records = await this.ctx.db.collection('typing.records' as any).find({ 
                domainId,
                uid 
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();

            return records as TypingRecord[];
        } catch (error) {
            console.error('[TypingService] Error fetching practice history:', error);
            return [];
        }
    }

    /**
     * 验证练习结果的合理性
     */
    public validateResult(result: TypingResult, originalText: string, userInput: string): boolean {
        // 基本数据验证
        if (!result || typeof result.wpm !== 'number' || typeof result.accuracy !== 'number') {
            return false;
        }
        
        // WPM合理性检查（假设人类极限为200WPM）
        if (result.wpm < 0 || result.wpm > 200) {
            return false;
        }
        
        // 准确率合理性检查
        if (result.accuracy < 0 || result.accuracy > 100) {
            return false;
        }
        
        // 时间合理性检查（至少要有1秒，最多30分钟）
        if (result.timeSpent < 1 || result.timeSpent > 1800) {
            return false;
        }
        
        // 文本长度一致性检查
        if (result.textLength !== originalText.length) {
            return false;
        }
        
        // 输入长度合理性检查
        if (userInput.length > originalText.length * 2) {
            return false;
        }
        
        // 按键次数合理性检查
        if (result.keystrokeCount < userInput.length || result.keystrokeCount > userInput.length * 3) {
            return false;
        }
        
        return true;
    }

    /**
     * 重置用户数据 (Admin功能)
     */
    async resetUserData(domainId: string, uid: number): Promise<void> {
        try {
            // 删除用户统计数据
            await this.ctx.db.collection('typing.stats' as any).deleteOne({ domainId, uid });
            
            // 删除用户练习记录
            await this.ctx.db.collection('typing.records' as any).deleteMany({ domainId, uid });
            
            console.log(`[TypingService] Reset data for user ${uid} in domain ${domainId}`);
        } catch (error) {
            console.error('[TypingService] Error resetting user data:', error);
            throw error;
        }
    }

    /**
     * 清理旧数据 (Admin功能)
     */
    async cleanupOldData(domainId: string, days: number = 90): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            // 删除旧的练习记录
            const result = await this.ctx.db.collection('typing.records' as any).deleteMany({
                domainId,
                createdAt: { $lt: cutoffDate }
            });

            console.log(`[TypingService] Cleaned up ${result.deletedCount} records older than ${days} days`);
            return result.deletedCount || 0;
        } catch (error) {
            console.error('[TypingService] Error cleaning up old data:', error);
            throw error;
        }
    }

    /**
     * 获取系统统计 (Admin功能)
     */
    async getSystemStats(domainId: string, period: string = '30d'): Promise<any> {
        try {
            const cutoffDate = this.calculateCutoffDate(period);

            // 总用户数
            const totalUsers = await this.ctx.db.collection('typing.stats' as any).countDocuments({ domainId });

            // 活跃用户数（在指定期间内有练习）
            const activeUsers = await this.ctx.db.collection('typing.stats' as any).countDocuments({
                domainId,
                lastPracticeAt: { $gte: cutoffDate }
            });

            // 总练习次数
            const totalPracticesResult = await this.ctx.db.collection('typing.stats' as any)
                .aggregate([
                    { $match: { domainId } },
                    { $group: { _id: null, total: { $sum: '$totalPractices' } } }
                ]).toArray();
            const totalPractices = totalPracticesResult[0]?.total || 0;

            // 期间内的练习次数
            const periodPractices = await this.ctx.db.collection('typing.records' as any).countDocuments({
                domainId,
                createdAt: { $gte: cutoffDate }
            });

            // 平均WPM
            const avgWPMResult = await this.ctx.db.collection('typing.stats' as any)
                .aggregate([
                    { $match: { domainId, totalPractices: { $gt: 0 } } },
                    { $group: { _id: null, avgWPM: { $avg: '$averageWPM' } } }
                ]).toArray();
            const systemAvgWPM = Math.round(avgWPMResult[0]?.avgWPM || 0);

            // 最高记录
            const topRecordsResult = await this.ctx.db.collection('typing.stats' as any)
                .aggregate([
                    { $match: { domainId } },
                    { $sort: { bestWPM: -1 } },
                    { $limit: 1 }
                ]).toArray();
            const topWPM = topRecordsResult[0]?.bestWPM || 0;

            return {
                period,
                totalUsers,
                activeUsers,
                totalPractices,
                periodPractices,
                systemAvgWPM,
                topWPM,
                activityRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
            };
        } catch (error) {
            console.error('[TypingService] Error calculating system stats:', error);
            return {
                period,
                totalUsers: 0,
                activeUsers: 0,
                totalPractices: 0,
                periodPractices: 0,
                systemAvgWPM: 0,
                topWPM: 0,
                activityRate: 0
            };
        }
    }

    /**
     * 获取用户最近练习记录
     */
    public async getRecentRecords(uid: number, limit: number = 5): Promise<TypingRecord[]> {
        try {
            const records = await this.ctx.db.collection('typing.records' as any).find({ 
                uid 
            })
            .sort({ practiceTime: -1 })
            .limit(limit)
            .toArray();

            return records as TypingRecord[];
        } catch (error) {
            console.error('[TypingService] Error fetching recent records:', error);
            return [];
        }
    }

    /**
     * 获取顶级用户（排行榜）
     */
    public async getTopUsers(limit: number = 10): Promise<any[]> {
        try {
            const pipeline = [
                {
                    $project: {
                        uid: 1,
                        bestWPM: 1,
                        averageWPM: 1,
                        bestAccuracy: 1,
                        totalPractices: 1,
                        totalScore: 1,
                        level: 1,
                        lastPracticeAt: 1
                    }
                },
                { $sort: { bestWPM: -1, totalPractices: -1 } },
                { $limit: limit }
            ];

            const results = await this.ctx.db.collection('typing.stats' as any).aggregate(pipeline).toArray();

            return results.map((result, index) => ({
                uid: result.uid,
                bestWPM: result.bestWPM || 0,
                avgAccuracy: result.bestAccuracy || 0,
                totalPractices: result.totalPractices || 0,
                level: result.level || 1,
                rank: index + 1
            }));
        } catch (error) {
            console.error('[TypingService] Error fetching top users:', error);
            return [];
        }
    }

    /**
     * 获取指定日期以来的记录
     */
    public async getRecordsSince(date: Date): Promise<TypingRecord[]> {
        try {
            const records = await this.ctx.db.collection('typing.records' as any).find({ 
                practiceTime: { $gte: date }
            }).toArray();

            return records as TypingRecord[];
        } catch (error) {
            console.error('[TypingService] Error fetching records since date:', error);
            return [];
        }
    }

    /**
     * 计算截止日期
     */
    private calculateCutoffDate(period: string): Date {
        const now = new Date();
        
        switch (period) {
            case '1d':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case '90d':
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            case '1y':
                return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
    }
}