import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { Handler, Logger, param, Types } from 'hydrooj';

const logger = new Logger('sop-admin');

const SOP_DIR = path.join(__dirname, '..', '..', 'public', 'sop');
const IMG_DIR = path.join(SOP_DIR, 'images');

// 允许编辑的 JSON 文件白名单
const ALLOWED_FILES = ['sop.json', 'course-sop.json'];

/**
 * SOP 管理页面 Handler
 * GET /sop/admin -> 渲染编辑页面
 */
export class SopAdminHandler extends Handler {
    noCheckPermView = true;

    async get() {
        this.response.template = 'sop_admin.html';
        this.response.body = {};
        this.response.addHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        this.response.addHeader('Pragma', 'no-cache');
        this.response.addHeader('Expires', '0');
    }
}

/**
 * SOP 保存 Handler
 * POST /sop/admin/save { file, data }
 * 将修改后的 JSON 数据写回文件
 */
export class SopAdminSaveHandler extends Handler {
    noCheckPermView = true;

    @param('file', Types.String)
    @param('data', Types.Any)
    async post(_domainId: string, file: string, data: any) {
        // 文件白名单校验
        if (!ALLOWED_FILES.includes(file)) {
            this.response.status = 400;
            this.response.body = { error: '不允许编辑此文件' };
            return;
        }

        const filePath = path.resolve(SOP_DIR, file);
        // 路径穿越防护
        if (!filePath.startsWith(SOP_DIR)) {
            this.response.status = 400;
            this.response.body = { error: '非法路径' };
            return;
        }

        // 数据格式校验
        if (!data || typeof data !== 'object') {
            this.response.status = 400;
            this.response.body = { error: '数据格式错误' };
            return;
        }

        try {
            // 原子写入：先写临时文件再 rename，避免写入中途崩溃导致文件损坏
            const tmpPath = filePath + '.tmp';
            fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
            fs.renameSync(tmpPath, filePath);
            logger.info(`SOP 文件已保存: ${file}`);
            this.response.body = { success: true };
        } catch (e) {
            logger.error(`SOP 保存失败: ${file}`, e);
            this.response.status = 500;
            this.response.body = { error: '保存失败' };
        }
    }
}

/**
 * SOP 图片上传 Handler
 * POST /sop/admin/upload (multipart/form-data, field: file)
 * 使用 sharp 压缩为 webp 格式
 */
export class SopAdminUploadHandler extends Handler {
    noCheckPermView = true;

    async post() {
        const file = this.request.files?.file as any;
        if (!file) {
            this.response.status = 400;
            this.response.body = { error: '未上传文件' };
            return;
        }

        // 文件大小限制 10MB
        if (file.size > 10 * 1024 * 1024) {
            this.response.status = 400;
            this.response.body = { error: '文件过大（最大10MB）' };
            return;
        }

        // 扩展名校验
        const ext = path.extname(file.originalFilename || '').toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            this.response.status = 400;
            this.response.body = { error: '仅支持 jpg/png/gif/webp 格式' };
            return;
        }

        // 生成文件名：时间戳 + 随机串，统一 .webp 扩展名
        const baseName = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const outFileName = `${baseName}.webp`;
        const outPath = path.resolve(IMG_DIR, outFileName);

        // 路径穿越防护
        if (!outPath.startsWith(IMG_DIR)) {
            this.response.status = 400;
            this.response.body = { error: '非法路径' };
            return;
        }

        try {
            // 确保目录存在
            if (!fs.existsSync(IMG_DIR)) {
                fs.mkdirSync(IMG_DIR, { recursive: true });
            }

            // sharp 压缩：限制宽度 1600px，webp 质量 82
            await sharp(file.filepath)
                .resize({ width: 1600, withoutEnlargement: true })
                .webp({ quality: 82 })
                .toFile(outPath);

            logger.info(`图片已上传: ${outFileName}`);
            this.response.body = {
                success: true,
                filename: outFileName,
                url: `/sop/images/${outFileName}`,
            };
        } catch (e) {
            logger.error('图片处理失败', e);
            this.response.status = 500;
            this.response.body = { error: '图片处理失败' };
        }
    }
}

/**
 * SOP 图片删除 Handler
 * POST /sop/admin/delete-image { filename }
 */
export class SopAdminDeleteImageHandler extends Handler {
    noCheckPermView = true;

    @param('filename', Types.String)
    async post(_domainId: string, filename: string) {
        // 严格白名单：只允许 webp 文件名
        if (!/^[a-zA-Z0-9._-]+\.webp$/i.test(filename)) {
            this.response.status = 400;
            this.response.body = { error: '非法文件名' };
            return;
        }

        const filePath = path.resolve(IMG_DIR, filename);
        if (!filePath.startsWith(IMG_DIR) || !fs.existsSync(filePath)) {
            this.response.status = 404;
            this.response.body = { error: '文件不存在' };
            return;
        }

        try {
            fs.unlinkSync(filePath);
            logger.info(`图片已删除: ${filename}`);
            this.response.body = { success: true };
        } catch (e) {
            logger.error(`图片删除失败: ${filename}`, e);
            this.response.status = 500;
            this.response.body = { error: '删除失败' };
        }
    }
}
