import { Context, Logger } from 'hydrooj';
import type { WechatService } from '../core/wechat-service';
import type { TemplateItem, TemplateMessage } from '../types/wechat';

type TemplateData = Record<string, { value: string, color?: string }>;

const logger = new Logger('wechat-template-message');

/**
 * 模板消息服务
 * 提供便捷的模板消息发送功能
 */
export class TemplateMessageService {
    private wechatService: WechatService;
    private ctx: Context;

    constructor(wechatService: WechatService, ctx: Context) {
        this.wechatService = wechatService;
        this.ctx = ctx;
    }

    private async ensureTemplateExists(templateId: string): Promise<void> {
        const cacheList = await this.wechatService.getTemplateList();
        let exists = cacheList.some((t) => t.template_id === templateId);

        if (!exists) {
            // 尝试强制刷新一次，避免缓存过期导致的误判
            const refreshed = await this.wechatService.getTemplateList(true);
            exists = refreshed.some((t) => t.template_id === templateId);
        }

        if (!exists) {
            throw new Error(`模板ID不存在或已被删除: ${templateId}`);
        }
    }

    /**
     * 发送模板消息（通过 openid）
     */
    async sendByOpenId(
        openid: string,
        templateId: string,
        data: TemplateData,
        options?: {
            url?: string;
            miniprogram?: { appid: string, pagepath: string };
        },
    ): Promise<number> {
        await this.ensureTemplateExists(templateId);

        const message: TemplateMessage = {
            touser: openid,
            template_id: templateId,
            data,
            ...options,
        };

        return this.wechatService.sendTemplateMessage(message);
    }

    /**
     * 发送模板消息（通过用户ID，需要先获取 openid）
     */
    async sendByUserId(
        uid: number,
        templateId: string,
        data: TemplateData,
        options?: {
            url?: string;
            miniprogram?: { appid: string, pagepath: string };
        },
    ): Promise<number | null> {
        // 从 OAuth 绑定中获取 openid
        const oauthData = await this.ctx.oauth.get('wechat', String(uid));
        if (!oauthData) {
            logger.warn(`[TemplateMessageService] 用户 ${uid} 未绑定微信账号`);
            return null;
        }

        // oauthData 可能是 openid 字符串，也可能是包含 openid 的对象
        let openid: string | undefined;
        if (typeof oauthData === 'string') {
            openid = oauthData;
        } else if (oauthData && typeof oauthData === 'object' && 'openid' in oauthData) {
            openid = (oauthData as { openid?: string }).openid;
        }

        if (!openid) {
            logger.warn(`[TemplateMessageService] 用户 ${uid} 的微信绑定数据无效`);
            return null;
        }

        return this.sendByOpenId(openid, templateId, data, options);
    }

    /**
     * 批量发送模板消息
     */
    async sendBatch(
        openids: string[],
        templateId: string,
        data: TemplateData,
        options?: {
            url?: string;
            miniprogram?: { appid: string, pagepath: string };
        },
    ): Promise<Array<{ openid: string, success: boolean, msgid?: number, error?: string }>> {
        const results = await Promise.allSettled(
            openids.map((openid) =>
                this.sendByOpenId(openid, templateId, data, options).then(
                    (msgid) => ({ openid, success: true, msgid }),
                    (error) => ({ openid, success: false, error: error.message }),
                ),
            ),
        );

        return results.map((result, index) =>
            result.status === 'fulfilled'
                ? result.value
                : { openid: openids[index], success: false, error: String(result.reason) },
        );
    }

    /**
     * 获取模板列表
     */
    async getTemplateList(): Promise<TemplateItem[]> {
        return this.wechatService.getTemplateList();
    }

    /**
     * 删除模板
     */
    async deleteTemplate(templateId: string): Promise<void> {
        return this.wechatService.deleteTemplate(templateId);
    }
}
