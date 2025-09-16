import { Context, Schema } from 'hydrooj';
import { VuePressHandler, VuePressRouteHandler, VuePressStaticHandler } from './src/handlers/VuePressHandler';

const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('启用VuePress文档'),
    basePath: Schema.string().default('/docs').description('文档访问路径'),
    title: Schema.string().default('Documentation').description('文档标题'),
});

export default function apply(ctx: Context, config: any = {}) {
    const finalConfig = {
        enabled: true,
        basePath: '/docs',
        title: 'Documentation',
        ...config,
    };

    if (!finalConfig.enabled) return;

    console.log('VuePress Docs Plugin loading...');

    // 静态资源路由 - 必须在通配符路由之前注册
    console.log('Registering assets route:', `${finalConfig.basePath}/assets/(.*)`);
    ctx.Route('docs_assets', `${finalConfig.basePath}/assets/(.*)`, VuePressStaticHandler);

    // 直接模式：VuePress独立运行
    ctx.Route('docs_main', finalConfig.basePath, VuePressHandler);
    ctx.Route('docs_routes', `${finalConfig.basePath}/(.*)?`, VuePressRouteHandler);

    ctx.injectUI('Nav', 'docs_main', {
        name: 'docs_main',
        displayName: finalConfig.title,
        icon: 'book',
        args: {},
    });

    console.log(`VuePress Docs Plugin loaded at ${finalConfig.basePath}`);
}

export { Config };
