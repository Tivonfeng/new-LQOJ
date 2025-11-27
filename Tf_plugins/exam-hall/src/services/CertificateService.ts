import * as fs from 'fs';
import { Context, ObjectId } from 'hydrooj';
import QiniuStorageService from './QiniuStorageService';

export interface Certificate {
    /** 证书ID（MongoDB ObjectId） */
    _id?: ObjectId;
    /** 所属域ID */
    domainId: ObjectId;
    /** 用户ID */
    uid: number;
    /** 证书名称（如：Python 等级考试、全国信息学竞赛） */
    certificateName: string;
    /** 认证/颁发机构（如：全国青少年信息学竞赛组委会） */
    certifyingBody: string;
    /** 所属预设ID（关联到证书预设，用于快速查询和管理） */
    presetId?: string | ObjectId;
    /** 赛项名称（实际存储的是赛项/事件名称，如："初赛"、"复赛"、"笔试"、"上机"等，用于展示和筛选） */
    category: string;
    /** 证书等级描述（仅用于前端展示，如："一等奖"、"二等奖"、"通过"等，可选） */
    level?: string;
    /** 证书颁发日期 */
    issueDate: Date;
    /** 证书图片URL（从七牛云存储获取） */
    certificateImageUrl?: string;
    /** 证书图片在七牛云的存储key（用于删除和管理） */
    certificateImageKey?: string;
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
    /** 权重值（用于排行榜计算，默认为1，值越大在排行榜中权重越高）- 已弃用 */
    weight?: number;
    /** 计算得出的权重值 */
    calculatedWeight?: number;
    /** 权重计算详情 */
    weightBreakdown?: {
        baseWeight: number;
        levelFactor: number;
        awardFactor: number;
        typeFactor: number;
        calculation: string;
    };
}

