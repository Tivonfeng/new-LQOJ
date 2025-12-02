import { Handler } from 'hydrooj';
import { TurtleWorkService } from '../services';

/**
 * 单个作品查看页面
 * 路由: /turtle/work/:workId
 */
export class TurtleWorkHandler extends Handler {
    async get(args: any) {
        const workService = new TurtleWorkService(this.ctx);

        const workId = args.workId as string | undefined;

        // 调试日志：记录路由参数与解析出的 workId
        console.log('[TurtleWorkHandler] GET /turtle/work', {
            args,
            parsedWorkId: workId,
            rawUrl: this.request.url,
        });

        if (!workId) {
            console.warn('[TurtleWorkHandler] Missing workId in args', { args });
            this.response.status = 404;
            this.response.template = 'turtle_work_not_found.html';
            this.response.body = {
                workId: '',
                isLoggedIn: !!this.user?._id,
            };
            return;
        }

        // 获取作品
        const work = await workService.getWork(workId);
        if (!work) {
            // 作品不存在时返回友好的 404 页面，而不是抛出后端错误
            console.warn('[TurtleWorkHandler] Work not found', {
                workId,
            });
            this.response.status = 404;
            this.response.template = 'turtle_work_not_found.html';
            this.response.body = {
                workId,
                isLoggedIn: !!this.user?._id,
            };
            return;
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

        // 解决 JSON.stringify 不能序列化 BigInt 的问题
        const bigintReplacer = (_key: string, value: any) =>
            typeof value === 'bigint' ? value.toString() : value;

        this.response.template = 'turtle_work.html';
        this.response.body = {
            work,
            workJSON: JSON.stringify(work, bigintReplacer),
            author,
            isAuthor,
            isLoggedIn: !!this.user?._id,
        };
    }

    async post(args: any) {
        const uid = this.user?._id;
        const { action, workId } = this.request.body;
        const workService = new TurtleWorkService(this.ctx);

        try {
            if (action === 'like') {
                if (!uid) {
                    this.response.status = 401;
                    this.response.body = { success: false, message: 'Please login first' };
                    return;
                }
                await workService.likeWork(workId, uid);
                this.response.body = { success: true };
            } else if (action === 'delete') {
                if (!uid) {
                    this.response.status = 401;
                    this.response.body = { success: false, message: 'Please login first' };
                    return;
                }
                await workService.deleteWork(workId, uid);
                this.response.body = { success: true };
            } else {
                this.response.body = { success: false, message: 'Invalid action' };
            }
        } catch (error) {
            this.response.body = { success: false, message: (error as Error).message };
        }
    }
}
