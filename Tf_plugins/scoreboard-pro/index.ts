import { ObjectId } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import {
    Context, ConnectionHandler, Handler, NotFoundError,
    param, Types, ContestModel, PERM,
} from 'hydrooj';

// ========== WebSocket Handler ==========

export class ScoreboardProConnHandler extends ConnectionHandler {
    tid: ObjectId;
    tdoc: any;

    // domainId 编码进 WS 路径参数 :domainId，由 WebSocketLayer.accept 注入 args
    async prepare() {
        const domainId: string = this.args.domainId;
        const tid = new ObjectId(this.args.tid);
        console.log('[SBP-WS] prepare args=', JSON.stringify(this.args));
        this.tid = tid;
        this.tdoc = await ContestModel.get(domainId, tid);
        if (!this.tdoc) throw new NotFoundError(tid);
        // 注册到订阅集合（prepare 之后 this.tdoc 才有值，handler/create 时机太早）
        const key = getKey(this.tdoc.domainId, this.tid);
        if (!subscribers.has(key)) subscribers.set(key, new Set());
        subscribers.get(key)!.add(this);
        // 立即推送一次全量
        await this.pushFullScoreboard();
    }

    // 连接关闭时由框架自动调用，从订阅集合移除
    async cleanup() {
        if (this.tdoc) {
            const key = getKey(this.tdoc.domainId, this.tid);
            subscribers.get(key)?.delete(this);
        }
    }

    async message(payload: any) {
        // 客户端可发送 {action: 'sync'} 请求全量数据
        if (payload?.action === 'sync') {
            await this.pushFullScoreboard();
        }
    }

    async pushFullScoreboard() {
        try {
            const [, rows, udict, pdict] = await ContestModel.getScoreboard.call(
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

// ========== 冻榜回放数据接口 ==========

export class ScoreboardProFrozenHandler extends Handler {
    @param('tid', Types.ObjectId)
    async get(domainId: string, tid: ObjectId) {
        const tdoc = await ContestModel.get(domainId, tid);
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
    // 注册为 scoreboard view，出现在比赛榜单页面的视图切换按钮里（与 Default / XCPCIO 并列）
    await ctx.inject(['scoreboard'], ({ scoreboard }) => {
        scoreboard.addView(
            'scoreboard-pro', 'Scoreboard Pro',
            { tdoc: 'tdoc' },
            {
                async display({ tdoc }) {
                    const [, rows, udict, pdict] = await ContestModel.getScoreboard.call(
                        this, tdoc.domainId, tdoc._id,
                        { isExport: false, showDisplayName: false },
                    );
                    this.response.template = 'scoreboard_pro.html';
                    this.response.body = {
                        tdoc,
                        rows,
                        udict,
                        pdict,
                        mode: 'normal', // 投影模式由前端按钮 (F键) 切换
                        // WS 路由无 /d/:domain 前缀，domainId 默认会是 system；
                        // 通过查询参数显式带上比赛所属域，prepare 里从 args 取回
                        wsPath: `/ws/scoreboard-pro/${tdoc._id.toHexString()}?domainId=${tdoc.domainId}`,
                    };
                },
                supportedRules: ['*'],
            },
        );
    });

    // 冻榜回放数据接口
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

    // i18n
    ctx.i18n.load('zh', {
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
