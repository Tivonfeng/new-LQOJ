import * as fs from 'fs';
import * as path from 'path';
import * as formidable from 'formidable';
import { ObjectId } from 'mongodb';
import { Handler, PRIV } from 'hydrooj';
import CertificateService from '../services/CertificateService';

/**
 * 证书上传处理器
 */
export class CertificateUploadHandler extends Handler {
    /**
     * GET /exam/admin/upload-certificate
     * 获取上传页面和配置
     */
    async get() {
        if (this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            this.response.status = 403;
            this.response.body = { success: false, error: '无权限上传证书' };
            return;
        }

        this.response.type = 'application/json';
        this.response.body = {
            message: '请使用 POST 方法上传证书',
            upload_endpoint: '/exam/admin/upload-certificate',
            max_file_size: '10MB',
            allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
        };
    }

    /**
     * POST /exam/admin/upload-certificate
     * 上传证书图片到七牛云
     */
    async post() {
        if (this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            this.response.status = 403;
            this.response.body = { success: false, error: '无权限上传证书' };
            return;
        }

        const form = formidable({
            maxFileSize: 10 * 1024 * 1024,
            uploadDir: '/tmp/exam-certificates',
            keepExtensions: true,
        });

        if (!fs.existsSync('/tmp/exam-certificates')) {
            fs.mkdirSync('/tmp/exam-certificates', { recursive: true });
        }

        const result = await new Promise<any>((resolve) => {
            form.parse(this.request as any, async (err, fields, files) => {
                try {
                    if (err) {
                        resolve({
                            success: false,
                            error: `表单解析失败: ${err.message}`,
                        });
                        return;
                    }

                    const imageFile = (files.image as any) || (files.certificate as any);
                    if (!imageFile) {
                        resolve({
                            success: false,
                            error: '未找到上传的文件',
                        });
                        return;
                    }

                    const filePath = imageFile[0]?.filepath || imageFile[0]?.path;
                    if (!filePath) {
                        resolve({
                            success: false,
                            error: '文件路径无效',
                        });
                        return;
                    }

                    const fileExt = path.extname(filePath).toLowerCase();
                    const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf'];
                    if (!allowedExts.includes(fileExt)) {
                        resolve({
                            success: false,
                            error: `不支持的文件格式: ${fileExt}`,
                        });
                        return;
                    }

                    try {
                        const certService = new CertificateService(this.ctx);
                        const uploadResult = await certService.uploadCertificateImage(filePath);

                        if (uploadResult.success) {
                            resolve({
                                success: true,
                                url: uploadResult.url,
                                key: uploadResult.key,
                                size: uploadResult.size,
                                message: '证书上传成功',
                            });
                        } else {
                            resolve({
                                success: false,
                                error: uploadResult.error || '上传失败',
                            });
                        }
                    } finally {
                        // 异步删除临时文件，失败不阻塞响应
                        if (fs.existsSync(filePath)) {
                            fs.promises.unlink(filePath).catch((err) => {
                                console.warn(
                                    `[ExamHall] 临时文件清理失败，将在后续清理: ${filePath}, 错误: ${err.message}`,
                                );
                            });
                        }
                    }
                } catch (error: any) {
                    resolve({
                        success: false,
                        error: `上传异常: ${error.message}`,
                    });
                }
            });
        });

        this.response.type = 'application/json';
        this.response.body = result;
    }
}

/**
 * 证书创建处理器
 */
