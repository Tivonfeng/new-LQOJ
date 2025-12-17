import {
    avatar,
    Handler,
    ObjectId,
    PERM,
    PRIV,
} from 'hydrooj';
import {
    LotteryRedemptionService,
} from '../services';

/**
 * 序列化对象为 JSON 兼容格式
 * 处理 BigInt、Date 和 ObjectId 对象
 */
function serializeForJSON(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === 'bigint') {
        return obj.toString();
    }
    if (obj instanceof Date) {
        return obj.toISOString();
    }
    // 处理 MongoDB ObjectId - 转换为字符串
    if (obj instanceof ObjectId) {
        return obj.toHexString();
    }
    // 处理包含 buffer 的 ObjectId 对象（序列化后的格式）
    if (typeof obj === 'object' && obj.buffer && typeof obj.buffer === 'object') {
        try {
            const buffer = Buffer.from(Object.values(obj.buffer) as number[]);
            return new ObjectId(buffer).toHexString();
        } catch {
            // 如果转换失败，继续正常序列化
        }
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
}

/**
 * 用户我的奖品页面处理器
 * 路由: /score/lottery/my-prizes
 * 功能: 用户查看自己的实物奖品记录
 */
export class MyPrizesHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async get() {
        const uid = this.user._id;
        const redemptionService = new LotteryRedemptionService(this.ctx);

        // 获取所有状态的奖品
        const [pending, redeemed, cancelled] = await Promise.all([
            redemptionService.getUserRedemptions(this.domain._id, uid, 'pending'),
            redemptionService.getUserRedemptions(this.domain._id, uid, 'redeemed'),
            redemptionService.getUserRedemptions(this.domain._id, uid, 'cancelled'),
        ]);

        // 格式化时间
        const formatRecords = (records: any[]) => records.map((record) => ({
            ...record,
            gameTime: record.gameTime && record.gameTime instanceof Date
                ? record.gameTime.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                })
                : record.gameTime
                    ? new Date(record.gameTime).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    })
                    : '',
            redeemedAt: record.redeemedAt && record.redeemedAt instanceof Date
                ? record.redeemedAt.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                })
                : record.redeemedAt
                    ? new Date(record.redeemedAt).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    })
                    : '',
        }));

        const serializedPending = serializeForJSON(formatRecords(pending));
        const serializedRedeemed = serializeForJSON(formatRecords(redeemed));
        const serializedCancelled = serializeForJSON(formatRecords(cancelled));

        // 将所有数据合并成一个对象并序列化为 JSON 字符串
        const myPrizesDataJson = JSON.stringify({
            pending: serializedPending,
            redeemed: serializedRedeemed,
            cancelled: serializedCancelled,
            pendingCount: pending.length,
            redeemedCount: redeemed.length,
            cancelledCount: cancelled.length,
        });

        this.response.template = 'lottery_my_prizes.html';
        this.response.body = {
            myPrizesDataJson,
        };
    }
}

/**
 * 用户我的奖品API处理器
 * 路由: /score/lottery/my-prizes/api
 * 功能: 获取用户的奖品列表（JSON格式）
 */
export class MyPrizesApiHandler extends Handler {
    async prepare() {
        if (!this.user._id) throw new Error('未登录');
    }

    async get() {
        const uid = this.user._id;
        const status = this.request.query.status as string | undefined;
        const redemptionService = new LotteryRedemptionService(this.ctx);

        const records = await redemptionService.getUserRedemptions(
            this.domain._id,
            uid,
            status as 'pending' | 'redeemed' | 'cancelled' | undefined,
        );

        // 格式化时间
        const formattedRecords = records.map((record) => ({
            ...record,
            gameTime: record.gameTime && record.gameTime instanceof Date
                ? record.gameTime.toISOString()
                : record.gameTime,
            redeemedAt: record.redeemedAt && record.redeemedAt instanceof Date
                ? record.redeemedAt.toISOString()
                : record.redeemedAt,
        }));

        this.response.type = 'application/json';
        this.response.body = {
            success: true,
            records: serializeForJSON(formattedRecords),
        };
    }
}

/**
 * 管理员核销管理页面处理器
 * 路由: /score/lottery/admin/redeem
 * 功能: 管理员查看和管理核销记录
 */
export class RedemptionAdminHandler extends Handler {
    async prepare() {
        // 检查管理员权限
        if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
            this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        }
    }

    async get() {
        const redemptionService = new LotteryRedemptionService(this.ctx);

        // 获取待核销列表
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const limit = 20;
        const pendingData = await redemptionService.getPendingRedemptions(
            this.domain._id,
            page,
            limit,
        );

        // 获取核销统计
        const stats = await redemptionService.getRedemptionStats(this.domain._id);

        // 获取用户信息
        const uids = [...new Set(pendingData.records.map((r) => r.uid))];
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

        // 格式化记录
        const formattedRecords = pendingData.records.map((record) => ({
            ...record,
            gameTime: record.gameTime && record.gameTime instanceof Date
                ? record.gameTime.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                })
                : record.gameTime
                    ? new Date(record.gameTime).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                    })
                    : '',
        }));

        const serializedRecords = serializeForJSON(formattedRecords);
        const serializedPendingData = serializeForJSON({
            ...pendingData,
            records: serializedRecords,
        });
        const serializedStats = serializeForJSON(stats);
        const serializedUdocs = serializeForJSON(
            Object.fromEntries(
                Object.values(udocs).map((u) => [
                    String(u._id),
                    {
                        ...u,
                        avatarUrl: avatar(u.avatar || `gravatar:${u.mail}`, 40),
                    },
                ]),
            ),
        );

        const redemptionAdminDataJson = JSON.stringify({
            pendingRecords: serializedRecords,
            pendingData: serializedPendingData,
            stats: serializedStats,
            udocs: serializedUdocs,
        });

        this.response.template = 'lottery_redemption_admin.html';
        this.response.body = {
            redemptionAdminDataJson,
        };
    }
}

