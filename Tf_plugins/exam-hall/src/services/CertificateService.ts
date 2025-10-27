import * as fs from 'fs';
import { ObjectId } from 'mongodb';
import { Context } from 'hydrooj';
import QiniuStorageService, { QiniuConfig } from './QiniuStorageService';

export interface Certificate {
    _id?: ObjectId;
    domainId: ObjectId;
    uid: number;
    certificateCode: string;
    certificateName: string;
    certifyingBody: string;
    category: string;
    level?: string;
    score?: number;
    issueDate: Date;
    expiryDate?: Date;
    certificateImageUrl?: string;
    certificateImageKey?: string;
    certificateImageSize?: number;
    certificateImageUploadedAt?: Date;
    status: 'active' | 'expired' | 'revoked';
    recordedBy: number;
    recordedAt: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CertificateFilter {
    category?: string;
    status?: string;
    skip?: number;
    limit?: number;
}

/**
 * 证书服务类
 * 处理证书的CRUD操作和七牛云图片管理
 */
export class CertificateService {
    private qiniuService: QiniuStorageService | null;
    private ctx: Context;

    constructor(ctx: Context, qiniuConfig?: QiniuConfig) {
        this.ctx = ctx;
        if (qiniuConfig) {
            this.qiniuService = new QiniuStorageService(qiniuConfig);
        }
    }

