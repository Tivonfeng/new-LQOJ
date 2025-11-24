import * as fs from 'fs';
import * as path from 'path';
import { ObjectId } from 'mongodb';
import { Handler, PRIV } from 'hydrooj';
import CertificateService from '../services/CertificateService';
import PresetService from '../services/PresetService';

// ============================================================================
// 🎓 证书管理处理器集合
// ============================================================================
// 说明：
// - 负责处理证书相关的HTTP请求
// - 调用CertificateService进行业务逻辑处理
// - 处理权限验证、数据格式化、错误响应等
// ============================================================================

/**
 * 证书处理器基类
 * 提供公共的权限检查和错误处理方法
 */
abstract class CertificateHandlerBase extends Handler {
    /**
     * 检查管理权限（管理员或系统编辑权限）
     * @throws 如果权限不足，自动返回403响应
     */
    protected checkManagePermission(): void {
        if (this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            this.response.status = 403;
            this.response.body = { success: false, error: '无权限访问此资源' };
            throw new Error('PERMISSION_DENIED');
        }
    }

    /**
     * 检查用户是否可以访问指定UID的数据
     * @param targetUid 目标用户UID
     * @returns true 如果当前用户是所有者或管理员
     */
    protected canAccessUser(targetUid: number): boolean {
        if (targetUid === this.user._id) return true;
        return this.user.role === 'admin' || !!(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM));
    }

    /**
     * 设置JSON响应
     */
    protected setJsonResponse(body: any, status = 200): void {
        this.response.type = 'application/json';
        this.response.status = status;
        this.response.body = body;
    }

    /**
     * 发送错误响应
     */
    protected sendError(message: string, status = 500): void {
        this.setJsonResponse({ success: false, error: message }, status);
    }

    /**
     * 发送成功响应
     */
    protected sendSuccess(data: any): void {
        this.setJsonResponse(data, 200);
    }
}

/**
 * 证书上传处理器
 * 路由: /exam/admin/upload-certificate
 * 功能: 处理证书图片上传到七牛云存储
 */
