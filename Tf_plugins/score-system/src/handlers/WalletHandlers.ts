import {
    Handler,
    PERM,
    PRIV,
} from 'hydrooj';
import {
    type TransferRecord,
    TransferService,
} from '../services';

// helper: 获取注入的 scoreCore 服务
function getScoreCore(ctx: any) {
    // 优先从全局对象获取（在插件加载时设置）
    let scoreCore = (global as any).scoreCoreService;
    if (scoreCore) {
        return scoreCore;
    }

    // 降级到 ctx.inject（在处理器运行时可能不可用）
    try {
        if (typeof ctx.inject === 'function') {
            ctx.inject(['scoreCore'], ({ scoreCore: _sc }: any) => {
                scoreCore = _sc;
            });
        } else {
            scoreCore = (ctx as any).scoreCore;
        }
    } catch (e) {
        scoreCore = (ctx as any).scoreCore;
    }

    if (!scoreCore) {
        throw new Error('ScoreCore service not available. Please ensure tf_plugins_core plugin is loaded before score-system plugin.');
    }

    return scoreCore;
}

export class WalletHandler extends Handler {
    async prepare() {
        this.checkPerm(PERM.PERM_VIEW);
        if (!this.user._id) throw new Error('需要登录');
    }

    async get() {
        const uid = this.user._id;
        const scoreCore = getScoreCore(this.ctx);
        const transferService = new TransferService(this.ctx);

        const userScore = await scoreCore.getUserScore(this.domain._id, uid);
        const myTransfers = await transferService.getUserTransferHistory(uid, 10);
        const allTransfers = await transferService.getAllTransferHistory(20);
        const transferStats = await transferService.getTransferStats();

        const uids = new Set<number>();
        for (const t of myTransfers) {
            uids.add(t.fromUid);
            uids.add(t.toUid);
        }
        for (const t of allTransfers) {
            uids.add(t.fromUid);
            uids.add(t.toUid);
        }

        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, Array.from(uids));

        const formatTransfers = (transfers: TransferRecord[]) => {
            return transfers.map((transfer) => ({
                ...transfer,
                createdAt: transfer.createdAt.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                completedAt: transfer.completedAt ? transfer.completedAt.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                }) : null,
            }));
        };

        this.response.template = 'wallet.html';
        this.response.body = {
            userScore: userScore || { totalScore: 0, acCount: 0 },
            myTransfers: formatTransfers(myTransfers),
            allTransfers: formatTransfers(allTransfers),
            udocs,
            transferStats,
            currentUid: uid,
            userBalance: userScore?.totalScore || 0,
            transferConfig: {
                minAmount: 1,
                maxAmount: 1000,
                dailyLimit: 100,
                transferFee: 1,
            },
        };
    }
}

export class TransferCreateHandler extends Handler {
    async prepare() {
        this.checkPerm(PERM.PERM_VIEW);
        if (!this.user._id) throw new Error('需要登录');
    }

    async post() {
        const { recipient, amount, reason } = this.request.body;
        const uid = this.user._id;

        if (!recipient || !amount) {
            this.response.body = { success: false, message: '请填写完整的转账信息' };
            return;
        }

        const amountNum = Number.parseInt(amount);
        if (!amountNum || amountNum <= 0) {
            this.response.body = { success: false, message: '转账金额必须是正整数' };
            return;
        }

        const transferService = new TransferService(this.ctx);

        const result = await transferService.createTransfer(uid, recipient.trim(), amountNum, reason?.trim());

        console.log(`[Transfer] User ${uid} transfer ${amountNum} to ${recipient}: ${result.message}`);

        this.response.body = result;
    }
}

export class TransferHistoryHandler extends Handler {
    async prepare() {
        this.checkPerm(PERM.PERM_VIEW);
        if (!this.user._id) throw new Error('需要登录');
    }

    async get() {
        const uid = this.user._id;
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const requestedLimit = Number.parseInt(this.request.query.limit as string) || 20;
        const limit = Math.min(requestedLimit, 10000); // 最大10000条
        const skip = (page - 1) * limit;

        const transferService = new TransferService(this.ctx);

        // 如果请求JSON格式且limit很大，返回所有记录
        const isJsonRequest = this.request.json || this.request.headers.accept?.includes('application/json');
        const fetchLimit = (isJsonRequest && requestedLimit >= 1000) ? 10000 : 100;

        const allTransfers = await transferService.getUserTransferHistory(uid, fetchLimit);
        // 如果是JSON请求且limit很大，返回所有记录；否则分页
        const transfers = (isJsonRequest && requestedLimit >= 1000) ? allTransfers : allTransfers.slice(skip, skip + limit);
        const total = allTransfers.length;

        const uids = new Set<number>();
        for (const t of transfers) {
            uids.add(t.fromUid);
            uids.add(t.toUid);
        }

        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, Array.from(uids));

        const formattedTransfers = transfers.map((transfer) => ({
            ...transfer,
            createdAt: transfer.createdAt.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
            completedAt: transfer.completedAt ? transfer.completedAt.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }) : null,
        }));

        // 自定义 JSON 序列化函数
        const serializeForJSON = (obj: any): any => {
            if (obj === null || obj === undefined) {
                return obj;
            }
            if (typeof obj === 'bigint') {
                return obj.toString();
            }
            if (obj instanceof Date) {
                return obj.toISOString();
            }
            if (Array.isArray(obj)) {
                return obj.map(serializeForJSON);
            }
            if (typeof obj === 'object') {
                const result: any = {};
                for (const [key, value] of Object.entries(obj)) {
                    result[key] = serializeForJSON(value);
                }
                return result;
            }
            return obj;
        };

        // 始终返回 JSON 格式
        this.response.type = 'application/json';
        this.response.body = {
            success: true,
            transfers: serializeForJSON(formattedTransfers),
            udocs: serializeForJSON(udocs),
            page,
            total,
            totalPages: Math.ceil(total / limit),
            currentUid: uid,
        };
    }
}

export class TransferAdminHandler extends Handler {
    async prepare() {
        if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
            this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        }
    }

    async get() {
        const transferService = new TransferService(this.ctx);

        const allTransfers = await transferService.getAllTransferHistory(50);
        const transferStats = await transferService.getTransferStats();

        const uids = new Set<number>();
        for (const t of allTransfers) {
            uids.add(t.fromUid);
            uids.add(t.toUid);
        }

        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, Array.from(uids));

        const formattedTransfers = allTransfers.map((transfer) => ({
            ...transfer,
            createdAt: transfer.createdAt.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }),
        }));

        // 自定义 JSON 序列化函数
        const serializeForJSON = (obj: any): any => {
            if (obj === null || obj === undefined) {
                return obj;
            }
            if (typeof obj === 'bigint') {
                return obj.toString();
            }
            if (obj instanceof Date) {
                return obj.toISOString();
            }
            if (Array.isArray(obj)) {
                return obj.map(serializeForJSON);
            }
            if (typeof obj === 'object') {
                const result: any = {};
                for (const [key, value] of Object.entries(obj)) {
                    result[key] = serializeForJSON(value);
                }
                return result;
            }
            return obj;
        };

        // 始终返回 JSON 格式
        this.response.type = 'application/json';
        this.response.body = {
            success: true,
            transfers: serializeForJSON(formattedTransfers),
            udocs: serializeForJSON(udocs),
            transferStats: serializeForJSON(transferStats),
        };
    }
}
