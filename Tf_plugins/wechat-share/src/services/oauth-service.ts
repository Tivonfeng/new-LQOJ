/* eslint-disable max-len */
import type { Context, Handler, OAuthProvider, OAuthUserResponse } from 'hydrooj';
import {
    SystemModel,
    TokenModel,
    UserFacingError,
    ValidationError,
} from 'hydrooj';
import type { WechatService } from '../core/wechat-service';
import type { WechatConfig } from '../types/wechat';

// 微信图标 SVG
const wechatIcon = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
<path d="M664.250054 368.541681c10.015098 0 19.892049 0.732687 29.67281 1.795902-26.647917-122.810047-159.358451-214.077703-310.826188-214.077703-169.353083 0-308.085774 114.232694-308.085774 259.274068 0 83.708494 46.165436 152.460344 123.281791 205.78483l-30.80868 91.730191 107.688651-53.455469c38.558178 7.53665 69.459978 15.308661 107.924012 15.308661 9.66308 0 19.230993-0.470721 28.752858-1.225921-6.025227-20.36584-9.521864-41.723264-9.521864-63.862493C402.328693 476.632491 517.908058 368.541681 664.250054 368.541681zM498.62897 285.87389c23.200398 0 38.557154 15.120372 38.557154 38.061874 0 22.846334-15.356756 38.156018-38.557154 38.156018-23.107277 0-46.260603-15.309684-46.260603-38.156018C452.368366 300.994262 475.522716 285.87389 498.62897 285.87389zM283.016307 362.090758c-23.107277 0-46.402843-15.309684-46.402843-38.156018 0-22.941502 23.295566-38.061874 46.402843-38.061874 23.081695 0 38.46301 15.120372 38.46301 38.061874C321.479317 346.782098 306.098002 362.090758 283.016307 362.090758zM945.448458 606.151333c0-121.888048-123.258255-221.236753-261.683954-221.236753-146.57838 0-262.015505 99.348706-262.015505 221.236753 0 122.06508 115.437126 221.200938 262.015505 221.200938 30.66644 0 61.617359-7.609305 92.423993-15.262612l84.513836 45.786813-23.178909-76.17082C899.379213 735.776599 945.448458 674.90216 945.448458 606.151333zM598.803483 567.994292c-15.332197 0-30.807656-15.096836-30.807656-30.501688 0-15.190981 15.47546-30.477129 30.807656-30.477129 23.295566 0 38.558178 15.286148 38.558178 30.477129C637.361661 552.897456 622.099049 567.994292 598.803483 567.994292zM768.25071 567.994292c-15.213493 0-30.594809-15.096836-30.594809-30.501688 0-15.190981 15.381315-30.477129 30.594809-30.477129 23.107277 0 38.558178 15.286148 38.558178 30.477129C806.808888 552.897456 791.357987 567.994292 768.25071 567.994292z" fill="#00C800"/>
</svg>`;

/**
 * 创建微信 OAuth Provider
 */
export function createWechatOAuthProvider(
    ctx: Context,
    wechatService: WechatService,
    config: WechatConfig,
): OAuthProvider {
    return {
        name: 'WeChat',
        text: 'Login with WeChat',
        icon: wechatIcon,
        canRegister: true,
        lockUsername: false, // 允许用户修改微信昵称

        /**
         * OAuth 第一步: 生成微信授权链接
         */
        async get(this: Handler) {
            console.log('[WechatOAuth] 开始OAuth登录流程');

            try {
                // 生成 state token (10分钟有效期)
                const [state] = await TokenModel.add(
                    TokenModel.TYPE_OAUTH,
                    600,
                    { redirect: this.request.referer || '/' },
                );

                console.log('[WechatOAuth] 生成state token:', state);

                // 获取服务器URL
                const serverUrl = SystemModel.get('server.url');
                const redirectUri = encodeURIComponent(`${serverUrl}oauth/wechat/callback`);

                console.log('[WechatOAuth] 回调地址:', redirectUri);

                // 选择授权方式
                // snsapi_userinfo: 需要用户同意,可获取用户详细信息
                // snsapi_base: 静默授权,仅获取openid
                const scope = 'snsapi_userinfo';

                // 检查是否为微信浏览器
                const userAgent = this.request.headers['user-agent'] || '';
                const isWechat = wechatService.isWechatBrowser(userAgent);

                console.log('[WechatOAuth] 是否微信浏览器:', isWechat);

                // 生成授权链接
                const authUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize?'
                    + `appid=${config.appId}`
                    + `&redirect_uri=${redirectUri}`
                    + '&response_type=code'
                    + `&scope=${scope}`
                    + `&state=${state}#wechat_redirect`;

                console.log('[WechatOAuth] 授权链接:', authUrl);

                // 重定向到微信授权页面
                this.response.redirect = authUrl;
            } catch (error) {
                console.error('[WechatOAuth] 生成授权链接失败:', error);
                throw new UserFacingError('生成微信授权链接失败', error.message);
            }
        },

        /**
         * OAuth 第二步: 处理微信回调
         */
        async callback(this: Handler, args: Record<string, any>): Promise<OAuthUserResponse> {
            const { state, code } = args;

            console.log('[WechatOAuth] 收到回调请求');
            console.log('[WechatOAuth] state:', state);
            console.log('[WechatOAuth] code:', code ? `${code.substring(0, 10)}...` : 'undefined');

            // 1. 验证 state token
            const s = await TokenModel.get(state, TokenModel.TYPE_OAUTH);
            if (!s) {
                console.error('[WechatOAuth] state token 无效或已过期');
                throw new ValidationError('token', '登录状态已过期，请重新尝试');
            }

            console.log('[WechatOAuth] state token 验证通过');

            try {
                // 2. 用 code 换取 access_token
                console.log('[WechatOAuth] 用code换取access_token...');
                const tokenData = await wechatService.getOAuthAccessToken(code);

                console.log('[WechatOAuth] 成功获取access_token');
                console.log('[WechatOAuth] openid:', tokenData.openid);
                console.log('[WechatOAuth] unionid:', tokenData.unionid || '(未绑定开放平台)');

                // 3. 获取用户信息
                console.log('[WechatOAuth] 获取用户信息...');
                const userInfo = await wechatService.getUserInfo(
                    tokenData.access_token,
                    tokenData.openid,
                );

                console.log('[WechatOAuth] 成功获取用户信息');
                console.log('[WechatOAuth] 昵称:', userInfo.nickname);
                console.log('[WechatOAuth] 头像:', userInfo.headimgurl);

                // 4. 删除临时 state token
                await TokenModel.del(s._id, TokenModel.TYPE_OAUTH);
                console.log('[WechatOAuth] 已删除state token');

                // 5. 构建标准 OAuth 响应
                // 优先使用 unionid (如果有),否则使用 openid
                const userId = tokenData.unionid || tokenData.openid;

                // 微信不提供邮箱,使用 lqcode.fun 域名作为占位邮箱
                // 格式: wechat_{openid}@lqcode.fun
                const placeholderEmail = `wechat_${userId}@lqcode.fun`;

                const ret: OAuthUserResponse = {
                    _id: userId,
                    email: placeholderEmail,
                    uname: [userInfo.nickname], // Hydro 支持用户名数组,会自动选择
                    avatar: userInfo.headimgurl,
                    bio: userInfo.province && userInfo.city
                        ? `${userInfo.province} ${userInfo.city}`
                        : '',
                };

                console.log('[WechatOAuth] OAuth登录成功');
                console.log('[WechatOAuth] 用户ID:', ret._id);
                console.log('[WechatOAuth] 昵称:', ret.uname);

                return ret;
            } catch (error) {
                console.error('[WechatOAuth] OAuth回调处理失败:', error);
                throw new UserFacingError('微信登录失败', error.message);
            }
        },
    };
}
