import { Context } from 'hydrooj';
import type { JSSDKConfig } from '../types/wechat';
import type { ShareConfig } from '../handlers/share-handler';

export interface JSSDKInjectionResult {
    jssdkConfig: JSSDKConfig;
    shareConfig: Required<Pick<ShareConfig, 'title' | 'desc' | 'link' | 'imgUrl'>>;
    menuConfig: {
        hideMenuItems: string[];
        showMenuItems: string[];
    };
    /**
     * 可直接注入到 HTML 模板的 <script> 标签内容。
     * 前端需提前引入微信 JSSDK: <script src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>
     */
    initScript: string;
}

const DEFAULT_MENU_CONFIG = {
    hideMenuItems: [
        'menuItem:copyUrl',
        'menuItem:openWithQQBrowser',
        'menuItem:openWithSafari',
    ],
    showMenuItems: [
        'menuItem:share:appMessage',
        'menuItem:share:timeline',
    ],
};

/**
 * JSSDK 注入 Helper
 *
 * H5 页面 Handler 调用此函数，一行获取 JSSDK 配置 + 分享配置 + 自动初始化脚本。
 *
 * 使用示例：
 *   const result = await injectJSSDK(this.ctx, {
 *       url: this.request.href,
 *       share: { title: '活动标题', desc: '活动描述', imgUrl: 'https://...' },
 *   });
 *   this.response.body = { ...result };
 *   // 或注入到模板: this.response.body = { jssdkInitScript: result.initScript };
 */
export async function injectJSSDK(
    ctx: Context,
    options: {
        url: string;
        share?: Partial<ShareConfig>;
        menuConfig?: { hideMenuItems?: string[]; showMenuItems?: string[] };
    },
): Promise<JSSDKInjectionResult> {
    const wechatService = ctx.wechatService;
    if (!wechatService) {
        throw new Error('微信服务未初始化');
    }

    const jssdkConfig = await wechatService.getJSSDKConfig(options.url);

    const shareConfig = {
        title: options.share?.title || '',
        desc: options.share?.desc || '',
        link: options.share?.link || options.url,
        imgUrl: options.share?.imgUrl || '',
    };

    const menuConfig = {
        hideMenuItems: options.menuConfig?.hideMenuItems || DEFAULT_MENU_CONFIG.hideMenuItems,
        showMenuItems: options.menuConfig?.showMenuItems || DEFAULT_MENU_CONFIG.showMenuItems,
    };

    // 生成前端自动初始化脚本
    // 前端页面需自行引入 jweixin SDK
    const initScript = `
<script>
(function() {
    var config = ${JSON.stringify(jssdkConfig)};
    var shareData = ${JSON.stringify(shareConfig)};
    var menuConfig = ${JSON.stringify(menuConfig)};
    if (typeof wx === 'undefined') {
        console.warn('[WechatJSSDK] jweixin SDK 未加载，跳过初始化');
        return;
    }
    wx.config({
        debug: false,
        appId: config.appId,
        timestamp: config.timestamp,
        nonceStr: config.nonceStr,
        signature: config.signature,
        jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData', 'hideMenuItems', 'showMenuItems']
    });
    wx.ready(function() {
        if (shareData.title || shareData.desc) {
            wx.updateAppMessageShareData(shareData);
            wx.updateTimelineShareData({
                title: shareData.title,
                link: shareData.link,
                imgUrl: shareData.imgUrl
            });
        }
        if (menuConfig.hideMenuItems && menuConfig.hideMenuItems.length) {
            wx.hideMenuItems({ menuList: menuConfig.hideMenuItems });
        }
        if (menuConfig.showMenuItems && menuConfig.showMenuItems.length) {
            wx.showMenuItems({ menuList: menuConfig.showMenuItems });
        }
    });
    wx.error(function(res) {
        console.error('[WechatJSSDK] config 失败:', res.errMsg);
    });
})();
</script>`.trim();

    return { jssdkConfig, shareConfig, menuConfig, initScript };
}
