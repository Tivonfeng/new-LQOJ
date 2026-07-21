import * as path from 'path';
import { pathExists, readFile } from 'fs-extra';
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
import { WechatStaticHandler } from './src/handlers/static-handler';
import {
    CommunityToolkitHandler,
    CommunityToolkitCourseDataHandler,
    CommunityToolkitFileHandler,
    CommunityToolkitImageHandler,
} from './src/handlers/community-toolkit-handler';
import { SopHomeHandler, SalesSopHandler, SopCourseHandler, SalesSopDataHandler } from './src/handlers/sop-handler';
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
    static inject = ['oauth', 'db'];
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

    private wechatService: WechatService;
    private openWechatService: WechatService | null = null;
    private tokenCacheService: TokenCacheService;
    private apiLimiter: WechatApiLimiter;

    constructor(ctx: Context, config: ReturnType<typeof WechatPlugin.Config>) {
        super(ctx, 'wechat');

        // 保护 AppSecret，不在日志中完整输出
        const maskSecret = (secret: string) => secret ? `${secret.substring(0, 4)}****${secret.substring(secret.length - 4)}` : '(未配置)';

        logger.info('[WechatPlugin] 初始化微信插件 (分享+登录+模板消息)');
        logger.info(`[WechatPlugin] 公众号 AppID: ${config.appId}, AppSecret: ${maskSecret(config.appSecret)}`);
        logger.info(`[WechatPlugin] 开放平台 AppID: ${config.openAppId || '(未配置)'}, AppSecret: ${maskSecret(config.openAppSecret)}`);
        logger.info(`[WechatPlugin] OAuth优先使用: ${config.useOpenPlatformForOAuth ? '开放平台' : '公众号'}, 授权域名: ${config.domains.join(', ')}`);

        // 创建微信配置
        const WECHAT_CONFIG: WechatConfig = {
            appId: config.appId,
            appSecret: config.appSecret,
            domain: config.domains[0],
            domains: config.domains,
        };

        // 创建共享的微信服务实例（继承 Service，super() 已自动注册到 ctx）
        this.wechatService = new WechatService(ctx, WECHAT_CONFIG);
        this.tokenCacheService = new TokenCacheService(ctx);
        this.apiLimiter = new WechatApiLimiter(ctx);

        // 创建模板消息服务（继承 Service，自动注册到 ctx）
        new TemplateMessageService(ctx, this.wechatService);

        // 创建开放平台的 WechatService（如果配置了）
        if (config.openAppId && config.openAppSecret) {
            const openConfig: WechatConfig = {
                appId: config.openAppId,
                appSecret: config.openAppSecret,
                domain: config.domains[0],
                domains: config.domains,
            };
            this.openWechatService = new WechatService(ctx, openConfig, 'openWechatService');
            logger.info('[WechatPlugin] 开放平台 WechatService 已创建');
        } else {
            logger.warn('[WechatPlugin] 开放平台未配置，PC端扫码登录将不可用');
        }

        // 初始化数据库索引和定时任务
        this.initDatabase(ctx);
        this.initScheduledTasks(ctx);

        // ========== 功能1: 微信分享功能 ==========
        ctx.Route('wechat_share', '/wechat/share', WechatShareHandler);
        logger.info('[WechatPlugin] 分享功能已启用 - 路由: /wechat/share');

        // 注册模板消息路由
        ctx.Route('wechat_template', '/wechat/template/list', WechatTemplateHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('wechat_template_send', '/wechat/template/send', WechatTemplateHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('wechat_template_delete', '/wechat/template/delete', WechatTemplateDeleteHandler, PRIV.PRIV_EDIT_SYSTEM);
        ctx.Route('wechat_template_test', '/wechat/template/test', WechatTemplateTestHandler, PRIV.PRIV_EDIT_SYSTEM);
        logger.info('[WechatPlugin] 模板消息功能已启用, 测试页面: /wechat/template/test');

        // 注册公开静态资源路由
        ctx.Route('wechat_static', '/wechat/static/:filename', WechatStaticHandler);
        logger.info('[WechatPlugin] 静态资源路由已注册: /wechat/static/:filename');

        // 注册社区工具包 H5 路由
        ctx.Route('community_toolkit', '/community-toolkit', CommunityToolkitHandler);
        ctx.Route('community_toolkit_course_data', '/community-toolkit/courses/:filename', CommunityToolkitCourseDataHandler);
        ctx.Route('community_toolkit_files', '/community-toolkit/files/:filename', CommunityToolkitFileHandler);
        ctx.Route('community_toolkit_images', '/community-toolkit/images/:filename', CommunityToolkitImageHandler);
        logger.info('[WechatPlugin] 社区工具包已启用 - 路由: /community-toolkit');

        // 注册 SOP 路由
        ctx.Route('sop_home', '/sop', SopHomeHandler);
        ctx.Route('sales_sop', '/sop/experience', SalesSopHandler);
        ctx.Route('sop_course', '/sop/course', SopCourseHandler);
        ctx.Route('sales_sop_data', '/sop/data/:filename', SalesSopDataHandler);
        ctx.Route('sales_sop_images', '/sop/images/:filename', SalesSopDataHandler);
        logger.info('[WechatPlugin] SOP已启用 - 首页: /sop, 体验课: /sop/experience, 课程: /sop/course');

        // 注册微信验证文件路由
        this.initVerifyFileRoute(ctx);
        logger.info('[WechatPlugin] 微信验证文件路由已注册');

        // ========== 功能2: 微信 OAuth 登录功能 ==========
        this.initOAuth(ctx, config);
        logger.info('[WechatPlugin] OAuth登录已启用 - 入口: /oauth/wechat/login, 回调: /oauth/wechat/callback');
        logger.info('[WechatPlugin] 微信插件加载完成 (分享 + OAuth + 模板消息 + Token缓存 + 额度管理)');

        ctx.i18n.load('zh', {
            'Login With Wechat': '使用微信登录',
            'community_toolkit': 'B端合作平台',
            'sop_home': '运营SOP',
            'sales_sop': '体验课群运营SOP',
            'sop_course': '课程课后反馈SOP',
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

        logger.info('[WechatPlugin] 数据库索引已创建');
    }

    /**
     * 初始化定时任务
     */
    private initScheduledTasks(ctx: Context): void {
        // 每小时清理过期的 Token
        ctx.interval(async () => {
            await this.tokenCacheService.cleanExpiredTokens();
        }, Time.hour);

        // 每天清理旧的接口调用记录（保留30天）
        ctx.interval(async () => {
            await this.apiLimiter.cleanOldRecords();
        }, Time.day);

        logger.info('[WechatPlugin] 定时任务已注册');
    }

    /**
     * 注册微信验证文件路由（静态文件拦截）
     */
    private initVerifyFileRoute(ctx: Context): void {
        const publicDir = path.join(__dirname, 'public');
        ctx.server.server.use(async (koaCtx, next) => {
            if (koaCtx.path.startsWith('/MP_verify_') || koaCtx.path.startsWith('/UJq6')) {
                const filename = koaCtx.path.substring(1);
                const filePath = path.join(publicDir, filename);
                try {
                    if (await pathExists(filePath)) {
                        koaCtx.type = 'text/plain';
                        koaCtx.body = await readFile(filePath, 'utf-8');
                        return;
                    }
                } catch (error) {
                    logger.error('[WechatPlugin] 读取验证文件失败:', error);
                }
            }
            await next();
        });
    }

    /**
     * 初始化 OAuth 登录
     */
    private initOAuth(ctx: Context, config: ReturnType<typeof WechatPlugin.Config>): void {
        const wechatService = this.wechatService;
        const openWechatService = this.openWechatService;

        ctx.oauth.provide('wechat', {
            text: 'Login by Wechat',
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
                        '您的微信账号尚未绑定到任何账号。请先使用其他方式登录，然后在"账号设置 -> 安全设置"中绑定微信账号。',
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

                // 如果 server.url 是相对路径，从请求中获取完整 URL
                if (!baseUrl || baseUrl === '/' || !baseUrl.startsWith('http')) {
                    const forwardedProto = this.request.headers['x-forwarded-proto'];
                    const protocol = (forwardedProto === 'https' || this.request.headers['x-forwarded-ssl'] === 'on')
                        ? 'https'
                        : 'http';

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
    }
}
