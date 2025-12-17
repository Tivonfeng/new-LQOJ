import { Handler, PRIV } from 'hydrooj';
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
 * 功能: 学生个人数据分析页面
 */
export class StudentAnalyticsHandler extends Handler {
    async get() {
        const uid = this.user?._id;
        const domainId = this.domain._id;
        const analyticsService = new StudentAnalyticsService(this.ctx);

        // 获取用户统计数据（包含代码行数统计）
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
            userStats = await analyticsService.getStudentStats(domainId, uid, true, true, 12, 12);
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
                
                // 调试日志
                console.log('[Student Analytics Handler] Monthly stats:', {
                    hasMonthlyCodeStats: !!monthlyCodeStats,
                    monthlyCodeStatsLength: monthlyCodeStats?.length || 0,
                });
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
            domainId,
            uid,
            isLoggedIn: !!uid,
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
 * 管理员数据分析处理器
 * 路由: /analytics/student/admin
 * 功能: 全局学生数据分析管理面板
 */
export class StudentAnalyticsAdminHandler extends Handler {
    async get() {
        this.checkPriv(PRIV.PRIV_MANAGE_SYSTEM);
        const domainId = this.domain._id;
        const analyticsService = new StudentAnalyticsService(this.ctx);

        // TODO: 获取全局统计数据
        const globalStats = {
            totalStudents: 0,
            totalEvents: 0,
            // 添加更多统计字段
        };

        // 准备传递给前端的数据
        const studentAnalyticsAdminData = {
            globalStats: serializeForJSON(globalStats),
            domainId,
            isLoggedIn: !!this.user?._id,
        };

        this.response.template = 'student_analytics_admin.html';
        this.response.body = {
            ...studentAnalyticsAdminData,
            studentAnalyticsAdminDataJson: JSON.stringify(studentAnalyticsAdminData),
            isLoggedIn: !!this.user?._id,
        };
    }
}

