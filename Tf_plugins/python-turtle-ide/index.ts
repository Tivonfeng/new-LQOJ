import { Context, Schema } from 'hydrooj';
import {
    TurtleAdminHandler,
    TurtleGalleryHandler,
    TurtlePlaygroundHandler,
    TurtleTaskAdminHandler,
    TurtleWorkHandler,
} from './src/handlers';
import type { TurtleTask, TurtleTaskProgress, TurtleWork } from './src/types';

// 配置 Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用 Turtle IDE'),
    maxCodeLength: Schema.number().default(10000).description('最大代码长度'),
    maxWorksPerUser: Schema.number().default(50).description('每用户最大作品数'),
});

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        'turtle.works': TurtleWork;
        'turtle.tasks': TurtleTask;
        'turtle.task_progress': TurtleTaskProgress;
    }
}

// 插件主函数
export default async function apply(ctx: Context, config: any = {}) {
    const defaultConfig = {
        enabled: true,
        maxCodeLength: 10000,
        maxWorksPerUser: 50,
    };

    const finalConfig = { ...defaultConfig, ...config };

    if (!finalConfig.enabled) {
        console.log('[Python Turtle IDE] Plugin is disabled in config');
        return;
    }

    console.log('[Python Turtle IDE] Plugin loading...');

    // 尝试注入 scoreService（如果可用），但不要把它赋值到 ctx（某些框架禁止在多个 fiber 中设置同一 ctx 属性）
    try {
        ctx.inject(['scoreService'], ({ scoreService: _scoreService }: any) => {
            // 使用注入回调内联处理或记录，可在此处执行需要立即执行的初始化逻辑
            console.log('[Python Turtle IDE] ✅ scoreService injected (callback)');
        });
    } catch (e) {
        // 部分框架实现可能不支持 ctx.inject 在此处直接调用，忽略错误并依赖回退机制
        console.warn('[Python Turtle IDE] ⚠️ ctx.inject scoreService failed:', (e as any)?.message || e);
    }

    // 创建数据库索引(作品集合 + 投币集合)
    try {
        await ctx.db.ensureIndexes(
            ctx.db.collection('turtle.works' as any),
            { key: { uid: 1, createdAt: -1 }, name: 'user_works' },
            { key: { isPublic: 1, isFeatured: 1 }, name: 'public_featured' },
            { key: { isPublic: 1, likes: -1 }, name: 'popular_works' },
            { key: { createdAt: -1 }, name: 'recent_works' },
        );

        // 投币记录集合：确保同一 (workId, uid) 唯一，防止重复投币
        await ctx.db.ensureIndexes(
            ctx.db.collection('turtle.work_likes' as any),
            { key: { workId: 1, uid: 1 }, name: 'work_likes_unique', unique: true },
        );

        await ctx.db.ensureIndexes(
            ctx.db.collection('turtle.tasks' as any),
            { key: { isPublished: 1, order: 1 }, name: 'task_publish_order' },
            { key: { createdAt: -1 }, name: 'task_created_at' },
        );

        await ctx.db.ensureIndexes(
            ctx.db.collection('turtle.task_progress' as any),
            { key: { uid: 1, taskId: 1 }, name: 'task_progress_user', unique: true },
            { key: { taskId: 1, status: 1 }, name: 'task_progress_status' },
        );

        console.log('[Python Turtle IDE] ✅ Indexes created successfully');
    } catch (error) {
        console.error('[Python Turtle IDE] ❌ Error creating indexes:', error.message);
    }

    // 注册路由
    // 作品社区：作为入口页面，展示全站作品 + 我的作品
    ctx.Route('turtle_gallery', '/turtle/gallery', TurtleGalleryHandler);
    // 编辑器：用于新建和编辑作品
    ctx.Route('turtle_playground', '/turtle/playground', TurtlePlaygroundHandler);
    ctx.Route('turtle_work', '/turtle/work/:workId', TurtleWorkHandler);
    ctx.Route('turtle_admin', '/turtle/admin', TurtleAdminHandler);
    ctx.Route('turtle_course_admin', '/turtle/course-admin', TurtleTaskAdminHandler);

    console.log('[Python Turtle IDE] ✅ Plugin loaded successfully!');
}

// 导出配置 Schema
export { Config };
