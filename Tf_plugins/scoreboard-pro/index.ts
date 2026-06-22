import { ObjectId } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import {
    Context, ConnectionHandler, Handler, NotFoundError,
    param, Types, contest, PERM,
} from 'hydrooj';

// ========== WebSocket Handler ==========

export class ScoreboardProConnHandler extends ConnectionHandler {
    tid: ObjectId;
    tdoc: any;

    @param('tid', Types.ObjectId)
    async prepare(domainId: string, tid: ObjectId) {
        this.tid = tid;
        this.tdoc = await contest.get(domainId, tid);
        if (!this.tdoc) throw new NotFoundError(tid);
    }

    async message(payload: any) {
        // 客户端可发送 {action: 'sync'} 请求全量数据
        if (payload?.action === 'sync') {
            await this.pushFullScoreboard();
        }
    }

    async pushFullScoreboard() {
        try {
            const [, rows, udict, pdict] = await contest.getScoreboard.call(
                this, this.tdoc.domainId, this.tdoc._id, {
                    isExport: false, showDisplayName: false,
                },
            );
            this.send(JSON.stringify({
                type: 'full',
                rows, udict, pdict,
                tdoc: {
                    _id: this.tdoc._id,
                    title: this.tdoc.title,
                    beginAt: this.tdoc.beginAt,
                    endAt: this.tdoc.endAt,
                    rule: this.tdoc.rule,
                    pids: this.tdoc.pids,
                },
                ts: Date.now(),
            }));
        } catch (e) {
            this.send(JSON.stringify({ type: 'error', message: String(e) }));
        }
    }

    // 订阅 record/change 事件并过滤本比赛的提交
    // @subscribe 装饰器在某些版本可能不可用，改用 bus 监听
}

// ========== 静态资源 Handler ==========

export class ScoreboardProStaticHandler extends Handler {
    noCheckPermView = true;

    @param('filename', Types.String)
    async get(_domainId: string, filename: string) {
        if (!/^[a-zA-Z0-9._-]+\.(css|js|mp3|png|svg|woff2?)$/.test(filename)) {
            throw new NotFoundError(filename);
        }
        const filePath = path.join(__dirname, 'public', filename);
        if (!fs.existsSync(filePath)) throw new NotFoundError(filename);

        const ext = path.extname(filename).toLowerCase();
        const mimes: Record<string, string> = {
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.mp3': 'audio/mpeg',
            '.png': 'image/png',
            '.svg': 'image/svg+xml',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
        };
        this.response.body = fs.readFileSync(filePath);
        this.response.type = mimes[ext] || 'application/octet-stream';
        this.response.addHeader('Cache-Control', 'public, max-age=3600');
    }
}

// ========== HTTP Handler (页面) ==========

export class ScoreboardProHandler extends Handler {
    @param('tid', Types.ObjectId)
    @param('mode', Types.String, true)
    async get(domainId: string, tid: ObjectId, mode = 'normal') {
        const tdoc = await contest.get(domainId, tid);
        if (!tdoc) throw new NotFoundError(tid);

        // 检查权限
        if (!this.user.own(tdoc) && !contest.canShowScoreboard.call(this, tdoc, true)) {
            this.checkPerm(PERM.PERM_VIEW_CONTEST_HIDDEN_SCOREBOARD);
        }

        // 直接渲染初始数据（首屏直出）
        const [, rows, udict, pdict] = await contest.getScoreboard.call(
            this, domainId, tid, { isExport: false, showDisplayName: false },
        );

        this.response.template = 'scoreboard_pro.html';
        this.response.body = {
            tdoc,
            rows,
            udict,
            pdict,
            mode, // 'normal' | 'projector'
            wsPath: `/ws/scoreboard-pro/${tid.toHexString()}`,
        };
    }
}

// ========== 冻榜回放数据接口 ==========

export class ScoreboardProFrozenHandler extends Handler {
    @param('tid', Types.ObjectId)
    async get(domainId: string, tid: ObjectId) {
        const tdoc = await contest.get(domainId, tid);
        if (!tdoc) throw new NotFoundError(tid);
        if (!this.user.own(tdoc)) {
            this.checkPerm(PERM.PERM_EDIT_CONTEST);
        }

        // 返回冻榜期间所有提交（按时间排序）
        if (!tdoc.lockAt) {
            this.response.body = { submissions: [], hasFrozen: false };
            return;
        }

        const { default: db } = await import('hydrooj/src/service/db');
        const records = await db.collection('record')
            .find({
                domainId,
                contest: tid,
                judgeAt: { $gte: tdoc.lockAt, $lte: tdoc.endAt },
            })
            .project({ _id: 1, uid: 1, pid: 1, status: 1, score: 1, judgeAt: 1 })
            .sort({ judgeAt: 1 })
            .toArray();

        this.response.body = {
            submissions: records,
            hasFrozen: true,
            lockAt: tdoc.lockAt,
            endAt: tdoc.endAt,
        };
    }
}