export class CertificateUploadHandler extends CertificateHandlerBase {
    /**
     * GET /exam/admin/upload-certificate
     * 返回上传配置信息
     */
    async get() {
        try {
            this.checkManagePermission();
            this.setJsonResponse({
                message: '请使用 POST 方法上传证书',
                upload_endpoint: '/exam/admin/upload-certificate',
                max_file_size: '10MB',
                allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            this.sendError(`获取上传配置失败: ${err.message}`, 500);
        }
    }

    /**
     * POST /exam/admin/upload-certificate
     * 上传证书图片到七牛云
     */
    async post() {
        try {
            this.checkManagePermission();

            // HydroOJ已自动通过中间件解析multipart，直接从this.request.files访问
            const imageFile = this.request.files?.image || this.request.files?.certificate;

            if (!imageFile) {
                this.sendError('未找到上传的文件', 400);
                return;
            }

            const filePath = imageFile.filepath;

            if (!fs.existsSync(filePath)) {
                this.sendError('文件不存在', 400);
                return;
            }

            const fileExt = path.extname(filePath).toLowerCase();
            const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf'];

            if (!allowedExts.includes(fileExt)) {
                this.sendError(`不支持的文件格式: ${fileExt}`, 400);
                return;
            }

            const certService = new CertificateService(this.ctx);
            const uploadResult = await certService.uploadCertificateImage(filePath);

            if (uploadResult.success) {
                this.setJsonResponse({
                    success: true,
                    url: uploadResult.url,
                    key: uploadResult.key,
                    size: uploadResult.size,
                    message: '证书上传成功',
                });
            } else {
                this.sendError(uploadResult.error || '上传失败', 500);
            }
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            this.sendError(`上传异常: ${err.message}`, 500);
        }
    }
}

/**
 * 证书创建处理器
 * 路由: POST /exam/admin/certificates
 * 功能: 创建新的证书记录
 */
export class CertificateCreateHandler extends CertificateHandlerBase {
    /**
     * POST /exam/admin/certificates
     * 创建证书记录
     */
    async post() {
        try {
            this.checkManagePermission();

            const {
                uid,
                username,
                presetId,
                certificateName,
                certifyingBody,
                category,
                level,
                issueDate,
                notes,
                certificateImageUrl,
                certificateImageKey,
                examType,
                competitionName,
                certificationSeries,
                weight,
            } = this.request.body;

            // 验证必填字段
            if (!issueDate) {
                this.sendError('缺少必填字段（颁发日期）', 400);
                return;
            }

            if (!presetId) {
                this.sendError('证书必须关联赛考预设', 400);
                return;
            }

            // 获取用户模型并通过用户名查找用户
            const UserModel = (global as any).Hydro.model.user;
            let targetUid: number | undefined;

            if (uid !== undefined && uid !== null && uid !== '') {
                const numericUid = Number(uid);
                if (Number.isNaN(numericUid)) {
                    this.sendError('无效的用户ID', 400);
                    return;
                }
                const userById = await UserModel.getById('system', numericUid);
                if (!userById) {
                    this.sendError(`用户 #${numericUid} 不存在`, 404);
                    return;
                }
                targetUid = numericUid;
            } else if (username) {
                const userByName = await UserModel.getByUname('system', username.trim());
                if (!userByName) {
                    this.sendError(`用户 ${username} 不存在`, 404);
                    return;
                }
                targetUid = userByName._id;
            } else {
                this.sendError('缺少用户信息', 400);
                return;
            }

            // 如果使用预设，从预设中获取信息
            let finalCertName = certificateName;
            let finalCertifyingBody = certifyingBody;
            // category 字段实际存储的是赛项名称（如："初赛"、"复赛"、"笔试"、"上机"等）
            // 前端通过 event 字段传递，后端存储在 category 字段中
            let finalCategory = typeof category === 'string' ? category.trim() : undefined; // category = 赛项名称（event）
            let finalExamType = examType as 'competition' | 'certification' | undefined; // examType = 分类（competition/certification）
            let finalCompetitionName = typeof competitionName === 'string' ? competitionName.trim() : undefined;
            let finalCertificationSeries = typeof certificationSeries === 'string' ? certificationSeries.trim() : undefined;
            let finalWeight: number | undefined;
            if (weight !== undefined && weight !== null && weight !== '') {
                const numericWeight = Number(weight);
                if (Number.isNaN(numericWeight)) {
                    this.sendError('权重必须是数字', 400);
                    return;
                }
                finalWeight = numericWeight;
            }

            if (presetId) {
                try {
                    const presetService = new PresetService(this.ctx);
                    const preset = await presetService.getPresetById(new ObjectId(presetId));

                    if (!preset) {
                        this.sendError('预设不存在', 404);
                        return;
                    }

                    // 从预设获取值
                    finalCertName = preset.name;
                    finalCertifyingBody = preset.certifyingBody;
                    // category 存储的是赛项名称，应该使用前端传来的 category（即 event）
                    finalCategory ||= (typeof category === 'string' ? category.trim() : undefined);
                    if (!finalCategory && preset.events?.length) {
                        finalCategory = preset.events[0].name;
                    }
                    // examType 从预设获取（真正的分类）
                    finalExamType = preset.type;
                    if (preset.type === 'competition') {
                        finalCompetitionName ||= preset.name;
                        finalCertificationSeries = undefined;
                    } else if (preset.type === 'certification') {
                        finalCertificationSeries ||= preset.name;
                        finalCompetitionName = undefined;
                    }
                    if (finalWeight === undefined) {
                        finalWeight = preset.weight || 1;
                    }
                } catch (err: any) {
                    console.warn(`[ExamHall] 获取预设失败: ${err.message}`);
                    // 如果预设获取失败，继续使用提交的值
                }
            }

            if (finalWeight === undefined) {
                finalWeight = 1;
            }

            if (finalExamType !== 'certification') {
                finalCertificationSeries = undefined;
            }
            if (finalExamType !== 'competition') {
                finalCompetitionName = undefined;
            }

            // 验证必需的证书字段
            if (!finalCertName || !finalCertifyingBody) {
                this.sendError('缺少证书信息（名称或机构）', 400);
                return;
            }

            // 验证赛项（category 字段存储的是赛项名称）
            if (!finalCategory) {
                // 前端会验证赛项是必填的，这里作为二次验证
                this.sendError('缺少赛项信息', 400);
                return;
            }

            if (typeof targetUid !== 'number') {
                this.sendError('用户信息无效', 400);
                return;
            }

            // 创建证书
            const certService = new CertificateService(this.ctx);
            const certificate = await certService.createCertificate(
                targetUid,
                {
                    certificateName: finalCertName,
                    certifyingBody: finalCertifyingBody,
                    presetId, // 保存预设ID
                    category: finalCategory,
                    level,
                    issueDate: new Date(issueDate),
                    certificateImageUrl,
                    certificateImageKey,
                    notes,
                    examType: finalExamType,
                    competitionName: finalCompetitionName,
                    certificationSeries: finalCertificationSeries,
                    weight: finalWeight,
                },
                undefined,
                this.user._id,
            );

            this.sendSuccess({
                success: true,
                certificate: {
                    _id: certificate._id,
                    certificateName: certificate.certificateName,
                    category: certificate.category,
                    issueDate: certificate.issueDate,
                },
                message: '证书创建成功',
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            this.sendError(err.message, 500);
        }
    }
}

/**
 * 证书获取处理器
 * 路由: GET /exam/certificates
 * 功能: 获取当前用户的证书列表
 */
export class CertificateGetHandler extends CertificateHandlerBase {
    /**
     * GET /exam/certificates
     * 获取当前用户的证书列表
     */
    async get() {
        try {
            const category = (this.request.query?.category as string) || undefined;
            const status = (this.request.query?.status as string) || undefined;
            const skip = Math.max(0, Number.parseInt((this.request.query?.skip as string) || '0') || 0);
            const limit = Math.min(1000, Math.max(1, Number.parseInt((this.request.query?.limit as string) || '100') || 100));

            const certService = new CertificateService(this.ctx);

            // 获取分页数据和总数
            const [certificates, total] = await Promise.all([
                certService.getUserCertificates(this.user._id, {
                    category,
                    status,
                    skip,
                    limit,
                }),
                certService.getUserCertificatesCount(this.user._id, {
                    category,
                    status,
                }),
            ]);

            this.sendSuccess({
                success: true,
                certificates,
                total,
                skip,
                limit,
            });
        } catch (err: any) {
            this.sendError(err.message, 500);
        }
    }
}

/**
 * 证书列表处理器 (管理员用)
 * 路由: GET /exam/admin/certificates-list
 * 功能: 获取所有证书列表（带用户名）
 */
export class CertificateListAdminHandler extends CertificateHandlerBase {
    /**
     * GET /exam/admin/certificates-list
     * 获取证书列表（支持按 uid 或 username 过滤）
     */
    async get() {
        try {
            this.checkManagePermission();

            const uid = (this.request.query?.uid as string) || undefined;
            const certService = new CertificateService(this.ctx);
            const UserModel = (global as any).Hydro.model.user;

            let targetUid: number | undefined;
            let certificates: any[] = [];

            if (uid) {
                // 尝试作为 uid 或 username 查找用户
                let user: any = null;

                // 先尝试数字 uid
                if (/^\d+$/.test(uid)) {
                    const uidNum = Number.parseInt(uid);
                    user = await UserModel.getById('system', uidNum);
                }

                // 再尝试 username
                user ||= await UserModel.getByUname('system', uid.trim());

                if (!user) {
                    this.sendSuccess({
                        success: true,
                        data: [],
                    });
                    return;
                }

                targetUid = user._id;
            }

            // 获取证书列表
            if (targetUid) {
                certificates = await certService.getUserCertificates(targetUid);
            } else {
                // 获取所有证书
                const collection = this.ctx.db.collection('exam.certificates' as any);
                certificates = (await collection
                    .find({ domainId: this.ctx.domain!._id })
                    .sort({ issueDate: -1 })
                    .toArray()) as any[];
            }

            // 批量查找用户信息并补充 username
            const userIds = [...new Set(certificates.map((c) => c.uid))];
            const userMap = new Map<number, { _id: number, uname: string }>();

            // 并行查询用户信息，提高性能
            const userResults = await Promise.allSettled(
                userIds.map((userId) => UserModel.getById('system', userId)),
            );

            for (let i = 0; i < userResults.length; i++) {
                const result = userResults[i];
                if (result.status === 'fulfilled' && result.value) {
                    const userId = userIds[i];
                    userMap.set(userId, { _id: result.value._id, uname: result.value.uname });
                }
            }

            // 补充 username 到每个证书
            const enrichedCertificates = certificates.map((cert) => ({
                ...cert,
                username: userMap.get(cert.uid)?.uname || undefined,
            }));

            this.sendSuccess({
                success: true,
                data: enrichedCertificates,
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            this.sendError(err.message, 500);
        }
    }
}

/**
 * 证书详情/更新/删除处理器（统一处理器）
 * 路由: /exam/admin/certificates/:id
 * 功能:
 *   - GET: 获取证书详情（支持所有者和管理员访问）
 *   - PUT: 更新证书信息（管理员操作）
 *   - DELETE: 删除单个证书（管理员操作）
 */
export class CertificateDetailHandler extends CertificateHandlerBase {
    /**
     * GET /exam/admin/certificates/:id
     * 获取证书详情
     */
    async get() {
        try {
            const id = this.request.params?.id as string;

            // 验证证书ID格式
            if (!id || !ObjectId.isValid(id)) {
                this.sendError('无效的证书ID', 400);
                return;
            }

            const certService = new CertificateService(this.ctx);
            const certificate = await certService.getCertificateById(new ObjectId(id));

            if (!certificate) {
                this.sendError('证书不存在', 404);
                return;
            }

            // 权限检查：只有所有者或管理员可以查看
            if (!this.canAccessUser(certificate.uid)) {
                this.sendError('无权限查看此证书', 403);
                return;
            }

            this.sendSuccess({
                success: true,
                certificate,
            });
        } catch (err: any) {
            this.sendError(err.message, 500);
        }
    }

    /**
     * PUT /exam/admin/certificates/:id
     * 更新证书
     */
    async put() {
        try {
            this.checkManagePermission();

            const id = this.request.params?.id as string;

            // 验证证书ID格式
            if (!id || !ObjectId.isValid(id)) {
                this.sendError('无效的证书ID', 400);
                return;
            }

            const {
                certificateName,
                certifyingBody,
                presetId,
                category,
                level,
                issueDate,
                notes,
                competitionName,
                certificationSeries,
                weight,
            } = this.request.body;

            let parsedWeight: number | undefined;
            if (weight !== undefined && weight !== null && weight !== '') {
                parsedWeight = Number(weight);
                if (Number.isNaN(parsedWeight)) {
                    this.sendError('权重必须是数字', 400);
                    return;
                }
            }

            // 更新证书 - 只更新允许的字段，保留 examType、competitionName 等用于统计的字段
            const certService = new CertificateService(this.ctx);
            const updateData: any = {
                certificateName,
                certifyingBody,
                presetId,
                category,
                level,
                issueDate: issueDate ? new Date(issueDate) : undefined,
                notes,
                competitionName: typeof competitionName === 'string' ? competitionName.trim() : undefined,
                certificationSeries: typeof certificationSeries === 'string' ? certificationSeries.trim() : undefined,
                weight: parsedWeight,
            };

            // 如果提供了预设ID，从预设中获取examType
            if (presetId) {
                try {
                    const presetService = new PresetService(this.ctx);
                    const preset = await presetService.getPresetById(new ObjectId(presetId));

                    if (preset) {
                        // 从预设更新examType，用于统计
                        updateData.examType = preset.type;
                    }
                } catch (err: any) {
                    console.warn(`[ExamHall] 获取预设失败: ${err.message}`);
                    // 如果预设获取失败，继续执行更新
                }
            }

            // 删除 undefined 的字段，避免覆盖原有的统计字段
            for (const key of Object.keys(updateData)) {
                if (updateData[key] === undefined) {
                    delete updateData[key];
                }
            }

            const certificate = await certService.updateCertificate(new ObjectId(id), updateData);

            this.sendSuccess({
                success: true,
                certificate,
                message: '证书更新成功',
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            this.sendError(err.message, 500);
        }
    }

    /**
     * DELETE /exam/admin/certificates/:id
     * 删除证书（包括云存储图片）
     */
    async delete() {
        try {
            this.checkManagePermission();

            const id = this.request.params?.id as string;

            // 验证证书ID格式
            if (!id || !ObjectId.isValid(id)) {
                this.sendError('无效的证书ID', 400);
                return;
            }

            // 删除证书
            const certService = new CertificateService(this.ctx);
            const success = await certService.deleteCertificate(new ObjectId(id));

            if (!success) {
                this.sendError('证书不存在', 404);
                return;
            }

            this.sendSuccess({
                success: true,
                message: '证书删除成功',
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            this.sendError(err.message, 500);
        }
    }
}

/**
 * @deprecated 使用 CertificateDetailHandler 代替（现已支持 GET, PUT, DELETE）
 */
export class CertificateUpdateHandler extends CertificateDetailHandler {}

/**
 * @deprecated 使用 CertificateDetailHandler 代替（现已支持 GET, PUT, DELETE）
 */
export class CertificateDeleteHandler extends CertificateDetailHandler {}

/**
 * 证书批量删除处理器
 * 路由: DELETE /exam/admin/certificates
 * 功能: 批量删除证书（管理员操作）
 */
export class CertificateBatchDeleteHandler extends CertificateHandlerBase {
    /**
     * DELETE /exam/admin/certificates
     * 批量删除证书
     */
    async delete() {
        try {
            this.checkManagePermission();

            const { ids } = this.request.body;

            // 验证参数
            if (!Array.isArray(ids) || ids.length === 0) {
                this.sendError('ids 必须是非空数组', 400);
                return;
            }

            // 过滤有效的证书ID
            const validIds = ids
                .filter((id) => ObjectId.isValid(id))
                .map((id) => new ObjectId(id));

            if (validIds.length === 0) {
                this.sendError('没有有效的证书ID', 400);
                return;
            }

            // 批量删除
            const certService = new CertificateService(this.ctx);
            const deletedCount = await certService.deleteCertificates(validIds);

            this.sendSuccess({
                success: true,
                deletedCount,
                message: `成功删除 ${deletedCount} 个证书`,
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            this.sendError(err.message, 500);
        }
    }
}

/**
 * 证书统计处理器
 * 路由: GET /exam/stats/certificates
 * 功能: 获取用户证书统计信息
 */
export class CertificateStatsHandler extends CertificateHandlerBase {
    /**
     * GET /exam/stats/certificates
     * 获取用户证书统计
     */
    async get() {
        try {
            const uid = (this.request.query?.uid as string) || String(this.user._id);
            const targetUid = Number.parseInt(uid);

            // 权限检查：只能查看自己或管理员可以查看任何人
            if (!this.canAccessUser(targetUid)) {
                this.sendError('无权限查看此统计信息', 403);
                return;
            }

            // 获取统计数据
            const certService = new CertificateService(this.ctx);
            const stats = await certService.getUserStats(targetUid);

            this.sendSuccess({
                success: true,
                stats: stats || {
                    uid: targetUid,
                    totalCertificates: 0,
                    certificates: [],
                    categoryStats: {},
                },
            });
        } catch (err: any) {
            this.sendError(err.message, 500);
        }
    }
}
