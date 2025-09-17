import { Context, Schema } from 'hydrooj';
import { TfPageHandler } from './src/handlers';

// 配置Schema定义
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用TF页面插件'),
});

// 插件主函数
export default function apply(ctx: Context, config: any = {}) {
    const finalConfig = { enabled: true, ...config };

    if (!finalConfig.enabled) {
        return;
    }

    console.log('TF Page plugin loading...');

    // 注册路由
    ctx.Route('tf_page', '/tf', TfPageHandler);

    console.log('TF Page plugin loaded successfully!');
}

export { Config };
