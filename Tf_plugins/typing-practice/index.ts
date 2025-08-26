import {
    Context,
    Schema,
    PRIV,
} from 'hydrooj';

// 导入类型定义
import {
    TypingRecord,
    TypingUserStats,
    TypingConfig,
    TypingAchievement,
} from './src/types/typing';

// Services are now created directly in handlers, no longer imported here

// 导入处理器
import {
    TypingPracticeHandler,
    TypingStatsHandler,
    TypingAdminHandler,
    TypingHallHandler,
} from './src/handlers';

// 插件配置Schema
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用打字练习插件'),
    scoreIntegration: Schema.boolean().default(true).description('是否集成积分系统'),
    defaultDifficulty: Schema.string().default('beginner').description('默认难度级别'),
    enableAchievements: Schema.boolean().default(true).description('是否启用成就系统'),
    enableSoundEffects: Schema.boolean().default(true).description('是否启用音效'),
    maxTextLength: Schema.number().default(500).description('最大文本长度'),
    minAccuracy: Schema.number().default(60).description('最低准确率要求'),
}).description('打字练习插件配置');

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        'typing.records': TypingRecord;
        'typing.stats': TypingUserStats;
        'typing.achievements': TypingAchievement;
    }
}

// 插件主函数
export default function apply(ctx: Context, config: Partial<TypingConfig> = {}) {
    // 设置默认配置
    const defaultConfig: TypingConfig = {
        enabled: true,
        scoreIntegration: true,
        defaultDifficulty: 'beginner',
        enableAchievements: true,
        enableSoundEffects: true,
        maxTextLength: 500,
        minAccuracy: 60,
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    console.log('Typing Practice plugin loading...');
    console.log('Typing Practice config:', JSON.stringify(finalConfig, null, 2));
    
    // 如果插件被禁用，直接返回
    if (!finalConfig.enabled) {
        console.log('Typing Practice plugin disabled');
        return;
    }
    
    // 不再将服务注入Context，而是在每个Handler中创建服务实例
    // 这样可以避免 "cannot set property" 错误
    console.log('Services will be created in each handler as needed');

    // 注册路由 - 直接传递Handler类
    ctx.Route('typing_hall', '/typing/hall', TypingHallHandler);  // 打字大厅（公开访问）
    ctx.Route('typing_practice', '/typing', TypingPracticeHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('typing_text', '/typing/text', TypingPracticeHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('typing_data', '/typing/data', TypingPracticeHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('typing_stats', '/typing/stats', TypingStatsHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('typing_admin', '/typing/admin', TypingAdminHandler, PRIV.PRIV_CREATE_DOMAIN);

    // 注册前端页面（如果支持的话）
    try {
        if ((ctx as any).ui && (ctx as any).ui.addPage) {
            (ctx as any).ui.addPage('typing_practice', 'typing-practice.page');
            (ctx as any).ui.addPage('typing_stats', 'typing-stats.page');
        }
    } catch (error) {
        console.log('UI page registration not available:', (error as Error).message);
    }
    
    // 注入导航栏 - 指向打字大厅
    ctx.injectUI('Nav', 'typing_hall', {
        prefix: 'typing_hall',
        icon: 'edit',
        after: 'training', // 插入到训练题目之后
    });

    console.log('Typing Practice plugin routes registered:');
    console.log('- /typing/hall - 打字大厅（主页面）');
    console.log('- /typing - 打字练习页面');
    console.log('- /typing/data - 数据API接口');
    console.log('- /typing/stats - 统计页面');
    console.log('- /typing/admin - 管理页面');

    console.log('Typing Practice plugin loaded successfully!');
}

// 导出配置Schema
export { Config };