import { Handler } from 'hydrooj';
import { TurtleWorkService } from '../services';

/**
 * Turtle 作品展示墙
 * 路由: /turtle/gallery
 */
export class TurtleGalleryHandler extends Handler {
    async get() {
        const workService = new TurtleWorkService(this.ctx);

        // 从查询参数获取页码
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);

        // 获取公开作品
        const { works, total, totalPages } = await workService.getPublicWorks(
            this.domain._id,
            page,
            24, // 每页24个作品
        );

        // 获取所有涉及的用户ID
        const uids = [...new Set(works.map((w) => w.uid))];

        // 获取用户信息
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

        this.response.template = 'turtle_gallery.html';
        this.response.body = {
            works,
            worksJSON: JSON.stringify(works),
            udocs,
            udocsJSON: JSON.stringify(udocs),
            page,
            total,
            totalPages,
            isLoggedIn: !!this.user?._id,
        };
    }
}
