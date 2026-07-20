import { Handler, Logger } from 'hydrooj';
import type { WechatService } from '../core/wechat-service';

const logger = new Logger('wechat-share-handler');

export interface ShareConfig {
    title?: string;
    desc?: string;
    link?: string;
    imgUrl?: string;
    hideMenuItems?: string[];
    showMenuItems?: string[];
}

export class WechatShareHandler extends Handler {
    allowCors = true;
    private allowedDomains: string[] = [];

    async _prepare() {
        const wechatService = this.ctx.wechatService;
        if (wechatService) {
            this.allowedDomains = wechatService.getAllowedDomains();
        }
    }

    /**
     * 设置 CORS 响应头（统一入口）
     */
    private applyCorsHeaders(): void {
        const origin = this.getAllowedOrigin();
        if (origin) {
            this.response.addHeader('Access-Control-Allow-Origin', origin);
            this.response.addHeader('Access-Control-Allow-Credentials', 'true');
        }
        this.response.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        this.response.addHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
        this.applyCorsHeaders();
        this.response.status = 200;
        this.response.body = {};
    }

    async get(args: any) {
        this.applyCorsHeaders();

        try {
            const url = args.url as string;
            const shareConfig: ShareConfig = args.share ? JSON.parse(args.share) : {};

            if (!url) {
                throw new Error('缺少url参数');
            }

            const wechatService = this.ctx.wechatService;
            if (!wechatService) {
                throw new Error('微信服务未初始化');
            }

            if (!wechatService.validateDomain(url)) {
                logger.warn(`[WechatShareHandler] 域名未授权: ${url}`);
                throw new Error('域名未授权');
            }

            const jssdkConfig = await wechatService.getJSSDKConfig(url);

            this.response.body = {
                success: true,
                data: {
                    jssdkConfig,
                    shareConfig: {
                        title: shareConfig.title || '',
                        desc: shareConfig.desc || '',
                        link: shareConfig.link || url,
                        imgUrl: shareConfig.imgUrl || '',
                    },
                    menuConfig: {
                        hideMenuItems: shareConfig.hideMenuItems || [
                            'menuItem:copyUrl',
                            'menuItem:openWithQQBrowser',
                            'menuItem:openWithSafari',
                        ],
                        showMenuItems: shareConfig.showMenuItems || [
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
