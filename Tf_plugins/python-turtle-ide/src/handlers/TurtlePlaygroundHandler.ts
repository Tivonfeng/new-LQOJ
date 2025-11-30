import { Handler } from 'hydrooj';
import { getExamples } from '../..';
import { TurtleWorkService } from '../services';

/**
 * Turtle Playground 编辑器页面
 * 路由: /turtle/playground
 */
export class TurtlePlaygroundHandler extends Handler {
    async get() {
        const uid = this.user?._id;
        const workService = new TurtleWorkService(this.ctx);

        // 从查询参数获取 workId
        const workId = this.request.query.workId as string | undefined;

        // 如果有 workId,加载作品
        let work: any = null;
        if (workId) {
            work = await workService.getWork(workId);
            if (!work) {
                this.response.redirect = this.url('turtle_playground');
                return;
            }
            // 增加浏览次数
            await workService.incrementViews(workId);
        }

        // 获取示例代码列表(硬编码)
        const examples = getExamples();

        // 获取用户的作品列表
        let userWorks: any[] = [];
        if (uid) {
            userWorks = await workService.getUserWorks(uid, this.domain._id);
        }

        this.response.template = 'turtle_playground.html';
        this.response.body = {
            work: work || null,
            workJSON: JSON.stringify(work || null),
            examples,
            examplesJSON: JSON.stringify(examples),
            userWorks,
            userWorksJSON: JSON.stringify(userWorks),
            isLoggedIn: !!uid,
            currentUserId: uid || null,
        };
    }

    async post() {
        const uid = this.user?._id;
        if (!uid) {
            this.response.body = { success: false, message: 'Please login first' };
            return;
        }

        const { action, workId, title, code, description, isPublic, imageUrl } = this.request.body;
        const workService = new TurtleWorkService(this.ctx);

        try {
            if (action === 'save') {
                const savedWorkId = await workService.saveWork({
                    workId: workId || undefined,
                    uid,
                    domainId: this.domain._id,
                    title: title || 'Untitled',
                    code,
                    description,
                    isPublic: isPublic === 'true' || isPublic === true,
                    imageUrl,
                });

                this.response.body = { success: true, workId: savedWorkId };
            } else if (action === 'delete') {
                await workService.deleteWork(workId, uid);
                this.response.body = { success: true };
            } else if (action === 'like') {
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
