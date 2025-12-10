import { Context, Logger } from 'hydrooj';
import type { WechatService } from '../core/wechat-service';
import type { TemplateMessage, TemplateItem } from '../types/wechat';

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

    /**
     * 发送模板消息（通过 openid）
     */
    async sendByOpenId(openid: string, templateId: string, data: Record<string, { value: string; color?: string }>, options?: {
        url?: string;
        miniprogram?: { appid: string; pagepath: string };
    }): Promise<number> {
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
    async sendByUserId(uid: number, templateId: string, data: Record<string, { value: string; color?: string }>, options?: {
        url?: string;
        miniprogram?: { appid: string; pagepath: string };
    }): Promise<number | null> {
        // 从 OAuth 绑定中获取 openid
        const oauthData = await this.ctx.oauth.get('wechat', uid);
        if (!oauthData) {
            logger.warn(`[TemplateMessageService] 用户 ${uid} 未绑定微信账号`);
            return null;
        }

        // oauthData 可能是 openid 字符串，也可能是包含 openid 的对象
        const openid = typeof oauthData === 'string' ? oauthData : oauthData.openid;
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
        data: Record<string, { value: string; color?: string }>,
        options?: {
            url?: string;
            miniprogram?: { appid: string; pagepath: string };
        },
    ): Promise<Array<{ openid: string; success: boolean; msgid?: number; error?: string }>> {
        const results = await Promise.allSettled(
            openids.map((openid) =>
                this.sendByOpenId(openid, templateId, data, options).then(
                    (msgid) => ({ openid, success: true, msgid }),
                    (error) => ({ openid, success: false, error: error.message }),
                ),
            ),
        );

        return results.map((result) =>
            result.status === 'fulfilled' ? result.value : { openid: '', success: false, error: result.reason },
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

