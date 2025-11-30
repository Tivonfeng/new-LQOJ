import { Handler } from 'hydrooj';
import { TurtleWorkService } from '../services';

/**
 * 单个作品查看页面
 * 路由: /turtle/work/:workId
 */
export class TurtleWorkHandler extends Handler {
    async get(domainId: string, workId: string) {
        const workService = new TurtleWorkService(this.ctx);

        // 获取作品
        const work = await workService.getWork(workId);
        if (!work) {
            throw new Error('Work not found');
        }

        // 增加浏览次数
        await workService.incrementViews(workId);

        // 获取作者信息
        const UserModel = global.Hydro.model.user;
        const author = await UserModel.getById(this.domain._id, work.uid);

        // 检查是否为作者
        const isAuthor = this.user?._id === work.uid;

        // 如果作品不公开且不是作者,则拒绝访问
        if (!work.isPublic && !isAuthor) {
            throw new Error('This work is private');
        }

        this.response.template = 'turtle_work.html';
        this.response.body = {
            work,
            workJSON: JSON.stringify(work),
            author,
            isAuthor,
            isLoggedIn: !!this.user?._id,
        };
    }

    async post() {
        const { action, workId } = this.request.body;
        const workService = new TurtleWorkService(this.ctx);

        try {
            if (action === 'like') {
                await workService.likeWork(workId);
                this.response.body = { success: true };
            } else {
                this.response.body = { success: false, message: 'Invalid action' };
            }
        } catch (error) {
            this.response.body = { success: false, message: error.message };
        }
    }
}
