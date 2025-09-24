import type { IScoreService } from '@tivonfeng/score-core';
import { ScoreService } from '@tivonfeng/score-core';
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
    private scoreService: IScoreService;
    private config: TransferConfig;

    constructor(config: TransferConfig, ctx: Context, scoreService: IScoreService) {
        this.config = config;
        this.ctx = ctx;
        this.scoreService = scoreService;
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

            const fee = this.config.transferFee || 0;
            const totalCost = amount + fee;

            // 检查余额是否足够
            const sufficientBalance = await this.scoreService.checkSufficientScore('system', fromUid, totalCost);
            if (!sufficientBalance) {
                return { success: false, message: '余额不足（包含手续费）' };
            }

            const transactionId = this.generateTransactionId();

            // 扣除转账方积分（包含手续费）
            const deductResult = await this.scoreService.deductUserScore(
                'system',
                fromUid,
                totalCost,
                `转账给用户${toUsername}: ${amount}积分${fee > 0 ? ` (手续费${fee}积分)` : ''}`,
            );

            if (!deductResult.success) {
                return { success: false, message: `转账失败: ${deductResult.message}` };
            }

            // 增加接收方积分
            const addResult = await this.scoreService.addUserScore(
                'system',
                toUser._id,
                amount,
                `接收转账: 来自用户${fromUid}`,
            );

            if (!addResult.success) {
                // 如果增加失败，需要回滚扣除的积分
                await this.scoreService.addUserScore('system', fromUid, totalCost, `转账失败回滚: ${transactionId}`);
                return { success: false, message: `转账失败: ${addResult.message}` };
            }

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
            });

            await this.scoreService.addScoreRecord({
                uid: fromUid,
                domainId: 'system',
                pid: 0,
                recordId: ScoreService.generateUniqueRecordId(), // 生成唯一标识符
                score: -totalCost,
                reason: `转账给 ${toUsername} (${amount}积分 + ${this.config.transferFee}手续费)`,
                problemTitle: '积分转账',
            });

            await this.scoreService.addScoreRecord({
                uid: toUser._id,
                domainId: 'system',
                pid: 0,
                recordId: ScoreService.generateUniqueRecordId(), // 生成唯一标识符
                score: amount,
                reason: `收到来自用户的转账: ${reason || '无备注'}`,
                problemTitle: '积分转账',
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
