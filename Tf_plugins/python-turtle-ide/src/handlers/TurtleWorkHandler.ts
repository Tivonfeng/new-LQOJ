import { Handler, PRIV, PERM } from 'hydrooj';
import { TurtleWorkService } from '../services';

/**
 * 单个作品查看页面
 * 路由: /turtle/work/:workId
 */
export class TurtleWorkHandler extends Handler {
    async get(args: any) {
        const workService = new TurtleWorkService(this.ctx);

        const workId = args.workId as string | undefined;

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

        // 检查是否为作者或有编辑权限
        const isAuthor = this.user?._id === work.uid;
        const hasEditPerm = this.user?.hasPerm(PERM.PERM_EDIT_DOMAIN) || false;
        const canViewCode = !!isAuthor || !!hasEditPerm;

        // 如果作品不公开且不是作者也没有编辑权限,则拒绝访问
        if (!work.isPublic && !isAuthor && !hasEditPerm) {
            throw new Error('This work is private');
        }

        // 返回 JSON 格式（前端使用弹窗查看，不再需要HTML页面）
        // 注意：代码始终返回（用于运行），但前端根据 canViewCode 决定是否显示
        const workPayload: any = {
            ...work,
            _id: work._id?.toString(),
        };

        // 代码不再删除，始终返回以便运行，但前端会根据 canViewCode 隐藏显示

        this.response.body = {
            work: workPayload,
            author: author ? {
                _id: author._id,
                uname: author.uname,
            } : null,
            isAuthor,
            hasEditPerm,
            canViewCode,
            codeHiddenReason: canViewCode ? '' : '该作品的代码仅对作者和有编辑权限的用户可见',
            isLoggedIn: !!this.user?._id,
        };
    }

    async post() {
        const uid = this.user?._id;
        const { action, workId } = this.request.body;
        const workService = new TurtleWorkService(this.ctx);

        try {
            if (action === 'coin') {
                if (!uid) {
                    this.response.status = 401;
                    this.response.body = { success: false, message: '请先登录' };
                    return;
                }
                await workService.coinWork(workId, uid, this.domain._id);
                this.response.body = { success: true, message: '投币成功！作品主人已获得1积分' };
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
