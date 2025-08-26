import { Handler, param, query, Types, PRIV } from 'hydrooj';
import { TypingService } from '../services/TypingService';
import { TypingConfig, TypingPracticeResponse } from '../types/typing';
import { DEFAULT_CONFIG } from './config';

export class TypingStatsHandler extends Handler {
    private get typingService(): TypingService {
        return new TypingService(DEFAULT_CONFIG, this.ctx);
    }
    
    private get config(): TypingConfig {
        return DEFAULT_CONFIG;
    }

    /**
     * GET /typing/stats - 显示用户统计页面
     */
    async get() {
        this.checkPriv(PRIV.PRIV_USER_PROFILE);

        try {
            const domainId = this.domain._id;
            const uid = this.user._id;

            // 获取用户详细统计
            const userStats = await this.typingService.getUserStats(domainId, uid);
            
            // 获取用户练习历史
            const practiceHistory = await this.typingService.getUserPracticeHistory(domainId, uid, 50);
            
            // 获取排行榜信息
            const wpmLeaderboard = await this.typingService.getLeaderboard(domainId, 'wpm', 10);
            const accuracyLeaderboard = await this.typingService.getLeaderboard(domainId, 'accuracy', 10);
            const scoreLeaderboard = await this.typingService.getLeaderboard(domainId, 'score', 10);
            
            // 计算用户在各个排行榜中的排名
            const userRankings = {
                wpm: wpmLeaderboard.findIndex(entry => entry.uid === uid) + 1 || null,
                accuracy: accuracyLeaderboard.findIndex(entry => entry.uid === uid) + 1 || null,
                score: scoreLeaderboard.findIndex(entry => entry.uid === uid) + 1 || null
            };

            // 处理进步数据
            const progressData = this.processProgressData(userStats);
            
            // 处理练习热力图数据
            const heatmapData = this.generateHeatmapData(userStats.practiceHistory);
            
            // 处理错误分析数据
            const errorAnalysis = this.processErrorAnalysis(userStats.commonErrors);

            this.response.template = 'typing_stats.html';
            this.response.body = {
                userStats,
                practiceHistory,
                userRankings,
                progressData,
                heatmapData,
                errorAnalysis,
                leaderboards: {
                    wpm: wpmLeaderboard,
                    accuracy: accuracyLeaderboard,
                    score: scoreLeaderboard
                },
                config: this.config,
                page_name: 'typing_stats'
            };
        } catch (error) {
            console.error('[TypingStatsHandler] Error loading stats page:', error);
            throw new Error('Failed to load typing statistics');
        }
    }

    /**
     * GET /typing/stats/api - 获取统计API数据
     */
    @query('period', Types.String, true)
    async getStatsApi(domainId: string, period: string = '30d') {
        this.checkPriv(PRIV.PRIV_USER_PROFILE);

        try {
            const uid = this.user._id;
            const userStats = await this.typingService.getUserStats(domainId, uid);

            // 根据时间段过滤数据
            const filteredHistory = this.filterHistoryByPeriod(userStats.practiceHistory, period);
            
            // 计算时间段内的统计
            const periodStats = this.calculatePeriodStats(filteredHistory);
            
            // 生成进度图表数据
            const chartData = this.generateChartData(userStats.progressChart, period);

            const response: TypingPracticeResponse = {
                success: true,
                data: {
                    periodStats,
                    chartData,
                    userStats: {
                        level: userStats.level,
                        totalPractices: userStats.totalPractices,
                        bestWPM: userStats.bestWPM,
                        bestAccuracy: userStats.bestAccuracy,
                        averageWPM: userStats.averageWPM,
                        averageAccuracy: userStats.averageAccuracy,
                        longestStreak: userStats.longestStreak,
                        achievements: userStats.achievements
                    }
                }
            };

            this.response.body = response;
        } catch (error) {
            console.error('[TypingStatsHandler] Error fetching stats API:', error);
            
            const response: TypingPracticeResponse = {
                success: false,
                error: {
                    code: 'STATS_API_ERROR',
                    message: 'Failed to fetch statistics data'
                }
            };
            
            this.response.body = response;
        }
    }

