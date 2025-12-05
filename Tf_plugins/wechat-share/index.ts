import * as path from 'path';
import {
    Context,
    Handler,
    Schema,
    Service,
    SystemModel,
    TokenModel,
    ValidationError,
} from 'hydrooj';
import { WechatService } from './src/core/wechat-service';
import { WechatShareHandler } from './src/handlers/share-handler';
import type { WechatConfig } from './src/types/wechat';

export default class WechatPlugin extends Service {
    static inject = ['oauth'];
    static Config = Schema.object({
        // 公众号配置（用于微信内授权和分享功能）
        appId: Schema.string().description('微信公众号 AppID (用于分享功能，必需)').default('wx8f8d991dfd127dca'),
        appSecret: Schema.string().description('微信公众号 AppSecret').role('secret').default('05068710fde31b2e914dceb3f45a8aa1'),
        // 开放平台配置（用于网页扫码登录，可选，配置后可同时支持微信内和浏览器登录）
        openAppId: Schema.string().description('微信开放平台 AppID (可选，用于扫码登录)').default(''),
        openAppSecret: Schema.string().description('微信开放平台 AppSecret').role('secret').default(''),
        useOpenPlatformForOAuth: Schema.boolean().description('优先使用开放平台进行OAuth登录').default(false),
        // 通用配置
        domains: Schema.array(Schema.string()).description('授权域名列表').default(['yz.lqcode.fun', 'noj.lqcode.fun']),
        canRegister: Schema.boolean().default(true),
    });

    wechatService: WechatService;

