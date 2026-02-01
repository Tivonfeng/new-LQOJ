/**
 * 红包 WebSocket 处理器
 * 用于实时推送红包消息到所有在线客户端
 */
import { ConnectionHandler } from '@hydrooj/framework';
import type { Context } from 'hydrooj';
import { RedEnvelopeService } from '../services';

// 【关键】使用 global 存储客户端 Map
// 注意：在 index.ts 中也会初始化这个 Map
const WS_CLIENTS_KEY = 'hydro_redEnvelope_wsClients';

// 获取客户端 Map
function getWsClients(): Map<string, any> {
    const globalMap = (global as any)[WS_CLIENTS_KEY];
    if (!globalMap) {
        console.log('[RedEnvelope WS] global 上不存在客户端 Map，创建新的');
        const newMap = new Map();
        (global as any)[WS_CLIENTS_KEY] = newMap;
        return newMap;
    }
    return globalMap;
}

/**
 * 广播消息到所有客户端
 */
export function broadcastToAllClients(data: any): void {
    const message = { ...data, timestamp: new Date().toISOString() };
    const wsClients = getWsClients();

    console.log('[RedEnvelope WS] ========== 广播开始 ==========');
    console.log('[RedEnvelope WS] wsClients 大小:', wsClients.size);

    let count = 0;
    let failCount = 0;

    for (const [clientId, client] of wsClients) {
        try {
            if (!client || !client.conn) {
                console.log('[RedEnvelope WS] 客户端', clientId, '连接已失效');
                wsClients.delete(clientId);
                continue;
            }
            const state = client.conn.readyState;
            if (state === 1) { // WebSocket.OPEN
                client.send(message);
                count++;
            } else {
                console.log('[RedEnvelope WS] 客户端', clientId, '状态不是 OPEN:', state);
                failCount++;
            }
        } catch (error) {
            console.error('[RedEnvelope WS] 发送失败:', clientId, error);
            wsClients.delete(clientId);
        }
    }

    console.log('[RedEnvelope WS] 发送成功:', count, '/', wsClients.size, '(失败:', failCount, ')');
    console.log('[RedEnvelope WS] =================================');
}

export class RedEnvelopeWSHandler extends ConnectionHandler<Context> {
    static type = 'red_envelope';

    /**
     * Hydro 框架调用 prepare 方法来初始化连接
     */
    async prepare() {
        const wsClients = getWsClients();
        const clientId = this.args.clientId || `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        console.log('[RedEnvelope WS] ========== prepare ==========');
        console.log('[RedEnvelope WS] 当前客户端数:', wsClients.size);
        console.log('[RedEnvelope WS] user:', this.user?._id, this.user?.uname);

        // 添加到集合（使用唯一 ID）
        wsClients.set(clientId, this);
        console.log('[RedEnvelope WS] 添加客户端:', clientId, '当前数:', wsClients.size);

        // 发送连接成功消息
        this.send({
            type: 'connected',
            clientId,
            message: '红包 WebSocket 连接成功',
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 处理消息
     */
    async message(data: any) {
        // 获取客户端 ID（从当前连接对象中获取）
        const clientId = this.getClientId();
        console.log('[RedEnvelope WS] 收到消息:', data.type, '来自:', clientId);
        try {
            if (data.type === 'ping') {
                this.send({ type: 'pong', timestamp: new Date().toISOString() });
            } else if (data.type === 'claim') {
                await this.handleClaim(data);
            }
        } catch (error) {
            console.error('[RedEnvelope WS] 消息处理失败:', error);
        }
    }

    private getClientId(): string {
        const wsClients = getWsClients();
        for (const [id, client] of wsClients) {
            if (client === this) return id;
        }
        return 'unknown';
    }

    private async handleClaim(data: any) {
        const { envelopeId } = data;
        if (!envelopeId) {
            this.send({ type: 'error', error: '红包ID不能为空' });
            return;
        }

        if (!this.user?._id) {
            this.send({ type: 'error', error: '请先登录' });
            return;
        }

        const service = new RedEnvelopeService(this.ctx);
        const result = await service.claimEnvelope(
            envelopeId,
            this.user._id,
            this.user.uname,
            this.user?.displayName,
        );

        if (result.success) {
            this.send({ type: 'claim_success', envelopeId, amount: result.amount });
            broadcastToAllClients({ type: 'envelope_claimed', envelopeId, remainingCount: result.remainingCount });
        } else {
            this.send({ type: 'claim_error', envelopeId, error: result.error });
        }
    }

    /**
     * 清理方法
     */
    async cleanup() {
        const wsClients = getWsClients();
        const clientId = this.getClientId();
        console.log('[RedEnvelope WS] cleanup, 客户端:', clientId);
        wsClients.delete(clientId);
        console.log('[RedEnvelope WS] cleanup 后客户端数:', wsClients.size);
    }

    /**
     * 错误处理
     */
    async onerror(error: Error) {
        const clientId = this.getClientId();
        console.error('[RedEnvelope WS] onerror:', clientId, error.message);
        const wsClients = getWsClients();
        wsClients.delete(clientId);
    }
}

export async function broadcastNewRedEnvelope(ctx: Context, envelopeId: string) {
    try {
        const service = new RedEnvelopeService(ctx);
        const brief = await service.getEnvelopeBrief(envelopeId);
        if (!brief) return;

        console.log('[RedEnvelope] 准备广播');
        broadcastToAllClients({ type: 'new_red_envelope', envelope: brief });

        if (typeof (ctx as any).broadcast === 'function') {
            (ctx as any).broadcast('score:red-envelope', { envelope: brief });
        }
    } catch (error) {
        console.error('[RedEnvelope] 广播失败:', error);
    }
}