/**
 * 管理员核销列表API处理器
 * 路由: /score/lottery/admin/redeem/list
 * 功能: 获取待核销列表（JSON格式）
 */
export class RedemptionListApiHandler extends Handler {
    async prepare() {
        if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
            this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        }
    }

    async get() {
        const redemptionService = new LotteryRedemptionService(this.ctx);
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const limit = Number.parseInt(this.request.query.limit as string) || 20;
        const uid = this.request.query.uid ? Number.parseInt(this.request.query.uid as string) : undefined;
        const prizeName = this.request.query.prizeName as string | undefined;

        const data = await redemptionService.getPendingRedemptions(
            this.domain._id,
            page,
            limit,
            { uid, prizeName },
        );

        // 获取用户信息
        const uids = [...new Set(data.records.map((r) => r.uid))];
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

        // 格式化记录
        const formattedRecords = data.records.map((record) => ({
            ...record,
            gameTime: record.gameTime && record.gameTime instanceof Date
                ? record.gameTime.toISOString()
                : record.gameTime,
        }));

        this.response.type = 'application/json';
        this.response.body = {
            success: true,
            data: {
                ...data,
                records: serializeForJSON(formattedRecords),
            },
            udocs: serializeForJSON(
                Object.fromEntries(
                    Object.values(udocs).map((u) => [
                        String(u._id),
                        {
                            ...u,
                            avatarUrl: avatar(u.avatar || `gravatar:${u.mail}`, 40),
                        },
                    ]),
                ),
            ),
        };
    }
}

/**
 * 管理员执行核销API处理器
 * 路由: /score/lottery/admin/redeem/redeem
 * 功能: 执行核销操作
 */
export class RedemptionRedeemApiHandler extends Handler {
    async prepare() {
        if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
            this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        }
    }

    async post() {
        const { recordId, note } = this.request.body;

        if (!recordId) {
            this.response.body = { success: false, message: '缺少记录ID' };
            this.response.type = 'application/json';
            return;
        }

        const redemptionService = new LotteryRedemptionService(this.ctx);
        const result = await redemptionService.redeemPrize(
            this.domain._id,
            recordId,
            this.user._id,
            note,
        );

        this.response.body = result;
        this.response.type = 'application/json';
    }
}

/**
 * 管理员取消核销API处理器
 * 路由: /score/lottery/admin/redeem/cancel
 * 功能: 取消核销操作
 */
export class RedemptionCancelApiHandler extends Handler {
    async prepare() {
        if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
            this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        }
    }

    async post() {
        const { recordId, note } = this.request.body;

        if (!recordId) {
            this.response.body = { success: false, message: '缺少记录ID' };
            this.response.type = 'application/json';
            return;
        }

        const redemptionService = new LotteryRedemptionService(this.ctx);
        const result = await redemptionService.cancelRedemption(
            this.domain._id,
            recordId,
            this.user._id,
            note,
        );

        this.response.body = result;
        this.response.type = 'application/json';
    }
}

/**
 * 管理员核销历史API处理器
 * 路由: /score/lottery/admin/redeem/history
 * 功能: 获取核销历史记录
 */
export class RedemptionHistoryApiHandler extends Handler {
    async prepare() {
        if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
            this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        }
    }

    async get() {
        const redemptionService = new LotteryRedemptionService(this.ctx);
        const page = Math.max(1, Number.parseInt(this.request.query.page as string) || 1);
        const limit = Number.parseInt(this.request.query.limit as string) || 20;
        const uid = this.request.query.uid ? Number.parseInt(this.request.query.uid as string) : undefined;
        const prizeName = this.request.query.prizeName as string | undefined;
        const status = this.request.query.status as 'redeemed' | 'cancelled' | undefined;

        const data = await redemptionService.getRedemptionHistory(
            this.domain._id,
            page,
            limit,
            { uid, prizeName, status },
        );

        // 格式化记录
        const formattedRecords = data.records.map((record) => ({
            ...record,
            redeemedAt: record.redeemedAt && record.redeemedAt instanceof Date
                ? record.redeemedAt.toISOString()
                : record.redeemedAt,
        }));

        // 获取用户信息
        const uids = [...new Set(data.records.map((r) => r.uid))];
        const adminUids = [...new Set(data.records.map((r) => r.redeemedBy))];
        const allUids = [...new Set([...uids, ...adminUids])];
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, allUids);

        this.response.type = 'application/json';
        this.response.body = {
            success: true,
            data: {
                ...data,
                records: serializeForJSON(formattedRecords),
            },
            udocs: serializeForJSON(
                Object.fromEntries(
                    Object.values(udocs).map((u) => [
                        String(u._id),
                        {
                            ...u,
                            avatarUrl: avatar(u.avatar || `gravatar:${u.mail}`, 40),
                        },
                    ]),
                ),
            ),
        };
    }
}