    constructor(ctx: Context, config: ReturnType<typeof WechatPlugin.Config>) {
        super(ctx, 'wechat');

        console.log('=====================================');
        console.log('[WechatPlugin] 初始化微信插件 (分享+登录)');
        console.log('[WechatPlugin] 配置信息:');
        console.log('[WechatPlugin]   公众号 AppID:', config.appId);
        console.log('[WechatPlugin]   开放平台 AppID:', config.openAppId || '(未配置)');
        console.log('[WechatPlugin]   OAuth优先使用:', config.useOpenPlatformForOAuth ? '开放平台' : '公众号');
        console.log('[WechatPlugin]   授权域名:', config.domains);
        console.log('=====================================');

        // 创建微信配置
        const WECHAT_CONFIG: WechatConfig = {
            appId: config.appId,
            appSecret: config.appSecret,
            domain: config.domains[0], // 使用第一个域名作为主域名
            domains: config.domains, // 传递所有域名
        };

        // 创建共享的微信服务实例
        this.wechatService = new WechatService(WECHAT_CONFIG);

        // 将微信服务注入到 context 中
        ctx.provide('wechatService');
        (ctx as any).wechatService = this.wechatService;

        // ========== 功能1: 微信分享功能 ==========
        console.log('[WechatPlugin] 正在注册分享功能...');

        // 设置CORS配置以允许跨域请求
        const currentCors = SystemModel.get('server.cors') || '';
        const allowedDomains = ['yz.lqcode.fun', 'noj.lqcode.fun', 'localhost', '127.0.0.1', '10.0.1.146'];
        const newCorsValue = [...new Set([...currentCors.split(','), ...allowedDomains])].filter(Boolean).join(',');
        SystemModel.set('server.cors', newCorsValue);
        console.log('[WechatPlugin] 设置CORS允许域名:', newCorsValue);

        // 注册分享路由
        ctx.Route('wechat_share', '/wechat/share', WechatShareHandler);
        console.log('[WechatPlugin] ✓ 分享功能已启用 - 路由: /wechat/share');

        // 注册微信验证文件路由
        const publicDir = path.join(__dirname, 'public');
        ctx.server.server.use(async (koaCtx, next) => {
            if (koaCtx.path.startsWith('/MP_verify_')) {
                const filename = koaCtx.path.substring(1); // 去掉开头的 /
                const filePath = path.join(publicDir, filename);
                try {
                    const fs = await import('fs-extra');
                    if (await fs.pathExists(filePath)) {
                        koaCtx.type = 'text/plain';
                        koaCtx.body = await fs.readFile(filePath, 'utf-8');
                        return;
                    }
                } catch (error) {
                    console.error('[WechatPlugin] 读取验证文件失败:', error);
                }
            }
            await next();
        });
        console.log('[WechatPlugin] ✓ 微信验证文件路由已注册');

        // ========== 功能2: 微信 OAuth 登录功能 ==========
        console.log('[WechatPlugin] 正在注册OAuth登录功能...');

        const wechatService = this.wechatService;

        // 创建开放平台的 WechatService（如果配置了）
        let openWechatService: WechatService | null = null;
        if (config.openAppId && config.openAppSecret) {
            const openConfig: WechatConfig = {
                appId: config.openAppId,
                appSecret: config.openAppSecret,
                domain: config.domains[0],
                domains: config.domains,
            };
            openWechatService = new WechatService(openConfig);
        }

        ctx.oauth.provide('wechat', {
            text: 'Login with Wechat',
            name: 'Wechat',
            canRegister: config.canRegister,
            callback: async function callback({ state, code }) {
                const s = await TokenModel.get(state, TokenModel.TYPE_OAUTH);
                if (!s) throw new ValidationError('token');

                // 判断使用哪个服务来获取用户信息
                let userInfo;
                const primaryService = config.useOpenPlatformForOAuth && openWechatService
                    ? openWechatService
                    : wechatService;
                const fallbackService = primaryService === openWechatService
                    ? wechatService
                    : openWechatService;

                try {
                    userInfo = await primaryService.getUserInfoByCode(code);
                } catch (error) {
                    if (fallbackService) {
                        console.log('[WechatPlugin] 主配置失败，尝试备用配置...', error.message);
                        userInfo = await fallbackService.getUserInfoByCode(code);
                    } else {
                        throw error;
                    }
                }

                await TokenModel.del(s._id, TokenModel.TYPE_OAUTH);

                return {
                    _id: userInfo.openid,
                    email: userInfo.email || `${userInfo.openid}@wechat.oauth`,
                    uname: [userInfo.nickname].filter((i) => i),
                    avatar: userInfo.headimgurl,
                };
            },
            get: async function get(this: Handler) {
                const [state] = await TokenModel.add(
                    TokenModel.TYPE_OAUTH, 600, { redirect: this.request.referer },
                );
                const url = SystemModel.get('server.url');
                const redirectUri = encodeURIComponent(`${url}oauth/wechat/callback`);

                // 检测是否在微信浏览器中
                const userAgent = this.request.headers['user-agent'] || '';
                const isWechat = /MicroMessenger/i.test(userAgent);

                // 决定使用哪个 AppID
                const useOpenPlatform = config.useOpenPlatformForOAuth && config.openAppId;
                const targetAppId = useOpenPlatform ? config.openAppId : config.appId;

                if (isWechat) {
                    // 微信内使用公众号授权
                    const authUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize';
                    const params = [
                        `?appid=${targetAppId}`,
                        `redirect_uri=${redirectUri}`,
                        'response_type=code',
                        'scope=snsapi_userinfo',
                        `state=${state}`,
                    ].join('&');
                    this.response.redirect = `${authUrl}${params}#wechat_redirect`;
                } else {
                    // 浏览器中使用开放平台扫码登录
                    if (!config.openAppId) {
                        throw new Error('未配置微信开放平台AppID，无法使用扫码登录功能');
                    }
                    const authUrl = 'https://open.weixin.qq.com/connect/qrconnect';
                    const params = [
                        `?appid=${config.openAppId}`,
                        `redirect_uri=${redirectUri}`,
                        'response_type=code',
                        'scope=snsapi_login',
                        `state=${state}`,
                    ].join('&');
                    this.response.redirect = `${authUrl}${params}#wechat_redirect`;
                }
            },
        });

        console.log('[WechatPlugin] ✓ OAuth登录已启用');
        console.log('[WechatPlugin]   - 登录入口: /oauth/wechat/login');
        console.log('[WechatPlugin]   - 回调地址: /oauth/wechat/callback');

        console.log('=====================================');
        console.log('[WechatPlugin] ✓ 微信插件加载完成');
        console.log('[WechatPlugin] 已启用功能:');
        console.log('[WechatPlugin]   1. 微信分享 (JSSDK)');
        console.log('[WechatPlugin]   2. 微信登录 (OAuth)');
        console.log('=====================================');

        ctx.i18n.load('zh', {
            'Login With Wechat': '使用微信登录',
        });
    }
}
