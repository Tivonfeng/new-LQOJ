import { Context, Schema } from 'hydrooj';
import { ClassroomToolsHandler } from './src/handlers/ToolsHandler';

// 配置Schema定义
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用课堂工具插件'),
    requireTeacherRole: Schema.boolean().default(false).description('是否要求教师角色才能使用'),
});

// 插件主函数
export default function apply(ctx: Context, config: any = {}) {
    const finalConfig = {
        enabled: true,
        requireTeacherRole: false,
        ...config,
    };

    if (!finalConfig.enabled) {
        return;
    }

    // 注册路由
    ctx.Route('classroom_tools', '/tools/classroom', ClassroomToolsHandler);

    // 注入导航栏
    ctx.injectUI('Nav', 'classroom_tools', {
        before: 'ranking',
    });
    ctx.logger.info('Classroom Tools plugin loaded');
}

export { Config };
