import * as path from 'path';
import * as fs from 'fs';
import { Handler, Logger, param, Types } from 'hydrooj';

const logger = new Logger('sop');

const SOP_DIR = path.join(__dirname, '..', '..', 'public', 'sop');

const IMAGE_MIMES: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
};

/**
 * SOP 首页 Handler
 * GET /sop -> SOP 选择首页（体验课SOP / 课程SOP）
 */
export class SopHomeHandler extends Handler {
    noCheckPermView = true;

    async get() {
        this.response.template = 'sop_home.html';
        this.response.body = {};
        this.response.addHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        this.response.addHeader('Pragma', 'no-cache');
        this.response.addHeader('Expires', '0');
    }
}

/**
 * 销售 SOP 页面 Handler
 * GET /sop/experience -> 返回体验课群运营SOP页面
 */
export class SalesSopHandler extends Handler {
    noCheckPermView = true;

    async get() {
        this.response.template = 'sales_sop.html';
        this.response.body = {};
        // 禁止 HTML 启发式缓存，确保每次刷新都拿到最新 constantVersion -> 最新 entry.js
        this.response.addHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        this.response.addHeader('Pragma', 'no-cache');
        this.response.addHeader('Expires', '0');
    }
}

/**
 * 课程 SOP 页面 Handler
 * GET /sop/course -> 返回课程课后反馈SOP页面
 */
export class SopCourseHandler extends Handler {
    noCheckPermView = true;

    async get() {
        this.response.template = 'sop_course.html';
        this.response.body = {};
        this.response.addHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        this.response.addHeader('Pragma', 'no-cache');
        this.response.addHeader('Expires', '0');
    }
}

/**
 * 销售 SOP 数据/图片 Handler
 * GET /sop/data/:filename -> 返回 sop.json
 * GET /sop/images/:filename -> 返回图片
 */
export class SalesSopDataHandler extends Handler {
    noCheckPermView = true;

    @param('filename', Types.String)
    async get(_domainId: string, filename: string) {
        // JSON 数据
        if (/^[a-zA-Z0-9._-]+\.json$/i.test(filename)) {
            const filePath = path.resolve(SOP_DIR, filename);
            if (!filePath.startsWith(SOP_DIR) || !fs.existsSync(filePath)) {
                this.response.status = 404;
                return;
            }
            this.response.body = fs.readFileSync(filePath, 'utf-8');
            this.response.type = 'application/json; charset=utf-8';
            this.response.addHeader('Cache-Control', 'no-cache');
            return;
        }

        // 图片
        if (/^[a-zA-Z0-9._-]+\.(png|jpe?g|gif|svg|webp)$/i.test(filename)) {
            const baseDir = path.join(SOP_DIR, 'images');
            const filePath = path.resolve(baseDir, filename);
            if (!filePath.startsWith(baseDir) || !fs.existsSync(filePath)) {
                this.response.status = 404;
                return;
            }
            const ext = path.extname(filename).toLowerCase();
            this.response.body = fs.readFileSync(filePath);
            this.response.type = IMAGE_MIMES[ext] || 'application/octet-stream';
            this.response.addHeader('Cache-Control', 'public, max-age=3600');
            return;
        }

        this.response.status = 404;
    }
}
