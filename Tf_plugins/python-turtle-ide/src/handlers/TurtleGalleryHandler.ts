import { ObjectId } from 'mongodb';
import { Handler, PRIV } from 'hydrooj';
import { TurtleTaskService, TurtleWorkService } from '../services';

/**
 * Turtle 作品展示墙
 * 路由: /turtle/gallery
 */
export class TurtleGalleryHandler extends Handler {
    async get() {
        const workService = new TurtleWorkService(this.ctx);
        const taskService = new TurtleTaskService(this.ctx);

        // 从查询参数获取页码
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const uid = this.user?._id;
        const isAdmin = !!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM);

        // 获取公开作品
        const { works, total, totalPages } = await workService.getPublicWorks(
            page,
            24, // 每页24个作品
        );

        // 获取热门作品排行榜（前20名）
        const popularWorks = await workService.getPopularWorks(20);

        // 统一处理公开作品，过滤掉代码字段，仅在「我的作品」中展示代码
        const sanitizePublicWork = (work: any) => {
            const { code, _id, ...rest } = work;
            return {
                ...rest,
                id: _id?.toString?.() || _id,
            };
        };

        const viewWorks = works.map(sanitizePublicWork);

        const popularWorksView = popularWorks.map(sanitizePublicWork);

        const tasks = await taskService.getPublicTasks();
        const taskViews = tasks.map((task: any) => ({
            ...task,
            id: task._id?.toString?.() || task._id,
        }));

        // 调试日志：记录当前页作品及其 ID
        console.log('[TurtleGalleryHandler] Public works page loaded', {
            page,
            total,
            totalPages,
            workIds: viewWorks.map((w) => w.id),
        });

        // 获取所有涉及的用户ID（用于全站作品作者信息，包括热门作品）
        const allUids = [...new Set([...works.map((w) => w.uid), ...popularWorks.map((w) => w.uid)])];

        // 获取用户信息
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, allUids);

        // 获取当前用户的作品列表
        let myWorksView: any[] = [];
        if (uid) {
            const myWorks = await workService.getUserWorks(uid);
            myWorksView = myWorks.map((w: any) => ({
                ...w,
                id: w._id?.toString?.() || w._id,
            }));
        }

        // 用户任务进度
        const taskProgressView: Record<string, any> = {};
        if (uid && taskViews.length) {
            const progressList = await taskService.listUserProgress(
                uid,
                taskViews.map((task) => new ObjectId(task.id)),
            );
            for (const progress of progressList) {
                taskProgressView[progress.taskId?.toString?.()] = {
                    status: progress.status,
                    updatedAt: progress.updatedAt,
                    completedAt: progress.completedAt,
                };
            }
        }

        // 解决 JSON.stringify 不能序列化 BigInt 的问题：
        // 将对象中的 BigInt 字段统一转换为字符串，避免抛出 TypeError
        const bigintReplacer = (_key: string, value: any) =>
            typeof value === 'bigint' ? value.toString() : value;

        this.response.template = 'turtle_gallery.html';
        this.response.body = {
            works: viewWorks,
            worksJSON: JSON.stringify(viewWorks, bigintReplacer),
            popularWorks: popularWorksView,
            popularWorksJSON: JSON.stringify(popularWorksView, bigintReplacer),
            myWorks: myWorksView,
            myWorksJSON: JSON.stringify(myWorksView, bigintReplacer),
            tasks: taskViews,
            tasksJSON: JSON.stringify(taskViews, bigintReplacer),
            taskProgress: taskProgressView,
            taskProgressJSON: JSON.stringify(taskProgressView, bigintReplacer),
            udocs,
            udocsJSON: JSON.stringify(udocs, bigintReplacer),
            currentUserId: uid || null,
            isAdmin,
            page,
            total,
            totalPages,
            isLoggedIn: !!uid,
        };
    }
}
