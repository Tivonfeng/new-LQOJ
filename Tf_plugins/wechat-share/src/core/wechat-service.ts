import * as crypto from 'crypto';
import axios from 'axios';
import { Context, Logger } from 'hydrooj';
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

export class WechatService {
    private tokenCache: WechatToken | null = null;
    private ticketCache: WechatTicket | null = null;
    private tokenPromise: Promise<string> | null = null;
    private ticketPromise: Promise<string> | null = null;
    private templateCache: { list: TemplateItem[], expiresAt: number } | null = null;
    private config: WechatConfig;
    private tokenCacheService: TokenCacheService | null = null;
    private apiLimiter: WechatApiLimiter | null = null;
    private ctx: Context | null = null;

    constructor(config: WechatConfig, ctx?: Context) {
        this.config = config;
        if (ctx) {
            this.ctx = ctx;
            this.tokenCacheService = new TokenCacheService(ctx);
            this.apiLimiter = new WechatApiLimiter(ctx);
        }
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
        logger.debug('[WechatService] 获取Access Token...');

        // 1. 检查内存缓存
        if (this.tokenCache && this.tokenCache.expires_at > now) {
            logger.debug('[WechatService] 使用内存缓存的Access Token');
            return this.tokenCache.access_token;
        }

        // 2. 检查持久化缓存
        if (this.tokenCacheService) {
            const cachedToken = await this.tokenCacheService.getAccessToken(this.config.appId);
            if (cachedToken && cachedToken.expires_at > now) {
                logger.debug('[WechatService] 使用持久化缓存的Access Token');
                this.tokenCache = cachedToken;
                return cachedToken.access_token;
            }
        }

        // 3. 检查接口调用限制
        if (this.apiLimiter) {
            const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'access_token');
            if (!canCall) {
                throw new Error('AccessToken 接口调用超出每日限制');
            }
        }

