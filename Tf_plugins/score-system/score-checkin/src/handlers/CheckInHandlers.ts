import { ServiceRegistry } from '@tivonfeng/score-core';
import {
    Handler,
} from 'hydrooj';
import { CheckInService, type DailyCheckInRecord, type UserCheckInStats } from '../services/CheckInService';

/**
 * 每日签到处理器
 * 路由: /score/checkin
 * 功能: 每日签到页面和签到逻辑处理
 */
export class CheckInHandler extends Handler {
    async get() {
        if (!this.user) {
            this.response.redirect = '/login';
            return;
        }

        const uid = this.user._id;

        // 从服务注册器获取签到服务
        const serviceRegistry = ServiceRegistry.getInstance();
        const checkInService = serviceRegistry.get<CheckInService>('checkin');

        if (!checkInService) {
            throw new Error('签到服务未找到，请确保插件正确加载');
        }

        // 获取用户签到统计
        let userStats: UserCheckInStats | null = await checkInService.getUserCheckInStats(uid);
        // 创建初始统计记录
        userStats ||= {
            uid,
            totalDays: 0,
            currentStreak: 0,
            maxStreak: 0,
            lastCheckIn: '',
            lastUpdated: new Date(),
        };

        // 检查今日是否已签到
        const hasCheckedInToday = await checkInService.hasCheckedInToday(uid);

        // 获取签到历史记录
        const recentHistory = await checkInService.getCheckInHistory(uid, 10);

        // 获取本月签到记录
        const monthlyCheckIns = await checkInService.getMonthlyCheckIns(uid);

        // 获取用户当前积分
        const scoreService = serviceRegistry.getScoreService();
        const userScore = scoreService ? await scoreService.getUserScore(this.domain._id, uid) : null;
        const currentScore = userScore?.totalScore || 0;

        // 生成日历数据 (当前月份)
        const calendarData = this.generateCalendarData(monthlyCheckIns);

        // 计算下次签到可获得的积分
        const nextStreak = hasCheckedInToday ? userStats.currentStreak : userStats.currentStreak + 1;
        const nextReward = checkInService.calculateCheckInScore(nextStreak);

        // 格式化历史记录的日期
        const formattedHistory = recentHistory.map((record: DailyCheckInRecord) => ({
            ...record,
            createdAt: record.createdAt.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
            checkInDate: this.formatDisplayDate(record.checkInDate),
        }));

        this.response.template = 'daily_checkin.html';
        this.response.body = {
            userStats,
            hasCheckedInToday,
            recentHistory: formattedHistory,
            monthlyCheckIns,
            calendarData,
            currentScore,
            nextReward,
            nextStreak: hasCheckedInToday ? userStats.currentStreak : nextStreak,
            rewardPreview: this.generateRewardPreview(userStats.currentStreak, hasCheckedInToday),
        };
    }

    async post() {
        if (!this.user) {
            this.response.body = { success: false, message: '请先登录' };
            return;
        }

        const uid = this.user._id;

        const { action } = this.request.body;

        if (action === 'checkin') {
            // 从服务注册器获取签到服务
            const serviceRegistry = ServiceRegistry.getInstance();
            const checkInService = serviceRegistry.get<CheckInService>('checkin');

            if (!checkInService) {
                this.response.body = { success: false, message: '签到服务未找到' };
                return;
            }

            const result = await checkInService.checkIn(this.domain._id, uid);
            this.response.body = result;
        } else {
            this.response.body = { success: false, message: '无效的操作' };
        }
    }

    /**
     * 生成日历数据
     * @param checkedInDates 已签到的日期数组
     */
    private generateCalendarData(checkedInDates: string[]): any {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        // 获取当月第一天和最后一天
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // 获取第一天是星期几 (0=周日, 1=周一, ...)
        const startWeekday = firstDay.getDay();

        // 生成日历数据
        const weeks: any[][] = [];
        let currentWeek: any[] = [];

        // 填充月初空白
        for (let i = 0; i < startWeekday; i++) {
            currentWeek.push({ day: '', isToday: false, isCheckedIn: false, isEmpty: true });
        }

        // 填充月份日期
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isToday = day === now.getDate();
            const isCheckedIn = checkedInDates.includes(dateStr);

            currentWeek.push({
                day,
                dateStr,
                isToday,
                isCheckedIn,
                isEmpty: false,
            });

            // 如果当前周已满7天，开始新的一周
            if (currentWeek.length === 7) {
                weeks.push([...currentWeek]);
                currentWeek = [];
            }
        }

        // 填充月末空白
        while (currentWeek.length < 7 && currentWeek.length > 0) {
            currentWeek.push({ day: '', isToday: false, isCheckedIn: false, isEmpty: true });
        }
        if (currentWeek.length > 0) {
            weeks.push(currentWeek);
        }

        return {
            year,
            month: month + 1,
            monthName: now.toLocaleString('zh-CN', { month: 'long' }),
            weeks,
            totalDays: lastDay.getDate(),
            checkedDays: checkedInDates.length,
        };
    }

    /**
     * 生成奖励预览 (未来7天的奖励)
     * @param currentStreak 当前连续签到天数
     * @param hasCheckedInToday 今日是否已签到
     */
    private generateRewardPreview(currentStreak: number, hasCheckedInToday: boolean): any[] {
        // 从服务注册器获取签到服务
        const serviceRegistry = ServiceRegistry.getInstance();
        const checkInService = serviceRegistry.get<CheckInService>('checkin');

        if (!checkInService) {
            return [];
        }
        const preview: any[] = [];

        const startStreak = hasCheckedInToday ? currentStreak + 1 : currentStreak + 1;

        for (let i = 0; i < 7; i++) {
            const streak = startStreak + i;
            const reward = checkInService.calculateCheckInScore(streak);
            const date = new Date();
            date.setDate(date.getDate() + (hasCheckedInToday ? i + 1 : i));

            let specialBonus = '';
            specialBonus ||= streak === 7 ? '周奖励' : '';
            specialBonus ||= streak === 14 ? '双周奖励' : '';
            specialBonus ||= streak % 7 === 0 ? '周奖励' : '';

            preview.push({
                day: i + 1,
                date: date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit' }),
                streak,
                reward,
                specialBonus,
                isToday: i === 0 && !hasCheckedInToday,
            });
        }

        return preview;
    }

    /**
     * 格式化显示日期
     * @param dateStr YYYY-MM-DD格式的日期字符串
     */
    private formatDisplayDate(dateStr: string): string {
        const date = new Date(`${dateStr}T00:00:00`);
        return date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
        });
    }
}