    /**
     * GET /typing/stats/export - 导出用户数据
     */
    @query('format', Types.String, true)
    async exportData(domainId: string, format: string = 'json') {
        this.checkPriv(PRIV.PRIV_USER_PROFILE);

        try {
            const uid = this.user._id;
            const userStats = await this.typingService.getUserStats(domainId, uid);
            const practiceHistory = await this.typingService.getUserPracticeHistory(domainId, uid, 1000);

            const exportData = {
                user: {
                    uid,
                    username: this.user.uname,
                    exportedAt: new Date().toISOString()
                },
                statistics: userStats,
                history: practiceHistory,
                summary: {
                    totalPractices: userStats.totalPractices,
                    totalTimeSpent: userStats.totalTimeSpent,
                    averageWPM: userStats.averageWPM,
                    averageAccuracy: userStats.averageAccuracy,
                    bestWPM: userStats.bestWPM,
                    bestAccuracy: userStats.bestAccuracy,
                    totalScore: userStats.totalScore,
                    level: userStats.level,
                    achievementsCount: userStats.achievements.length
                }
            };

            if (format === 'csv') {
                // 生成CSV格式
                const csvContent = this.generateCSV(exportData);
                this.response.attachment('typing-practice-data.csv');
                this.response.body = csvContent;
                this.response.type = 'text/csv';
            } else {
                // 默认JSON格式
                this.response.attachment('typing-practice-data.json');
                this.response.body = JSON.stringify(exportData, null, 2);
                this.response.type = 'application/json';
            }
        } catch (error) {
            console.error('[TypingStatsHandler] Error exporting data:', error);
            throw new Error('Failed to export user data');
        }
    }

    /**
     * 处理进步数据
     */
    private processProgressData(userStats: any) {
        const progressChart = userStats.progressChart || [];
        
        if (progressChart.length < 2) {
            return {
                wpmTrend: 'stable',
                accuracyTrend: 'stable',
                wpmChange: 0,
                accuracyChange: 0,
                improvementRate: 0
            };
        }

        // 计算最近的趋势
        const recent = progressChart.slice(-10); // 最近10次练习
        const older = progressChart.slice(-20, -10); // 之前10次练习

        const recentAvgWPM = recent.reduce((sum: number, item: any) => sum + item.wpm, 0) / recent.length;
        const olderAvgWPM = older.length > 0 ? older.reduce((sum: number, item: any) => sum + item.wpm, 0) / older.length : recentAvgWPM;
        
        const recentAvgAccuracy = recent.reduce((sum: number, item: any) => sum + item.accuracy, 0) / recent.length;
        const olderAvgAccuracy = older.length > 0 ? older.reduce((sum: number, item: any) => sum + item.accuracy, 0) / older.length : recentAvgAccuracy;

        const wpmChange = recentAvgWPM - olderAvgWPM;
        const accuracyChange = recentAvgAccuracy - olderAvgAccuracy;

        return {
            wpmTrend: wpmChange > 2 ? 'improving' : wpmChange < -2 ? 'declining' : 'stable',
            accuracyTrend: accuracyChange > 1 ? 'improving' : accuracyChange < -1 ? 'declining' : 'stable',
            wpmChange: Math.round(wpmChange * 100) / 100,
            accuracyChange: Math.round(accuracyChange * 100) / 100,
            improvementRate: Math.round(((wpmChange + accuracyChange) / 2) * 100) / 100
        };
    }

    /**
     * 生成热力图数据
     */
    private generateHeatmapData(practiceHistory: any[]) {
        const heatmapData = new Map();
        const today = new Date();
        
        // 生成过去90天的数据
        for (let i = 89; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            
            const dayData = practiceHistory.find(h => h.date === dateString);
            heatmapData.set(dateString, {
                date: dateString,
                practices: dayData ? dayData.practices : 0,
                totalTime: dayData ? dayData.totalTime : 0,
                intensity: dayData ? Math.min(Math.floor(dayData.practices / 5) + 1, 4) : 0
            });
        }
        
        return Array.from(heatmapData.values());
    }

    /**
     * 处理错误分析数据
     */
    private processErrorAnalysis(commonErrors: any[]) {
        if (!commonErrors || commonErrors.length === 0) {
            return {
                mostProblematicChars: [],
                improvementSuggestions: [],
                errorPatterns: []
            };
        }

        // 按错误次数排序
        const sortedErrors = commonErrors.sort((a, b) => b.errorCount - a.errorCount);
        const mostProblematic = sortedErrors.slice(0, 10);
        
        // 生成改进建议
        const suggestions = this.generateImprovementSuggestions(mostProblematic);
        
        // 分析错误模式
        const patterns = this.analyzeErrorPatterns(mostProblematic);

        return {
            mostProblematicChars: mostProblematic,
            improvementSuggestions: suggestions,
            errorPatterns: patterns
        };
    }

