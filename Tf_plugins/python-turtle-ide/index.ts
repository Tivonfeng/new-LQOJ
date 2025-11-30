import { Context, Schema } from 'hydrooj';
import {
    TurtleAdminHandler,
    TurtleGalleryHandler,
    TurtlePlaygroundHandler,
    TurtleWorkHandler,
} from './src/handlers';
import type { TurtleExample, TurtleWork } from './src/types';

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

/**
 * 获取示例代码列表(硬编码)
 */
export function getExamples(): TurtleExample[] {
    return [
        {
            name: 'Square',
            nameZh: '正方形',
            category: 'basic',
            code: `import turtle

t = turtle.Turtle()
t.speed(3)

# 绘制正方形
for i in range(4):
    t.forward(100)
    t.left(90)

turtle.done()`,
            description: '绘制一个简单的正方形',
            difficulty: 1,
            order: 1,
        },
        {
            name: 'Star',
            nameZh: '五角星',
            category: 'basic',
            code: `import turtle

t = turtle.Turtle()
t.speed(5)
t.color('gold')

# 绘制五角星
for i in range(5):
    t.forward(200)
    t.right(144)

turtle.done()`,
            description: '绘制一个漂亮的五角星',
            difficulty: 1,
            order: 2,
        },
        {
            name: 'Circle',
            nameZh: '圆形',
            category: 'basic',
            code: `import turtle

t = turtle.Turtle()
t.speed(5)
t.color('blue')

# 绘制圆形
t.circle(100)

turtle.done()`,
            description: '绘制一个圆形',
            difficulty: 1,
            order: 3,
        },
        {
            name: 'Spiral',
            nameZh: '彩色螺旋',
            category: 'advanced',
            code: `import turtle

t = turtle.Turtle()
t.speed(10)

colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']

# 绘制彩色螺旋
for i in range(100):
    t.color(colors[i % 6])
    t.forward(i * 2)
    t.left(91)

turtle.done()`,
            description: '绘制彩色螺旋图案',
            difficulty: 2,
            order: 4,
        },
        {
            name: 'Flower',
            nameZh: '花朵',
            category: 'art',
            code: `import turtle

t = turtle.Turtle()
t.speed(0)

# 绘制花朵
for i in range(36):
    t.color('pink')
    t.circle(100)
    t.left(10)

turtle.done()`,
            description: '绘制美丽的花朵图案',
            difficulty: 2,
            order: 5,
        },
        {
            name: 'Rainbow',
            nameZh: '彩虹',
            category: 'art',
            code: `import turtle

t = turtle.Turtle()
t.speed(10)

colors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet']

# 绘制彩虹
t.penup()
t.goto(-200, 0)
t.pendown()

for i, color in enumerate(colors):
    t.color(color)
    t.pensize(10)
    t.circle(150 - i * 20, 180)
    t.penup()
    t.goto(-200, i * 20)
    t.pendown()

turtle.done()`,
            description: '绘制七色彩虹',
            difficulty: 3,
            order: 6,
        },
    ];
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

    // 创建数据库索引(只为作品集合创建)
    try {
        await ctx.db.ensureIndexes(
            ctx.db.collection('turtle.works' as any),
            { key: { domainId: 1, uid: 1, createdAt: -1 }, name: 'user_works' },
            { key: { domainId: 1, isPublic: 1, isFeatured: 1 }, name: 'public_featured' },
            { key: { domainId: 1, likes: -1 }, name: 'popular_works' },
            { key: { domainId: 1, createdAt: -1 }, name: 'recent_works' },
        );

        console.log('[Python Turtle IDE] ✅ Indexes created successfully');
    } catch (error) {
        console.error('[Python Turtle IDE] ❌ Error creating indexes:', error.message);
    }

    // 注册路由
    ctx.Route('turtle_playground', '/turtle/playground', TurtlePlaygroundHandler);
    ctx.Route('turtle_gallery', '/turtle/gallery', TurtleGalleryHandler);
    ctx.Route('turtle_work', '/turtle/work/:workId', TurtleWorkHandler);
    ctx.Route('turtle_admin', '/turtle/admin', TurtleAdminHandler);

    // 注入导航栏
    ctx.injectUI('Nav', 'turtle_playground', {
        prefix: 'turtle',
        before: 'typing',
    });

    console.log('[Python Turtle IDE] ✅ Plugin loaded successfully!');
}

// 导出配置 Schema
export { Config };
