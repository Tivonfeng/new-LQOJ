/**
 * 日期工具函数（周计算相关）
 *
 * 统一供 TypingStatsService 与 TypingAnalyticsService 使用，
 * 避免重复实现。周以周一为起始，使用 ISO 周数。
 */

/**
 * 获取周字符串 (如: "2025-W03")
 */
export function getWeekString(date: Date): string {
    const year = date.getFullYear();
    const weekNumber = getWeekNumber(date);
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * 获取 ISO 周数
 */
export function getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * 获取本周开始日期（周一为一周开始）
 */
export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 周一为一周开始
    return new Date(d.setDate(diff));
}
