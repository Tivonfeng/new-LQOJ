import { Handler, param, PRIV, Types } from 'hydrooj';
import { GlobalStatsService } from '../services/GlobalStatsService';
import { StudentAnalyticsService } from '../services';

// 自定义 JSON 序列化函数，处理 BigInt 和其他不可序列化的值
function serializeForJSON(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    if (obj instanceof Date) {
        return obj.toISOString();
    }
    if (Array.isArray(obj)) {
        return obj.map(serializeForJSON);
    }
    if (typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = serializeForJSON(value);
        }
        return result;
    }
    return obj;
}

/**
 * 学生数据分析处理器
 * 路由: /analytics/student
 * 功能: 学生个人数据分析页面（全域统计，支持懒加载）
 */
export class StudentAnalyticsHandler extends Handler {
    @param('weeks', Types.PositiveInt, true)
    @param('months', Types.PositiveInt, true)
    async get(domainId: string, weeks: number = 4, months: number = 4) {
        const uid = this.user?._id;
        const analyticsService = new StudentAnalyticsService(this.ctx);

        // 获取用户统计数据（全域统计）
        // 默认只加载 4 周和 4 个月的数据（懒加载优化）
        let userStats = null;
        let weeklyCodeStats = null;
        let monthlyCodeStats = null;
        let totalCodeLines = 0;
        let submissionStats = null;
        let submissionTimeDistribution = null;
        let submissionStatusDistribution = null;
        let problemStats = null;
        let problemDifficultyDistribution = null;
        let problemTagDistribution = null;

        if (uid) {
            userStats = await analyticsService.getStudentStats(uid, true, true, weeks, months);
            if (userStats) {
                weeklyCodeStats = userStats.weeklyCodeStats;
                monthlyCodeStats = userStats.monthlyCodeStats;
                totalCodeLines = userStats.totalCodeLines || 0;
                submissionStats = userStats.submissionStats;
                submissionTimeDistribution = userStats.submissionTimeDistribution;
                submissionStatusDistribution = userStats.submissionStatusDistribution;
                problemStats = userStats.problemCompletionStats;
                problemDifficultyDistribution = userStats.problemDifficultyDistribution;
                problemTagDistribution = userStats.problemTagDistribution;
            }
        }

        // 准备传递给前端的数据
        const studentAnalyticsData = {
            userStats: serializeForJSON(userStats),
            weeklyCodeStats: serializeForJSON(weeklyCodeStats),
            monthlyCodeStats: serializeForJSON(monthlyCodeStats),
            totalCodeLines,
            submissionStats: serializeForJSON(submissionStats),
            submissionTimeDistribution: serializeForJSON(submissionTimeDistribution),
            submissionStatusDistribution: serializeForJSON(submissionStatusDistribution),
            problemStats: serializeForJSON(problemStats),
            problemDifficultyDistribution: serializeForJSON(problemDifficultyDistribution),
            problemTagDistribution: serializeForJSON(problemTagDistribution),
            uid,
            isLoggedIn: !!uid,
            // 懒加载相关参数
            currentWeeks: weeks,
            currentMonths: months,
            hasMoreWeeks: weeks < 52,  // 最多 52 周
            hasMoreMonths: months < 24, // 最多 24 个月
        };

        this.response.template = 'student_analytics.html';
        this.response.body = {
            ...studentAnalyticsData,
            studentAnalyticsDataJson: JSON.stringify(studentAnalyticsData),
            isLoggedIn: !!uid,
        };
    }
}

/**
 * 学生数据分析 API 处理器
 * 路由: /analytics/student/api/more
 * 功能: 按需加载更多统计数据
 */
export class StudentAnalyticsApiHandler extends Handler {
    @param('type', Types.String)
    @param('weeks', Types.PositiveInt, true)
    @param('months', Types.PositiveInt, true)
    async get(domainId: string, type: string, weeks: number = 12, months: number = 12) {
        const uid = this.user?._id;
        if (!uid) {
            this.response.body = { error: 'Not logged in' };
            return;
        }

        const analyticsService = new StudentAnalyticsService(this.ctx);

        let data: any = null;

        switch (type) {
            case 'weekly':
                // 加载更多周数据
                const weeklyStats = await analyticsService.getWeeklyCodeStats(uid, weeks);
                data = { weeklyCodeStats: serializeForJSON(weeklyStats) };
                break;

            case 'monthly':
                // 加载更多月数据
                const monthlyStats = await analyticsService.getMonthlyCodeStats(uid, months);
                data = { monthlyCodeStats: serializeForJSON(monthlyStats) };
                break;

            case 'full':
                // 加载完整数据
                const fullStats = await analyticsService.getStudentStats(uid, true, true, weeks, months);
                data = serializeForJSON(fullStats);
                break;

            default:
                this.response.body = { error: 'Invalid type' };
                return;
        }

        this.response.body = data;
    }
}

/**
 * 管理员数据分析处理器
 * 路由: /analytics/student/admin
 * 功能: 全域学生数据分析管理面板
 */
export class StudentAnalyticsAdminHandler extends Handler {
    async get() {
        this.checkPriv(PRIV.PRIV_MANAGE_SYSTEM);

        const globalStatsService = new GlobalStatsService(this.ctx);
        const globalStats = await globalStatsService.getGlobalStats();

        // 准备传递给前端的数据
        const studentAnalyticsAdminData = {
            globalStats: serializeForJSON(globalStats),
            isLoggedIn: !!this.user?._id,
        };

        this.response.template = 'student_analytics_admin.html';
        this.response.body = {
            ...studentAnalyticsAdminData,
            studentAnalyticsAdminDataJson: JSON.stringify(studentAnalyticsAdminData),
            isLoggedIn: !!this.user?._id,
        };
    }

    @param('action', Types.String)
    async post(domainId: string, action: string) {
        this.checkPriv(PRIV.PRIV_MANAGE_SYSTEM);

        const globalStatsService = new GlobalStatsService(this.ctx);
        let result: any = { success: false };

        switch (action) {
            case 'clearCache':
                const deletedCount = await globalStatsService.clearAllCache();
                result = { success: true, deletedCount };
                break;

            case 'markAllDirty':
                const modifiedCount = await globalStatsService.markAllCacheDirty();
                result = { success: true, modifiedCount };
                break;

            case 'refreshStats':
                const stats = await globalStatsService.getGlobalStats();
                result = { success: true, stats: serializeForJSON(stats) };
                break;

            default:
                result = { success: false, error: 'Invalid action' };
        }

        this.response.body = result;
    }
}
