import * as fs from 'fs';
import * as path from 'path';
import { ObjectId } from 'mongodb';
import { Handler, PRIV } from 'hydrooj';
import CertificateService from '../services/CertificateService';

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
        console.log(`[ExamHall] 检查权限: role=${this.user.role}, perm=${this.user.perm}, hasEditSystemPerm=${!!(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))}`);
        if (this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            console.error('[ExamHall] 权限检查失败: 既不是admin也没有PRIV_EDIT_SYSTEM权限');
            this.response.status = 403;
            this.response.body = { success: false, error: '无权限访问此资源' };
            throw new Error('PERMISSION_DENIED');
        }
        console.log('[ExamHall] 权限检查成功');
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
        } catch (err) {
            // 权限检查已自动返回错误
        }
    }

    /**
     * POST /exam/admin/upload-certificate
     * 上传证书图片到七牛云
     */
    async post() {
        try {
            console.log('[ExamHall] POST /exam/admin/upload-certificate 开始处理');
            this.checkManagePermission();
            console.log('[ExamHall] 权限检查通过');

            // HydroOJ已自动通过中间件解析multipart，直接从this.request.files访问
            const imageFile = this.request.files?.image || this.request.files?.certificate;
            console.log(`[ExamHall] 接收到文件: ${JSON.stringify(imageFile ? { originalFilename: imageFile.originalFilename, size: imageFile.size } : null)}`);

            if (!imageFile) {
                console.error('[ExamHall] 未找到上传的文件');
                this.sendError('未找到上传的文件', 400);
                return;
            }

            const filePath = imageFile.filepath;
            console.log(`[ExamHall] 文件路径: ${filePath}`);

            if (!fs.existsSync(filePath)) {
                console.error(`[ExamHall] 文件不存在: ${filePath}`);
                this.sendError('文件不存在', 400);
                return;
            }

            const fileExt = path.extname(filePath).toLowerCase();
            const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf'];
            console.log(`[ExamHall] 文件扩展名: ${fileExt}`);

            if (!allowedExts.includes(fileExt)) {
                console.error(`[ExamHall] 不支持的文件格式: ${fileExt}`);
                this.sendError(`不支持的文件格式: ${fileExt}`, 400);
                return;
            }

            const certService = new CertificateService(this.ctx);
            console.log('[ExamHall] CertificateService初始化完成，开始上传...');

            const uploadResult = await certService.uploadCertificateImage(filePath);
            console.log(`[ExamHall] 上传结果: ${JSON.stringify(uploadResult)}`);

            if (uploadResult.success) {
                this.response.body = {
                    success: true,
                    url: uploadResult.url,
                    key: uploadResult.key,
                    size: uploadResult.size,
                    message: '证书上传成功',
                };
            } else {
                this.sendError(uploadResult.error || '上传失败', 500);
            }
        } catch (err: any) {
            console.error(`[ExamHall] POST处理异常: ${err.message}`);
            console.error(`[ExamHall] 错误堆栈: ${err.stack}`);
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
                username,
                uid,
                presetId,
                certificateName,
                certifyingBody,
                category,
                level,
                score,
                issueDate,
                expiryDate,
                notes,
                certificateImageUrl,
                certificateImageKey,
                examType,
                competitionName,
                certificationSeries,
                levelNumber,
                weight,
            } = this.request.body;

            // 验证必填字段
            if (!username || !issueDate) {
                this.sendError('缺少必填字段（用户和颁发日期）', 400);
                return;
            }

            // 获取用户模型并通过用户名查找用户
            const UserModel = (global as any).Hydro.model.user;
            const targetUser = await UserModel.getByUname('system', username.trim());

            if (!targetUser) {
                this.sendError(`用户 ${username} 不存在`, 404);
                return;
            }

            const targetUid = targetUser._id;

            // 如果使用预设，从预设中获取信息
            let finalCertName = certificateName;
            let finalCertifyingBody = certifyingBody;
            let finalCategory = category;
            let finalExamType = examType;
            let finalCompetitionName = competitionName;
            let finalCertificationSeries = certificationSeries;
            let finalLevelNumber = levelNumber;
            let finalWeight = weight || 1;

            if (presetId) {
                try {
                    const PresetService = (await import('../services/PresetService')).default;
                    const presetService = new PresetService(this.ctx);
                    const { ObjectId } = await import('mongodb');
                    const preset = await presetService.getPresetById(new ObjectId(presetId));

                    if (!preset) {
                        this.sendError('预设不存在', 404);
                        return;
                    }

                    // 从预设获取值
                    finalCertName = preset.certificateName;
                    finalCertifyingBody = preset.certifyingBody;
                    finalCategory = preset.category;
                    finalExamType = preset.type;
                    finalCompetitionName = preset.competitionName;
                    finalCertificationSeries = preset.certificationSeries;
                    finalWeight = preset.weight || 1;
                } catch (err: any) {
                    console.warn(`[ExamHall] 获取预设失败: ${err.message}`);
                    // 如果预设获取失败，继续使用提交的值
                }
            }

            // 验证必需的证书字段
            if (!finalCertName || !finalCertifyingBody || !finalCategory) {
                this.sendError('缺少证书信息（名称、机构、分类）', 400);
                return;
            }

            // 创建证书
            const certService = new CertificateService(this.ctx);
            const certificate = await certService.createCertificate(
                targetUid,
                {
                    certificateName: finalCertName,
                    certifyingBody: finalCertifyingBody,
                    category: finalCategory,
                    level,
                    score: score ? Number.parseInt(score) : undefined,
                    issueDate: new Date(issueDate),
                    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
                    certificateImageUrl,
                    certificateImageKey,
                    notes,
                    examType: finalExamType,
                    competitionName: finalCompetitionName,
                    certificationSeries: finalCertificationSeries,
                    levelNumber: finalLevelNumber,
                    weight: finalWeight,
                },
                undefined,
                this.user._id,
            );

            this.sendSuccess({
                success: true,
                certificate: {
                    _id: certificate._id,
                    certificateCode: certificate.certificateCode,
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
            const skip = Number.parseInt((this.request.query?.skip as string) || '0');
            const limit = Number.parseInt((this.request.query?.limit as string) || '100');

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
                category,
                level,
                score,
                issueDate,
                expiryDate,
                status,
                notes,
            } = this.request.body;

            // 更新证书
            const certService = new CertificateService(this.ctx);
            const certificate = await certService.updateCertificate(new ObjectId(id), {
                certificateName,
                certifyingBody,
                category,
                level,
                score: score ? Number.parseInt(score) : undefined,
                issueDate: issueDate ? new Date(issueDate) : undefined,
                expiryDate: expiryDate ? new Date(expiryDate) : undefined,
                status,
                notes,
            });

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