// ========== 订阅器 ==========

// 维护所有活跃 WS 连接 { domainId/tid: Set<conn> }
const subscribers = new Map<string, Set<ScoreboardProConnHandler>>();

function getKey(domainId: string, tid: ObjectId | string) {
    return `${domainId}/${tid.toString()}`;
}

// ========== 插件入口 ==========

export async function apply(ctx: Context) {
    // 路由
    ctx.Route(
        'scoreboard_pro',
        '/contest/:tid/scoreboard-pro',
        ScoreboardProHandler,
        PERM.PERM_VIEW_CONTEST_SCOREBOARD,
    );

    ctx.Route(
        'scoreboard_pro_frozen',
        '/contest/:tid/scoreboard-pro/frozen',
        ScoreboardProFrozenHandler,
        PERM.PERM_VIEW_CONTEST_SCOREBOARD,
    );

    // 静态资源（CSS/JS/音效）
    ctx.Route(
        'scoreboard_pro_static',
        '/scoreboard-pro/:filename',
        ScoreboardProStaticHandler,
    );

    // WebSocket
    ctx.Connection(
        'scoreboard_pro_ws',
        '/ws/scoreboard-pro/:tid',
        ScoreboardProConnHandler,
        PERM.PERM_VIEW_CONTEST_SCOREBOARD,
    );

    // 拦截连接创建，加入订阅集合
    ctx.on('handler/create' as any, async (h: any) => {
        if (h instanceof ScoreboardProConnHandler) {
            const key = getKey(h.tdoc.domainId, h.tid);
            if (!subscribers.has(key)) subscribers.set(key, new Set());
            subscribers.get(key)!.add(h);

            // 立即推送一次全量
            await h.pushFullScoreboard();
        }
    });

    // 监听评测完成事件
    ctx.on('record/judge' as any, async (rdoc: any, _updated: any) => {
        if (!rdoc?.contest) return;

        const key = getKey(rdoc.domainId, rdoc.contest);
        const subs = subscribers.get(key);
        if (!subs?.size) return;

        // 推送单次提交事件
        const payload = JSON.stringify({
            type: 'submission',
            uid: rdoc.uid,
            pid: rdoc.pid,
            rid: rdoc._id?.toString?.() || rdoc._id,
            status: rdoc.status,
            score: rdoc.score,
            ts: Date.now(),
        });

        for (const sub of subs) {
            try {
                sub.send(payload);
            } catch {
                subs.delete(sub);
            }
        }

        // 同时推送全量重算（让客户端不必自己算分）
        // 节流：1.5 秒内最多一次
        scheduleFullSync(rdoc.domainId, rdoc.contest, subs);
    });

    // 清理连接
    const cleanupTimer = setInterval(() => {
        for (const [key, set] of subscribers.entries()) {
            for (const conn of set) {
                if ((conn as any).destroyed) set.delete(conn);
            }
            if (set.size === 0) subscribers.delete(key);
        }
    }, 30000);

    ctx.on('dispose', () => clearInterval(cleanupTimer));

    // 导航
    ctx.injectUI(
        'Nav',
        'scoreboard_pro',
        { prefix: 'scoreboard-pro', icon: 'star' },
        PERM.PERM_VIEW_CONTEST_SCOREBOARD,
    );

    // i18n
    ctx.i18n.load('zh', {
        scoreboard_pro: '🏆 实时榜单',
        'Scoreboard Pro': '⚡ 酷炫实时榜',
        'Projector Mode': '投影模式',
        'Frozen Replay': '冻榜回放',
    });
}

// ========== 节流：全量同步 ==========

const pendingFullSync = new Map<string, NodeJS.Timeout>();

function scheduleFullSync(domainId: string, tid: ObjectId, subs: Set<ScoreboardProConnHandler>) {
    const key = getKey(domainId, tid);
    if (pendingFullSync.has(key)) return;

    const timer = setTimeout(async () => {
        pendingFullSync.delete(key);
        // 选取第一个连接获取最新数据（所有人看的是同一份）
        const firstSub = subs.values().next().value;
        if (firstSub) {
            await firstSub.pushFullScoreboard();
            // 复制 payload 给其他连接（避免每个连接都查一次 DB）
            // 简化：直接让每个连接独立推送
            for (const sub of subs) {
                if (sub !== firstSub) {
                    try { await sub.pushFullScoreboard(); } catch {}
                }
            }
        }
    }, 1500);

    pendingFullSync.set(key, timer);
}
