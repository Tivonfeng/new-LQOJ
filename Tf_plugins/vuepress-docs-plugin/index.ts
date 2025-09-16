import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';
import { Context, PRIV, Schema } from 'hydrooj';
import { VuePressHandler } from './src/handlers/VuePressHandler';

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

    // 使用捕获路由处理所有文档请求
    ctx.server.addCaptureRoute(`${finalConfig.basePath}/`, async (c: any, _next: any) => {
        const filePath = c.path.substring(`${finalConfig.basePath}/`.length);

        if (filePath.startsWith('assets/')) {
            // 静态资源处理 - 直接处理而不创建Handler实例
            const requestedFile = filePath.substring('assets/'.length);
            const pluginDir = __dirname;
            const distDir = path.join(pluginDir, 'vuepress');
            const assetsDir = path.join(distDir, 'assets');
            const fullPath = path.join(assetsDir, requestedFile);

            try {
                if (fs.existsSync(fullPath)) {
                    const fileContent = fs.readFileSync(fullPath);
                    const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
                    c.type = mimeType;
                    c.body = fileContent;
                } else {
                    c.status = 404;
                    c.body = `File not found: ${requestedFile}`;
                }
            } catch (error) {
                c.status = 500;
                c.body = `Error: ${error.message}`;
            }
        } else {
            // 页面路由处理 - 重定向到主路由
            c.redirect(`${finalConfig.basePath}`);
        }
    });

    // 主路由（用于导航）- 添加权限检查
    ctx.Route('docs_main', finalConfig.basePath, VuePressHandler, PRIV.PRIV_USER_PROFILE);

    // 导航栏显示也需要权限检查
    ctx.injectUI('Nav', 'docs_main', {
        prefix: 'docs',
        before: 'ranking', // 插入到排行榜前面
    }, PRIV.PRIV_USER_PROFILE);

    console.log(`VuePress Docs Plugin loaded at ${finalConfig.basePath}`);
}

export { Config };