    /**
     * 生成改进建议
     */
    private generateImprovementSuggestions(errors: any[]): string[] {
        const suggestions: string[] = [];
        
        errors.forEach(error => {
            if (error.accuracy < 70) {
                suggestions.push(`加强练习字符 "${error.character}" - 当前准确率仅${error.accuracy.toFixed(1)}%`);
            }
        });

        // 通用建议
        if (errors.length > 5) {
            suggestions.push('建议进行针对性的字符练习，专注于错误率最高的字符');
        }
        
        return suggestions.slice(0, 5); // 最多5个建议
    }

    /**
     * 分析错误模式
     */
    private analyzeErrorPatterns(errors: any[]): any[] {
        const patterns = [];
        
        // 分析数字键错误
        const numberErrors = errors.filter(e => /\d/.test(e.character));
        if (numberErrors.length > 2) {
            patterns.push({
                type: 'numbers',
                description: '数字键准确率较低',
                affectedKeys: numberErrors.map(e => e.character)
            });
        }
        
        // 分析特殊字符错误
        const specialErrors = errors.filter(e => /[!@#$%^&*()_+\-=\[\]{}|;':".,<>?]/.test(e.character));
        if (specialErrors.length > 2) {
            patterns.push({
                type: 'symbols',
                description: '特殊符号准确率较低',
                affectedKeys: specialErrors.map(e => e.character)
            });
        }
        
        return patterns;
    }

    /**
     * 根据时间段过滤历史数据
     */
    private filterHistoryByPeriod(history: any[], period: string) {
        const now = new Date();
        let cutoffDate: Date;
        
        switch (period) {
            case '7d':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        
        return history.filter(h => new Date(h.date) >= cutoffDate);
    }

    /**
     * 计算时间段内的统计
     */
    private calculatePeriodStats(history: any[]) {
        if (history.length === 0) {
            return {
                totalPractices: 0,
                totalTime: 0,
                averageWPM: 0,
                bestWPM: 0,
                totalScore: 0,
                activeDays: 0
            };
        }

        const totalPractices = history.reduce((sum, h) => sum + h.practices, 0);
        const totalTime = history.reduce((sum, h) => sum + h.totalTime, 0);
        const bestWPM = Math.max(...history.map(h => h.bestWPM));
        const totalScore = history.reduce((sum, h) => sum + h.score, 0);
        const activeDays = history.filter(h => h.practices > 0).length;

        return {
            totalPractices,
            totalTime: Math.round(totalTime),
            averageWPM: totalPractices > 0 ? Math.round(totalTime > 0 ? (totalPractices / totalTime) * 60 * 5 : 0) : 0, // 估算WPM
            bestWPM,
            totalScore,
            activeDays
        };
    }

    /**
     * 生成图表数据
     */
    private generateChartData(progressChart: any[], period: string) {
        if (!progressChart || progressChart.length === 0) {
            return {
                wpmData: [],
                accuracyData: [],
                labels: []
            };
        }

        // 根据时间段筛选数据
        const filtered = this.filterProgressByPeriod(progressChart, period);
        
        return {
            wpmData: filtered.map(p => ({ x: p.date, y: p.wpm })),
            accuracyData: filtered.map(p => ({ x: p.date, y: p.accuracy })),
            labels: filtered.map(p => p.date)
        };
    }

    /**
     * 根据时间段过滤进度数据
     */
    private filterProgressByPeriod(progressChart: any[], period: string) {
        const now = new Date();
        let daysBack: number;
        
        switch (period) {
            case '7d': daysBack = 7; break;
            case '30d': daysBack = 30; break;
            case '90d': daysBack = 90; break;
            case '1y': daysBack = 365; break;
            default: daysBack = 30;
        }
        
        const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
        
        return progressChart
            .filter(p => new Date(p.date) >= cutoffDate)
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * 生成CSV格式数据
     */
    private generateCSV(data: any): string {
        let csv = 'Date,WPM,Accuracy,Time Spent,Score,Difficulty,Text Type\n';
        
        data.history.forEach((record: any) => {
            const result = record.result;
            csv += `${record.createdAt},${result.wpm},${result.accuracy},${result.timeSpent},${record.scoreEarned},${result.difficulty},${result.textType}\n`;
        });
        
        return csv;
    }
}