import * as crypto from 'crypto';
import axios from 'axios';
import { Context, Logger, Service } from 'hydrooj';
import { WechatApiLimiter } from '../services/api-limiter';
import { TokenCacheService } from '../services/token-cache';
import {
    JSSDKConfig,
    TemplateItem,
    TemplateListResponse,
    TemplateMessage,
    TemplateMessageResponse,
    WechatConfig,
    WechatErrorCode,
    WechatOAuthToken,
    WechatTicket,
    WechatToken,
    WechatUserInfo,
} from '../types/wechat';

const logger = new Logger('wechat-service');
const TEMPLATE_CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存模板列表，减少频繁调用

declare module 'cordis' {
    interface Context {
        wechatService: WechatService;
    }
}

export class WechatService extends Service {
    static inject = ['db'];

    private tokenCache: WechatToken | null = null;
    private ticketCache: WechatTicket | null = null;
    private tokenPromise: Promise<string> | null = null;
    private ticketPromise: Promise<string> | null = null;
    private templateCache: { list: TemplateItem[], expiresAt: number } | null = null;
    private config: WechatConfig;
    private tokenCacheService: TokenCacheService;
    private apiLimiter: WechatApiLimiter;

    constructor(ctx: Context, config: WechatConfig, serviceName = 'wechatService') {
        super(ctx, serviceName);
        this.config = config;
        this.tokenCacheService = new TokenCacheService(ctx);
        this.apiLimiter = new WechatApiLimiter(ctx);
    }

    /**
     * 获取 appId（用于 OAuth 授权 URL 构建等）
     */
    get appId(): string {
        return this.config.appId;
    }

    private generateNonceStr(): string {
        return Math.random().toString(36).substring(2, 15);
    }

    private generateTimestamp(): number {
        return Math.floor(Date.now() / 1000);
    }

    private sha1(str: string): string {
        return crypto.createHash('sha1').update(str).digest('hex');
    }

    // ========== 分享功能相关 ==========

    /**
     * 获取微信公众平台 Access Token (用于 JSSDK)
     * 带并发控制,避免重复请求
     */
    async getAccessToken(): Promise<string> {
        const now = Date.now();

        // 1. 检查内存缓存
        if (this.tokenCache && this.tokenCache.expires_at > now) {
            return this.tokenCache.access_token;
        }

        // 2. 检查持久化缓存
        const cachedToken = await this.tokenCacheService.getAccessToken(this.config.appId);
        if (cachedToken && cachedToken.expires_at > now) {
            this.tokenCache = cachedToken;
            return cachedToken.access_token;
        }

        // 3. 检查接口调用限制
        const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'access_token');
        if (!canCall) {
            throw new Error('AccessToken 接口调用超出每日限制');
        }

        // 4. 检查是否正在请求中(防止并发)
        if (this.tokenPromise) {
            return this.tokenPromise;
        }

        // 5. 创建新请求
        this.tokenPromise = this.fetchAccessToken()
            .finally(() => {
                this.tokenPromise = null;
            });

