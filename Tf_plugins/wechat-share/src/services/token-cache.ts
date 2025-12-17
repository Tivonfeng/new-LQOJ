import { Context } from 'hydrooj';
import type { WechatOAuthToken, WechatOAuthTokenDoc, WechatTicket, WechatToken } from '../types/wechat';

/**
 * Token 持久化缓存服务
 * 使用数据库存储 Token，支持多实例部署
 */
export class TokenCacheService {
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    /**
     * 获取 Access Token 缓存
     */
    async getAccessToken(appId: string): Promise<WechatToken | null> {
        const doc = await this.ctx.db.collection('wechat.tokens' as any).findOne({
            _id: `${appId}_access_token`,
            type: 'access_token',
            expiresAt: { $gt: new Date() },
        });

        if (!doc) return null;

        return {
            access_token: doc.token,
            expires_in: Math.floor((doc.expiresAt.getTime() - Date.now()) / 1000),
            expires_at: doc.expiresAt.getTime(),
        };
    }

    /**
     * 设置 Access Token 缓存
     */
    async setAccessToken(appId: string, token: WechatToken): Promise<void> {
        const expiresAt = new Date(token.expires_at);
        await this.ctx.db.collection('wechat.tokens' as any).updateOne(
            { _id: `${appId}_access_token` },
            {
                $set: {
                    appId,
                    type: 'access_token',
                    token: token.access_token,
                    expiresAt,
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
     * 获取 JS API Ticket 缓存
     */
    async getJSApiTicket(appId: string): Promise<WechatTicket | null> {
        const doc = await this.ctx.db.collection('wechat.tokens' as any).findOne({
            _id: `${appId}_jsapi_ticket`,
            type: 'jsapi_ticket',
            expiresAt: { $gt: new Date() },
        });

        if (!doc) return null;

        return {
            ticket: doc.token,
            expires_in: Math.floor((doc.expiresAt.getTime() - Date.now()) / 1000),
            expires_at: doc.expiresAt.getTime(),
        };
    }

    /**
     * 设置 JS API Ticket 缓存
     */
    async setJSApiTicket(appId: string, ticket: WechatTicket): Promise<void> {
        const expiresAt = new Date(ticket.expires_at);
        await this.ctx.db.collection('wechat.tokens' as any).updateOne(
            { _id: `${appId}_jsapi_ticket` },
            {
                $set: {
                    appId,
                    type: 'jsapi_ticket',
                    token: ticket.ticket,
                    expiresAt,
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
     * 获取 OAuth Token 缓存
     */
    async getOAuthToken(openid: string): Promise<WechatOAuthTokenDoc | null> {
        const doc = await this.ctx.db.collection('wechat.oauth_tokens' as any).findOne({
            _id: openid,
            expiresAt: { $gt: new Date() },
        });

        return doc as WechatOAuthTokenDoc | null;
    }

    /**
     * 设置 OAuth Token 缓存
     */
    async setOAuthToken(tokenData: WechatOAuthToken, openid: string, unionid?: string): Promise<void> {
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        await this.ctx.db.collection('wechat.oauth_tokens' as any).updateOne(
            { _id: openid },
            {
                $set: {
                    openid,
                    unionid,
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token,
                    expiresAt,
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
     * 清除过期的 Token
     */
    async cleanExpiredTokens(): Promise<void> {
        const now = new Date();
        await Promise.all([
            this.ctx.db.collection('wechat.tokens' as any).deleteMany({ expiresAt: { $lt: now } }),
            this.ctx.db.collection('wechat.oauth_tokens' as any).deleteMany({ expiresAt: { $lt: now } }),
        ]);
    }
}
