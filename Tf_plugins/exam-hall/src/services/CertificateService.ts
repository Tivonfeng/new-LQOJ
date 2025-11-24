import * as fs from 'fs';
import { ObjectId } from 'mongodb';
import { Context } from 'hydrooj';
import QiniuStorageService from './QiniuStorageService';

export interface Certificate {
    /** 证书ID（MongoDB ObjectId） */
    _id?: ObjectId;
    /** 所属域ID */
    domainId: ObjectId;
    /** 用户ID */
    uid: number;
    /** 证书编码（唯一标识，自动生成，格式：CERT-YYYYMMDD-XXXXX） */
    certificateCode: string;
    /** 证书名称（如：Python 等级考试、全国信息学竞赛） */
    certificateName: string;
    /** 认证/颁发机构（如：全国青少年信息学竞赛组委会） */
    certifyingBody: string;
    /** 所属预设ID（关联到证书预设，用于快速查询和管理） */
    presetId?: string | ObjectId;
    /** 证书分类（用于统计和筛选，如：竞赛、考级、其他） */
    category: string;
    /** 证书等级（如：初级、中级、高级、专家，可选） */
    level?: string;
    /** 证书颁发日期 */
    issueDate: Date;
    /** 证书图片URL（从七牛云存储获取） */
    certificateImageUrl?: string;
    /** 证书图片在七牛云的存储key（用于删除和管理） */
    certificateImageKey?: string;
    /** 证书图片文件大小（单位：字节） */
    certificateImageSize?: number;
    /** 证书图片上传时间 */
    certificateImageUploadedAt?: Date;
    /** 证书状态（active: 有效，expired: 已过期，revoked: 已撤销） */
    status: 'active' | 'expired' | 'revoked';
    /** 证书录入者的用户ID */
    recordedBy: number;
    /** 证书录入时间 */
    recordedAt: Date;
    /** 备注信息（可选） */
    notes?: string;
    /** 证书创建时间 */
    createdAt: Date;
    /** 证书最后更新时间 */
    updatedAt: Date;

    // ========== 赛考相关扩展字段 ==========
    /** 赛考类型：竞赛(competition) 或 考级(certification)，用于多维度统计 */
    examType?: 'competition' | 'certification';
    /** 竞赛名称（仅竞赛类型使用，如"全国信息学竞赛"、"素养大赛"） */
    competitionName?: string;
    /** 考级系列（仅考级类型使用，如"Python"、"C++"、"Scratch"） */
    certificationSeries?: string;
    /** 考级等级数字（1-8，仅考级类型使用，用于记录具体的等级） */
    levelNumber?: number;
    /** 权重值（用于排行榜计算，默认为1，值越大在排行榜中权重越高） */
    weight?: number;
}

export interface CertificateFilter {
    /** 按分类过滤（如：竞赛、考级、其他） */
    category?: string;
    /** 按状态过滤（active: 有效，expired: 已过期，revoked: 已撤销） */
    status?: string;
    /** 分页：跳过的记录数 */
    skip?: number;
    /** 分页：返回的记录数 */
    limit?: number;
}

/**
 * 证书服务类
 * 处理证书的CRUD操作和七牛云图片管理
 */
export class CertificateService {
    private qiniuService: QiniuStorageService;
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
        this.qiniuService = new QiniuStorageService();
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
        const collection = this.ctx.db.collection('exam.certificates' as any);

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
            presetId: data.presetId, // 保存预设ID
            category: data.category!,
            level: data.level,
            issueDate: new Date(data.issueDate!),
            status: 'active',
            recordedBy: recordedBy || 0,
            recordedAt: new Date(),
            notes: data.notes,
            createdAt: new Date(),
            updatedAt: new Date(),

            // 证书图片信息
            certificateImageUrl: data.certificateImageUrl,
            certificateImageKey: data.certificateImageKey,
            certificateImageSize: data.certificateImageSize,
            certificateImageUploadedAt: data.certificateImageUploadedAt,

