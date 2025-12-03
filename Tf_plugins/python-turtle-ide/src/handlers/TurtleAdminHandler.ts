import { Handler, PRIV } from 'hydrooj';
import { TurtleWorkService } from '../services';

/**
 * Turtle 管理后台
 * 路由: /turtle/admin
 */
export class TurtleAdminHandler extends Handler {
    async prepare() {
        // 检查管理员权限
        if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
            throw new Error('权限不足');
        }
    }

    async get() {
        const workService = new TurtleWorkService(this.ctx);

        // 从查询参数获取页码
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);

        // 获取所有作品
        const { works, total, totalPages } = await workService.getAllWorks(
            page,
            50, // 每页50个作品
        );

        // 获取所有涉及的用户ID
        const uids = [...new Set(works.map((w) => w.uid))];

        // 获取用户信息
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

        this.response.template = 'turtle_admin.html';
        this.response.body = {
            works,
            worksJSON: JSON.stringify(works),
            udocs,
            udocsJSON: JSON.stringify(udocs),
            page,
            total,
            totalPages,
        };
    }

    async post() {
        const { action, workId, featured } = this.request.body;
        const workService = new TurtleWorkService(this.ctx);

        try {
            if (action === 'delete') {
                await workService.adminDeleteWork(workId);
                this.response.body = { success: true };
            } else if (action === 'setFeatured') {
                await workService.setFeatured(workId, featured === 'true' || featured === true);
                this.response.body = { success: true };
            } else {
                this.response.body = { success: false, message: '无效的操作' };
            }
        } catch (error) {
            this.response.body = { success: false, message: error.message };
        }
    }
}