    /**
     * 创建证书 (支持图片上传)
     */
    async createCertificate(
        uid: number,
        data: Partial<Certificate>,
        imageFile?: string,
        recordedBy?: number,
    ): Promise<Certificate> {
        const collection = this.ctx.db.collection('exam.certificates');

        const generateCertCode = (): string => {
            if (data.certificateCode && typeof data.certificateCode === 'string') {
                return data.certificateCode;
            }
            return this.generateCertificateCode();
        };

        const cert: Certificate = {
            domainId: this.ctx.domain!._id as any as ObjectId,
            uid,
            certificateCode: generateCertCode(),
            certificateName: data.certificateName!,
            certifyingBody: data.certifyingBody!,
            category: data.category!,
            level: data.level,
            score: data.score,
            issueDate: new Date(data.issueDate!),
            expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
            status: 'active',
            recordedBy: recordedBy || 0,
            recordedAt: new Date(),
            notes: data.notes,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // 如果有图片文件，上传到七牛云
        if (imageFile && this.qiniuService?.isReady()) {
            try {
                const uploadResult = await this.uploadCertificateImage(imageFile);
                if (uploadResult.success) {
                    cert.certificateImageUrl = uploadResult.url;
                    cert.certificateImageKey = uploadResult.key;
                    cert.certificateImageSize = uploadResult.size;
                    cert.certificateImageUploadedAt = new Date();
                }
            } catch (err: any) {
                console.error(`[ExamHall] 证书图片上传失败: ${err.message}`);
            }
        }

        const result = await collection.insertOne(cert);
        cert._id = result.insertedId;

        // 更新用户统计
        await this.updateUserStats(uid);

        console.log(
            `[ExamHall] 创建证书成功: uid=${uid}, code=${cert.certificateCode}`,
        );

        return cert;
    }

    /**
     * 上传证书图片到七牛云
     */
    async uploadCertificateImage(
        filePath: string,
    ): Promise<{
        success: boolean;
        url?: string;
        key?: string;
        size?: number;
        error?: string;
    }> {
        if (!this.qiniuService?.isReady()) {
            return {
                success: false,
                error: '七牛云存储未启用',
            };
        }

        try {
            // 检查文件大小 (限制10MB)
            const stats = fs.statSync(filePath);
            if (stats.size > 10 * 1024 * 1024) {
                return {
                    success: false,
                    error: '文件大小超过10MB限制',
                };
            }

            // 上传到七牛云
            const uploadResult = await this.qiniuService.uploadFile(filePath, 'certificates');

            if (uploadResult.success) {
                return {
                    success: true,
                    url: uploadResult.url,
                    key: uploadResult.key,
                    size: uploadResult.size,
                };
            } else {
                return {
                    success: false,
                    error: uploadResult.error,
                };
            }
        } catch (error: any) {
            return {
                success: false,
                error: `上传异常: ${error.message}`,
            };
        }
    }

    /**
     * 更新证书 (包含图片更新)
     */
    async updateCertificate(
        id: ObjectId,
        data: Partial<Certificate>,
        imageFile?: string,
    ): Promise<Certificate> {
        const collection = this.ctx.db.collection('exam.certificates');

        const updateData: Partial<Certificate> = {
            ...data,
            updatedAt: new Date(),
        };

        // 如果有新图片，上传并删除旧图片
        if (imageFile && this.qiniuService?.isReady()) {
            const oldCert = await collection.findOne({ _id: id }) as Certificate;

            if (oldCert) {
                // 删除旧图片
                if (oldCert.certificateImageKey) {
                    await this.qiniuService.deleteFile(oldCert.certificateImageKey);
                }

                // 上传新图片
                const uploadResult = await this.uploadCertificateImage(imageFile);
                if (uploadResult.success) {
                    updateData.certificateImageUrl = uploadResult.url;
                    updateData.certificateImageKey = uploadResult.key;
                    updateData.certificateImageSize = uploadResult.size;
                    updateData.certificateImageUploadedAt = new Date();
                }
            }
        }

        await collection.updateOne({ _id: id }, { $set: updateData });

        const cert = (await collection.findOne({ _id: id })) as Certificate;

        // 更新用户统计
        await this.updateUserStats(cert.uid);

        console.log(`[ExamHall] 更新证书成功: id=${id}`);

        return cert;
    }

    /**
     * 删除证书 (包含图片删除)
     */
    async deleteCertificate(id: ObjectId): Promise<boolean> {
        const collection = this.ctx.db.collection('exam.certificates');

        const cert = (await collection.findOne({ _id: id })) as Certificate | null;
        if (!cert) {
            return false;
        }

        // 删除七牛云中的图片
        if (cert.certificateImageKey && this.qiniuService?.isReady()) {
            try {
                await this.qiniuService.deleteFile(cert.certificateImageKey);
            } catch (err: any) {
                console.error(`[ExamHall] 删除七牛云图片失败: ${err.message}`);
            }
        }

        // 删除数据库记录
        const result = await collection.deleteOne({ _id: id });

        // 更新用户统计
        if (result.deletedCount > 0) {
            await this.updateUserStats(cert.uid);
            console.log(`[ExamHall] 删除证书成功: id=${id}`);
        }

        return result.deletedCount > 0;
    }

    /**
     * 批量删除证书（含失败恢复）
     */
    async deleteCertificates(ids: ObjectId[]): Promise<number> {
        const collection = this.ctx.db.collection('exam.certificates');

        // 获取要删除的所有证书
        const certs = (await collection
            .find({ _id: { $in: ids } })
            .toArray()) as Certificate[];

        // 删除七牛云图片（失败不阻止继续）
        if (this.qiniuService?.isReady()) {
            const imageKeys = certs
                .filter((c) => c.certificateImageKey)
                .map((c) => c.certificateImageKey!);

            if (imageKeys.length > 0) {
                try {
                    await this.qiniuService.deleteMultiple(imageKeys);
                } catch (err: any) {
                    console.error(`[ExamHall] 批量删除七牛云图片失败: ${err.message}，继续删除数据库记录`);
                }
            }
        }

        // 删除数据库记录
        let deleteResult;
        try {
            deleteResult = await collection.deleteMany({ _id: { $in: ids } });
        } catch (err: any) {
            console.error(`[ExamHall] 批量删除证书失败: ${err.message}`);
            throw new Error(`批量删除证书失败: ${err.message}`);
        }

        // 更新用户统计（有重试机制）
        const uniqueUIDs = new Set(certs.map((c) => c.uid));
        const statsUpdateErrors: Array<{ uid: number, error: string }> = [];

        for (const uid of uniqueUIDs) {
            // Sequential updates needed to maintain consistency
            // eslint-disable-next-line no-await-in-loop
            try {
                await this.updateUserStats(uid);
            } catch (err: any) {
                statsUpdateErrors.push({
                    uid,
                    error: err.message,
                });
                // 重试一次
                // eslint-disable-next-line no-await-in-loop
                try {
                    await this.updateUserStats(uid);
                    // 重试成功，移除错误记录
                    statsUpdateErrors.pop();
                } catch (retryErr: any) {
                    console.error(`[ExamHall] 用户 ${uid} 统计更新失败（包括重试）: ${retryErr.message}`);
                }
            }
        }

        if (statsUpdateErrors.length > 0) {
            console.warn(
                `[ExamHall] 批量删除后，${statsUpdateErrors.length} 个用户的统计更新失败:\n${statsUpdateErrors.map((e) => `uid=${e.uid}: ${e.error}`).join('\n')}`,
            );
        }

        console.log(`[ExamHall] 批量删除${deleteResult.deletedCount}个证书，更新${uniqueUIDs.size - statsUpdateErrors.length}个用户统计`);

        return deleteResult.deletedCount;
    }

    /**
     * 获取用户证书列表
     */
    async getUserCertificates(
        uid: number,
        filters?: CertificateFilter,
    ): Promise<Certificate[]> {
        const collection = this.ctx.db.collection('exam.certificates');

        const query: any = {
            domainId: this.ctx.domain!._id,
            uid,
        };

        if (filters?.category) {
            query.category = filters.category;
        }

        if (filters?.status) {
            query.status = filters.status;
        }

        return (await collection
            .find(query)
            .sort({ issueDate: -1 })
            .skip(filters?.skip || 0)
            .limit(filters?.limit || 100)
            .toArray()) as Certificate[];
    }

    /**
     * 获取证书详情
     */
    async getCertificateById(id: ObjectId): Promise<Certificate | null> {
        const collection = this.ctx.db.collection('exam.certificates');
        return (await collection.findOne({ _id: id })) as Certificate | null;
    }

    /**
     * 获取用户证书总数
     */
    async getUserCertificateCount(uid: number): Promise<number> {
        const collection = this.ctx.db.collection('exam.certificates');

        return collection.countDocuments({
            domainId: this.ctx.domain!._id,
            uid,
            status: 'active',
        });
    }

    /**
     * 获取全域证书总数
     */
    async getTotalCertificateCount(): Promise<number> {
        const collection = this.ctx.db.collection('exam.certificates');

        return collection.countDocuments({
            domainId: this.ctx.domain!._id,
            status: 'active',
        });
    }

    /**
     * 更新用户证书统计
     * 移除冗余的 certificates 字段，保持统计表简洁
     */
    async updateUserStats(uid: number): Promise<void> {
        const collection = this.ctx.db.collection('exam.certificates');
        const statsCollection = this.ctx.db.collection('exam.user_stats');

        // 统计证书信息
        const certs = (await collection
            .find({
                domainId: this.ctx.domain!._id,
                uid,
                status: 'active',
            })
            .toArray()) as Certificate[];

        // 计算分类统计
        const categoryStats = {} as Record<string, number>;
        for (const cert of certs) {
            categoryStats[cert.category] = (categoryStats[cert.category] || 0) + 1;
        }

        const stats = {
            domainId: this.ctx.domain!._id,
            uid,
            totalCertificates: certs.length,
            categoryStats,
            lastCertificateDate: certs.length > 0 ? certs[0].issueDate : undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // 更新或插入统计（第一次创建时保留 createdAt）
        await statsCollection.updateOne(
            { domainId: this.ctx.domain!._id, uid },
            {
                $set: {
                    ...stats,
                    // 只在第一次创建时设置 createdAt，之后保持不变
                    createdAt: { $ifNull: ['$createdAt', stats.createdAt] } as any,
                },
            },
            { upsert: true },
        );
    }

    /**
     * 生成证书编码
     */
    private generateCertificateCode(): string {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.random().toString(36).substring(2, 7).toUpperCase();

        return `CERT-${year}${month}${day}-${random}`;
    }

    /**
     * 获取用户统计信息
     */
    async getUserStats(uid: number): Promise<any> {
        const statsCollection = this.ctx.db.collection('exam.user_stats');
        return await statsCollection.findOne({ uid });
    }

    /**
     * 获取用户按分类的统计
     */
    async getCategoryStats(uid: number): Promise<Record<string, number>> {
        const stats = await this.getUserStats(uid);
        return stats?.categoryStats || {};
    }
}

export default CertificateService;
