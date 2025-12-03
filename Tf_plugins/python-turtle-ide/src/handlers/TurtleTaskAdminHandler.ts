import { Handler, PRIV } from 'hydrooj';
import { TurtleTaskService } from '../services';

const jsonReplacer = (_key: string, value: any) => {
    if (value instanceof Date) return value.toISOString();
    return value;
};

export class TurtleTaskAdminHandler extends Handler {
    async prepare() {
        if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
            throw new Error('权限不足');
        }
    }

    async get() {
        const taskService = new TurtleTaskService(this.ctx);
        const tasks = await taskService.listAllTasks();
        const taskViews = tasks.map((task) => ({
            ...task,
            id: task._id?.toString?.() || '',
        }));

        this.response.template = 'turtle_course_admin.html';
        this.response.body = {
            tasks: taskViews,
            tasksJSON: JSON.stringify(taskViews, jsonReplacer),
        };
    }

    async post() {
        const taskService = new TurtleTaskService(this.ctx);
        const { action } = this.request.body;

        try {
            if (action === 'create' || action === 'update') {
                const {
                    taskId,
                    title,
                    description,
                    difficulty,
                    tags,
                    starterCode,
                    hint,
                    coverImage,
                    isPublished,
                    order,
                } = this.request.body;

                if (!title || !description) {
                    throw new Error('任务标题和描述不能为空');
                }

                const savedId = await taskService.saveTask({
                    taskId,
                    title,
                    description,
                    difficulty: difficulty || 'beginner',
                    tags: Array.isArray(tags)
                        ? tags
                        : typeof tags === 'string' && tags.length
                            ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
                            : [],
                    starterCode,
                    hint,
                    coverImage,
                    isPublished: isPublished === true || isPublished === 'true',
                    order: typeof order === 'number' ? order : Number.parseInt(order, 10) || undefined,
                });

                this.response.body = { success: true, taskId: savedId };
                return;
            }

            if (action === 'delete') {
                const { taskId } = this.request.body;
                if (!taskId) {
                    throw new Error('缺少任务 ID');
                }
                await taskService.deleteTask(taskId);
                this.response.body = { success: true };
                return;
            }

            this.response.body = { success: false, message: '无效操作' };
        } catch (error) {
            this.response.body = { success: false, message: (error as Error).message };
        }
    }
}