            // 新字段
            examType: data.examType,
            competitionName: data.competitionName,
            certificationSeries: data.certificationSeries,
            levelNumber: data.levelNumber,
            weight: data.weight || 1, // 默认权重为 1
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
            console.error('[ExamHall] 七牛云存储未初始化或未启用');
            return {
                success: false,
                error: '七牛云存储未启用',
            };
        }

        try {
            // 检查文件大小 (限制10MB)
            const stats = fs.statSync(filePath);
            console.log(`[ExamHall] 文件信息: 路径=${filePath}, 大小=${stats.size}B`);
            if (stats.size > 10 * 1024 * 1024) {
                console.error('[ExamHall] 文件大小超过限制');
                return {
                    success: false,
                    error: '文件大小超过10MB限制',
                };
            }

            // 上传到七牛云
            console.log('[ExamHall] 开始上传到七牛云...');
            const uploadResult = await this.qiniuService.uploadFile(filePath, 'certificates');
            console.log(`[ExamHall] 七牛云上传结果: success=${uploadResult.success}, error=${uploadResult.error}`);

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
        const collection = this.ctx.db.collection('exam.certificates' as any);

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
        const collection = this.ctx.db.collection('exam.certificates' as any);

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
        const collection = this.ctx.db.collection('exam.certificates' as any);

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
        let deleteResult: any;
        try {
            deleteResult = await collection.deleteMany({ _id: { $in: ids } });
        } catch (err: any) {
            console.error(`[ExamHall] 批量删除证书失败: ${err.message}`);
            throw new Error(`批量删除证书失败: ${err.message}`);
        }

        // 批量更新用户统计信息
        // 优化：使用批量操作替代循环，减少数据库往返
        const uniqueUIDs = new Set(certs.map((c) => c.uid));
        const statsUpdateErrors: Array<{ uid: number, error: string }> = [];

        // 收集所有更新操作
        const updatePromises = Array.from(uniqueUIDs).map((uid) =>
            this.updateUserStats(uid).catch((err: any) => ({
                uid,
                error: err.message,
            })),
        );

        // 并发执行所有更新，避免顺序等待
        const results = await Promise.allSettled(updatePromises);

        // 收集失败的更新
        for (const result of results) {
            if (result.status === 'rejected') {
                const error = result.reason;
                if (error && typeof error === 'object' && 'uid' in error) {
                    statsUpdateErrors.push(error);
                }
            } else if (result.value && typeof result.value === 'object' && 'uid' in result.value) {
                statsUpdateErrors.push(result.value);
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
        const collection = this.ctx.db.collection('exam.certificates' as any);

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
        const collection = this.ctx.db.collection('exam.certificates' as any);
        return (await collection.findOne({ _id: id })) as Certificate | null;
    }

    /**
     * 获取用户证书总数 (支持过滤)
     */
    async getUserCertificatesCount(
        uid: number,
        filters?: CertificateFilter,
    ): Promise<number> {
        const collection = this.ctx.db.collection('exam.certificates' as any);

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

        return collection.countDocuments(query);
    }

    /**
     * 获取用户证书总数 (仅活跃证书)
     */
    async getUserCertificateCount(uid: number): Promise<number> {
        const collection = this.ctx.db.collection('exam.certificates' as any);

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
        const collection = this.ctx.db.collection('exam.certificates' as any);

        return collection.countDocuments({
            domainId: this.ctx.domain!._id,
            status: 'active',
        });
    }

    /**
     * 更新用户证书统计
     * 支持竞赛/考级的多维度统计
     */
    async updateUserStats(uid: number): Promise<void> {
        const collection = this.ctx.db.collection('exam.certificates' as any);
        const statsCollection = this.ctx.db.collection('exam.user_stats' as any);

        // 统计所有证书信息
        const certs = (await collection
            .find({
                domainId: this.ctx.domain!._id,
                uid,
                status: 'active',
            })
            .toArray()) as Certificate[];

        // ===== 基础统计 =====
        const categoryStats = {} as Record<string, number>;
        for (const cert of certs) {
            categoryStats[cert.category] = (categoryStats[cert.category] || 0) + 1;
        }

        // ===== 竞赛统计 =====
        const competitionStats = {
            total: 0,
            competitions: {} as Record<string, number>, // 按竞赛名统计
            weight: 0, // 权重总和
        };

        // ===== 考级统计 =====
        const certificationStats = {
            total: 0,
            series: {} as Record<string, { levels: Set<number>, count: number }>, // 按系列统计
            highestLevels: {} as Record<string, number>, // 按系列的最高等级
            weight: 0, // 权重总和
        };

        // 遍历证书进行分类统计
        for (const cert of certs) {
            if (cert.examType === 'competition') {
                competitionStats.total++;
                const compName = cert.competitionName || '未分类竞赛';
                competitionStats.competitions[compName] =
                    (competitionStats.competitions[compName] || 0) + 1;
                competitionStats.weight += cert.weight || 1;
            } else if (cert.examType === 'certification') {
                certificationStats.total++;
                const series = cert.certificationSeries || '其他';
                const level = cert.levelNumber || 0;

                certificationStats.series[series] ||= {
                    levels: new Set(),
                    count: 0,
                };

                certificationStats.series[series].levels.add(level);
                certificationStats.series[series].count++;

                // 记录最高等级
                const currentHighest = certificationStats.highestLevels[series] || 0;
                certificationStats.highestLevels[series] = Math.max(currentHighest, level);

                certificationStats.weight += cert.weight || 1;
            }
        }

        // 转换 Set 为数组（因为 Set 无法序列化到 MongoDB）
        const certificationSeriesForStorage = {} as Record<string, any>;
        for (const [series, data] of Object.entries(certificationStats.series)) {
            certificationSeriesForStorage[series] = {
                levels: Array.from(data.levels).sort((a, b) => a - b),
                count: data.count,
                highest: certificationStats.highestLevels[series],
            };
        }

        // 检查是否已存在统计记录
        const existingStats = await statsCollection.findOne({
            domainId: this.ctx.domain!._id,
            uid,
        });

        const stats = {
            domainId: this.ctx.domain!._id,
            uid,

            // 基础统计
            totalCertificates: certs.length,
            categoryStats,
            lastCertificateDate: certs.length > 0 ? certs[0].issueDate : undefined,

            // 竞赛统计
            competitionStats: {
                total: competitionStats.total,
                competitions: competitionStats.competitions,
                weight: competitionStats.weight,
            },

            // 考级统计
            certificationStats: {
                total: certificationStats.total,
                series: certificationSeriesForStorage,
                highestLevels: certificationStats.highestLevels,
                weight: certificationStats.weight,
            },

            // 综合权重（用于综合排行榜）
            totalWeight:
                competitionStats.weight
                + certificationStats.weight,

            updatedAt: new Date(),
            // 只在第一次创建时设置 createdAt，之后保持不变
            createdAt: existingStats?.createdAt || new Date(),
        };

        // 更新或插入统计
        await statsCollection.updateOne(
            { domainId: this.ctx.domain!._id, uid },
            { $set: stats },
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
        const statsCollection = this.ctx.db.collection('exam.user_stats' as any);
        return await statsCollection.findOne({
            domainId: this.ctx.domain!._id,
            uid,
        });
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
