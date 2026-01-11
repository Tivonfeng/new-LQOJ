import {
    Context, ObjectId,
} from 'hydrooj';
import { LotteryGameRecord } from './LotteryService';

/**
 * 核销记录接口（用于审计）
 */
export interface RedemptionRecord {
    _id?: any;
    recordId: any; // 关联的 lottery.records._id
    uid: number; // 中奖用户
    domainId: string;
    prizeName: string;
    prizeDescription: string;
    redeemedAt: Date;
    redeemedBy: number; // 管理员UID
    redeemNote?: string;
    status: 'redeemed' | 'cancelled';
}

/**
 * 九宫格抽奖核销服务
 * 负责：核销管理、查询、统计
 */
export class LotteryRedemptionService {
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    /**
     * 获取待核销列表
     */
    async getPendingRedemptions(
        domainId: string,
        page: number = 1,
        limit: number = 20,
        filters?: {
            uid?: number | number[];
            prizeName?: string;
        },
    ): Promise<{
        records: LotteryGameRecord[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        // 管理员视图不再按域区分，查询所有域的待核销记录
        const query: any = {
            prizeType: 'physical',
            redeemStatus: 'pending',
        };

        if (filters?.uid !== undefined) {
            if (Array.isArray(filters.uid)) {
                query.uid = { $in: filters.uid };
            } else {
                query.uid = filters.uid;
            }
        }
        if (filters?.prizeName) query.prizeName = { $regex: filters.prizeName, $options: 'i' };

        const records = await this.ctx.db.collection('lottery.records' as any)
            .find(query)
            .sort({ gameTime: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await this.ctx.db.collection('lottery.records' as any)
            .countDocuments(query);

        return {
            records,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * 核销奖品
     */
    async redeemPrize(
        domainId: string,
        recordId: any,
        adminUid: number,
        note?: string,
    ): Promise<{ success: boolean, message?: string }> {
        try {
            // 转换 recordId 为 ObjectId
            let queryId: ObjectId;
            if (typeof recordId === 'string' && ObjectId.isValid(recordId)) {
                queryId = new ObjectId(recordId);
            } else if (recordId && typeof recordId === 'object' && recordId.buffer) {
                // 处理序列化后的 ObjectId（包含 buffer）
                const buffer = Buffer.from(Object.values(recordId.buffer));
                queryId = new ObjectId(buffer);
            } else if (recordId instanceof ObjectId) {
                queryId = recordId;
            } else {
                return { success: false, message: '无效的记录ID格式' };
            }

            // 查找记录
            const record = await this.ctx.db.collection('lottery.records' as any)
                // 管理员核销不再按域限制，按记录ID和奖品类型查找
                .findOne({ _id: queryId, prizeType: 'physical' });

            if (!record) {
                return { success: false, message: '记录不存在' };
            }

            if (record.redeemStatus !== 'pending') {
                return { success: false, message: '该奖品已核销或已取消' };
            }

            // 更新核销状态
            await this.ctx.db.collection('lottery.records' as any).updateOne(
                { _id: queryId },
                {
                    $set: {
                        redeemStatus: 'redeemed',
                        redeemedAt: new Date(),
                        redeemedBy: adminUid,
                        redeemNote: note || '',
                    },
                },
            );

            // 创建核销记录（用于审计）
            await this.ctx.db.collection('lottery.redemptions' as any).insertOne({
                recordId: queryId,
                uid: record.uid,
                domainId,
                prizeName: record.prizeName,
                prizeDescription: record.physicalPrize?.description || '',
                redeemedAt: new Date(),
                redeemedBy: adminUid,
                redeemNote: note,
                status: 'redeemed',
            });

            return { success: true };
        } catch (error: any) {
            console.error('[LotteryRedemptionService] Error redeeming prize:', error);
            return {
                success: false,
                message: `核销失败: ${error.message || '未知错误'}`,
            };
        }
    }

    /**
     * 取消核销（撤销）
     */
    async cancelRedemption(
        domainId: string,
        recordId: any,
        adminUid: number,
        note?: string,
    ): Promise<{ success: boolean, message?: string }> {
        try {
            // 转换 recordId 为 ObjectId
            let queryId: ObjectId;
            if (typeof recordId === 'string' && ObjectId.isValid(recordId)) {
                queryId = new ObjectId(recordId);
            } else if (recordId && typeof recordId === 'object' && recordId.buffer) {
                // 处理序列化后的 ObjectId（包含 buffer）
                const buffer = Buffer.from(Object.values(recordId.buffer));
                queryId = new ObjectId(buffer);
            } else if (recordId instanceof ObjectId) {
                queryId = recordId;
            } else {
                return { success: false, message: '无效的记录ID格式' };
            }

            const record = await this.ctx.db.collection('lottery.records' as any)
                // 管理员取消核销不再按域限制
                .findOne({ _id: queryId });

            if (!record) {
                return { success: false, message: '记录不存在' };
            }

            if (record.redeemStatus !== 'pending') {
                return { success: false, message: '无法取消核销（该奖品已核销或已取消）' };
            }

            await this.ctx.db.collection('lottery.records' as any).updateOne(
                { _id: queryId },
                {
                    $set: {
                        redeemStatus: 'cancelled',
                        redeemedAt: new Date(),
                        redeemedBy: adminUid,
                        redeemNote: note || '管理员取消',
                    },
                },
            );

            // 创建取消记录（用于审计）
            await this.ctx.db.collection('lottery.redemptions' as any).insertOne({
                recordId: queryId,
                uid: record.uid,
                domainId,
                prizeName: record.prizeName,
                prizeDescription: record.physicalPrize?.description || '',
                redeemedAt: new Date(),
                redeemedBy: adminUid,
                redeemNote: note || '管理员取消',
                status: 'cancelled',
            });

            return { success: true };
        } catch (error: any) {
            console.error('[LotteryRedemptionService] Error cancelling redemption:', error);
            return {
                success: false,
                message: `取消核销失败: ${error.message || '未知错误'}`,
            };
        }
    }

    /**
     * 获取用户的所有核销记录
     */
    async getUserRedemptions(
        domainId: string | undefined, // 修改为可选参数，支持全域查询
        uid: number,
        status?: 'pending' | 'redeemed' | 'cancelled',
    ): Promise<LotteryGameRecord[]> {
        const query: any = {
            uid,
            prizeType: 'physical',
        };

        // 如果指定了domainId，则按域查询；否则全域查询
        if (domainId) {
            query.domainId = domainId;
        }

        if (status) {
            query.redeemStatus = status;
        }

        return await this.ctx.db.collection('lottery.records' as any)
            .find(query)
            .sort({ gameTime: -1 })
            .toArray();
    }

    /**
     * 获取核销历史（管理员）
     */
    async getRedemptionHistory(
        domainId: string,
        page: number = 1,
        limit: number = 20,
        filters?: {
            uid?: number | number[];
            prizeName?: string;
            status?: 'redeemed' | 'cancelled';
        },
    ): Promise<{
        records: RedemptionRecord[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        // 管理员核销历史不再区分域
        const query: any = {};

        if (filters?.uid !== undefined) {
            if (Array.isArray(filters.uid)) {
                query.uid = { $in: filters.uid };
            } else {
                query.uid = filters.uid;
            }
        }
        if (filters?.prizeName) query.prizeName = { $regex: filters.prizeName, $options: 'i' };
        if (filters?.status) query.status = filters.status;

        const records = await this.ctx.db.collection('lottery.redemptions' as any)
            .find(query)
            .sort({ redeemedAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await this.ctx.db.collection('lottery.redemptions' as any)
            .countDocuments(query);

        return {
            records,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * 获取核销统计
     */
    async getRedemptionStats(domainId: string): Promise<{
        totalPending: number;
        totalRedeemed: number;
        totalCancelled: number;
        byPrize: Array<{
            prizeName: string;
            pending: number;
            redeemed: number;
            cancelled: number;
        }>;
    }> {
        const [pending, redeemed, cancelled] = await Promise.all([
            this.ctx.db.collection('lottery.records' as any)
                .countDocuments({ prizeType: 'physical', redeemStatus: 'pending' }),
            this.ctx.db.collection('lottery.records' as any)
                .countDocuments({ prizeType: 'physical', redeemStatus: 'redeemed' }),
            this.ctx.db.collection('lottery.records' as any)
                .countDocuments({ prizeType: 'physical', redeemStatus: 'cancelled' }),
        ]);

        // 按奖品统计
        const prizeStats = await this.ctx.db.collection('lottery.records' as any)
            .aggregate([
                // 统计所有域的实物奖品核销数据
                { $match: { prizeType: 'physical' } },
                {
                    $group: {
                        _id: {
                            prizeName: '$prizeName',
                            status: '$redeemStatus',
                        },
                        count: { $sum: 1 },
                    },
                },
            ])
            .toArray();

        const byPrizeMap = new Map<string, { pending: number, redeemed: number, cancelled: number }>();

        for (const stat of prizeStats) {
            const prizeName = stat._id.prizeName;
            const status = stat._id.status;
            const count = stat.count;

            if (!byPrizeMap.has(prizeName)) {
                byPrizeMap.set(prizeName, { pending: 0, redeemed: 0, cancelled: 0 });
            }

            const prizeStat = byPrizeMap.get(prizeName)!;
            if (status === 'pending') prizeStat.pending = count;
            else if (status === 'redeemed') prizeStat.redeemed = count;
            else if (status === 'cancelled') prizeStat.cancelled = count;
        }

        const byPrize = Array.from(byPrizeMap.entries()).map(([prizeName, stats]) => ({
            prizeName,
            ...stats,
        }));

        return {
            totalPending: pending,
            totalRedeemed: redeemed,
            totalCancelled: cancelled,
            byPrize,
        };
    }
}
