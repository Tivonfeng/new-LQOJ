import { Context, Schema } from 'hydrooj';
import {
    TurtleAdminHandler,
    TurtleGalleryHandler,
    TurtlePlaygroundHandler,
    TurtleWorkHandler,
} from './src/handlers';
import type { TurtleWork } from './src/types';

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

    // 创建数据库索引(作品集合 + 投币集合)
    try {
        await ctx.db.ensureIndexes(
            ctx.db.collection('turtle.works' as any),
            { key: { domainId: 1, uid: 1, createdAt: -1 }, name: 'user_works' },
            { key: { domainId: 1, isPublic: 1, isFeatured: 1 }, name: 'public_featured' },
            { key: { domainId: 1, likes: -1 }, name: 'popular_works' },
            { key: { domainId: 1, createdAt: -1 }, name: 'recent_works' },
        );

        // 投币记录集合：确保同一 (workId, uid) 唯一，防止重复投币
        await ctx.db.ensureIndexes(
            ctx.db.collection('turtle.work_likes' as any),
            { key: { workId: 1, uid: 1 }, name: 'work_likes_unique', unique: true },
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

    // 注入导航栏：入口指向作品社区，而不是直接进入编辑器
    ctx.injectUI('Nav', 'turtle_gallery', {
        prefix: 'turtle',
        before: 'typing',
    });

    console.log('[Python Turtle IDE] ✅ Plugin loaded successfully!');
}

// 导出配置 Schema
export { Config };
