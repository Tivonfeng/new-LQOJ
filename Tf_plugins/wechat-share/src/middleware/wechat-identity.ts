import { Context, Handler, Logger, SystemModel, TokenModel } from 'hydrooj';
import type { WechatService } from '../core/wechat-service';

const logger = new Logger('wechat-identity');

export interface WechatIdentity {
    openid: string;
    unionid?: string;
    nickname: string;
    avatar: string;
    uid: number | null;
}

/**
 * 微信身份识别工具
 *
 * 在微信浏览器中，通过静默 OAuth 获取用户身份。
 * 授权完成后，身份信息缓存在 session 中，后续请求直接复用。
 *
 * 使用方式（在 Handler 的 _prepare 中调用）：
 *   const identity = await resolveWechatIdentity(this.ctx, this);
 *   if (!identity) {
 *       // 非微信浏览器，或用户拒绝授权
 *   }
 */
export async function resolveWechatIdentity(
    ctx: Context,
    handler: Handler,
): Promise<WechatIdentity | null> {
    const userAgent = handler.request.headers['user-agent'] || '';
    const wechatService = ctx.wechatService;
    if (!wechatService) return null;

    // 非微信浏览器，不需要身份识别
    if (!wechatService.isWechatBrowser(userAgent)) {
        return null;
    }

    // 1. 已登录的 Hydro 用户，尝试从 oauth 绑定中查微信身份
    if (handler.user?._id) {
        const bindings = await ctx.oauth.list(handler.user._id);
        const wechatBinding = bindings.find((b) => b.platform === 'wechat');
        if (wechatBinding) {
            // 查 oauth_tokens 拿 openid 和用户信息
            const tokenDoc = await ctx.db.collection('wechat.oauth_tokens' as any).findOne({
                $or: [{ unionid: wechatBinding.id }, { openid: wechatBinding.id }],
            });
            if (tokenDoc) {
                return {
                    openid: tokenDoc.openid,
                    unionid: tokenDoc.unionid,
                    nickname: handler.user.uname || '',
                    avatar: handler.user.avatar || '',
                    uid: handler.user._id,
                };
            }
        }
    }

    // 2. 从 session 缓存中取已授权的微信身份
    const sessionIdentity = (handler.session as any).wechatIdentity;
    if (sessionIdentity) {
        return sessionIdentity as WechatIdentity;
    }

    // 3. 未授权，触发静默 OAuth 跳转
    // 构建 redirect_uri，授权后回到当前页面
    let baseUrl = SystemModel.get('server.url') || '';
    if (!baseUrl || !baseUrl.startsWith('http')) {
        const protocol = handler.request.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        baseUrl = `${protocol}://${handler.request.host}`;
    }
    baseUrl = baseUrl.replace(/\/+$/, '');

    const redirectUri = encodeURIComponent(`${baseUrl}${handler.request.originalPath}${handler.request.querystring ? '?' + handler.request.querystring : ''}`);
    const stateToken = await TokenModel.add(
        TokenModel.TYPE_OAUTH,
        600,
        {
            redirect: `${baseUrl}${handler.request.originalPath}`,
            platform: 'mp',
            silent: true,
        },
    );

    const appId = wechatService.appId;
    if (!appId) {
        logger.error('[wechat-identity] 微信 appId 未配置');
        return null;
    }

    const authUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize'
        + `?appid=${appId}`
        + `&redirect_uri=${redirectUri}`
        + '&response_type=code'
        + '&scope=snsapi_userinfo'
        + `&state=${stateToken[0]}`
        + '#wechat_redirect';

    handler.response.redirect = authUrl;
    return null;
}

/**
 * 微信 H5 Handler 基类
 *
 * 继承此类的 Handler 自动获得微信静默授权能力：
 * - 微信内浏览器自动获取用户身份（静默授权，无需用户手动点击）
 * - 非微信浏览器正常放行，wechatIdentity 为 null
 * - 已登录用户优先从 OAuth 绑定中查微信身份
 *
 * 使用方式：
 *   class MyH5PageHandler extends WechatH5Handler {
 *       async get() {
 *           const wxUser = this.wechatIdentity;
 *           // 渲染页面...
 *       }
 *   }
 */
export class WechatH5Handler extends Handler {
    noCheckPermView = true;
    wechatIdentity: WechatIdentity | null = null;

    async _prepare() {
        try {
            this.wechatIdentity = await resolveWechatIdentity(this.ctx, this);
        } catch (error) {
            logger.warn(`[WechatH5Handler] 身份识别失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
