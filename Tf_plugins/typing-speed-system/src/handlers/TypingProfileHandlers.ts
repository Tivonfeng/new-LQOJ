import { Handler } from 'hydrooj';
import { getTypingServices } from '../utils/ctxHelper';

/**
 * 个人打字中心处理器
 * 路由: /typing/me
 * 功能: 展示当前用户的打字速度详情、历史记录和进步曲线
 */
export class TypingProfileHandler extends Handler {
    async get() {
        const uid = this.user._id;
        const { recordService, statsService, analyticsService } = getTypingServices(this.ctx);
        if (!recordService || !statsService || !analyticsService) {
            this.response.body = { error: '打字系统服务未就绪' };
            return;
        }

        // 获取用户统计（全域统一）
        const userStats = await statsService.getUserStats(uid);

        // 获取用户排名（全域统一）
        let maxRank: number | null = null;
        let avgRank: number | null = null;
        if (userStats) {
            maxRank = await statsService.getUserRank(uid, 'max');
            avgRank = await statsService.getUserRank(uid, 'avg');
        }

        // 获取用户历史记录（createdAt 保持 Date，JSON.stringify 自动转 ISO）
        const userRecords = await recordService.getUserRecords(uid, 30);

        // 获取用户进步曲线数据（date 已为 ISO 字符串）
        const progressData = await analyticsService.getUserProgress(uid);

        // 获取录入人信息
        const recorderIds = [...new Set(userRecords.map((r: any) => r.recordedBy))];
        const UserModel = global.Hydro.model.user;
        const recorderDocs = await UserModel.getList(this.domain._id, recorderIds);

        // 将recorderDocs转换为简化的JSON格式
        const recorderDocsSimplified: Record<string, { uname?: string; displayName?: string }> = {};
        for (const userId in recorderDocs) {
            recorderDocsSimplified[userId] = {
                uname: recorderDocs[userId].uname,
                displayName: recorderDocs[userId].displayName,
            };
        }

        this.response.template = 'typing_profile.html';
        this.response.body = {
            userStats: userStats || { maxWpm: 0, avgWpm: 0, totalRecords: 0 },
            maxRank,
            avgRank,
            userRecords,
            progressData,
            recorderDocs: recorderDocsSimplified,
        };
    }
}