        // 4. 检查是否正在请求中(防止并发)
        if (this.tokenPromise) {
            logger.debug('[WechatService] 等待正在进行的Token请求...');
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
        logger.info('[WechatService] 从微信API获取新的Access Token');
        const now = Date.now();

        try {
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

            logger.info(`[WechatService] 成功获取Access Token, expires_in: ${response.data.expires_in}`);
            const token: WechatToken = {
                access_token: response.data.access_token,
                expires_in: response.data.expires_in,
                expires_at: now + (response.data.expires_in - 300) * 1000, // 提前5分钟过期
            };

            this.tokenCache = token;

            // 保存到持久化缓存
            if (this.tokenCacheService) {
                await this.tokenCacheService.setAccessToken(this.config.appId, token);
            }

            // 记录接口调用
            if (this.apiLimiter) {
                await this.apiLimiter.recordCall(this.config.appId, 'access_token');
            }

            return token.access_token;
        } catch (error) {
            // 错误时清空缓存
            this.tokenCache = null;
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatService] 获取Access Token失败: ${message}`);
            throw new Error(`获取微信Access Token失败: ${message}`);
        }
    }

    /**
     * 获取 JS API Ticket
     */
    async getJSApiTicket(): Promise<string> {
        const now = Date.now();
        logger.debug('[WechatService] 获取JS API Ticket...');

        // 1. 检查内存缓存
        if (this.ticketCache && this.ticketCache.expires_at > now) {
            logger.debug('[WechatService] 使用内存缓存的JS API Ticket');
            return this.ticketCache.ticket;
        }

        // 2. 检查持久化缓存
        if (this.tokenCacheService) {
            const cachedTicket = await this.tokenCacheService.getJSApiTicket(this.config.appId);
            if (cachedTicket && cachedTicket.expires_at > now) {
                logger.debug('[WechatService] 使用持久化缓存的JS API Ticket');
                this.ticketCache = cachedTicket;
                return cachedTicket.ticket;
            }
        }

        // 3. 检查是否正在请求中(防止并发)
        if (this.ticketPromise) {
            logger.debug('[WechatService] 等待正在进行的Ticket请求...');
            return this.ticketPromise;
        }

        // 4. 检查接口调用限制
        if (this.apiLimiter) {
            const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'jsapi_ticket');
            if (!canCall) {
                throw new Error('JSApiTicket 接口调用超出每日限制');
            }
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
        logger.info('[WechatService] 从微信API获取新的JS API Ticket');
        const now = Date.now();

        try {
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

            logger.info(`[WechatService] 成功获取JS API Ticket, expires_in: ${response.data.expires_in}`);
            const ticket: WechatTicket = {
                ticket: response.data.ticket,
                expires_in: response.data.expires_in,
                expires_at: now + (response.data.expires_in - 300) * 1000, // 提前5分钟过期
            };

            this.ticketCache = ticket;

            // 保存到持久化缓存
            if (this.tokenCacheService) {
                await this.tokenCacheService.setJSApiTicket(this.config.appId, ticket);
            }

            // 记录接口调用
            if (this.apiLimiter) {
                await this.apiLimiter.recordCall(this.config.appId, 'jsapi_ticket');
            }

            return ticket.ticket;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatService] 获取JS API Ticket失败: ${message}`);
            throw new Error(`获取微信JS API Ticket失败: ${message}`);
        }
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

        logger.debug('[WechatService] 生成签名参数:', params);
        const signature = this.sha1(params);
        logger.debug('[WechatService] 生成的签名:', signature);

        return signature;
    }

    /**
     * 获取 JSSDK 配置
     */
    async getJSSDKConfig(url: string): Promise<JSSDKConfig> {
        logger.debug(`[WechatService] 生成JSSDK配置, URL: ${url}`);
        try {
            const ticket = await this.getJSApiTicket();
            const timestamp = this.generateTimestamp();
            const nonceStr = this.generateNonceStr();

            // URL处理：去除hash部分
            const cleanUrl = url.split('#')[0];
            logger.debug(`[WechatService] 清理后的URL: ${cleanUrl}`);

            const signature = this.generateSignature(ticket, cleanUrl, timestamp, nonceStr);

            const config = {
                appId: this.config.appId,
                timestamp,
                nonceStr,
                signature,
            };

            logger.debug('[WechatService] 生成的JSSDK配置:', config);
            return config;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatService] 生成JSSDK配置失败: ${message}`);
            throw new Error(`生成JSSDK配置失败: ${message}`);
        }
    }

    /**
     * 验证域名
     */
    validateDomain(url: string): boolean {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;

            // 获取所有允许的域名
            const allowedDomains = this.config.domains || [this.config.domain];
            const cleanDomains = allowedDomains.map((d) => d.replace(/^https?:\/\//, ''));

            logger.debug(`[WechatService] 验证域名: ${hostname}, 允许的域名: ${cleanDomains.join(', ')}`);

            // 允许本地开发环境域名
            const isLocalDev = !!hostname.match(/^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)$/);

            // 检查是否匹配任一允许的域名
            const isValid = cleanDomains.some((allowedDomain) => (
                hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`)
            )) || isLocalDev;

            logger.debug(`[WechatService] 域名验证结果: ${isValid}${isLocalDev ? ' (本地开发环境)' : ''}`);
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

        // 检查接口调用限制
        if (this.apiLimiter) {
            const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'oauth_access_token');
            if (!canCall) {
                throw new Error('OAuth AccessToken 接口调用超出每日限制');
            }
        }

        try {
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
            logger.info(`[WechatService] 成功获取OAuth Access Token, openid: ${tokenData.openid}`);

            // 保存到持久化缓存
            if (this.tokenCacheService) {
                await this.tokenCacheService.setOAuthToken(
                    tokenData,
                    tokenData.openid,
                    tokenData.unionid,
                );
            }

            // 记录接口调用
            if (this.apiLimiter) {
                await this.apiLimiter.recordCall(this.config.appId, 'oauth_access_token');
            }

            return tokenData;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatService] 获取OAuth Access Token失败: ${message}`);
            throw new Error(`获取微信OAuth Access Token失败: ${message}`);
        }
    }

    /**
     * 刷新 OAuth Access Token
     */
    async refreshOAuthToken(refreshToken: string): Promise<WechatOAuthToken> {
        logger.debug('[WechatService] 刷新OAuth Access Token');

        // 检查接口调用限制
        if (this.apiLimiter) {
            const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'oauth_access_token');
            if (!canCall) {
                throw new Error('OAuth AccessToken 接口调用超出每日限制');
            }
        }

        try {
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
            logger.info(`[WechatService] 成功刷新OAuth Access Token, openid: ${tokenData.openid}`);

            // 保存到持久化缓存
            if (this.tokenCacheService) {
                await this.tokenCacheService.setOAuthToken(
                    tokenData,
                    tokenData.openid,
                    tokenData.unionid,
                );
            }

            // 记录接口调用
            if (this.apiLimiter) {
                await this.apiLimiter.recordCall(this.config.appId, 'oauth_access_token');
            }

            return tokenData;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatService] 刷新OAuth Access Token失败: ${message}`);
            throw new Error(`刷新OAuth Access Token失败: ${message}`);
        }
    }

    /**
     * 通过 refresh_token 获取用户信息（如果 access_token 过期）
     */
    async getUserInfoByRefreshToken(refreshToken: string, openid: string): Promise<WechatUserInfo> {
        logger.debug(`[WechatService] 通过refresh_token获取用户信息, openid: ${openid}`);

        // 先尝试从缓存获取
        if (this.tokenCacheService) {
            const cachedToken = await this.tokenCacheService.getOAuthToken(openid);
            if (cachedToken && cachedToken.expiresAt > new Date()) {
                // Token 未过期，直接使用
                return this.getUserInfo(cachedToken.accessToken, openid);
            } else if (cachedToken) {
                // Token 过期，使用 refresh_token 刷新
                try {
                    const newTokenData = await this.refreshOAuthToken(cachedToken.refreshToken);
                    return this.getUserInfo(newTokenData.access_token, openid);
                } catch (error) {
                    // 刷新失败，尝试使用传入的 refresh_token
                    const newTokenData = await this.refreshOAuthToken(refreshToken);
                    return this.getUserInfo(newTokenData.access_token, openid);
                }
            }
        }

        // 缓存中没有，使用传入的 refresh_token 刷新
        const newTokenData = await this.refreshOAuthToken(refreshToken);
        return this.getUserInfo(newTokenData.access_token, openid);
    }

    /**
     * 获取微信用户信息
     */
    async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
        logger.debug(`[WechatService] 获取用户信息, openid: ${openid}`);

        // 检查接口调用限制
        if (this.apiLimiter) {
            const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'userinfo');
            if (!canCall) {
                throw new Error('用户信息接口调用超出每日限制');
            }
        }

        try {
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
                    if (this.tokenCacheService) {
                        const cachedToken = await this.tokenCacheService.getOAuthToken(openid);
                        if (cachedToken) {
                            logger.info('[WechatService] AccessToken过期，尝试刷新...');
                            const newTokenData = await this.refreshOAuthToken(cachedToken.refreshToken);
                            // 重试获取用户信息
                            return this.getUserInfo(newTokenData.access_token, openid);
                        }
                    }
                }

                this.handleWechatError(errorCode, response.data.errmsg);
                throw new Error(`微信API错误: ${errorCode} - ${response.data.errmsg}`);
            }

            logger.info(`[WechatService] 成功获取用户信息: ${response.data.nickname}`);

            // 记录接口调用
            if (this.apiLimiter) {
                await this.apiLimiter.recordCall(this.config.appId, 'userinfo');
            }

            return response.data;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatService] 获取用户信息失败: ${message}`);
            throw new Error(`获取微信用户信息失败: ${message}`);
        }
    }

    /**
     * 通过授权码获取用户信息（便捷方法）
     */
    async getUserInfoByCode(code: string): Promise<WechatUserInfo> {
        logger.debug('[WechatService] 通过code获取用户信息');
        const tokenData = await this.getOAuthAccessToken(code);
        const userInfo = await this.getUserInfo(tokenData.access_token, tokenData.openid);
        return userInfo;
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
                // 清除相关缓存
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
        logger.info(`[WechatService] 发送模板消息给: ${templateMessage.touser}, 模板ID: ${templateMessage.template_id}`);

        // 检查接口调用限制
        if (this.apiLimiter) {
            const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'template_message');
            if (!canCall) {
                throw new Error('模板消息接口调用超出每日限制');
            }
        }

        try {
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
                let userFriendlyMessage = `发送模板消息失败: ${errmsg}`;
                if (errorCode === WechatErrorCode.INVALID_TEMPLATE_ID) {
                    userFriendlyMessage = `模板ID无效。请检查：\n1. 模板ID是否正确\n2. 模板是否已被删除\n3. 模板是否属于当前公众号\n\n错误详情: ${errmsg}`;
                }

                throw new Error(userFriendlyMessage);
            }

            // 记录接口调用
            if (this.apiLimiter) {
                await this.apiLimiter.recordCall(this.config.appId, 'template_message');
            }

            logger.info(`[WechatService] 模板消息发送成功, msgid: ${response.data.msgid}`);
            return response.data.msgid!;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatService] 发送模板消息失败: ${errorMessage}`);
            throw new Error(`发送模板消息失败: ${errorMessage}`);
        }
    }

    /**
     * 获取模板列表
     * @returns 模板列表
     */
    async getTemplateList(forceRefresh = false): Promise<TemplateItem[]> {
        logger.info('[WechatService] 获取模板列表');

        if (!forceRefresh && this.templateCache && this.templateCache.expiresAt > Date.now()) {
            logger.info(`[WechatService] 使用模板列表缓存, 剩余 ${(this.templateCache.expiresAt - Date.now()) / 1000}s`);
            return this.templateCache.list;
        }

        // 检查接口调用限制
        if (this.apiLimiter) {
            const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'get_template_list');
            if (!canCall) {
                throw new Error('获取模板列表接口调用超出每日限制');
            }
        }

        try {
            const accessToken = await this.getAccessToken();
            const apiUrl = 'https://api.weixin.qq.com/cgi-bin/template/get_all_private_template';
            logger.info(`[WechatService] 请求模板列表API: ${apiUrl}`);
            logger.info(`[WechatService] Access Token: ${accessToken.substring(0, 20)}...`);

            const response = await axios.get<TemplateListResponse>(
                apiUrl,
                {
                    params: { access_token: accessToken },
                    timeout: 10000,
                },
            );

            // 记录完整响应（用于调试）
            logger.info(`[WechatService] API响应状态: ${response.status}`);
            logger.info(`[WechatService] API响应数据: ${JSON.stringify(response.data)}`);

            // 检查响应数据
            if (!response.data) {
                logger.error('[WechatService] 获取模板列表失败: 响应数据为空');
                throw new Error('获取模板列表失败: 响应数据为空');
            }

            // 检查是否有错误码
            if (response.data.errcode !== undefined && response.data.errcode !== 0) {
                const errorCode = response.data.errcode as WechatErrorCode;
                const errorMsg = response.data.errmsg || '未知错误';
                logger.error(`[WechatService] 获取模板列表失败: ${errorCode} - ${errorMsg}`);
                this.handleWechatError(errorCode, errorMsg);
                throw new Error(`获取模板列表失败: ${errorCode} - ${errorMsg}`);
            }

            // 检查模板列表是否存在
            if (!response.data.template_list) {
                logger.warn('[WechatService] 模板列表为空或不存在');
                return [];
            }

            // 记录接口调用
            if (this.apiLimiter) {
                await this.apiLimiter.recordCall(this.config.appId, 'get_template_list');
            }

            logger.info(`[WechatService] 成功获取模板列表, 共 ${response.data.template_list.length} 个模板`);
            this.templateCache = {
                list: response.data.template_list,
                expiresAt: Date.now() + TEMPLATE_CACHE_TTL,
            };
            return response.data.template_list;
        } catch (error: any) {
            // 处理 axios 错误
            if (error.response) {
                // 服务器返回了错误响应
                const data = error.response.data as any;
                const errcode = data?.errcode;
                const errmsg = data?.errmsg || error.message || '未知错误';
                const rid = this.extractRid(errmsg, error.response.headers);
                logger.error(`[WechatService] 获取模板列表失败 (HTTP ${error.response.status}): ${errcode !== undefined ? errcode : 'N/A'} - ${errmsg}`);
                if (rid) {
                    logger.error(`[WechatService] 微信请求ID (rid): ${rid}`);
                }
                if (errcode !== undefined && errcode !== null) {
                    this.handleWechatError(errcode as WechatErrorCode, errmsg);
                    throw new Error(`获取模板列表失败: ${errcode} - ${errmsg}`);
                }
                throw new Error(`获取模板列表失败: HTTP ${error.response.status} - ${errmsg}`);
            } else if (error.request) {
                // 请求已发出但没有收到响应
                const message = error.message || '网络错误';
                logger.error(`[WechatService] 获取模板列表失败: 网络错误 - ${message}`);
                throw new Error(`获取模板列表失败: 网络错误 - ${message}`);
            }

            // 处理其他错误
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatService] 获取模板列表失败: ${message}`);
            if (error.stack) {
                logger.error(`[WechatService] 错误堆栈: ${error.stack}`);
            }
            throw new Error(`获取模板列表失败: ${message}`);
        }
    }

    /**
     * 删除模板
     * @param templateId 模板ID
     */
    async deleteTemplate(templateId: string): Promise<void> {
        logger.info(`[WechatService] 删除模板: ${templateId}`);

        // 检查接口调用限制
        if (this.apiLimiter) {
            const canCall = await this.apiLimiter.checkLimit(this.config.appId, 'delete_template');
            if (!canCall) {
                throw new Error('删除模板接口调用超出每日限制');
            }
        }

        try {
            const accessToken = await this.getAccessToken();
            interface DeleteTemplateResponse {
                errcode: number;
                errmsg: string;
            }
            const response = await axios.post<DeleteTemplateResponse>(
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

            // 记录接口调用
            if (this.apiLimiter) {
                await this.apiLimiter.recordCall(this.config.appId, 'delete_template');
            }

            logger.info('[WechatService] 模板删除成功');
            this.templateCache = null;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatService] 删除模板失败: ${message}`);
            throw new Error(`删除模板失败: ${message}`);
        }
    }
}
