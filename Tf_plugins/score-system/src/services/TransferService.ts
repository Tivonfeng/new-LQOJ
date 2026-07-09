import type { ClientSession } from 'mongodb';
import {
    Context,
} from 'hydrooj';

export interface TransferRecord {
    _id?: any;
    fromUid: number;
    toUid: number;
    amount: number;
    fee: number;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    reason?: string;
    createdAt: Date;
    completedAt?: Date;
    transactionId: string;
}

export interface TransferConfig {
    enabled: boolean;
    minAmount: number;
    maxAmount: number;
    dailyLimit: number;
    transferFee: number;
}

export class TransferService {
    private ctx: Context;
    private config: TransferConfig;

    constructor(ctx: Context, config?: Partial<TransferConfig>) {
        this.ctx = ctx;
        this.config = {
            enabled: true,
            minAmount: 1,
            maxAmount: 1000,
            dailyLimit: 100,
            transferFee: 1,
            ...config,
        };
    }

    /**
     * 在 MongoDB 事务中执行操作（如果支持）
     * Replica Set 环境使用事务，standalone mongod 降级为普通执行
     *
     * standalone MongoDB 不支持事务和 retryable writes，强行使用
     * session/transaction 会抛出 "This MongoDB deployment does not support
     * retryable writes" 错误（事务内部依赖 retryable writes，即使连接串加了
     * retryWrites=false 也无法在 standalone 上使用事务）。因此需要先检测部署
     * 形态，只有 Replica Set 才使用事务。
     */
    private async withTransaction<T>(operations: (session: ClientSession | null) => Promise<T>): Promise<T> {
        // 检测是否为 Replica Set：只有 Replica Set 才能使用 session/transaction
        let isReplicaSet = false;
        try {
            const adminDb = this.ctx.db.client.db('admin');
            const status = await adminDb.command({ replSetGetStatus: 1 }).catch(() => null);
            isReplicaSet = !!status;
        } catch {
            isReplicaSet = false;
        }

        if (!isReplicaSet) {
            // standalone 模式：不使用 session/transaction，直接执行
            return operations(null);
        }

        // Replica Set 模式：使用事务
        let session: ClientSession | null = null;
        try {
            session = this.ctx.db.client.startSession();
            session.startTransaction();
            const result = await operations(session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            try { await session?.abortTransaction(); } catch { /* ignore */ }
            throw error;
        } finally {
            try { await session?.endSession(); } catch { /* ignore */ }
        }
    }

    private generateTransactionId(): string {
        return `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    async createTransfer(
        fromUid: number,
        toUsername: string,
        amount: number,
        reason?: string,
    ): Promise<{
        success: boolean;
        transactionId?: string;
        message: string;
    }> {
        try {
            // 获取 scoreCore 实例
            const scoreCore = this.ctx.scoreCore!;
            if (!scoreCore) {
                throw new Error('ScoreCore service not available. Please ensure tf_plugins_core plugin is loaded before score-system plugin.');
            }

            if (!this.config.enabled) {
                return { success: false, message: '转账功能暂时关闭' };
            }

            if (amount < this.config.minAmount) {
                return { success: false, message: `转账金额不能少于 ${this.config.minAmount} 积分` };
            }

            if (amount > this.config.maxAmount) {
                return { success: false, message: `转账金额不能超过 ${this.config.maxAmount} 积分` };
            }

            const UserModel = global.Hydro.model.user;
            const toUser = await UserModel.getByUname('system', toUsername);
            if (!toUser) {
                return { success: false, message: '目标用户不存在' };
            }

            if (fromUid === toUser._id) {
                return { success: false, message: '不能给自己转账' };
            }

            const dailyCheck = await this.checkDailyLimit(fromUid);
            if (!dailyCheck) {
                return { success: false, message: `今日转账次数已达上限 ${this.config.dailyLimit} 次` };
            }

            const fromUserScore = await scoreCore.getUserScore('system', fromUid);
            const totalCost = amount + this.config.transferFee;

            if (!fromUserScore || fromUserScore.totalScore < totalCost) {
                return { success: false, message: '余额不足（包含手续费）' };
            }

            const transactionId = this.generateTransactionId();

            // 生成唯一的 pid 值，避免唯一索引冲突（转账使用 -7000000 范围）
            const timestamp = Date.now();
            const uniquePidFrom = -7000000 - timestamp;
            const uniquePidTo = -7000000 - timestamp - 1;

            await this.withTransaction(async (session) => {
                const opts = session ? { session } : {};

                await scoreCore.updateUserScore('system', fromUid, -totalCost, opts);
                await scoreCore.updateUserScore('system', toUser._id, amount, opts);

                await this.ctx.db.collection('transfer.records' as any).insertOne({
                    fromUid,
                    toUid: toUser._id,
                    amount,
                    fee: this.config.transferFee,
                    status: 'completed',
                    reason: reason || '',
                    createdAt: new Date(),
                    completedAt: new Date(),
                    transactionId,
                }, opts);

                await scoreCore.addScoreRecord({
                    uid: fromUid,
                    domainId: 'system',
                    pid: uniquePidFrom,
                    recordId: null,
                    score: -totalCost,
                    reason: `转账给 ${toUsername} (${amount}积分 + ${this.config.transferFee}手续费)`,
                    category: '积分转账',
                }, opts);

                await scoreCore.addScoreRecord({
                    uid: toUser._id,
                    domainId: 'system',
                    pid: uniquePidTo,
                    recordId: null,
                    score: amount,
                    reason: `收到来自用户的转账: ${reason || '无备注'}`,
                    category: '积分转账',
                }, opts);
            });

            return {
                success: true,
                transactionId,
                message: `成功转账 ${amount} 积分给 ${toUsername}`,
            };
        } catch (error) {
            console.error('[TransferService] Transfer failed:', error);
            return { success: false, message: `转账失败: ${error.message}` };
        }
    }

    private async checkDailyLimit(uid: number): Promise<boolean> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayTransfers = await this.ctx.db.collection('transfer.records' as any)
            .countDocuments({
                fromUid: uid,
                createdAt: { $gte: today },
                status: 'completed',
            });

        return todayTransfers < this.config.dailyLimit;
    }

    async getUserTransferHistory(uid: number, limit: number = 20): Promise<TransferRecord[]> {
        return await this.ctx.db.collection('transfer.records' as any)
            .find({
                $or: [
                    { fromUid: uid },
                    { toUid: uid },
                ],
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
    }

    async getAllTransferHistory(limit: number = 50): Promise<TransferRecord[]> {
        return await this.ctx.db.collection('transfer.records' as any)
            .find({ status: 'completed' })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
    }

    async getTransferStats(): Promise<{
        totalTransfers: number;
        totalAmount: number;
        totalFees: number;
        todayTransfers: number;
        todayAmount: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const allTransfers = await this.ctx.db.collection('transfer.records' as any)
            .find({ status: 'completed' })
            .toArray();

        const todayTransfers = allTransfers.filter((t) => t.createdAt >= today);

        return {
            totalTransfers: allTransfers.length,
            totalAmount: allTransfers.reduce((sum, t) => sum + t.amount, 0),
            totalFees: allTransfers.reduce((sum, t) => sum + t.fee, 0),
            todayTransfers: todayTransfers.length,
            todayAmount: todayTransfers.reduce((sum, t) => sum + t.amount, 0),
        };
    }
}
