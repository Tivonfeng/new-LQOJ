import * as path from 'path';
import {
    Context,
    ForbiddenError,
    Handler,
    Logger,
    PRIV,
    Schema,
    Service,
    SystemModel,
    Time,
    TokenModel,
    ValidationError,
} from 'hydrooj';
import { WechatService } from './src/core/wechat-service';
import { WechatShareHandler } from './src/handlers/share-handler';
import {
    WechatTemplateDeleteHandler,
    WechatTemplateHandler,
} from './src/handlers/template-handler';
import { WechatTemplateTestHandler } from './src/handlers/template-test-handler';
import { WechatApiLimiter } from './src/services/api-limiter';
import { TemplateMessageService } from './src/services/template-message-service';
import { TokenCacheService } from './src/services/token-cache';
import type { WechatConfig } from './src/types/wechat';

const logger = new Logger('wechat-plugin');

// 声明数据库集合类型
declare module 'hydrooj' {
    interface Collections {
        'wechat.tokens': import('./src/types/wechat').WechatTokenDoc;
        'wechat.oauth_tokens': import('./src/types/wechat').WechatOAuthTokenDoc;
        'wechat.api_calls': import('./src/types/wechat').WechatApiCallDoc;
    }
}

export default class WechatPlugin extends Service {
    static inject = ['oauth'];
    static Config = Schema.object({
        // 公众号配置（用于微信内授权和分享功能）
        appId: Schema.string().description('微信公众号 AppID (用于分享功能，必需)').default('wx8f8d991dfd127dca'),
        appSecret: Schema.string().description('微信公众号 AppSecret').role('secret').default('05068710fde31b2e914dceb3f45a8aa1'),
        // 开放平台配置（用于网页扫码登录，可选，配置后可同时支持微信内和浏览器登录）
        openAppId: Schema.string().description('微信开放平台 AppID (可选，用于扫码登录)').default('wxb2ae929b4383b073'),
        openAppSecret: Schema.string().description('微信开放平台 AppSecret').role('secret').default('607ac168edfd1c3b1f1a0774294d3a46'),
        useOpenPlatformForOAuth: Schema.boolean().description('优先使用开放平台进行OAuth登录').default(false),
        // 通用配置
        domains: Schema.array(Schema.string()).description('授权域名列表').default(['yz.lqcode.fun', 'noj.lqcode.fun']),
        canRegister: Schema.boolean().description('是否允许通过微信注册新账号（false=仅允许绑定现有账号）').default(false),
    });

    wechatService: WechatService;

