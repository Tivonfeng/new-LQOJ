import { Handler, Logger } from 'hydrooj';
import type { WechatService } from '../core/wechat-service';

const logger = new Logger('wechat-share-handler');

export class WechatShareHandler extends Handler {
    wechatService: WechatService;
    allowCors = true;
    private allowedDomains: string[] = [];

    async _prepare() {
        // Get wechatService from context
        this.wechatService = (this.ctx as any).wechatService;
        // 从 wechatService 获取允许的域名列表
        if (this.wechatService) {
            this.allowedDomains = this.wechatService.getAllowedDomains();
        }
    }

    /**
     * 获取允许的 Origin
     */
    private getAllowedOrigin(): string | null {
        const origin = this.request.headers.origin;
        if (!origin) return null;

        try {
            const originUrl = new URL(origin);
            const hostname = originUrl.hostname;

            // 允许本地开发环境
            const isLocalDev = !!hostname.match(/^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)$/);
            if (isLocalDev) return origin;

            // 检查是否在允许的域名列表中
            const isAllowed = this.allowedDomains.some((allowedDomain) => (
                hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`)
            ));

            return isAllowed ? origin : null;
        } catch {
            return null;
        }
    }

    async options() {
        const origin = this.getAllowedOrigin();
        if (origin) {
            this.response.addHeader('Access-Control-Allow-Origin', origin);
            this.response.addHeader('Access-Control-Allow-Credentials', 'true');
        }
        this.response.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        this.response.addHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        this.response.status = 200;
        this.response.body = {};
    }

    async get(args: any) {
        const origin = this.getAllowedOrigin();
        if (origin) {
            this.response.addHeader('Access-Control-Allow-Origin', origin);
            this.response.addHeader('Access-Control-Allow-Credentials', 'true');
        }
        this.response.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        this.response.addHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        logger.debug(`[WechatShareHandler] 收到分享配置请求: ${JSON.stringify(args)}`);
        try {
            const url = args.url as string;

            if (!url) {
                logger.error('[WechatShareHandler] 缺少url参数');
                throw new Error('缺少url参数');
            }

            if (!this.wechatService.validateDomain(url)) {
                logger.error(`[WechatShareHandler] 域名未授权: ${url}`);
                throw new Error('域名未授权');
            }

            const jssdkConfig = await this.wechatService.getJSSDKConfig(url);
            logger.info('[WechatShareHandler] 成功生成分享配置');

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
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatShareHandler] 处理请求失败: ${message}`);
            this.response.status = 400;
            this.response.body = {
                success: false,
                error: message,
            };
        }
    }
}
