import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';
import { Handler } from 'hydrooj';

/**
 * VuePress主页处理器
 */
export class VuePressHandler extends Handler {
    async get() {
        await this.serveVuePressPage('/');
    }

    protected async serveVuePressPage(_requestPath: string) {
        const pluginDir = path.dirname(path.dirname(path.dirname(__filename)));
        const distDir = path.join(pluginDir, 'vuepress');

        try {
            // VuePress是SPA，所有路由都返回index.html
            const indexPath = path.join(distDir, 'index.html');

            if (!fs.existsSync(indexPath)) {
                this.response.status = 404;
                this.response.body = 'VuePress build files not found. Please place your built VuePress files in the vuepress/ directory.';
                return;
            }

            let htmlContent = fs.readFileSync(indexPath, 'utf-8');

            // 重写资源路径
            htmlContent = this.rewriteVuePressAssets(htmlContent);

            // 注入Hydro信息
            htmlContent = this.injectHydroContext(htmlContent);

            this.response.type = 'text/html';
            this.response.body = htmlContent;
        } catch (error) {
            console.error('Error serving VuePress page:', error);
            this.response.status = 500;
            this.response.body = 'Internal Server Error';
        }
    }

    /**
     * 重写VuePress资源路径
     */
    protected rewriteVuePressAssets(html: string): string {
        const basePath = '/docs';

        // 处理assets路径
        html = html.replace(/href="\/assets\//g, `href="${basePath}/assets/`);
        html = html.replace(/src="\/assets\//g, `src="${basePath}/assets/`);

        // 处理可能的相对路径
        html = html.replace(/href="(?!http|\/\/|\/docs\/)([^"]*\.css[^"]*)"/g, `href="${basePath}/$1"`);
        html = html.replace(/src="(?!http|\/\/|\/docs\/)([^"]*\.js[^"]*)"/g, `src="${basePath}/$1"`);

        // 处理模块预加载
        html = html.replace(/href="(?!http|\/\/|\/docs\/)([^"]*)" rel="modulepreload"/g, `href="${basePath}/$1" rel="modulepreload"`);

        // 处理base标签（如果VuePress配置了base）
        html = html.replace(/<base href="[^"]*"[^>]*>/g, `<base href="${basePath}/">`);

        // 处理favicon等其他资源
        html = html.replace(/href="(?!http|\/\/|\/docs\/)([^"]*\.ico[^"]*)"/g, `href="${basePath}/$1"`);
        html = html.replace(/href="(?!http|\/\/|\/docs\/)([^"]*\.png[^"]*)"/g, `href="${basePath}/$1"`);

        return html;
    }

    /**
     * 注入Hydro上下文信息
     */
    protected injectHydroContext(html: string): string {
        const hydroContext = {
            user: this.user ? {
                _id: this.user._id,
                uname: this.user.uname,
                displayName: this.user.displayName,
                priv: this.user.priv,
            } : null,
            domain: {
                _id: this.domain._id,
                name: this.domain.name,
            },
            basePath: '/docs',
            isHydroEmbedded: true,
            theme: this.getHydroTheme(),
        };

        // 注入Hydro样式变量
        const hydroStyles = `
<style>
:root {
    --hydro-primary: #6366f1;
    --hydro-success: #10b981;
    --hydro-warning: #f59e0b;
    --hydro-error: #ef4444;
}

/* 与Hydro主题保持一致的样式 */
.vp-doc h1, .vp-doc h2, .vp-doc h3 {
    color: var(--hydro-primary);
}

/* VuePress Hope主题样式优化 */
body[data-hydro-embedded="true"] {
    background: var(--vp-c-bg);
}

/* 确保在Hydro环境中正常显示 */
.theme-hope-content {
    max-width: none !important;
}
</style>`;

        const script = `
<script>
window.__HYDRO_CONTEXT__ = ${JSON.stringify(hydroContext)};

// 如果用户已登录，可以在VuePress中显示用户信息
if (window.__HYDRO_CONTEXT__.user) {
    console.log('Hydro用户已登录:', window.__HYDRO_CONTEXT__.user.uname);
}

// 可以在这里添加与Hydro的交互逻辑
window.HydroVuePressReady = function() {
    console.log('VuePress在Hydro环境中加载完成');
};

// 如果是嵌入模式，添加新标签页打开功能
if (window.__HYDRO_CONTEXT__.isHydroEmbedded) {
    document.addEventListener('DOMContentLoaded', function() {
        // 为所有外部链接添加新标签页打开
        const links = document.querySelectorAll('a[href^="http"], a[href^="//"]');
        links.forEach(link => {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        });
    });
}
</script>`;

        return html
            .replace('</head>', `${hydroStyles}\n${script}\n</head>`)
            .replace('<body', '<body data-hydro-embedded="true"');
    }

    private getHydroTheme() {
        // 获取Hydro当前主题设置
        return {
            primary: '#6366f1',
            dark: false, // 可以从Hydro获取用户的主题偏好
        };
    }
}

/**
 * VuePress路由处理器 - 处理所有子路径
 */
export class VuePressRouteHandler extends VuePressHandler {
    async get() {
        const requestPath = this.request.path;
        const basePath = '/docs';

        // 提取相对于basePath的路径
        const relativePath = requestPath.replace(basePath, '') || '/';

        await this.serveVuePressPage(relativePath);
    }
}

/**
 * VuePress静态资源处理器
 */
export class VuePressStaticHandler extends Handler {
    async get() {
        console.log('[VuePress Static] Handler called!');
        console.log('[VuePress Static] Request path:', this.request.path);
        console.log('[VuePress Static] Request params:', this.request.params);
        console.log('[VuePress Static] Path param:', this.request.params.path);
        console.log('[VuePress Static] __dirname:', __dirname);

        const requestedFile = this.request.params[0] || this.request.params.path || '';
        const pluginDir = path.resolve(__dirname, '../..');
        const distDir = path.join(pluginDir, 'vuepress');
        const assetsDir = path.join(distDir, 'assets');
        const filePath = path.join(assetsDir, requestedFile);

        console.log('[VuePress Static] Plugin dir:', pluginDir);
        console.log('[VuePress Static] Dist dir:', distDir);
        console.log('[VuePress Static] Assets dir:', assetsDir);
        console.log('[VuePress Static] Requested file:', requestedFile);
        console.log('[VuePress Static] Looking for file:', filePath);
        console.log('[VuePress Static] Assets dir exists:', fs.existsSync(assetsDir));
        console.log('[VuePress Static] Dist dir exists:', fs.existsSync(distDir));

        try {
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath);
                const mimeType = mime.lookup(filePath) || 'application/octet-stream';

                this.response.type = mimeType;
                this.response.body = fileContent;
                console.log('[VuePress Static] Served file successfully, size:', fileContent.length);
            } else {
                this.response.status = 404;
                this.response.body = `File not found: ${requestedFile}`;
                console.log('[VuePress Static] File not found:', filePath);
            }
        } catch (error) {
            console.error('[VuePress Static] Error:', error);
            this.response.status = 500;
            this.response.body = `Error: ${error.message}`;
        }
    }
}
