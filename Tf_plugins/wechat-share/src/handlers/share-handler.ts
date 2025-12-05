import { Handler } from 'hydrooj';
import type { WechatService } from '../core/wechat-service';

export class WechatShareHandler extends Handler {
    wechatService: WechatService;
    allowCors = true;

    async _prepare() {
        // Get wechatService from context
        this.wechatService = (this.ctx as any).wechatService;
    }

    async options() {
        // 设置CORS头部
        this.response.addHeader('Access-Control-Allow-Origin', '*');
        this.response.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        this.response.addHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        this.response.status = 200;
        this.response.body = {};
    }

    async get(args: any) {
        // 设置CORS头部
        this.response.addHeader('Access-Control-Allow-Origin', '*');
        this.response.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        this.response.addHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