export class CertificateCreateHandler extends Handler {
    /**
     * POST /exam/admin/certificates
     * 创建证书记录
     */
    async post() {
        if (this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            this.response.status = 403;
            this.response.body = { success: false, error: '无权限创建证书' };
            return;
        }

        const {
            uid,
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
        } = this.request.body;

        if (!uid || !certificateName || !certifyingBody || !category || !issueDate) {
            this.response.status = 400;
            this.response.body = { success: false, error: '缺少必填字段' };
            return;
        }

        try {
            const certService = new CertificateService(this.ctx);
            const certificate = await certService.createCertificate(Number.parseInt(uid), {
                certificateName,
                certifyingBody,
                category,
                level,
                score: score ? Number.parseInt(score) : undefined,
                issueDate: new Date(issueDate),
                expiryDate: expiryDate ? new Date(expiryDate) : undefined,
                certificateImageUrl,
                certificateImageKey,
                notes,
            }, undefined, this.user._id);

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                certificate: {
                    _id: certificate._id,
                    certificateCode: certificate.certificateCode,
                    certificateName: certificate.certificateName,
                    category: certificate.category,
                    issueDate: certificate.issueDate,
                },
                message: '证书创建成功',
            };
        } catch (error: any) {
            this.response.type = 'application/json';
            this.response.status = 500;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}

/**
 * 证书获取处理器
 */
export class CertificateGetHandler extends Handler {
    /**
     * GET /exam/certificates
     * 获取当前用户的证书列表
     */
    async get() {
        const category = (this.request.query?.category as string) || undefined;
        const status = (this.request.query?.status as string) || undefined;
        const skip = Number.parseInt((this.request.query?.skip as string) || '0');
        const limit = Number.parseInt((this.request.query?.limit as string) || '100');

        try {
            const certService = new CertificateService(this.ctx);
            const certificates = await certService.getUserCertificates(this.user._id, {
                category,
                status,
                skip,
                limit,
            });

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                certificates,
                total: certificates.length,
            };
        } catch (error: any) {
            this.response.type = 'application/json';
            this.response.status = 500;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}

/**
 * 证书详情处理器
 */
export class CertificateDetailHandler extends Handler {
    /**
     * GET /exam/certificates/:id
     * 获取证书详情
     */
    async get() {
        const id = this.request.params?.id as string;

        if (!id || !ObjectId.isValid(id)) {
            this.response.status = 400;
            this.response.body = { success: false, error: '无效的证书ID' };
            return;
        }

        try {
            const certService = new CertificateService(this.ctx);
            const certificate = await certService.getCertificateById(new ObjectId(id));

            if (!certificate) {
                this.response.status = 404;
                this.response.body = { success: false, error: '证书不存在' };
                return;
            }

            // 权限检查：先检查是否是所有者或管理员
            const isOwner = certificate.uid === this.user._id;
            const isAdmin = this.user.role === 'admin' || !!(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM));

            if (!isOwner && !isAdmin) {
                this.response.status = 403;
                this.response.body = { success: false, error: '无权限查看此证书' };
                return;
            }

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                certificate,
            };
        } catch (error: any) {
            this.response.type = 'application/json';
            this.response.status = 500;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}

/**
 * 证书更新处理器
 */
export class CertificateUpdateHandler extends Handler {
    /**
     * PUT /exam/admin/certificates/:id
     * 更新证书
     */
    async put() {
        if (this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            this.response.status = 403;
            this.response.body = { success: false, error: '无权限更新证书' };
            return;
        }

        const id = this.request.params?.id as string;

        if (!id || !ObjectId.isValid(id)) {
            this.response.status = 400;
            this.response.body = { success: false, error: '无效的证书ID' };
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

        try {
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

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                certificate,
                message: '证书更新成功',
            };
        } catch (error: any) {
            this.response.type = 'application/json';
            this.response.status = 500;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}

/**
 * 证书删除处理器
 */
export class CertificateDeleteHandler extends Handler {
    /**
     * DELETE /exam/admin/certificates/:id
     * 删除证书（包括云存储图片）
     */
    async delete() {
        if (this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            this.response.status = 403;
            this.response.body = { success: false, error: '无权限删除证书' };
            return;
        }

        const id = this.request.params?.id as string;

        if (!id || !ObjectId.isValid(id)) {
            this.response.status = 400;
            this.response.body = { success: false, error: '无效的证书ID' };
            return;
        }

        try {
            const certService = new CertificateService(this.ctx);
            const success = await certService.deleteCertificate(new ObjectId(id));

            if (!success) {
                this.response.status = 404;
                this.response.body = { success: false, error: '证书不存在' };
                return;
            }

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                message: '证书删除成功',
            };
        } catch (error: any) {
            this.response.type = 'application/json';
            this.response.status = 500;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}

/**
 * 证书批量删除处理器
 */
export class CertificateBatchDeleteHandler extends Handler {
    /**
     * DELETE /exam/admin/certificates
     * 批量删除证书
     */
    async delete() {
        if (this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            this.response.status = 403;
            this.response.body = { success: false, error: '无权限删除证书' };
            return;
        }

        const { ids } = this.request.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            this.response.status = 400;
            this.response.body = { success: false, error: 'ids 必须是非空数组' };
            return;
        }

        const validIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

        if (validIds.length === 0) {
            this.response.status = 400;
            this.response.body = { success: false, error: '没有有效的证书ID' };
            return;
        }

        try {
            const certService = new CertificateService(this.ctx);
            const deletedCount = await certService.deleteCertificates(validIds);

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                deletedCount,
                message: `成功删除 ${deletedCount} 个证书`,
            };
        } catch (error: any) {
            this.response.type = 'application/json';
            this.response.status = 500;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}

/**
 * 用户统计处理器
 */
export class CertificateStatsHandler extends Handler {
    /**
     * GET /exam/stats/certificates
     * 获取用户证书统计
     */
    async get() {
        const uid = (this.request.query?.uid as string) || String(this.user._id);

        if (uid !== String(this.user._id) && this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            this.response.status = 403;
            this.response.body = { success: false, error: '无权限查看此统计信息' };
            return;
        }

        try {
            const certService = new CertificateService(this.ctx);
            const stats = await certService.getUserStats(Number.parseInt(uid));

            this.response.type = 'application/json';
            this.response.body = {
                success: true,
                stats: stats || {
                    uid,
                    totalCertificates: 0,
                    certificates: [],
                    categoryStats: {},
                },
            };
        } catch (error: any) {
            this.response.type = 'application/json';
            this.response.status = 500;
            this.response.body = {
                success: false,
                error: error.message,
            };
        }
    }
}
