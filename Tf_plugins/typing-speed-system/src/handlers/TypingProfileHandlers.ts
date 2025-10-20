import { Handler } from 'hydrooj';
import {
    TypingAnalyticsService,
    TypingRecordService,
    TypingStatsService,
} from '../services';

/**
 * 个人打字中心处理器
 * 路由: /typing/me
 * 功能: 展示当前用户的打字速度详情、历史记录和进步曲线
 */
export class TypingProfileHandler extends Handler {
    async get() {
        const uid = this.user._id;
        const recordService = new TypingRecordService(this.ctx);
        const statsService = new TypingStatsService(this.ctx, recordService);
        const analyticsService = new TypingAnalyticsService(this.ctx, recordService, statsService);

        // 获取用户统计
        const userStats = await statsService.getUserStats(uid, this.domain._id);

        // 获取用户排名
        let maxRank = null;
        let avgRank = null;
        if (userStats) {
            maxRank = await statsService.getUserRank(uid, 'max', this.domain._id);
            avgRank = await statsService.getUserRank(uid, 'avg', this.domain._id);
        }

        // 获取用户历史记录
        const userRecords = await recordService.getUserRecords(uid, 30);

        // 获取用户进步曲线数据
        const progressData = await analyticsService.getUserProgress(uid);

        // 格式化记录
        const formattedRecords = recordService.formatRecords(userRecords);

        // 获取录入人信息
        const recorderIds = [...new Set(userRecords.map((r) => r.recordedBy))];
        const UserModel = global.Hydro.model.user;
        const recorderDocs = await UserModel.getList(this.domain._id, recorderIds);

        this.response.template = 'typing_profile.html';
        this.response.body = {
            userStats: userStats || { maxWpm: 0, avgWpm: 0, totalRecords: 0 },
            maxRank,
            avgRank,
            userRecords: formattedRecords,
            progressData,
            progressDataJSON: JSON.stringify(progressData),
            recorderDocs,
        };
    }
}
