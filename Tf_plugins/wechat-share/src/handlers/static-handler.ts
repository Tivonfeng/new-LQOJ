import * as path from 'path';
import * as fs from 'fs';
import { Handler, param, Types } from 'hydrooj';

const MIMES: Record<string, string> = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.map': 'application/json; charset=utf-8',
};

/**
 * 微信插件公开静态资源 Handler
 *
 * 路由: /wechat/static/:filename
 * 无需登录即可访问（noCheckPermView = true）
 *
 * 安全措施：
 * - 文件名白名单正则，防止目录穿越
 * - path.join 限定在 public 目录下
 */
export class WechatStaticHandler extends Handler {
    noCheckPermView = true;

    @param('filename', Types.String)
    async get(_domainId: string, filename: string) {
        // 白名单：仅允许字母、数字、点、下划线、连字符，且必须有合法扩展名
        if (!/^[a-zA-Z0-9._/-]+\.(css|js|json|html?|mp[34]|png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|map)$/i.test(filename)) {
            this.response.status = 404;
            return;
        }

        // __dirname = src/handlers，需要回退两层到插件根目录的 public/
        const publicDir = path.join(__dirname, '..', '..', 'public');
        const filePath = path.join(publicDir, filename);

        // 二次校验：确保解析后的路径仍在 public 目录内
        if (!filePath.startsWith(publicDir)) {
            this.response.status = 404;
            return;
        }

        if (!fs.existsSync(filePath)) {
            this.response.status = 404;
            return;
        }

        const ext = path.extname(filename).toLowerCase();
        this.response.body = fs.readFileSync(filePath);
        this.response.type = MIMES[ext] || 'application/octet-stream';
        this.response.addHeader('Cache-Control', 'public, max-age=3600');
    }
}
