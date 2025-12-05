import * as crypto from 'crypto';
import axios from 'axios';
import type {
    WechatToken,
    WechatTicket,
    JSSDKConfig,
    WechatConfig,
    WechatOAuthToken,
    WechatUserInfo,
} from '../types/wechat';

export class WechatService {
    private tokenCache: WechatToken | null = null;
    private ticketCache: WechatTicket | null = null;
    private tokenPromise: Promise<string> | null = null;
    private ticketPromise: Promise<string> | null = null;
    private config: WechatConfig;

    constructor(config: WechatConfig) {
        this.config = config;
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
        console.log('[WechatService] 获取Access Token...');

        // 1. 检查缓存
        if (this.tokenCache && this.tokenCache.expires_at > now) {
            console.log('[WechatService] 使用缓存的Access Token');
            return this.tokenCache.access_token;
        }

        // 2. 检查是否正在请求中(防止并发)
        if (this.tokenPromise) {
            console.log('[WechatService] 等待正在进行的Token请求...');
            return this.tokenPromise;
        }

        // 3. 创建新请求
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
        console.log('[WechatService] 从微信API获取新的Access Token');
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
                console.error('[WechatService] 微信API错误:', response.data.errcode, response.data.errmsg);
                throw new Error(`微信API错误: ${response.data.errcode} - ${response.data.errmsg}`);
            }

            console.log('[WechatService] 成功获取Access Token, expires_in:', response.data.expires_in);
            this.tokenCache = {
                access_token: response.data.access_token,
                expires_in: response.data.expires_in,
                expires_at: now + (response.data.expires_in - 300) * 1000, // 提前5分钟过期
            };

            return this.tokenCache.access_token;
        } catch (error) {
            // 错误时清空缓存
            this.tokenCache = null;
            const message = error instanceof Error ? error.message : String(error);
            console.error('[WechatService] 获取Access Token失败:', message);
            throw new Error(`获取微信Access Token失败: ${message}`);
        }
    }

    /**
     * 获取 JS API Ticket
     */
    async getJSApiTicket(): Promise<string> {
        const now = Date.now();
        console.log('[WechatService] 获取JS API Ticket...');

        if (this.ticketCache && this.ticketCache.expires_at > now) {
            console.log('[WechatService] 使用缓存的JS API Ticket');
            return this.ticketCache.ticket;
        }

        console.log('[WechatService] 从微信API获取新的JS API Ticket');
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
                console.error('[WechatService] 微信API错误:', response.data.errcode, response.data.errmsg);
                throw new Error(`微信API错误: ${response.data.errcode} - ${response.data.errmsg}`);
            }

            console.log('[WechatService] 成功获取JS API Ticket, expires_in:', response.data.expires_in);
            this.ticketCache = {
                ticket: response.data.ticket,
                expires_in: response.data.expires_in,
                expires_at: now + (response.data.expires_in - 300) * 1000, // 提前5分钟过期
            };

            return this.ticketCache.ticket;
        } catch (error) {
            console.error('[WechatService] 获取JS API Ticket失败:', error.message);
            throw new Error(`获取微信JS API Ticket失败: ${error.message}`);
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

        console.log('[WechatService] 生成签名参数:', params);
        const signature = this.sha1(params);
        console.log('[WechatService] 生成的签名:', signature);

        return signature;
    }

    /**
     * 获取 JSSDK 配置
     */
    async getJSSDKConfig(url: string): Promise<JSSDKConfig> {
        console.log('[WechatService] 生成JSSDK配置, URL:', url);
        try {
            const ticket = await this.getJSApiTicket();
            const timestamp = this.generateTimestamp();
            const nonceStr = this.generateNonceStr();

            // URL处理：去除hash部分
            const cleanUrl = url.split('#')[0];
            console.log('[WechatService] 清理后的URL:', cleanUrl);

            const signature = this.generateSignature(ticket, cleanUrl, timestamp, nonceStr);

            const config = {
                appId: this.config.appId,
                timestamp,
                nonceStr,
                signature,
            };

            console.log('[WechatService] 生成的JSSDK配置:', config);
            return config;
        } catch (error) {
            console.error('[WechatService] 生成JSSDK配置失败:', error.message);
            throw new Error(`生成JSSDK配置失败: ${error.message}`);
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

            console.log('[WechatService] 验证域名:', hostname, '允许的域名:', cleanDomains);

            // 允许本地开发环境域名
            const isLocalDev = !!hostname.match(/^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)$/);

            // 检查是否匹配任一允许的域名
            const isValid = cleanDomains.some((allowedDomain) => (
                hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`)
            )) || isLocalDev;

            console.log('[WechatService] 域名验证结果:', isValid, isLocalDev ? '(本地开发环境)' : '');
            return isValid;
        } catch (error) {
            console.error('[WechatService] 域名验证失败:', error.message);
            return false;
        }
    }

    // ========== OAuth 登录功能相关 ==========

    /**
     * 用 code 换取 OAuth Access Token
     */
    async getOAuthAccessToken(code: string): Promise<WechatOAuthToken> {
        console.log('[WechatService] 获取OAuth Access Token, code:', code);
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
                console.error('[WechatService] 微信OAuth错误:', response.data.errcode, response.data.errmsg);
                throw new Error(`微信OAuth错误: ${response.data.errcode} - ${response.data.errmsg}`);
            }

            console.log('[WechatService] 成功获取OAuth Access Token, openid:', response.data.openid);
            return response.data;
        } catch (error) {
            console.error('[WechatService] 获取OAuth Access Token失败:', error.message);
            throw new Error(`获取微信OAuth Access Token失败: ${error.message}`);
        }
    }

    /**
     * 获取微信用户信息
     */
    async getUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
        console.log('[WechatService] 获取用户信息, openid:', openid);
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
                console.error('[WechatService] 微信API错误:', response.data.errcode, response.data.errmsg);
                throw new Error(`微信API错误: ${response.data.errcode} - ${response.data.errmsg}`);
            }

            console.log('[WechatService] 成功获取用户信息:', response.data.nickname);
            return response.data;
        } catch (error) {
            console.error('[WechatService] 获取用户信息失败:', error.message);
            throw new Error(`获取微信用户信息失败: ${error.message}`);
        }
    }

    /**
     * 通过授权码获取用户信息（便捷方法）
     */
    async getUserInfoByCode(code: string): Promise<WechatUserInfo> {
        console.log('[WechatService] 通过code获取用户信息');
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
}
