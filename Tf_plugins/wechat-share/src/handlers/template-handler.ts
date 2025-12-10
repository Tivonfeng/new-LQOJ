import { Handler, Logger, PRIV } from 'hydrooj';
import type { WechatService } from '../core/wechat-service';
import type { TemplateMessageService } from '../services/template-message-service';

const logger = new Logger('wechat-template-handler');

/**
 * 模板消息管理 Handler
 * 提供模板消息的发送和管理功能
 */
export class WechatTemplateHandler extends Handler {
    wechatService: WechatService;
    templateService: TemplateMessageService;

    async _prepare() {
        this.wechatService = (this.ctx as any).wechatService;
        this.templateService = (this.ctx as any).wechatTemplateMessage;
    }

    /**
     * 发送模板消息
     * POST /wechat/template/send
     * Body: {
     *   openid: string,
     *   templateId: string,
     *   data: Record<string, { value: string; color?: string }>,
     *   url?: string,
     *   miniprogram?: { appid: string; pagepath: string }
     * }
     */
    async post() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        const { openid, templateId, data, url, miniprogram } = this.request.body;

        if (!openid || !templateId || !data) {
            this.response.status = 400;
            this.response.body = { success: false, error: '缺少必需参数: openid, templateId, data' };
            return;
        }

        try {
            const msgid = await this.templateService.sendByOpenId(openid, templateId, data, { url, miniprogram });
            this.response.body = { success: true, msgid };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatTemplateHandler] 发送模板消息失败: ${message}`);
            this.response.status = 500;
            this.response.body = { success: false, error: message };
        }
    }

    /**
     * 获取模板列表
     * GET /wechat/template/list
     */
    async get() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        try {
            const templates = await this.templateService.getTemplateList();
            this.response.body = { success: true, templates };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatTemplateHandler] 获取模板列表失败: ${message}`);
            this.response.status = 500;
            this.response.body = { success: false, error: message };
        }
    }
}

/**
 * 删除模板 Handler
 */
export class WechatTemplateDeleteHandler extends Handler {
    wechatService: WechatService;
    templateService: TemplateMessageService;

    async _prepare() {
        this.wechatService = (this.ctx as any).wechatService;
        this.templateService = (this.ctx as any).wechatTemplateMessage;
    }

    /**
     * 删除模板
     * POST /wechat/template/delete
     * Body: { templateId: string }
     */
    async post() {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        const { templateId } = this.request.body;

        if (!templateId) {
            this.response.status = 400;
            this.response.body = { success: false, error: '缺少必需参数: templateId' };
            return;
        }

        try {
            await this.templateService.deleteTemplate(templateId);
            this.response.body = { success: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[WechatTemplateHandler] 删除模板失败: ${message}`);
            this.response.status = 500;
            this.response.body = { success: false, error: message };
        }
    }
}