export interface CertificateFilter {
    /** 按赛项过滤（赛项名称，如："初赛"、"笔试"等） */
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
     * 将外部传入的 presetId 统一转换为 ObjectId，避免库内类型不一致
     */
    private normalizePresetId(presetId?: string | ObjectId | null): ObjectId | undefined {
        if (!presetId) return undefined;
        if (presetId instanceof ObjectId) return presetId;
        if (ObjectId.isValid(presetId)) {
            return new ObjectId(presetId);
        }

        console.warn(`[ExamHall] 无效的 presetId: ${presetId}`);
        return undefined;
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

        const cert: Certificate = {
            domainId: this.ctx.domain!._id as any as ObjectId,
            uid,
            certificateName: data.certificateName!,
            certifyingBody: data.certifyingBody!,
            presetId: this.normalizePresetId(data.presetId), // 保存预设ID
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

            // 新字段
            examType: data.examType,
            competitionName: data.competitionName,
            certificationSeries: data.certificationSeries,
            weight: data.weight ?? 1, // 默认权重为 1
        };

        // 如果有图片文件，上传到七牛云
        if (imageFile && this.qiniuService?.isReady()) {
            try {
                const uploadResult = await this.uploadCertificateImage(imageFile);
                if (uploadResult.success) {
                    cert.certificateImageUrl = uploadResult.url;
                    cert.certificateImageKey = uploadResult.key;
                    // 已移除：certificateImageSize 和 certificateImageUploadedAt（无用字段）
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
            `[ExamHall] 创建证书成功: uid=${uid}, id=${cert._id}`,
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

        if (data.presetId !== undefined) {
            const normalizedPresetId = this.normalizePresetId(data.presetId);
            if (normalizedPresetId) {
                updateData.presetId = normalizedPresetId;
            } else {
                delete updateData.presetId;
            }
        }

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
                    // 已移除：certificateImageSize 和 certificateImageUploadedAt（无用字段）
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
     * @param uid 用户ID
     * @param filters 过滤条件（filters.category 按赛项名称筛选，category 字段存储的是赛项名称）
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

        // category 字段用于按赛项名称筛选
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
     * 获取所有证书（管理员用）
     */
    async getAllCertificates(): Promise<Certificate[]> {
        const collection = this.ctx.db.collection('exam.certificates' as any);
        return (await collection
            .find({ domainId: this.ctx.domain!._id })
            .sort({ issueDate: -1 })
            .toArray()) as Certificate[];
    }

    /**
     * 根据ID列表批量获取证书
     */
    async getCertificatesByIds(ids: ObjectId[]): Promise<Certificate[]> {
        const collection = this.ctx.db.collection('exam.certificates' as any);
        return (await collection
            .find({ _id: { $in: ids } })
            .toArray()) as Certificate[];
    }

    /**
     * 获取用户证书总数 (支持过滤)
     * @param uid 用户ID
     * @param filters 过滤条件（filters.category 按赛项名称筛选，category 字段存储的是赛项名称）
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

        // category 字段用于按赛项名称筛选
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
     * 获取最近一个季度的证书
     * @param examType 证书类型：competition 或 certification，如果未指定则返回所有类型
     * @param limit 返回数量限制，默认20
     */
    async getRecentQuarterCertificates(
        examType?: 'competition' | 'certification',
        limit = 20,
    ): Promise<Certificate[]> {
        const collection = this.ctx.db.collection('exam.certificates' as any);

        // 计算最近一个季度的开始日期
        const now = new Date();
        const currentMonth = now.getMonth(); // 0-11
        const currentYear = now.getFullYear();

        // 确定当前季度
        let quarterStartMonth: number;
        if (currentMonth < 3) {
            // Q1: 1-3月
            quarterStartMonth = 0;
        } else if (currentMonth < 6) {
            // Q2: 4-6月
            quarterStartMonth = 3;
        } else if (currentMonth < 9) {
            // Q3: 7-9月
            quarterStartMonth = 6;
        } else {
            // Q4: 10-12月
            quarterStartMonth = 9;
        }

        const quarterStartDate = new Date(currentYear, quarterStartMonth, 1);

        const query: any = {
            domainId: this.ctx.domain!._id,
            status: 'active',
            issueDate: { $gte: quarterStartDate },
        };

        if (examType) {
            query.examType = examType;
        }

        return (await collection
            .find(query)
            .sort({ issueDate: -1 })
            .limit(limit)
            .toArray()) as Certificate[];
    }

    /**
     * 更新用户证书统计
     * 支持竞赛/考级的多维度统计
     * 优化：使用投影只查询需要的字段，减少数据传输
     */
    async updateUserStats(uid: number): Promise<void> {
        const collection = this.ctx.db.collection('exam.certificates' as any);
        const statsCollection = this.ctx.db.collection('exam.user_stats' as any);

        // 统计所有证书信息 - 使用投影只查询需要的字段，提升性能
        const certs = (await collection
            .find({
                domainId: this.ctx.domain!._id,
                uid,
                status: 'active',
            })
            .project({
                // 只查询统计所需的字段，减少数据传输
                examType: 1,
                competitionName: 1,
                certificationSeries: 1,
                weight: 1,
                category: 1,
                issueDate: 1,
            })
            .toArray()) as Partial<Certificate>[];

        // ===== 基础统计 =====
        // 优化：使用 examType 进行分类统计，而不是 category（category 存储的是赛项名称）
        const categoryStats = {} as Record<string, number>;
        for (const cert of certs) {
            // 根据 examType 进行分类统计
            if (cert.examType === 'competition') {
                categoryStats['竞赛'] = (categoryStats['竞赛'] || 0) + 1;
            } else if (cert.examType === 'certification') {
                categoryStats['考级'] = (categoryStats['考级'] || 0) + 1;
            } else {
                // 如果没有 examType，尝试从 category 推断（向后兼容）
                // 注意：这不应该发生，因为新证书都应该有 examType
                categoryStats['其他'] = (categoryStats['其他'] || 0) + 1;
            }
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
            series: {} as Record<string, { count: number }>, // 按系列统计仅保留数量
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

                certificationStats.series[series] ||= {
                    count: 0,
                };

                certificationStats.series[series].count++;

                certificationStats.weight += cert.weight || 1;
            }
        }

        // 转换 Set 为数组（因为 Set 无法序列化到 MongoDB）
        // 优化：存储时直接排序，查询时无需处理
        const certificationSeriesForStorage = {} as Record<string, { count: number }>;
        for (const [series, data] of Object.entries(certificationStats.series)) {
            certificationSeriesForStorage[series] = {
                count: data.count,
            };
        }

        // 检查是否已存在统计记录
        const existingStats = await statsCollection.findOne({
            domainId: this.ctx.domain!._id,
            uid,
        });

        // 优化：categoryStats 基于 examType 分类统计（"竞赛"、"考级"）
        // 注意：category 字段存储的是赛项名称，不用于分类统计
        const stats = {
            domainId: this.ctx.domain!._id,
            uid,

            // 基础统计
            totalCertificates: certs.length,
            categoryStats, // 基于 examType 计算的分类统计（向后兼容，但建议使用动态计算的版本）
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
     * 动态计算 categoryStats（从竞赛和考级统计中提取）
     * 优化：基于 examType 分类，而不是 category 字段（category 存储的是赛项名称）
     * 返回格式：{ "竞赛": 2, "考级": 3 }
     */
    private calculateCategoryStats(stats: any): Record<string, number> {
        if (!stats) return {};

        // 如果已有 categoryStats，直接返回（向后兼容）
        if (stats.categoryStats) {
            return stats.categoryStats;
        }

        // 从竞赛和考级统计动态计算（基于 examType）
        const categoryStats: Record<string, number> = {};
        if (stats.competitionStats?.total) {
            categoryStats['竞赛'] = stats.competitionStats.total;
        }
        if (stats.certificationStats?.total) {
            categoryStats['考级'] = stats.certificationStats.total;
        }

        return categoryStats;
    }

    /**
     * 获取用户统计信息
     * 优化：自动填充动态计算的冗余字段，保持向后兼容
     */
    async getUserStats(uid: number): Promise<any> {
        const statsCollection = this.ctx.db.collection('exam.user_stats' as any);
        const stats = await statsCollection.findOne({
            domainId: this.ctx.domain!._id,
            uid,
        });

        if (!stats) return null;

        // 动态计算并填充冗余字段，保持向后兼容
        return {
            ...stats,
            // 动态计算 categoryStats（如果不存在）
            categoryStats: this.calculateCategoryStats(stats),
        };
    }

    /**
     * 获取用户按分类的统计
     * 优化：使用动态计算的 categoryStats
     */
    async getCategoryStats(uid: number): Promise<Record<string, number>> {
        const stats = await this.getUserStats(uid);
        return this.calculateCategoryStats(stats);
    }
}

export default CertificateService;
