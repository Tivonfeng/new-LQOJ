import { Handler, PRIV } from 'hydrooj';
import { getTypingServices } from '../utils/ctxHelper';

/**
 * 打字赛季处理器
 * 路由: /typing/season
 * 功能: GET 重定向到打字大厅赛季 Tab；POST 处理报名
 *
 * 赛季展示已融合到打字大厅首页的「打字赛季」Tab，不再需要独立页面。
 * 保留此路由是为了兼容旧链接和大厅横幅的报名 POST 请求。
 */
export class TypingSeasonHandler extends Handler {
    async get() {
        // 重定向到打字大厅的赛季 Tab
        this.response.redirect = '/typing/hall?tab=season';
    }

    async post() {
        const { action } = this.request.body;

        if (action === 'register') {
            await this.handleRegister();
        } else {
            this.response.body = { success: false, message: '无效的操作' };
        }
    }

    /**
     * 学生报名当前赛季
     */
    private async handleRegister() {
        if (!this.user?._id) {
            this.response.body = { success: false, message: '请先登录' };
            return;
        }

        const { seasonService } = getTypingServices(this.ctx);
        if (!seasonService) {
            this.response.body = { success: false, message: '打字系统服务未就绪' };
            return;
        }

        try {
            const result = await seasonService.register(this.user._id);
            this.response.body = result;
        } catch (error: any) {
            console.error('[TypingSeason] Register error:', error);
            this.response.body = { success: false, message: `报名失败：${error.message}` };
        }
    }
}