    constructor(ctx: Context, config: ReturnType<typeof WechatPlugin.Config>) {
        super(ctx, 'wechat');

        // 保护 AppSecret，不在日志中完整输出
        const maskSecret = (secret: string) => secret ? `${secret.substring(0, 4)}****${secret.substring(secret.length - 4)}` : '(未配置)';

        logger.info('=====================================');
        logger.info('[WechatPlugin] 初始化微信插件 (分享+登录)');
        logger.info('[WechatPlugin] 配置信息:');
        logger.info(`[WechatPlugin]   公众号 AppID: ${config.appId}`);
        logger.info(`[WechatPlugin]   公众号 AppSecret: ${maskSecret(config.appSecret)}`);
        logger.info(`[WechatPlugin]   开放平台 AppID: ${config.openAppId || '(未配置)'}`);
        logger.info(`[WechatPlugin]   开放平台 AppSecret: ${maskSecret(config.openAppSecret)}`);
        logger.info(`[WechatPlugin]   OAuth优先使用: ${config.useOpenPlatformForOAuth ? '开放平台' : '公众号'}`);
        logger.info(`[WechatPlugin]   授权域名: ${config.domains.join(', ')}`);
        logger.info('=====================================');

        // 创建微信配置
        const WECHAT_CONFIG: WechatConfig = {
            appId: config.appId,
            appSecret: config.appSecret,
            domain: config.domains[0], // 使用第一个域名作为主域名
            domains: config.domains, // 传递所有域名
        };

        // 创建共享的微信服务实例（传入 ctx 以启用持久化缓存和接口限制）
        this.wechatService = new WechatService(WECHAT_CONFIG, ctx);

        // 将微信服务和模板消息服务注入到 context 中
        ctx.provide('wechatService');
        (ctx as any).wechatService = this.wechatService;

        const templateMessageService = new TemplateMessageService(this.wechatService, ctx);
        ctx.provide('wechatTemplateMessage');
        (ctx as any).wechatTemplateMessage = templateMessageService;

        // 初始化数据库索引和定时任务
        this.initDatabase(ctx);
        this.initScheduledTasks(ctx);

        // ========== 功能1: 微信分享功能 ==========
        logger.info('[WechatPlugin] 正在注册分享功能...');

        // 注册分享路由
        ctx.Route('wechat_share', '/wechat/share', WechatShareHandler);
        logger.info('[WechatPlugin] ✓ 分享功能已启用 - 路由: /wechat/share');

        // 注册模板消息路由
        ctx.Route('wechat_template', '/wechat/template/list', WechatTemplateHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('wechat_template_send', '/wechat/template/send', WechatTemplateHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('wechat_template_delete', '/wechat/template/delete', WechatTemplateDeleteHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('wechat_template_test', '/wechat/template/test', WechatTemplateTestHandler, PRIV.PRIV_EDIT_SYSTEM);
        logger.info('[WechatPlugin] ✓ 模板消息功能已启用');
        logger.info('[WechatPlugin] ✓ 模板消息测试页面: /wechat/template/test');

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
                    logger.error('[WechatPlugin] 读取验证文件失败:', error);
                }
            }
            await next();
        });
        logger.info('[WechatPlugin] ✓ 微信验证文件路由已注册');

