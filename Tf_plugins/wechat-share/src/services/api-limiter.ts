import { Context, Logger } from 'hydrooj';

const logger = new Logger('wechat-api-limiter');

/**
 * 微信 API 调用额度管理服务
 * 监控接口调用次数，防止超出限制
 */
export class WechatApiLimiter {
    private ctx: Context;
    private dailyLimits: Map<string, number> = new Map([
        ['access_token', 2000], // AccessToken 每日限制 2000 次
        ['jsapi_ticket', 2000], // JSApiTicket 每日限制 2000 次
        ['oauth_access_token', 10000], // OAuth Token 每日限制较高
        ['userinfo', 10000], // 用户信息接口
        ['template_message', 100000], // 模板消息每日限制 10万次
        ['get_template_list', 1000], // 获取模板列表
        ['delete_template', 1000], // 删除模板
    ]);

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    /**
     * 检查接口调用是否超出限制
     */
    async checkLimit(appId: string, apiName: string): Promise<boolean> {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const limit = this.dailyLimits.get(apiName) || 10000;

        const doc = await this.ctx.db.collection('wechat.api_calls' as any).findOne({
            _id: `${appId}_${apiName}_${today}`,
        });

        if (doc && doc.callCount >= limit) {
            logger.warn(`[WechatApiLimiter] API调用超出限制: ${apiName}, 今日已调用: ${doc.callCount}/${limit}`);
            return false;
        }

        return true;
    }

    /**
     * 记录接口调用
     */
    async recordCall(appId: string, apiName: string): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const id = `${appId}_${apiName}_${today}`;

        await this.ctx.db.collection('wechat.api_calls' as any).updateOne(
            { _id: id },
            {
                $inc: { callCount: 1 },
                $set: {
                    appId,
                    apiName,
                    date: today,
                    lastCallAt: new Date(),
                    updatedAt: new Date(),
                },
                $setOnInsert: {
                    createdAt: new Date(),
                },
            },
            { upsert: true },
        );
    }

    /**
     * 获取今日调用次数
     */
    async getTodayCallCount(appId: string, apiName: string): Promise<number> {
        const today = new Date().toISOString().split('T')[0];
        const doc = await this.ctx.db.collection('wechat.api_calls' as any).findOne({
            _id: `${appId}_${apiName}_${today}`,
        });

        return doc?.callCount || 0;
    }

    /**
     * 获取接口限制
     */
    getLimit(apiName: string): number {
        return this.dailyLimits.get(apiName) || 10000;
    }

    /**
     * 清理旧数据（保留最近30天）
     */
    async cleanOldRecords(): Promise<void> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

        await this.ctx.db.collection('wechat.api_calls' as any).deleteMany({
            date: { $lt: dateStr },
        });
    }
}
