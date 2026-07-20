import * as path from 'path';
import * as fs from 'fs';
import { Handler, Logger, param, Types } from 'hydrooj';

const logger = new Logger('community-toolkit');

const COMMUNITY_DIR = path.join(__dirname, '..', '..', 'public', 'community');

const FILE_MIMES: Record<string, string> = {
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pdf': 'application/pdf',
};

const IMAGE_MIMES: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
};

const FILE_PATTERN = /^[a-zA-Z0-9._-]+\.(docx|xlsx|pdf)$/i;
const IMAGE_PATTERN = /^[a-zA-Z0-9._-]+\.(png|jpe?g|gif|svg|ico|webp)$/i;

/**
 * 社区工具包 H5 主页面 Handler
 * GET /community-toolkit -> 使用 Nunjucks 模板渲染（React SPA 入口）
 */
export class CommunityToolkitHandler extends Handler {
    noCheckPermView = true;

    async get() {
        this.response.template = 'community_toolkit.html';
        this.response.body = {};
    }
}

/**
 * 课程 JSON 配置文件 Handler
 * GET /community-toolkit/courses/:filename
 */
export class CommunityToolkitCourseDataHandler extends Handler {
    noCheckPermView = true;

    @param('filename', Types.String)
    async get(_domainId: string, filename: string) {
        if (!/^[a-zA-Z0-9._-]+\.json$/i.test(filename)) {
            this.response.status = 404;
            return;
        }

        const baseDir = path.join(COMMUNITY_DIR, 'courses');
        const filePath = path.resolve(baseDir, filename);
        if (!filePath.startsWith(baseDir)) {
            this.response.status = 404;
            return;
        }

        if (!fs.existsSync(filePath)) {
            this.response.status = 404;
            return;
        }

        this.response.body = fs.readFileSync(filePath, 'utf-8');
        this.response.type = 'application/json; charset=utf-8';
        this.response.addHeader('Cache-Control', 'public, max-age=300');
    }
}

/**
 * 社区工具包附件下载 Handler
 * GET /community-toolkit/files/:filename
 */
export class CommunityToolkitFileHandler extends Handler {
    noCheckPermView = true;

    @param('filename', Types.String)
    async get(_domainId: string, filename: string) {
        if (!FILE_PATTERN.test(filename)) {
            this.response.status = 404;
            return;
        }

        const baseDir = path.join(COMMUNITY_DIR, 'files');
        const filePath = path.resolve(baseDir, filename);
        if (!filePath.startsWith(baseDir)) {
            this.response.status = 404;
            return;
        }

        if (!fs.existsSync(filePath)) {
            this.response.status = 404;
            this.response.body = 'File not found';
            return;
        }

        const ext = path.extname(filename).toLowerCase();
        this.response.body = fs.readFileSync(filePath);
        this.response.type = FILE_MIMES[ext] || 'application/octet-stream';
        this.response.addHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        this.response.addHeader('Cache-Control', 'public, max-age=3600');
    }
}

/**
 * 社区工具包图片资源 Handler
 * GET /community-toolkit/images/:filename
 */
export class CommunityToolkitImageHandler extends Handler {
    noCheckPermView = true;

    @param('filename', Types.String)
    async get(_domainId: string, filename: string) {
        if (!IMAGE_PATTERN.test(filename)) {
            this.response.status = 404;
            return;
        }

        const baseDir = path.join(COMMUNITY_DIR, 'images');
        const filePath = path.resolve(baseDir, filename);
        if (!filePath.startsWith(baseDir)) {
            this.response.status = 404;
            return;
        }

        if (!fs.existsSync(filePath)) {
            this.response.status = 404;
            return;
        }

        const ext = path.extname(filename).toLowerCase();
        this.response.body = fs.readFileSync(filePath);
        this.response.type = IMAGE_MIMES[ext] || 'application/octet-stream';
        this.response.addHeader('Cache-Control', 'public, max-age=3600');
    }
}
