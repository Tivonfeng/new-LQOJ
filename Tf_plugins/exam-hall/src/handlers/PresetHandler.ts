import { Handler, ObjectId, PRIV } from 'hydrooj';
import PresetService, { CertificatePreset } from '../services/PresetService';

/**
 * 预设管理处理器基类
 */
abstract class PresetHandlerBase extends Handler {
    protected checkManagePermission(): void {
        if (this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            this.response.status = 403;
            this.response.body = { success: false, error: '无权限访问此资源' };
            throw new Error('PERMISSION_DENIED');
        }
    }

    protected setJsonResponse(body: any, status = 200): void {
        this.response.type = 'application/json';
        this.response.status = status;
        this.response.body = body;
    }

    protected sendError(message: string, status = 500): void {
        this.setJsonResponse({ success: false, error: message }, status);
    }

    protected sendSuccess(data: any): void {
        this.setJsonResponse(data, 200);
    }
}

/**
 * 预设列表/创建处理器 (combined handler for GET and POST)
 * 路由: GET /exam/admin/presets (list) | POST /exam/admin/presets (create)
 */
export class PresetListHandler extends PresetHandlerBase {
    async get() {
        try {
            this.checkManagePermission();

            const type = this.request.query?.type as string | undefined;
            const enabledOnly = this.request.query?.enabledOnly === 'true';

            const presetService = new PresetService(this.ctx);
            let presets: CertificatePreset[];

            if (type && (type === 'competition' || type === 'certification')) {
                presets = await presetService.getPresetsByType(type, enabledOnly);
            } else {
                presets = await presetService.getAllPresets(enabledOnly);
            }

            this.sendSuccess({
                success: true,
                data: presets,
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            this.sendError(err.message, 500);
        }
    }

    async post() {
        try {
            this.checkManagePermission();

            const {
                type,
                name,
                certifyingBody,
                level,
                description,
                events,
            } = this.request.body;

            // 验证必填字段
            if (!type || !name || !certifyingBody || !level) {
                this.sendError('缺少必填字段', 400);
                return;
            }

            if (type !== 'competition' && type !== 'certification') {
                this.sendError('无效的预设类型', 400);
                return;
            }

            // 验证级别
            const validLevels = ['city', 'province', 'national', 'international'];
            if (!validLevels.includes(level)) {
                this.sendError('无效的级别', 400);
                return;
            }

            // 验证赛项
            if (!Array.isArray(events) || events.length === 0) {
                this.sendError('赛项不能为空', 400);
                return;
            }

            if (events.some((event: any) => !event.name || typeof event.name !== 'string')) {
                this.sendError('赛项名称无效', 400);
                return;
            }

            const presetService = new PresetService(this.ctx);
            const preset = await presetService.createPreset({
                type,
                name,
                certifyingBody,
                level,
                description,
                events,
            });

            this.sendSuccess({
                success: true,
                data: preset,
                message: '预设创建成功',
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            this.sendError(err.message, 500);
        }
    }
}

/**
 * 创建预设处理器 (alias for backwards compatibility)
 * 已合并到 PresetListHandler
 */
export class PresetCreateHandler extends PresetListHandler {}

/**
 * 预设详情/更新/删除处理器
 * 路由: /exam/admin/presets/:id
 */
export class PresetDetailHandler extends PresetHandlerBase {
    async get() {
        try {
            this.checkManagePermission();

            const id = this.request.params?.id as string;

            if (!id || !ObjectId.isValid(id)) {
                this.sendError('无效的预设ID', 400);
                return;
            }

            const presetService = new PresetService(this.ctx);
            const preset = await presetService.getPresetById(new ObjectId(id));

            if (!preset) {
                this.sendError('预设不存在', 404);
                return;
            }

            this.sendSuccess({
                success: true,
                data: preset,
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            this.sendError(err.message, 500);
        }
    }

    async put() {
        try {
            this.checkManagePermission();

            const id = this.request.params?.id as string;

            if (!id || !ObjectId.isValid(id)) {
                this.sendError('无效的预设ID', 400);
                return;
            }

            const {
                name,
                certifyingBody,
                level,
                description,
                enabled,
                events,
            } = this.request.body;

            // 验证级别（如果提供）
            if (level !== undefined) {
                const validLevels = ['city', 'province', 'national', 'international'];
                if (!validLevels.includes(level)) {
                    this.sendError('无效的级别', 400);
                    return;
                }
            }

            // 验证赛项（如果提供）
            if (events !== undefined) {
                if (!Array.isArray(events) || events.length === 0) {
                    this.sendError('赛项不能为空', 400);
                    return;
                }

                if (events.some((event: any) => !event.name || typeof event.name !== 'string')) {
                    this.sendError('赛项名称无效', 400);
                    return;
                }
            }

            // 构建更新对象，只包含提供的字段
            const updateData: any = {};
            if (name !== undefined) updateData.name = name;
            if (certifyingBody !== undefined) updateData.certifyingBody = certifyingBody;
            if (level !== undefined) updateData.level = level;
            if (description !== undefined) updateData.description = description;
            if (enabled !== undefined) updateData.enabled = enabled;
            if (events !== undefined) updateData.events = events;

            const presetService = new PresetService(this.ctx);
            const preset = await presetService.updatePreset(new ObjectId(id), updateData);

            this.sendSuccess({
                success: true,
                data: preset,
                message: '预设更新成功',
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            console.error(`[ExamHall] 预设更新失败: ${err.message}`);
            this.sendError(err.message, 500);
        }
    }

    async delete() {
        try {
            this.checkManagePermission();

            const id = this.request.params?.id as string;

            if (!id || !ObjectId.isValid(id)) {
                this.sendError('无效的预设ID', 400);
                return;
            }

            const presetService = new PresetService(this.ctx);
            const success = await presetService.deletePreset(new ObjectId(id));

            if (!success) {
                this.sendError('预设不存在', 404);
                return;
            }

            this.sendSuccess({
                success: true,
                message: '预设删除成功',
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            this.sendError(err.message, 500);
        }
    }
}

/**
 * 预设启用/禁用处理器
 * 路由: PATCH /exam/admin/presets/:id/toggle
 */
export class PresetToggleHandler extends PresetHandlerBase {
    async patch() {
        try {
            this.checkManagePermission();

            const id = this.request.params?.id as string;
            const { enabled } = this.request.body;

            if (!id || !ObjectId.isValid(id)) {
                this.sendError('无效的预设ID', 400);
                return;
            }

            if (typeof enabled !== 'boolean') {
                this.sendError('enabled 必须是布尔值', 400);
                return;
            }

            const presetService = new PresetService(this.ctx);
            const preset = await presetService.togglePreset(new ObjectId(id), enabled);

            this.sendSuccess({
                success: true,
                data: preset,
                message: enabled ? '预设已启用' : '预设已禁用',
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            this.sendError(err.message, 500);
        }
    }
}
