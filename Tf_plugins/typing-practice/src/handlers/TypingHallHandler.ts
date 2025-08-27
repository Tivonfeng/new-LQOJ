import { Handler } from 'hydrooj';
import { TypingService } from '../services/TypingService';

export class TypingHallHandler extends Handler {
    noCheckPermissions = true;

    async get() {
        // 创建默认配置
        const config = {
            enabled: true,
            scoreIntegration: true,
            defaultDifficulty: 'beginner',
            enableAchievements: true,
            enableSoundEffects: true,
            maxTextLength: 500,
            minAccuracy: 60,
        };

        const typingService = new TypingService(config, this.ctx);

        // 获取用户统计数据（如果已登录）
        let userStats = null;
        let userProgress = null;
        let recentSessions = null;
        let isLoggedIn = false;

        if (this.user._id) {
            isLoggedIn = true;
            try {
                userStats = await typingService.getUserStats(this.domain._id, this.user._id);

                // 获取用户进度数据
                userProgress = {
                    basicKeys: userStats?.basicKeysProgress || 0,
                    wordsCompleted: userStats?.totalPractices || 0,
                    articlesCompleted: userStats?.articlesCompleted || 0,
                };

                // 获取最近的练习记录
                const recentRecords = await typingService.getRecentRecords(this.user._id, 5);
                recentSessions = recentRecords.map((record) => ({
                    modeIcon: this.getModeIcon(record.textType),
                    modeName: this.getModeName(record.textType),
                    wpm: Math.round(record.result.wpm || 0),
                    accuracy: Math.round(record.result.accuracy || 0),
                    timeAgo: this.getTimeAgo(record.practiceTime),
                    performance: this.getPerformanceLevel(record.result.wpm || 0, record.result.accuracy || 0),
                    scoreIcon: this.getScoreIcon(record.result.wpm || 0, record.result.accuracy || 0),
                }));
            } catch (error) {
                console.error('Error getting user stats:', error);
                // 继续执行，显示默认数据
            }
        }

        // 获取排行榜数据
        let leaderboard = [];
        let udocs = {};
        try {
            const topUsers = await typingService.getTopUsers(10);
            leaderboard = topUsers;

            // 获取用户文档
            const userIds = topUsers.map((user) => user.uid).filter(Boolean);
            if (userIds.length > 0) {
                const UserModel = global.Hydro.model.user;
                const userDocs = await UserModel.getList(this.domain._id, userIds);
                udocs = Object.fromEntries(
                    userDocs.map((doc) => [doc._id, doc]),
                );
            }
        } catch (error) {
            console.error('Error getting leaderboard:', error);
        }

        // 获取今日活跃用户数
        let todayActiveUsers = 0;
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const records = await typingService.getRecordsSince(today);
            const uniqueUsers = new Set(records.map((record) => record.uid));
            todayActiveUsers = uniqueUsers.size;
        } catch (error) {
            console.error('Error getting today active users:', error);
        }

        this.response.template = 'typing_hall.html';
        this.response.body = {
            title: 'Typing Hall',
            isLoggedIn,
            userStats,
            userProgress,
            recentSessions,
            leaderboard,
            udocs,
            todayActiveUsers,
            // 默认的困难度和类型信息
            difficulties: [
                { key: 'beginner', name: '初级', description: '基础练习' },
                { key: 'intermediate', name: '中级', description: '进阶练习' },
                { key: 'advanced', name: '高级', description: '专业练习' },
                { key: 'expert', name: '专家', description: '极限挑战' },
            ],
            textTypes: [
                { key: 'basic_keys', name: '基础键位', description: '字母反复练习，掌握正确指法' },
                { key: 'programming_words', name: '编程词汇', description: '常用编程词汇和变量名' },
                { key: 'english', name: '英文文章', description: '英语文本和段落练习' },
                { key: 'chinese', name: '中文文章', description: '中文文本和段落练习' },
                { key: 'programming', name: '编程代码', description: '完整代码段落练习' },
            ],
        };
    }

    private getModeIcon(textType: string): string {
        const icons = {
            basic_keys: '🔤',
            programming_words: '📝',
            english: '📄',
            chinese: '📜',
            programming: '💻',
            mixed: '📄',
        };
        return icons[textType] || '⌨️';
    }

    private getModeName(textType: string): string {
        const names = {
            basic_keys: '基础键位练习',
            programming_words: '编程词汇练习',
            english: '英文文章练习',
            chinese: '中文文章练习',
            programming: '编程代码练习',
            mixed: '混合练习',
        };
        return names[textType] || '打字练习';
    }

    private getTimeAgo(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            return `${diffDays}天前`;
        } else if (diffHours > 0) {
            return `${diffHours}小时前`;
        } else {
            return '刚刚';
        }
    }

    private getPerformanceLevel(wpm: number, accuracy: number): string {
        if (wpm >= 80 && accuracy >= 95) return 'excellent';
        if (wpm >= 60 && accuracy >= 90) return 'good';
        if (wpm >= 40 && accuracy >= 80) return 'average';
        return 'poor';
    }

    private getScoreIcon(wpm: number, accuracy: number): string {
        const performance = this.getPerformanceLevel(wpm, accuracy);
        const icons = {
            excellent: '🏆',
            good: '✨',
            average: '👍',
            poor: '📈',
        };
        return icons[performance] || '⌨️';
    }
}
