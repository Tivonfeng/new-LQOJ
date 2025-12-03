import { Handler, PRIV } from 'hydrooj';
import { TurtleTaskService, TurtleWorkService } from '../services';

/**
 * Turtle Playground 编辑器页面
 * 路由: /turtle/playground
 */
export class TurtlePlaygroundHandler extends Handler {
    async get() {
        const uid = this.user?._id;
        const workService = new TurtleWorkService(this.ctx);
        const taskService = new TurtleTaskService(this.ctx);

        // 从查询参数获取 workId 和 taskId
        const workId = this.request.query.workId as string | undefined;
        const taskId = this.request.query.taskId as string | undefined;

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

        // 如果带有 taskId，获取任务信息
        let task: any = null;
        let taskProgress: any = null;
        if (taskId) {
            const fetchedTask = await taskService.getTask(taskId);
            if (!fetchedTask) {
                this.response.redirect = this.url('turtle_playground');
                return;
            }
            if (!fetchedTask.isPublished && !(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
                this.response.redirect = this.url('turtle_playground');
                return;
            }

            task = {
                ...fetchedTask,
                id: fetchedTask._id?.toString?.() || fetchedTask._id,
            };

            if (uid) {
                const progress = await taskService.getUserProgress(uid, taskId);
                if (progress) {
                    taskProgress = {
                        status: progress.status,
                        lastCode: progress.lastCode || '',
                        updatedAt: progress.updatedAt,
                        completedAt: progress.completedAt,
                        bestWorkId: progress.bestWorkId?.toString?.() || null,
                    };
                }
            }
        }

        // 获取用户的作品列表
        let userWorks: any[] = [];
        if (uid) {
            userWorks = await workService.getUserWorks(uid);
        }

        // 获取当前用户名并序列化为 JSON 字符串
        const currentUserName = this.user?.uname || '';
        const currentUserNameJSON = currentUserName ? JSON.stringify(currentUserName) : 'null';

        this.response.template = 'turtle_playground.html';
        this.response.body = {
            work: work || null,
            workJSON: JSON.stringify(work || null),
            userWorks,
            userWorksJSON: JSON.stringify(userWorks),
            isLoggedIn: !!uid,
            currentUserId: uid || null,
            currentUserName,
            currentUserNameJSON,
            task: task || null,
            taskJSON: JSON.stringify(task || null),
            taskProgress: taskProgress || null,
            taskProgressJSON: JSON.stringify(taskProgress || null),
        };
    }

    async post() {
        const uid = this.user?._id;
        if (!uid) {
            this.response.body = { success: false, message: 'Please login first' };
            return;
        }

        const {
            action,
            workId,
            title,
            code,
            description,
            isPublic,
            imageUrl,
            taskId,
            status,
        } = this.request.body;
        const workService = new TurtleWorkService(this.ctx);
        const taskService = new TurtleTaskService(this.ctx);

        try {
            if (action === 'save') {
                const savedWorkId = await workService.saveWork({
                    workId: workId || undefined,
                    uid,
                    title: title || 'Untitled',
                    code,
                    description,
                    isPublic: isPublic === 'true' || isPublic === true,
                    imageUrl,
                });

                if (taskId) {
                    await taskService.upsertProgress({
                        taskId,
                        uid,
                        code,
                        status: 'completed',
                        bestWorkId: savedWorkId,
                    });
                }

                this.response.body = { success: true, workId: savedWorkId };
            } else if (action === 'delete') {
                await workService.deleteWork(workId, uid);
                this.response.body = { success: true };
            } else if (action === 'coin') {
                await workService.coinWork(workId, uid, this.domain._id);
                this.response.body = { success: true, message: '投币成功！作品主人已获得1积分' };
            } else if (action === 'taskProgress') {
                if (!taskId) {
                    this.response.body = { success: false, message: '缺少任务 ID' };
                    return;
                }
                const progress = await taskService.upsertProgress({
                    taskId,
                    uid,
                    code,
                    status: status || 'in_progress',
                });
                this.response.body = {
                    success: true,
                    progress: {
                        taskId: progress.taskId?.toString?.() || '',
                        status: progress.status,
                        lastCode: progress.lastCode || '',
                        updatedAt: progress.updatedAt,
                        completedAt: progress.completedAt,
                        bestWorkId: progress.bestWorkId?.toString?.() || '',
                    },
                };
            } else {
                this.response.body = { success: false, message: 'Invalid action' };
            }
        } catch (error) {
            this.response.body = { success: false, message: error.message };
        }
    }
}
