import {
    Context, Handler, ObjectId,
    param, Types,
} from 'hydrooj';

export function apply(ctx: Context) {
    // 注册前端页面
    ctx.ui.addPage('scratchpad-timer', 'scratchpad-timer.page');

    // 添加解题时间记录接口
    class ProblemTimerHandler extends Handler {
        @param('pid', Types.ObjectId)
        @param('time', Types.UnsignedInt)
        async post(domainId: string, pid: ObjectId, time: number) {
            // 获取当前用户
            const uid = this.user._id;
            if (!uid) throw new Error('User not logged in');

            // 保存解题时间记录
            const record = {
                domainId,
                uid,
                pid,
                solveTime: time, // 解题耗时（毫秒）
                finishedAt: new Date(),
            };

            // 保存到数据库（这里可以根据需要选择合适的collection）
            await ctx.model.document.add(
                domainId,
                'problem_solve_time',
                record.uid,
                record.pid,
                record,
            );

            this.response.body = { success: true };
        }
    }

    // 注册路由
    ctx.Route('problem_timer', '/problem/:pid/timer', ProblemTimerHandler);
}

export const name = 'scratchpad-timer';
export const version = '1.0.0';
