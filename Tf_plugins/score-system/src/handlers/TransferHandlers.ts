import {
    Handler,
    PERM,
    PRIV,
} from 'hydrooj';
import {
    ScoreService,
    TransferService,
    type TransferRecord,
} from '../services';
import { DEFAULT_CONFIG } from './config';

export class TransferExchangeHandler extends Handler {
    async prepare() {
        this.checkPerm(PERM.PERM_VIEW);
        if (!this.user._id) throw new Error('需要登录');
    }

    async get() {
        const uid = this.user._id;
        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const transferService = new TransferService(this.ctx, scoreService);

        const userScore = await scoreService.getUserScore(this.domain._id, uid);
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

        this.response.template = 'transfer_exchange.html';
        this.response.body = {
            userScore: userScore || { totalScore: 0, acCount: 0 },
            myTransfers: formatTransfers(myTransfers),
            allTransfers: formatTransfers(allTransfers),
            udocs,
            transferStats,
            currentUid: uid,
            userBalance: userScore?.totalScore || 0,
            transferConfig: {
                minAmount: 10,
                maxAmount: 1000,
                dailyLimit: 20,
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

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const transferService = new TransferService(this.ctx, scoreService);

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
        const limit = 20;
        const skip = (page - 1) * limit;

        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const transferService = new TransferService(this.ctx, scoreService);

        const allTransfers = await transferService.getUserTransferHistory(uid, 100);
        const transfers = allTransfers.slice(skip, skip + limit);
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

        this.response.template = 'transfer_history.html';
        this.response.body = {
            transfers: formattedTransfers,
            udocs,
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
        const scoreService = new ScoreService(DEFAULT_CONFIG, this.ctx);
        const transferService = new TransferService(this.ctx, scoreService);

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

        this.response.template = 'transfer_admin.html';
        this.response.body = {
            transfers: formattedTransfers,
            udocs,
            transferStats,
        };
    }
}
