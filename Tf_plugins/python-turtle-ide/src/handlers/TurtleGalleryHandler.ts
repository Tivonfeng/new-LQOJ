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
        const uid = this.user?._id;

        // 获取公开作品
        const { works, total, totalPages } = await workService.getPublicWorks(
            this.domain._id,
            page,
            24, // 每页24个作品
        );

        // 将作品中的 _id 转成字符串形式，避免模板和前端使用时出现 ObjectId 序列化问题
        const viewWorks = works.map((w: any) => ({
            ...w,
            id: w._id?.toString?.() || w._id,
        }));

        // 调试日志：记录当前页作品及其 ID
        console.log('[TurtleGalleryHandler] Public works page loaded', {
            domainId: this.domain._id,
            page,
            total,
            totalPages,
            workIds: viewWorks.map((w) => w.id),
        });

        // 获取所有涉及的用户ID（用于全站作品作者信息）
        const allUids = [...new Set(works.map((w) => w.uid))];

        // 获取用户信息
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, allUids);

        // 获取当前用户的作品列表
        let myWorksView: any[] = [];
        if (uid) {
            const myWorks = await workService.getUserWorks(uid, this.domain._id);
            myWorksView = myWorks.map((w: any) => ({
                ...w,
                id: w._id?.toString?.() || w._id,
            }));
        }

        // 解决 JSON.stringify 不能序列化 BigInt 的问题：
        // 将对象中的 BigInt 字段统一转换为字符串，避免抛出 TypeError
        const bigintReplacer = (_key: string, value: any) =>
            typeof value === 'bigint' ? value.toString() : value;

        this.response.template = 'turtle_gallery.html';
        this.response.body = {
            works: viewWorks,
            worksJSON: JSON.stringify(viewWorks, bigintReplacer),
            myWorks: myWorksView,
            myWorksJSON: JSON.stringify(myWorksView, bigintReplacer),
            udocs,
            udocsJSON: JSON.stringify(udocs, bigintReplacer),
            currentUserId: uid || null,
            page,
            total,
            totalPages,
            isLoggedIn: !!uid,
        };
    }
}
