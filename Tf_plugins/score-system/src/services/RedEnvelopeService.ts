/**
 * 红包服务层
 * 负责红包的核心业务逻辑
 */
import {
    db,
} from 'hydrooj';
import {
    type CreateRedEnvelopeParams,
    RedEnvelope,
    RedEnvelopeBrief,
    RedEnvelopeCategory,
    RedEnvelopeClaim,
    RedEnvelopeDetail,
    type RedEnvelopeStats,
    RedEnvelopeStatus,
    RedEnvelopeType,
} from '../models/RedEnvelope';

// 红包集合名称
const RED_ENVELOPE_COLLECTION = 'score_red_envelopes' as any;
const RED_ENVELOPE_CLAIM_COLLECTION = 'score_red_envelope_claims' as any;

export class RedEnvelopeService {
    private ctx: any;
    private domainId: string;

    constructor(ctx: any, domainId?: string) {
        this.ctx = ctx;
        this.domainId = domainId || ctx.domain?._id || 'default';
    }

    /**
     * 创建红包
     */
    async createEnvelope(
        uid: number,
        uname: string,
        displayName: string | undefined,
        params: CreateRedEnvelopeParams,
    ): Promise<{ success: boolean, envelopeId?: string, error?: string }> {
        const { totalAmount, totalCount, message, type, expireHours = 24 } = params;

        // 验证参数
        if (totalAmount < totalCount) {
            return { success: false, error: '总金额必须大于等于红包数量（每个红包至少1积分）' };
        }
        if (totalCount < 1 || totalCount > 100) {
            return { success: false, error: '红包数量必须在1-100之间' };
        }
        if (totalAmount < 1) {
            return { success: false, error: '总金额必须大于0' };
        }

        // 获取用户积分并扣款
        const scoreCore = (global as any).scoreCoreService;
        if (!scoreCore) {
            console.error('[RedEnvelope] scoreCore 服务不存在');
            return { success: false, error: '积分服务不可用' };
        }

        const userScore = await scoreCore.getUserScore(this.domainId, uid);
        console.log('[RedEnvelope] 用户积分查询结果:', { uid, userScore });
        const currentScore = userScore?.totalScore || 0;
        if (currentScore < totalAmount) {
            return { success: false, error: `积分不足（当前: ${currentScore}，需要: ${totalAmount}）` };
        }

        // 生成红包ID和唯一PID
        const envelopeId = `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // 使用时间戳+微秒级计数器确保PID唯一
        const sendPid = -10000001 - Date.now() % 1000000 - Math.floor(Math.random() * 1000);
        const sendRecordId = `send_${envelopeId}`; // 发送记录ID（唯一）

        // 计算过期时间
        const now = new Date();
        const expiredAt = new Date(now.getTime() + expireHours * 60 * 60 * 1000);

        // 创建红包记录（先创建对象，还没存入数据库）
        const envelope: RedEnvelope = {
            envelopeId,
            senderUid: uid,
            senderName: uname,
            senderDisplayName: displayName,
            totalAmount,
            totalCount,
            remainingAmount: totalAmount,
            remainingCount: totalCount,
            message: message || '恭喜发财，大吉大利！',
            type,
            domainId: this.domainId,
            createdAt: now,
            expiredAt,
            status: RedEnvelopeStatus.ACTIVE,
        };

        // 扣除积分
        await scoreCore.recordScoreChange({
            uid,
            domainId: this.domainId,
            pid: sendPid, // 使用唯一PID
            recordId: sendRecordId,
            score: -totalAmount,
            reason: `发红包：${message || '恭喜发财'}`,
            category: RedEnvelopeCategory.RED_ENVELOPE_SEND,
        });

        try {
            await db.collection(RED_ENVELOPE_COLLECTION).insertOne(envelope);
            console.log(`[RedEnvelope] 用户 ${uid}(${uname}) 创建了红包 ${envelopeId}，金额 ${totalAmount}，数量 ${totalCount}`);
            return { success: true, envelopeId };
        } catch (error) {
            // 如果创建失败，退回积分
            await scoreCore.recordScoreChange({
                uid,
                domainId: this.domainId,
                pid: sendPid, // 使用与发送时相同的PID
                recordId: `refund_${sendRecordId}`,
                score: totalAmount,
                reason: `发红包失败退款：${message || '恭喜发财'}`,
                category: RedEnvelopeCategory.RED_ENVELOPE_SEND,
            });
            console.error('[RedEnvelope] 创建红包失败:', error);
            return { success: false, error: '创建红包失败' };
        }
    }

    /**
     * 领取红包
     */
    async claimEnvelope(
        envelopeId: string,
        uid: number,
        uname: string,
        displayName: string | undefined,
    ): Promise<{ success: boolean, amount?: number, remainingCount?: number, error?: string }> {
        // 检查用户是否已登录
        if (!uid) {
            return { success: false, error: '请先登录' };
        }

        // 获取红包信息
        const envelope = await db.collection(RED_ENVELOPE_COLLECTION).findOne({
            envelopeId,
            domainId: this.domainId,
        }) as unknown as RedEnvelope | null;

        if (!envelope) {
            return { success: false, error: '红包不存在' };
        }

        // 检查红包状态
        if (envelope.status !== RedEnvelopeStatus.ACTIVE) {
            return { success: false, error: '红包已结束' };
        }

        // 检查是否过期
        if (new Date() > new Date(envelope.expiredAt)) {
            await this.expireEnvelope(envelopeId);
            return { success: false, error: '红包已过期' };
        }

        // 检查是否已领取过
        const existingClaim = await db.collection(RED_ENVELOPE_CLAIM_COLLECTION).findOne({
            envelopeId,
            claimerUid: uid,
            domainId: this.domainId,
        });
        if (existingClaim) {
            return { success: false, error: '您已领取过该红包' };
        }

        // 领取红包（使用原子操作防止并发问题）
        const result = await db.collection(RED_ENVELOPE_COLLECTION).findOneAndUpdate(
            {
                envelopeId,
                domainId: this.domainId,
                status: RedEnvelopeStatus.ACTIVE,
                remainingCount: { $gt: 0 },
            },
            {
                $inc: {
                    remainingAmount: -1, // 这里先减1，实际金额后面计算
                    remainingCount: -1,
                },
            },
            {
                returnDocument: 'before',
            },
        );

        if (!result) {
            return { success: false, error: '领取失败，红包已被领完' };
        }

        // 计算领取金额
        let amount: number;
        if (envelope.type === RedEnvelopeType.AVERAGE) {
            // 平均分配：总金额 / 总数量
            amount = Math.floor(envelope.totalAmount / envelope.totalCount);
            // 处理余数
            const remainder = envelope.totalAmount % envelope.totalCount;
            amount += remainder > 0 ? 1 : 0;
        } else {
            // 随机分配
            amount = this.calculateRandomAmount(
                envelope.remainingAmount,
                envelope.remainingCount,
            );
        }

        // 更新实际剩余金额
        await db.collection(RED_ENVELOPE_COLLECTION).updateOne(
            { envelopeId, domainId: this.domainId },
            { $inc: { remainingAmount: -amount } },
        );

        // 记录领取信息
        const claimRecord: RedEnvelopeClaim = {
            envelopeId,
            claimerUid: uid,
            claimerName: uname,
            claimerDisplayName: displayName,
            amount,
            createdAt: new Date(),
            domainId: this.domainId,
        };
        await db.collection(RED_ENVELOPE_CLAIM_COLLECTION).insertOne(claimRecord);

        // 检查是否已领完
        const updatedEnvelope = await db.collection(RED_ENVELOPE_COLLECTION).findOne({
            envelopeId,
            domainId: this.domainId,
        }) as unknown as RedEnvelope;
        if (updatedEnvelope && updatedEnvelope.remainingCount <= 0) {
            await db.collection(RED_ENVELOPE_COLLECTION).updateOne(
                { envelopeId, domainId: this.domainId },
                { $set: { status: RedEnvelopeStatus.COMPLETED } },
            );
        }

        // 给领取者加积分
        const scoreCoreForClaim = (global as any).scoreCoreService;
        if (scoreCoreForClaim) {
            // 使用时间戳+微秒级计数器确保PID唯一
            const claimPid = -10000002 - Date.now() % 1000000 - Math.floor(Math.random() * 1000);
            const claimRecordId = `claim_${envelopeId}_${uid}_${Date.now()}`;
            await scoreCoreForClaim.recordScoreChange({
                uid,
                domainId: this.domainId,
                pid: claimPid, // 使用唯一PID
                recordId: claimRecordId,
                score: amount,
                reason: `抢红包：来自 ${envelope.senderName || '神秘用户'}`,
                category: RedEnvelopeCategory.RED_ENVELOPE_CLAIM,
            });
        }

        console.log(`[RedEnvelope] 用户 ${uid}(${uname}) 领取了红包 ${envelopeId}，获得 ${amount} 积分`);
        return { success: true, amount, remainingCount: envelope.remainingCount - 1 };
    }

    /**
     * 随机分配算法（微信红包算法）
     */
    private calculateRandomAmount(
        remainingAmount: number,
        remainingCount: number,
    ): number {
        if (remainingCount === 1) {
            return remainingAmount;
        }

        // 每个人至少1积分
        const minAmount = 1;
        // 最大可以抢的金额 = 剩余金额 / 剩余人数 * 2
        const maxAmount = Math.floor(remainingAmount / remainingCount * 2);

        // 确保最大值至少等于最小值
        const safeMaxAmount = Math.max(maxAmount, minAmount);

        // 随机生成金额
        let amount = Math.floor(Math.random() * (safeMaxAmount - minAmount + 1)) + minAmount;

        // 如果计算出的金额大于剩余金额，调整为剩余金额 - (剩余人数-1)*1
        const maxPossible = remainingAmount - (remainingCount - 1);
        if (amount > maxPossible) {
            amount = maxPossible;
        }

        // 确保金额合理
        amount = Math.max(1, Math.min(amount, remainingAmount - (remainingCount - 1)));

        return amount;
    }

    /**
     * 获取红包详情
     */
    async getEnvelopeDetail(envelopeId: string, uid?: number): Promise<RedEnvelopeDetail | null> {
        const envelope = await db.collection(RED_ENVELOPE_COLLECTION).findOne({
            envelopeId,
            domainId: this.domainId,
        }) as unknown as RedEnvelope | null;

        if (!envelope) {
            return null;
        }

        // 获取领取记录
        const claims = await db.collection(RED_ENVELOPE_CLAIM_COLLECTION)
            .find({ envelopeId, domainId: this.domainId })
            .sort({ createdAt: 1 })
            .toArray() as unknown as RedEnvelopeClaim[];

        // 检查是否过期
        const now = new Date();
        const isExpired = now > new Date(envelope.expiredAt) || envelope.status === RedEnvelopeStatus.EXPIRED;

        // 检查是否已领完
        const canClaim = envelope.status === RedEnvelopeStatus.ACTIVE
            && !isExpired
            && envelope.remainingCount > 0;

        // 检查用户是否已领取
        let userHasClaimed = false;
        let userClaimAmount: number | undefined;

        if (uid) {
            const userClaim = claims.find((c) => c.claimerUid === uid);
            if (userClaim) {
                userHasClaimed = true;
                userClaimAmount = userClaim.amount;
            }
        }

        return {
            ...envelope,
            createdAt: envelope.createdAt.toISOString(),
            expiredAt: envelope.expiredAt.toISOString(),
            claims: claims.map((c) => ({
                ...c,
                createdAt: c.createdAt.toISOString(),
            })),
            isExpired,
            canClaim,
            userHasClaimed,
            userClaimAmount,
        };
    }

    /**
     * 获取红包简要信息（用于WebSocket推送）
     */
    async getEnvelopeBrief(envelopeId: string): Promise<RedEnvelopeBrief | null> {
        const envelope = await db.collection(RED_ENVELOPE_COLLECTION).findOne({
            envelopeId,
            domainId: this.domainId,
        }) as unknown as RedEnvelope | null;

        if (!envelope) {
            return null;
        }

        return {
            envelopeId: envelope.envelopeId,
            senderName: envelope.senderName,
            senderDisplayName: envelope.senderDisplayName,
            message: envelope.message,
            remainingCount: envelope.remainingCount,
            totalAmount: envelope.totalAmount,
        };
    }

    /**
     * 获取红包列表
     */
    async getEnvelopeList(
        page: number = 1,
        limit: number = 10,
        uid?: number,
    ): Promise<{ envelopes: RedEnvelopeDetail[], total: number }> {
        const skip = (page - 1) * limit;

        const [envelopes, total] = await Promise.all([
            db.collection(RED_ENVELOPE_COLLECTION)
                .find({ domainId: this.domainId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray() as unknown as RedEnvelope[],
            db.collection(RED_ENVELOPE_COLLECTION).countDocuments({ domainId: this.domainId }),
        ]);

        const result: RedEnvelopeDetail[] = [];
        for (const envelope of envelopes) {
            const detail = await this.getEnvelopeDetail(envelope.envelopeId, uid);
            if (detail) {
                result.push(detail);
            }
        }

        return { envelopes: result, total };
    }

    /**
     * 获取用户发送的红包
     */
    async getUserSentEnvelopes(
        uid: number,
        page: number = 1,
        limit: number = 10,
    ): Promise<{ envelopes: RedEnvelopeDetail[], total: number }> {
        const skip = (page - 1) * limit;

        const [envelopes, total] = await Promise.all([
            db.collection(RED_ENVELOPE_COLLECTION)
                .find({ domainId: this.domainId, senderUid: uid })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray() as unknown as RedEnvelope[],
            db.collection(RED_ENVELOPE_COLLECTION).countDocuments({
                domainId: this.domainId,
                senderUid: uid,
            }),
        ]);

        const result: RedEnvelopeDetail[] = [];
        for (const envelope of envelopes) {
            const detail = await this.getEnvelopeDetail(envelope.envelopeId, uid);
            if (detail) {
                result.push(detail);
            }
        }

        return { envelopes: result, total };
    }

    /**
     * 获取用户领取的红包
     */
    async getUserClaimedEnvelopes(
        uid: number,
        page: number = 1,
        limit: number = 10,
    ): Promise<{ claims: RedEnvelopeClaim[], total: number }> {
        const skip = (page - 1) * limit;

        const [claims, total] = await Promise.all([
            db.collection(RED_ENVELOPE_CLAIM_COLLECTION)
                .find({ domainId: this.domainId, claimerUid: uid })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray() as unknown as RedEnvelopeClaim[],
            db.collection(RED_ENVELOPE_CLAIM_COLLECTION).countDocuments({
                domainId: this.domainId,
                claimerUid: uid,
            }),
        ]);

        return { claims, total };
    }

    /**
     * 过期红包处理
     */
    async expireEnvelope(envelopeId: string): Promise<void> {
        await db.collection(RED_ENVELOPE_COLLECTION).updateOne(
            { envelopeId, domainId: this.domainId },
            { $set: { status: RedEnvelopeStatus.EXPIRED } },
        );
        console.log(`[RedEnvelope] 红包 ${envelopeId} 已过期`);
    }

    /**
     * 检查并过期红包
     */
    async checkAndExpireEnvelopes(): Promise<number> {
        const now = new Date();
        const result = await db.collection(RED_ENVELOPE_COLLECTION).updateMany(
            {
                domainId: this.domainId,
                status: RedEnvelopeStatus.ACTIVE,
                expiredAt: { $lt: now },
            },
            { $set: { status: RedEnvelopeStatus.EXPIRED } },
        );
        return result.modifiedCount;
    }

    /**
     * 获取红包统计信息
     */
    async getStats(uid?: number): Promise<RedEnvelopeStats> {
        const match: any = { domainId: this.domainId };
        if (uid) {
            match.senderUid = uid;
        }

        const [sentStats] = await db.collection(RED_ENVELOPE_COLLECTION)
            .aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        totalSent: { $sum: 1 },
                        totalAmount: { $sum: '$totalAmount' },
                    },
                },
            ])
            .toArray();

        const claimMatch: any = { domainId: this.domainId };
        if (uid) {
            match.claimUid = uid;
        }

        const [claimStats] = await db.collection(RED_ENVELOPE_CLAIM_COLLECTION)
            .aggregate([
                { $match: claimMatch },
                {
                    $group: {
                        _id: null,
                        totalClaims: { $sum: 1 },
                        totalClaimed: { $sum: '$amount' },
                    },
                },
            ])
            .toArray();

        return {
            totalSent: sentStats?.totalSent || 0,
            totalAmount: sentStats?.totalAmount || 0,
            totalClaims: claimStats?.totalClaims || 0,
            totalClaimed: claimStats?.totalClaimed || 0,
        };
    }

    /**
     * 创建数据库索引
     */
    async createIndexes(): Promise<void> {
        const envelopeColl = db.collection(RED_ENVELOPE_COLLECTION);
        const claimColl = db.collection(RED_ENVELOPE_CLAIM_COLLECTION);

        try {
            // 红包集合索引
            await envelopeColl.createIndex(
                { envelopeId: 1 },
                { name: 'envelope_id', unique: true },
            );
            await envelopeColl.createIndex(
                { senderUid: 1, createdAt: -1 },
                { name: 'sender_created' },
            );
            await envelopeColl.createIndex(
                { domainId: 1, status: 1, createdAt: -1 },
                { name: 'domain_status_created' },
            );
            await envelopeColl.createIndex(
                { expiredAt: 1 },
                { name: 'expired_at', sparse: true },
            );

            // 领取记录集合索引
            await claimColl.createIndex(
                { envelopeId: 1, claimerUid: 1 },
                { name: 'envelope_claimer', unique: true },
            );
            await claimColl.createIndex(
                { claimerUid: 1, createdAt: -1 },
                { name: 'claimer_created' },
            );
            await claimColl.createIndex(
                { domainId: 1 },
                { name: 'domain' },
            );

            console.log('[RedEnvelope] 数据库索引创建成功');
        } catch (error) {
            console.warn('[RedEnvelope] 创建数据库索引失败:', error);
        }
    }
}
