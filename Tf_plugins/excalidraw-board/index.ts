import { Context, Handler, PERM, PRIV, ProblemModel, StorageModel, Types, param, query, route } from 'hydrooj';
import { streamToBuffer } from '@hydrooj/utils/lib/utils';
import fs from 'fs';
import path from 'path';

const MAX_VERSIONS = 10;

function jsonResponse(that: Handler, obj: any) {
    that.response.type = 'application/json';
    that.response.body = obj;
}

/** 画板文件名前缀：board-{pid}-{uid}- */
function boardPrefix(pid: string | number, uid: number) {
    return `board-${pid}-${uid}-`;
}

/**
 * Excalidraw 静态资产服务（CSS/字体）
 * 不依赖 koa-static-cache 的启动扫描（新增文件也能访问），直接读插件 public/ 目录。
 * 路由：/excalidraw-asset/* （如 /excalidraw-asset/index.css、/excalidraw-asset/fonts/...）
 */
export class ExcalidrawAssetHandler extends Handler {
    @route('file', Types.String, true)
    async get(domainId: string, file?: string) {
        const base = path.resolve(__dirname, 'public', 'excalidraw');
        // 防止路径穿越
        const target = path.resolve(base, file || 'index.css');
        if (!target.startsWith(base + path.sep) && target !== base) {
            this.response.status = 403;
            return;
        }
        if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
            this.response.status = 404;
            return;
        }
        const ext = path.extname(target).toLowerCase();
        const mime: Record<string, string> = {
            '.css': 'text/css; charset=utf-8',
            '.woff2': 'font/woff2',
            '.woff': 'font/woff',
            '.ttf': 'font/ttf',
            '.otf': 'font/otf',
        };
        this.response.type = mime[ext] || 'application/octet-stream';
        this.response.body = fs.createReadStream(target);
    }
}

/**
 * 画板保存/加载接口（与题目文件功能集成）
 * - 按教师隔离：文件名 board-{pid}-{uid}-{ts}.excalidraw
 * - 多版本：每次保存新文件，保留最近 MAX_VERSIONS 个
 * - 权限：题目作者或 PERM_EDIT_PROBLEM
 */
export class ExcalidrawBoardHandler extends Handler {
    private async loadPdoc(domainId: string, pid: string | number) {
        const pdoc = await ProblemModel.get(domainId, pid);
        if (!pdoc) {
            this.response.status = 404;
            jsonResponse(this, { error: 'problem not found' });
            return null;
        }
        return pdoc;
    }

    private checkOwner(pdoc: any) {
        // 教师身份：题目作者 / 域编辑权限 / 系统编辑权限（PRIV_EDIT_SYSTEM）
        if (!this.user.own(pdoc) && !this.user.hasPerm(PERM.PERM_EDIT_PROBLEM) && !this.user.hasPriv(PRIV.PRIV_EDIT_SYSTEM)) {
            this.response.status = 403;
            jsonResponse(this, { error: 'permission denied' });
            return false;
        }
        return true;
    }

    /** 列出/加载该教师的画板版本 */
    @query('pid', Types.String, true)
    @query('file', Types.String, true)
    async get(domainId: string, pid?: string, file?: string) {
        const pdoc = await this.loadPdoc(domainId, pid || '');
        if (!pdoc) return;
        if (!this.checkOwner(pdoc)) return;
        const prefix = boardPrefix(pdoc.pid || pdoc.docId, this.user._id);
        const files = (pdoc.additional_file || [])
            .filter((f: any) => f.name.startsWith(prefix) && f.name.endsWith('.excalidraw'))
            .sort((a: any, b: any) => (b.name > a.name ? 1 : -1)); // 时间戳在文件名里，倒序=最新在前

        if (!file) {
            return jsonResponse(this, {
                files: files.map((f: any) => ({ name: f.name, size: f.size, lastModified: f.lastModified })),
            });
        }
        // 越权防护：仅允许读取当前教师的画板文件
        if (!file.startsWith(prefix) || !file.endsWith('.excalidraw')) {
            this.response.status = 403;
            return jsonResponse(this, { error: 'permission denied' });
        }
        try {
            const buf = await streamToBuffer(
                await StorageModel.get(`problem/${pdoc.domainId}/${pdoc.docId}/additional_file/${file}`),
            );
            return jsonResponse(this, { content: buf.toString() });
        } catch (e) {
            this.response.status = 404;
            return jsonResponse(this, { error: 'file not found' });
        }
    }

    /** 保存画板为新版本，清理超出 MAX_VERSIONS 的旧版本 */
    @param('pid', Types.String, true)
    @param('content', Types.String, true)
    async post(domainId: string, pid?: string, content?: string) {
        const pdoc = await this.loadPdoc(domainId, pid || '');
        if (!pdoc) return;
        if (!this.checkOwner(pdoc)) return;
        if (!content) {
            this.response.status = 400;
            return jsonResponse(this, { error: 'content required' });
        }
        const p = pdoc.pid || pdoc.docId;
        const name = `board-${p}-${this.user._id}-${Date.now()}.excalidraw`;
        await ProblemModel.addAdditionalFile(domainId, pdoc.docId, name, Buffer.from(content), this.user._id);

        // 版本清理：保留最近 MAX_VERSIONS 个（把刚保存的文件计入）
        const prefix = boardPrefix(p, this.user._id);
        const mine = [...(pdoc.additional_file || [])
            .filter((f: any) => f.name.startsWith(prefix) && f.name.endsWith('.excalidraw'))
            .map((f: any) => f.name), name]
            .sort((a, b) => (b > a ? 1 : -1));
        if (mine.length > MAX_VERSIONS) {
            await ProblemModel.delAdditionalFile(domainId, pdoc.docId, mine.slice(MAX_VERSIONS), this.user._id);
        }
        return jsonResponse(this, { success: true, name });
    }
}

export default async function apply(ctx: Context) {
    // path-to-regexp v8：通配参数用 *file（旧语法 :file(.*) 已废弃）
    ctx.Route('excalidraw_asset', '/excalidraw-asset/*file', ExcalidrawAssetHandler);
    ctx.Route('excalidraw_board_save', '/excalidraw-board/save', ExcalidrawBoardHandler);
    ctx.Route('excalidraw_board_load', '/excalidraw-board/load', ExcalidrawBoardHandler);
    console.log('[excalidraw-board] ✅ Excalidraw 教师画板插件加载完成');
}