        // ========== 功能2: 微信 OAuth 登录功能 ==========
        logger.info('[WechatPlugin] 正在注册OAuth登录功能...');

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
            openWechatService = new WechatService(openConfig, ctx);
            logger.info('[WechatPlugin] ✓ 开放平台 WechatService 已创建', {
                appId: config.openAppId,
                domain: config.domains[0],
            });
        } else {
            logger.warn('[WechatPlugin] ⚠ 开放平台未配置，PC端扫码登录将不可用', {
                hasOpenAppId: !!config.openAppId,
                hasOpenAppSecret: !!config.openAppSecret,
            });
        }

        ctx.oauth.provide('wechat', {
            text: 'Login with Wechat',
            name: 'Wechat',
            canRegister: config.canRegister,
            callback: async function callback(this: Handler, { state, code }) {
                const s = await TokenModel.get(state, TokenModel.TYPE_OAUTH);
                if (!s) throw new ValidationError('token');

                const isBinding = this.session.oauthBind === 'wechat';

                // 根据 state token 中保存的平台信息选择正确的 service
                const platform = (s as any).platform || 'mp';
                const useOpenPlatform = platform === 'open' && openWechatService;

                if (platform === 'open' && !openWechatService) {
                    logger.error('[WechatPlugin] PC端扫码登录需要开放平台service，但未创建');
                    throw new Error('开放平台服务未初始化，无法处理PC端扫码登录');
                }

                const primaryService = useOpenPlatform ? openWechatService! : wechatService;
                const fallbackService = primaryService === openWechatService
                    ? wechatService
                    : openWechatService;

                let tokenData;
                let userInfo;
                try {
                    tokenData = await primaryService.getOAuthAccessToken(code);
                    userInfo = await primaryService.getUserInfo(tokenData.access_token, tokenData.openid);
                } catch (error) {
                    if (fallbackService) {
                        logger.warn(`[WechatPlugin] 主配置失败，尝试备用配置: ${error instanceof Error ? error.message : String(error)}`);
                        tokenData = await fallbackService.getOAuthAccessToken(code);
                        userInfo = await fallbackService.getUserInfo(tokenData.access_token, tokenData.openid);
                    } else {
                        throw error;
                    }
                }

                await TokenModel.del(s._id, TokenModel.TYPE_OAUTH);

                // 优先使用 unionid（跨平台统一），如果没有则使用 openid
                const unionid = tokenData.unionid || userInfo.unionid;
                const openid = tokenData.openid || userInfo.openid;

                // 同时尝试用 unionid 和 openid 查找绑定账号
                let existingUid: number | null = null;
                if (unionid) {
                    existingUid = await ctx.oauth.get('wechat', unionid);
                }
                if (!existingUid && openid) {
                    existingUid = await ctx.oauth.get('wechat', openid);
                    // 如果找到绑定账号使用的是 openid，但 unionid 存在，则更新绑定记录为 unionid
                    if (existingUid && unionid) {
                        await ctx.db.collection('oauth').deleteOne({ platform: 'wechat', id: openid });
                        await ctx.oauth.set('wechat', unionid, existingUid);
                    }
                }

                const userId = unionid || openid;
                const email = userInfo.email || `${userId}@wechat.oauth`;
                const existingUidByEmail = await ctx.oauth.get('mail', email);

                if (!isBinding && !existingUid && !existingUidByEmail && !config.canRegister) {
                    throw new ForbiddenError(
                        '微信账号未绑定',
                        '您的微信账号尚未绑定到任何账号。请先使用其他方式登录，然后在"账号设置 → 安全设置"中绑定微信账号。',
                    );
                }

                // 统一返回 unionid（如果存在），因为 unionid 是跨平台统一的
                return {
                    _id: unionid || openid,
                    email,
                    uname: [userInfo.nickname].filter((i) => i),
                    avatar: userInfo.headimgurl,
                };
            },
            get: async function get(this: Handler) {
                // 获取服务器 URL 并规范化
                let baseUrl = SystemModel.get('server.url') || '';

                // 如果 server.url 是相对路径，从请求或配置中获取完整 URL
                if (!baseUrl || baseUrl === '/' || !baseUrl.startsWith('http')) {
                    const forwardedProto = this.request.headers['x-forwarded-proto'];
                    const protocol = (forwardedProto === 'https' || this.request.headers['x-forwarded-ssl'] === 'on')
                        ? 'https'
                        : 'https';

                    const currentHost = (this.request.host || this.request.headers.host || '').split(':')[0];
                    const cleanDomains = (config.domains || []).map((d: string) => d.replace(/^https?:\/\//, ''));

                    let selectedDomain = currentHost;
                    if (cleanDomains.length > 0) {
                        const isCurrentHostInConfig = cleanDomains.some((d: string) =>
                            currentHost === d || currentHost.endsWith(`.${d}`),
                        );

                        if (isCurrentHostInConfig) {
                            selectedDomain = cleanDomains.find((d: string) =>
                                currentHost === d || currentHost.endsWith(`.${d}`),
                            ) || currentHost;
                        } else {
                            selectedDomain = cleanDomains.find((d: string) => d.includes('noj.lqcode.fun'))
                                || cleanDomains[0];
                        }
                    }

                    baseUrl = `${protocol}://${selectedDomain}`;
                }

                baseUrl = baseUrl.replace(/\/+$/, '');
                if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
                    baseUrl = `https://${baseUrl}`;
                }

                const redirectUri = `${baseUrl}/oauth/wechat/callback`;
                const encodedRedirectUri = encodeURIComponent(redirectUri);

                const userAgent = this.request.headers['user-agent'] || '';
                const isWechat = /MicroMessenger/i.test(userAgent);

                // 判断使用的平台：PC端必须使用开放平台，微信内根据配置决定
                let useOpenPlatformForThisRequest: boolean;
                if (!isWechat) {
                    if (!config.openAppId) {
                        throw new Error('未配置微信开放平台AppID，无法使用扫码登录功能');
                    }
                    useOpenPlatformForThisRequest = true;
                } else {
                    useOpenPlatformForThisRequest = config.useOpenPlatformForOAuth && !!config.openAppId;
                }

                // 在 state token 中保存使用的平台信息，以便回调时正确选择 service
                const [state] = await TokenModel.add(
                    TokenModel.TYPE_OAUTH, 600, {
                        redirect: this.request.referer,
                        platform: useOpenPlatformForThisRequest ? 'open' : 'mp',
                    },
                );

                if (isWechat) {
                    const targetAppId = useOpenPlatformForThisRequest ? config.openAppId! : config.appId;
                    const authUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize';
                    const params = [
                        `?appid=${targetAppId}`,
                        `redirect_uri=${encodedRedirectUri}`,
                        'response_type=code',
                        'scope=snsapi_userinfo',
                        `state=${state}`,
                    ].join('&');
                    this.response.redirect = `${authUrl}${params}#wechat_redirect`;
                } else {
                    const authUrl = 'https://open.weixin.qq.com/connect/qrconnect';
                    const params = [
                        `?appid=${config.openAppId}`,
                        `redirect_uri=${encodedRedirectUri}`,
                        'response_type=code',
                        'scope=snsapi_login',
                        `state=${state}`,
                    ].join('&');
                    this.response.redirect = `${authUrl}${params}#wechat_redirect`;
                }
            },
        });

        logger.info('[WechatPlugin] ✓ OAuth登录已启用');
        logger.info('[WechatPlugin]   - 登录入口: /oauth/wechat/login');
        logger.info('[WechatPlugin]   - 回调地址: /oauth/wechat/callback');

        logger.info('=====================================');
        logger.info('[WechatPlugin] ✓ 微信插件加载完成');
        logger.info('[WechatPlugin] 已启用功能:');
        logger.info('[WechatPlugin]   1. 微信分享 (JSSDK)');
        logger.info('[WechatPlugin]   2. 微信登录 (OAuth)');
        logger.info('[WechatPlugin]   3. 模板消息');
        logger.info('[WechatPlugin]   4. Token持久化缓存');
        logger.info('[WechatPlugin]   5. 接口调用额度管理');
        logger.info('[WechatPlugin]   6. OAuth Token自动刷新');
        logger.info('=====================================');

        ctx.i18n.load('zh', {
            'Login With Wechat': '使用微信登录',
        });
    }

    /**
     * 初始化数据库索引
     */
    private async initDatabase(ctx: Context): Promise<void> {
        await ctx.db.ensureIndexes(
            ctx.db.collection('wechat.tokens' as any),
            { key: { appId: 1, type: 1 }, name: 'appId_type' },
            { key: { expiresAt: 1 }, name: 'expiresAt', expireAfterSeconds: 0 },
        );

        await ctx.db.ensureIndexes(
            ctx.db.collection('wechat.oauth_tokens' as any),
            { key: { openid: 1 }, name: 'openid', unique: true },
            { key: { unionid: 1 }, name: 'unionid', sparse: true },
            { key: { expiresAt: 1 }, name: 'expiresAt', expireAfterSeconds: 0 },
        );

        await ctx.db.ensureIndexes(
            ctx.db.collection('wechat.api_calls' as any),
            { key: { appId: 1, apiName: 1, date: 1 }, name: 'appId_apiName_date', unique: true },
            { key: { date: 1 }, name: 'date' },
        );

        logger.info('[WechatPlugin] ✓ 数据库索引已创建');
    }

    /**
     * 初始化定时任务
     */
    private initScheduledTasks(ctx: Context): void {
        // 每小时清理过期的 Token
        ctx.interval(async () => {
            const tokenCacheService = new TokenCacheService(ctx);
            await tokenCacheService.cleanExpiredTokens();
            logger.debug('[WechatPlugin] 已清理过期Token');
        }, Time.hour);

        // 每天清理旧的接口调用记录（保留30天）
        ctx.interval(async () => {
            const apiLimiter = new WechatApiLimiter(ctx);
            await apiLimiter.cleanOldRecords();
            logger.debug('[WechatPlugin] 已清理旧的接口调用记录');
        }, Time.day);

        logger.info('[WechatPlugin] ✓ 定时任务已注册');
    }
}
