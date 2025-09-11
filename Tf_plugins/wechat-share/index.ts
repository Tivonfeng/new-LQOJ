import * as crypto from 'crypto';
import axios from 'axios';
import {
    Context,
    Handler,
} from 'hydrooj';

// 硬编码配置
const WECHAT_CONFIG = {
    appId: process.env.WECHAT_APP_ID || 'wx8f8d991dfd127dca',
    appSecret: process.env.WECHAT_APP_SECRET || '05068710fde31b2e914dceb3f45a8aa1',
    domain: process.env.WECHAT_DOMAIN || 'https://noj.lqcode.fun',
};

interface WechatToken {
    access_token: string;
    expires_in: number;
    expires_at: number;
}

interface WechatTicket {
    ticket: string;
    expires_in: number;
    expires_at: number;
}

interface JSSDKConfig {
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
}

export class WechatService {
    private tokenCache: WechatToken | null = null;
    private ticketCache: WechatTicket | null = null;

    private generateNonceStr(): string {
        return Math.random().toString(36).substring(2, 15);
    }

    private generateTimestamp(): number {
        return Math.floor(Date.now() / 1000);
    }

    private sha1(str: string): string {
        return crypto.createHash('sha1').update(str).digest('hex');
    }

    async getAccessToken(): Promise<string> {
        const now = Date.now();
        console.log('[WechatService] 获取Access Token...');

        if (this.tokenCache && this.tokenCache.expires_at > now) {
            console.log('[WechatService] 使用缓存的Access Token');
            return this.tokenCache.access_token;
        }

        console.log('[WechatService] 从微信API获取新的Access Token');
        try {
            const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
                params: {
                    grant_type: 'client_credential',
                    appid: WECHAT_CONFIG.appId,
                    secret: WECHAT_CONFIG.appSecret,
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
            console.error('[WechatService] 获取Access Token失败:', error.message);
            throw new Error(`获取微信Access Token失败: ${error.message}`);
        }
    }

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
                appId: WECHAT_CONFIG.appId,
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

    validateDomain(url: string): boolean {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            const allowedDomain = WECHAT_CONFIG.domain.replace(/^https?:\/\//, '');

            console.log('[WechatService] 验证域名:', hostname, '允许的域名:', allowedDomain);

            const isValid = hostname === allowedDomain
                || hostname.endsWith(`.${allowedDomain}`);

            console.log('[WechatService] 域名验证结果:', isValid);
            return isValid;
        } catch (error) {
            console.error('[WechatService] 域名验证失败:', error.message);
            return false;
        }
    }
}

class WechatShareHandler extends Handler {
    wechatService = new WechatService();

    async get(args: any) {
        console.log('[WechatShareHandler] 收到分享配置请求:', args);
        try {
            const url = args.url as string;

            if (!url) {
                console.error('[WechatShareHandler] 缺少url参数');
                throw new Error('缺少url参数');
            }

            if (!this.wechatService.validateDomain(url)) {
                console.error('[WechatShareHandler] 域名未授权:', url);
                throw new Error('域名未授权');
            }

            const jssdkConfig = await this.wechatService.getJSSDKConfig(url);
            console.log('[WechatShareHandler] 成功生成分享配置');

            this.response.body = {
                success: true,
                data: {
                    jssdkConfig,
                    menuConfig: {
                        hideMenuItems: [
                            'menuItem:copyUrl',
                            'menuItem:openWithQQBrowser',
                            'menuItem:openWithSafari',
                        ],
                        showMenuItems: [
                            'menuItem:share:appMessage',
                            'menuItem:share:timeline',
                        ],
                    },
                },
            };
        } catch (error) {
            console.error('[WechatShareHandler] 处理请求失败:', error.message);
            this.response.status = 400;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}

export default function apply(ctx: Context) {
    console.log('[WechatShare] 初始化微信分享插件');
    console.log('[WechatShare] 配置信息:', {
        appId: WECHAT_CONFIG.appId,
        domain: WECHAT_CONFIG.domain,
        hasSecret: !!WECHAT_CONFIG.appSecret,
    });

    ctx.Route('wechat_share', '/wechat/share', WechatShareHandler);
    console.log('[WechatShare] 注册路由: /wechat/share ');

    ctx.i18n.load('zh', {
        wechat_share: '微信分享',
        wechat_share_get_config: '获取分享配置',
    });

    ctx.i18n.load('en', {
        wechat_share: 'WeChat Share',
        wechat_share_get_config: 'Get Share Config',
    });
    console.log('[WechatShare] 微信插件加载成功');
}