        return this.tokenPromise;
    }

    /**
     * 实际获取 Access Token 的方法
     */
    private async fetchAccessToken(): Promise<string> {
        logger.debug('[WechatService] 从微信API获取新的Access Token');
        const now = Date.now();

        const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
            params: {
                grant_type: 'client_credential',
                appid: this.config.appId,
                secret: this.config.appSecret,
            },
            timeout: 10000,
        });

        if (response.data.errcode) {
            const errorCode = response.data.errcode as WechatErrorCode;
            logger.error(`[WechatService] 微信API错误: ${errorCode} - ${response.data.errmsg}`);
            this.handleWechatError(errorCode, response.data.errmsg);
            throw new Error(`微信API错误: ${errorCode} - ${response.data.errmsg}`);
        }

        logger.debug(`[WechatService] 成功获取Access Token, expires_in: ${response.data.expires_in}`);
        const token: WechatToken = {
            access_token: response.data.access_token,
            expires_in: response.data.expires_in,
            expires_at: now + (response.data.expires_in - 300) * 1000, // 提前5分钟过期
        };

        this.tokenCache = token;
        await this.tokenCacheService.setAccessToken(this.config.appId, token);
        await this.apiLimiter.recordCall(this.config.appId, 'access_token');

        return token.access_token;
    }

    /**
     * 获取 JS API Ticket
     */
    async getJSApiTicket(): Promise<string> {
        const now = Date.now();

        // 1. 检查内存缓存
        if (this.ticketCache && this.ticketCache.expires_at > now) {
            return this.ticketCache.ticket;
        }

        // 2. 检查持久化缓存
        const cachedTicket = await this.tokenCacheService.getJSApiTicket(this.config.appId);
        if (cachedTicket && cachedTicket.expires_at > now) {
            this.ticketCache = cachedTicket;
            return cachedTicket.ticket;
        }

        // 3. 检查是否正在请求中(防止并发)
        if (this.ticketPromise) {
            return this.ticketPromise;
        }

        // 4. 检查接口调用限制
        const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'jsapi_ticket');
        if (!canCall) {
            throw new Error('JSApiTicket 接口调用超出每日限制');
        }

        // 5. 创建新请求
        this.ticketPromise = this.fetchJSApiTicket()
            .finally(() => {
                this.ticketPromise = null;
            });

        return this.ticketPromise;
    }

    /**
     * 实际获取 JS API Ticket 的方法
     */
    private async fetchJSApiTicket(): Promise<string> {
        logger.debug('[WechatService] 从微信API获取新的JS API Ticket');
        const now = Date.now();

        const accessToken = await this.getAccessToken();
        const response = await axios.get('https://api.weixin.qq.com/cgi-bin/ticket/getticket', {
            params: {
                access_token: accessToken,
                type: 'jsapi',
            },
            timeout: 10000,
        });

        if (response.data.errcode !== 0) {
            const errorCode = response.data.errcode as WechatErrorCode;
            logger.error(`[WechatService] 微信API错误: ${errorCode} - ${response.data.errmsg}`);
            this.handleWechatError(errorCode, response.data.errmsg);
            throw new Error(`微信API错误: ${errorCode} - ${response.data.errmsg}`);
        }

        logger.debug(`[WechatService] 成功获取JS API Ticket, expires_in: ${response.data.expires_in}`);
        const ticket: WechatTicket = {
            ticket: response.data.ticket,
            expires_in: response.data.expires_in,
            expires_at: now + (response.data.expires_in - 300) * 1000, // 提前5分钟过期
        };

        this.ticketCache = ticket;
        await this.tokenCacheService.setJSApiTicket(this.config.appId, ticket);
        await this.apiLimiter.recordCall(this.config.appId, 'jsapi_ticket');

        return ticket.ticket;
    }

    /**
     * 生成 JSSDK 签名
     */
    generateSignature(ticket: string, url: string, timestamp: number, nonceStr: string): string {
        const params = [
            `jsapi_ticket=${ticket}`,
            `noncestr=${nonceStr}`,
            `timestamp=${timestamp}`,
            `url=${url}`,
        ].sort().join('&');

        return this.sha1(params);
    }

    /**
     * 获取 JSSDK 配置
     */
    async getJSSDKConfig(url: string): Promise<JSSDKConfig> {
        logger.debug(`[WechatService] 生成JSSDK配置, URL: ${url}`);
        const ticket = await this.getJSApiTicket();
        const timestamp = this.generateTimestamp();
        const nonceStr = this.generateNonceStr();

        // URL处理：去除hash部分
        const cleanUrl = url.split('#')[0];
        const signature = this.generateSignature(ticket, cleanUrl, timestamp, nonceStr);

        return {
            appId: this.config.appId,
            timestamp,
            nonceStr,
            signature,
        };
    }

    /**
     * 验证域名
     */
    validateDomain(url: string): boolean {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;

            const allowedDomains = this.config.domains || [this.config.domain];
            const cleanDomains = allowedDomains.map((d) => d.replace(/^https?:\/\//, ''));

            // 允许本地开发环境域名
            const isLocalDev = !!hostname.match(/^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)$/);

            const isValid = cleanDomains.some((allowedDomain) => (
                hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`)
            )) || isLocalDev;

            return isValid;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatService] 域名验证失败: ${message}`);
            return false;
        }
    }

    // ========== OAuth 登录功能相关 ==========

    /**
     * 用 code 换取 OAuth Access Token
     */
    async getOAuthAccessToken(code: string): Promise<WechatOAuthToken> {
        logger.debug(`[WechatService] 获取OAuth Access Token, code: ${code.substring(0, 10)}...`);

        const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'oauth_access_token');
        if (!canCall) {
            throw new Error('OAuth AccessToken 接口调用超出每日限制');
        }

        const response = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
            params: {
                appid: this.config.appId,
                secret: this.config.appSecret,
                code,
                grant_type: 'authorization_code',
            },
            timeout: 10000,
        });

        if (response.data.errcode) {
            const errorCode = response.data.errcode as WechatErrorCode;
            logger.error(`[WechatService] 微信OAuth错误: ${errorCode} - ${response.data.errmsg}`);
            this.handleWechatError(errorCode, response.data.errmsg);
            throw new Error(`微信OAuth错误: ${errorCode} - ${response.data.errmsg}`);
        }

        const tokenData: WechatOAuthToken = response.data;
        logger.debug(`[WechatService] 成功获取OAuth Access Token, openid: ${tokenData.openid}`);

        await this.tokenCacheService.setOAuthToken(
            tokenData,
            tokenData.openid,
            tokenData.unionid,
        );
        await this.apiLimiter.recordCall(this.config.appId, 'oauth_access_token');

        return tokenData;
    }

    /**
     * 刷新 OAuth Access Token
     */
    async refreshOAuthToken(refreshToken: string): Promise<WechatOAuthToken> {
        logger.debug('[WechatService] 刷新OAuth Access Token');

        const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'oauth_access_token');
        if (!canCall) {
            throw new Error('OAuth AccessToken 接口调用超出每日限制');
        }

        const response = await axios.get('https://api.weixin.qq.com/sns/oauth2/refresh_token', {
            params: {
                appid: this.config.appId,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            },
            timeout: 10000,
        });

        if (response.data.errcode) {
            const errorCode = response.data.errcode as WechatErrorCode;
            logger.error(`[WechatService] 刷新OAuth Token错误: ${errorCode} - ${response.data.errmsg}`);
            this.handleWechatError(errorCode, response.data.errmsg);
            throw new Error(`刷新OAuth Token错误: ${errorCode} - ${response.data.errmsg}`);
        }

        const tokenData: WechatOAuthToken = response.data;
        logger.debug(`[WechatService] 成功刷新OAuth Access Token, openid: ${tokenData.openid}`);

        await this.tokenCacheService.setOAuthToken(
            tokenData,
            tokenData.openid,
            tokenData.unionid,
        );
        await this.apiLimiter.recordCall(this.config.appId, 'oauth_access_token');

        return tokenData;
    }

    /**
     * 通过 refresh_token 获取用户信息（如果 access_token 过期）
     */
    async getUserInfoByRefreshToken(refreshToken: string, openid: string): Promise<WechatUserInfo> {
        logger.debug(`[WechatService] 通过refresh_token获取用户信息, openid: ${openid}`);

        const cachedToken = await this.tokenCacheService.getOAuthToken(openid);
        if (cachedToken && cachedToken.expiresAt > new Date()) {
            return this.getUserInfo(cachedToken.accessToken, openid);
        }

        if (cachedToken) {
            try {
                const newTokenData = await this.refreshOAuthToken(cachedToken.refreshToken);
                return this.getUserInfo(newTokenData.access_token, openid);
            } catch {
                // 缓存中的 refresh_token 失败，尝试用传入的
            }
        }

        const newTokenData = await this.refreshOAuthToken(refreshToken);
        return this.getUserInfo(newTokenData.access_token, openid);
    }

    /**
     * 获取微信用户信息
     */
    async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
        logger.debug(`[WechatService] 获取用户信息, openid: ${openid}`);

        const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'userinfo');
        if (!canCall) {
            throw new Error('用户信息接口调用超出每日限制');
        }

        const response = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
            params: {
                access_token: accessToken,
                openid,
                lang: 'zh_CN',
            },
            timeout: 10000,
        });

        if (response.data.errcode) {
            const errorCode = response.data.errcode as WechatErrorCode;
            logger.error(`[WechatService] 微信API错误: ${errorCode} - ${response.data.errmsg}`);

            // 如果是 access_token 过期，尝试刷新
            if (errorCode === WechatErrorCode.ACCESS_TOKEN_EXPIRED || errorCode === WechatErrorCode.INVALID_ACCESS_TOKEN) {
                const cachedToken = await this.tokenCacheService.getOAuthToken(openid);
                if (cachedToken) {
                    logger.info('[WechatService] AccessToken过期，尝试刷新...');
                    const newTokenData = await this.refreshOAuthToken(cachedToken.refreshToken);
                    return this.getUserInfo(newTokenData.access_token, openid);
                }
            }

            this.handleWechatError(errorCode, response.data.errmsg);
            throw new Error(`微信API错误: ${errorCode} - ${response.data.errmsg}`);
        }

        logger.debug(`[WechatService] 成功获取用户信息: ${response.data.nickname}`);
        await this.apiLimiter.recordCall(this.config.appId, 'userinfo');

        return response.data;
    }

    /**
     * 通过授权码获取用户信息（便捷方法）
     */
    async getUserInfoByCode(code: string): Promise<WechatUserInfo> {
        const tokenData = await this.getOAuthAccessToken(code);
        return this.getUserInfo(tokenData.access_token, tokenData.openid);
    }

    /**
     * 检查是否为微信浏览器
     */
    isWechatBrowser(userAgent: string): boolean {
        return /MicroMessenger/i.test(userAgent);
    }

    /**
     * 获取允许的域名列表（用于 CORS 验证等）
     */
    getAllowedDomains(): string[] {
        const allowedDomains = this.config.domains || [this.config.domain];
        return allowedDomains.map((d) => d.replace(/^https?:\/\//, ''));
    }

    /**
     * 处理微信错误码
     */
    private handleWechatError(errorCode: WechatErrorCode, errmsg: string): void {
        switch (errorCode) {
            case WechatErrorCode.ACCESS_TOKEN_EXPIRED:
            case WechatErrorCode.INVALID_ACCESS_TOKEN:
                logger.warn('[WechatService] AccessToken过期或无效，需要重新获取');
                this.tokenCache = null;
                break;
            case WechatErrorCode.INVALID_CODE:
                logger.warn('[WechatService] 授权码无效，可能已使用或过期');
                break;
            case WechatErrorCode.CODE_USED:
                logger.warn('[WechatService] 授权码已使用');
                break;
            case WechatErrorCode.INVALID_REFRESH_TOKEN:
            case WechatErrorCode.REFRESH_TOKEN_EXPIRED:
                logger.warn('[WechatService] RefreshToken无效或过期，需要用户重新授权');
                break;
            case WechatErrorCode.INVALID_TEMPLATE_ID:
                logger.error('[WechatService] 模板ID无效，请检查模板ID是否正确或是否已被删除');
                break;
            case WechatErrorCode.API_LIMIT_EXCEEDED:
                logger.error('[WechatService] 接口调用超出限制');
                break;
            case WechatErrorCode.SYSTEM_BUSY:
                logger.warn('[WechatService] 微信系统繁忙，请稍后重试');
                break;
            default:
                logger.warn(`[WechatService] 未知错误码: ${errorCode}, 错误信息: ${errmsg}`);
        }
    }

    private extractRid(errmsg?: string, headers?: Record<string, any>): string | null {
        if (errmsg) {
            const ridMatch = errmsg.match(/rid:\s*([a-f0-9-]+)/i);
            if (ridMatch) return ridMatch[1];
        }
        const ridHeader = headers?.['x-request-id'] || headers?.['X-Request-Id'];
        if (Array.isArray(ridHeader)) return ridHeader[0];
        if (typeof ridHeader === 'string') return ridHeader;
        return null;
    }

    // ========== 模板消息功能相关 ==========

    /**
     * 发送模板消息
     * @param templateMessage 模板消息内容
     * @returns 消息ID
     */
    async sendTemplateMessage(templateMessage: TemplateMessage): Promise<number> {
        logger.debug(`[WechatService] 发送模板消息给: ${templateMessage.touser}, 模板ID: ${templateMessage.template_id}`);

        const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'template_message');
        if (!canCall) {
            throw new Error('模板消息接口调用超出每日限制');
        }

        const accessToken = await this.getAccessToken();
        const response = await axios.post<TemplateMessageResponse>(
            'https://api.weixin.qq.com/cgi-bin/message/template/send',
            templateMessage,
            {
                params: { access_token: accessToken },
                timeout: 10000,
            },
        );

        if (response.data.errcode !== 0) {
            const errorCode = response.data.errcode as WechatErrorCode;
            const errmsg = response.data.errmsg || '未知错误';
            const rid = this.extractRid(errmsg, response.headers);

            logger.error(`[WechatService] 发送模板消息失败: ${errorCode} - ${errmsg}`);
            if (rid) {
                logger.error(`[WechatService] 微信请求ID (rid): ${rid}`);
            }

            this.handleWechatError(errorCode, errmsg);

            // 提供更友好的错误消息
            if (errorCode === WechatErrorCode.INVALID_TEMPLATE_ID) {
                throw new Error(`模板ID无效。请检查：\n1. 模板ID是否正确\n2. 模板是否已被删除\n3. 模板是否属于当前公众号\n\n错误详情: ${errmsg}`);
            }

            throw new Error(`发送模板消息失败: ${errmsg}`);
        }

        await this.apiLimiter.recordCall(this.config.appId, 'template_message');
        logger.debug(`[WechatService] 模板消息发送成功, msgid: ${response.data.msgid}`);
        return response.data.msgid!;
    }

    /**
     * 获取模板列表
     * @returns 模板列表
     */
    async getTemplateList(forceRefresh = false): Promise<TemplateItem[]> {
        if (!forceRefresh && this.templateCache && this.templateCache.expiresAt > Date.now()) {
            return this.templateCache.list;
        }

        const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'get_template_list');
        if (!canCall) {
            throw new Error('获取模板列表接口调用超出每日限制');
        }

        const accessToken = await this.getAccessToken();
        const response = await axios.get<TemplateListResponse>(
            'https://api.weixin.qq.com/cgi-bin/template/get_all_private_template',
            {
                params: { access_token: accessToken },
                timeout: 10000,
            },
        );

        if (!response.data) {
            throw new Error('获取模板列表失败: 响应数据为空');
        }

        if (response.data.errcode !== undefined && response.data.errcode !== 0) {
            const errorCode = response.data.errcode as WechatErrorCode;
            const errorMsg = response.data.errmsg || '未知错误';
            logger.error(`[WechatService] 获取模板列表失败: ${errorCode} - ${errorMsg}`);
            this.handleWechatError(errorCode, errorMsg);
            throw new Error(`获取模板列表失败: ${errorCode} - ${errorMsg}`);
        }

        if (!response.data.template_list) {
            logger.warn('[WechatService] 模板列表为空或不存在');
            return [];
        }

        await this.apiLimiter.recordCall(this.config.appId, 'get_template_list');
        logger.debug(`[WechatService] 成功获取模板列表, 共 ${response.data.template_list.length} 个模板`);

        this.templateCache = {
            list: response.data.template_list,
            expiresAt: Date.now() + TEMPLATE_CACHE_TTL,
        };
        return response.data.template_list;
    }

    /**
     * 删除模板
     * @param templateId 模板ID
     */
    async deleteTemplate(templateId: string): Promise<void> {
        logger.debug(`[WechatService] 删除模板: ${templateId}`);

        const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'delete_template');
        if (!canCall) {
            throw new Error('删除模板接口调用超出每日限制');
        }

        const accessToken = await this.getAccessToken();
        const response = await axios.post<{ errcode: number, errmsg: string }>(
            'https://api.weixin.qq.com/cgi-bin/template/del_private_template',
            { template_id: templateId },
            {
                params: { access_token: accessToken },
                timeout: 10000,
            },
        );

        if (response.data.errcode !== 0) {
            const errorCode = response.data.errcode as WechatErrorCode;
            logger.error(`[WechatService] 删除模板失败: ${errorCode} - ${response.data.errmsg}`);
            this.handleWechatError(errorCode, response.data.errmsg);
            throw new Error(`删除模板失败: ${errorCode} - ${response.data.errmsg}`);
        }

        await this.apiLimiter.recordCall(this.config.appId, 'delete_template');
        this.templateCache = null;
        logger.debug('[WechatService] 模板删除成功');
    }
}
