/**
 * 红包处理器
 * 处理红包相关的 HTTP API 请求
 */
import { Handler } from 'hydrooj';
import type { CreateRedEnvelopeParams } from '../models/RedEnvelope';
import { RedEnvelopeService, type RedEnvelopeType } from '../services';
import { broadcastNewRedEnvelope } from './RedEnvelopeWSHandler';

/**
 * 获取当前用户的 displayName
 */
function getUserDisplayName(user: any): string | undefined {
    // 优先使用 displayName
    if (user?.displayName) {
        return user.displayName;
    }
    return undefined;
}

/**
 * 创建红包处理器
 * 路由: POST /score/red-envelope/create
 */
export class RedEnvelopeCreateHandler extends Handler {
    async post() {
        const uid = this.user?._id;
        if (!uid) {
            this.response.body = { success: false, error: '请先登录' };
            this.response.status = 401;
            return;
        }

        const { totalAmount, totalCount, message, type = 'random', expireHours = 24 } = this.request.body as CreateRedEnvelopeParams;

        // 参数验证
        if (!totalAmount || typeof totalAmount !== 'number' || totalAmount < 1) {
            this.response.body = { success: false, error: '请输入有效的总金额' };
            return;
        }
        if (!totalCount || typeof totalCount !== 'number' || totalCount < 1) {
            this.response.body = { success: false, error: '请输入有效的红包数量' };
            return;
        }
        if (totalAmount > 100000) {
            this.response.body = { success: false, error: '单次发红包金额不能超过100000积分' };
            return;
        }
        if (totalCount > 100) {
            this.response.body = { success: false, error: '红包数量不能超过100个' };
            return;
        }

        const service = new RedEnvelopeService(this.ctx);
        const displayName = getUserDisplayName(this.user);

        const result = await service.createEnvelope(
            uid,
            this.user.uname,
            displayName,
            {
                totalAmount,
                totalCount,
                message: message || '',
                type: type as RedEnvelopeType,
                expireHours,
            },
        );

        // 如果创建成功，广播新红包消息给所有在线客户端
        if (result.success && result.envelopeId) {
            // 使用 setTimeout 确保数据库写入完成后再广播
            setTimeout(async () => {
                try {
                    await broadcastNewRedEnvelope(this.ctx, result.envelopeId!);
                } catch (error) {
                    console.error('[RedEnvelope] 广播红包消息失败:', error);
                }
            }, 100);
        }

        this.response.body = result;
    }
}

/**
 * 领取红包处理器
 * 路由: POST /score/red-envelope/:envelopeId/claim
 */
export class RedEnvelopeClaimHandler extends Handler {
    async post() {
        const { envelopeId } = this.request.params;
        const uid = this.user?._id;

        if (!uid) {
            this.response.body = { success: false, error: '请先登录' };
            this.response.status = 401;
            return;
        }

        if (!envelopeId) {
            this.response.body = { success: false, error: '红包ID不能为空' };
            return;
        }

        const service = new RedEnvelopeService(this.ctx);
        const displayName = getUserDisplayName(this.user);

        const result = await service.claimEnvelope(
            envelopeId,
            uid,
            this.user.uname,
            displayName,
        );

        this.response.body = result;
    }
}

/**
 * 获取红包详情处理器
 * 路由: GET /score/red-envelope/:envelopeId
 */
export class RedEnvelopeDetailHandler extends Handler {
    async get() {
        const { envelopeId } = this.request.params;
        const uid = this.user?._id;

        if (!envelopeId) {
            this.response.body = { success: false, error: '红包ID不能为空' };
            return;
        }

        const service = new RedEnvelopeService(this.ctx);
        const detail = await service.getEnvelopeDetail(envelopeId, uid);

        if (!detail) {
            this.response.body = { success: false, error: '红包不存在' };
            this.response.status = 404;
            return;
        }

        this.response.body = { success: true, envelope: detail };
    }
}

/**
 * 获取红包列表处理器
 * 路由: GET /score/red-envelope/list
 */
export class RedEnvelopeListHandler extends Handler {
    async get() {
        const page = Number.parseInt(this.request.query.page as string) || 1;
        const limit = Math.min(Number.parseInt(this.request.query.limit as string) || 10, 50);
        const uid = this.user?._id;

        const service = new RedEnvelopeService(this.ctx);
        const result = await service.getEnvelopeList(page, limit, uid);

        this.response.body = { success: true, ...result };
    }
}

/**
 * 获取用户发送的红包列表处理器
 * 路由: GET /score/red-envelope/my/sent
 */
export class RedEnvelopeMySentHandler extends Handler {
    async get() {
        const uid = this.user?._id;

        if (!uid) {
            this.response.body = { success: false, error: '请先登录' };
            this.response.status = 401;
            return;
        }

        const page = Number.parseInt(this.request.query.page as string) || 1;
        const limit = Math.min(Number.parseInt(this.request.query.limit as string) || 10, 50);

        const service = new RedEnvelopeService(this.ctx);
        const result = await service.getUserSentEnvelopes(uid, page, limit);

        this.response.body = { success: true, ...result };
    }
}

/**
 * 获取用户领取的红包列表处理器
 * 路由: GET /score/red-envelope/my/claimed
 */
export class RedEnvelopeMyClaimedHandler extends Handler {
    async get() {
        const uid = this.user?._id;

        if (!uid) {
            this.response.body = { success: false, error: '请先登录' };
            this.response.status = 401;
            return;
        }

        const page = Number.parseInt(this.request.query.page as string) || 1;
        const limit = Math.min(Number.parseInt(this.request.query.limit as string) || 10, 50);

        const service = new RedEnvelopeService(this.ctx);
        const result = await service.getUserClaimedEnvelopes(uid, page, limit);

        this.response.body = { success: true, ...result };
    }
}

/**
 * 获取红包统计信息处理器
 * 路由: GET /score/red-envelope/stats
 */
export class RedEnvelopeStatsHandler extends Handler {
    async get() {
        const uid = this.user?._id;

        const service = new RedEnvelopeService(this.ctx);
        const stats = await service.getStats(uid);

        this.response.body = { success: true, stats };
    }
}

/**
 * 红包大厅页面处理器
 * 路由: GET /score/red-envelope/hall
 * 功能: 渲染红包大厅页面
 */
export class RedEnvelopeHallPageHandler extends Handler {
    async get() {
        const uid = this.user?._id;

        // 获取统计数据
        const service = new RedEnvelopeService(this.ctx);
        const stats = await service.getStats(uid);

        // 获取红包列表
        const { envelopes, total } = await service.getEnvelopeList(1, 20, uid);

        // 获取用户积分
        let currentUserScore = 0;
        if (uid) {
            const scoreCore = (global as any).scoreCoreService;
            if (scoreCore) {
                const userScore = await scoreCore.getUserScore(this.domain._id, uid);
                currentUserScore = userScore?.totalScore || 0;
            }
        }

        // 准备模板数据
        const hallData = {
            stats: {
                totalSent: stats.totalSent,
                totalAmount: stats.totalAmount,
                totalClaims: stats.totalClaims,
                totalClaimed: stats.totalClaimed,
            },
            envelopes,
            total,
            currentUserId: uid,
            currentUserScore,
            isLoggedIn: !!uid,
        };

        // 渲染模板
        this.response.template = 'red_envelope_hall.html';
        this.response.body = {
            redEnvelopeHallDataJson: JSON.stringify(hallData),
        };
    }
}
