import * as fs from 'fs';
import { ObjectId } from 'mongodb';
import { Context } from 'hydrooj';
import QiniuStorageService from './QiniuStorageService';

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

    // ========== 新增字段 ==========
    // 赛考类型：竞赛(competition) 或 考级(certification)
    examType?: 'competition' | 'certification';
    // 竞赛名称 (仅竞赛类型使用，如"信息学竞赛")
    competitionName?: string;
    // 考级系列 (仅考级类型使用，如"Python", "Scratch", "C++")
    certificationSeries?: string;
    // 考级等级数字 (1-8, 仅考级类型使用)
    levelNumber?: number;
    // 权重值 (用于排行榜计算，默认1)
    weight?: number;
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
            try {
                await this.updateUserStats(uid);
            } catch (err: any) {
                statsUpdateErrors.push({
                    uid,
                    error: err.message,
                });
                // 重试一次

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

                if (!certificationStats.series[series]) {
                    certificationStats.series[series] = {
                        levels: new Set(),
                        count: 0,
                    };
                }

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
                competitionStats.weight +
                certificationStats.weight,

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

    /**
     * ===== 新增排行榜方法 =====
     */

    /**
     * 获取综合排行榜 (基于总权重)
     * @param limit 返回数量
     * @returns 排行榜数据，包含排名和权重信息
     */
    async getComprehensiveLeaderboard(limit: number = 100): Promise<any[]> {
        const statsCollection = this.ctx.db.collection('exam.user_stats' as any);

        const results = await statsCollection
            .find({ domainId: this.ctx.domain!._id })
            .sort({ totalWeight: -1 })
            .limit(limit)
            .toArray();

        return results.map((item: any, index: number) => ({
            rank: index + 1,
            uid: item.uid,
            totalWeight: item.totalWeight || 0,
            totalCertificates: item.totalCertificates || 0,
            competitionCount: item.competitionStats?.total || 0,
            certificationCount: item.certificationStats?.total || 0,
            competitionWeight: item.competitionStats?.weight || 0,
            certificationWeight: item.certificationStats?.weight || 0,
        }));
    }

    /**
     * 获取竞赛排行榜 (仅竞赛证书)
     * @param limit 返回数量
     * @returns 排行榜数据
     */
    async getCompetitionLeaderboard(limit: number = 100): Promise<any[]> {
        const statsCollection = this.ctx.db.collection('exam.user_stats' as any);

        const results = await statsCollection
            .find({
                domainId: this.ctx.domain!._id,
                'competitionStats.weight': { $gt: 0 },
            })
            .sort({ 'competitionStats.weight': -1 })
            .limit(limit)
            .toArray();

        return results.map((item: any, index: number) => ({
            rank: index + 1,
            uid: item.uid,
            competitionCount: item.competitionStats?.total || 0,
            competitionWeight: item.competitionStats?.weight || 0,
            competitions: item.competitionStats?.competitions || {},
        }));
    }

    /**
     * 获取考级排行榜 (仅考级证书)
     * @param limit 返回数量
     * @returns 排行榜数据
     */
    async getCertificationLeaderboard(limit: number = 100): Promise<any[]> {
        const statsCollection = this.ctx.db.collection('exam.user_stats' as any);

        const results = await statsCollection
            .find({
                domainId: this.ctx.domain!._id,
                'certificationStats.weight': { $gt: 0 },
            })
            .sort({ 'certificationStats.weight': -1 })
            .limit(limit)
            .toArray();

        return results.map((item: any, index: number) => ({
            rank: index + 1,
            uid: item.uid,
            certificationCount: item.certificationStats?.total || 0,
            certificationWeight: item.certificationStats?.weight || 0,
            series: item.certificationStats?.series || {},
            highestLevels: item.certificationStats?.highestLevels || {},
        }));
    }

    /**
     * 获取用户在综合排行榜中的排名
     * @param uid 用户ID
     * @returns 排名信息
     */
    async getUserComprehensiveRank(uid: number): Promise<any> {
        const statsCollection = this.ctx.db.collection('exam.user_stats' as any);

        // 获取用户的权重
        const userStats = await statsCollection.findOne({
            domainId: this.ctx.domain!._id,
            uid,
        });

        if (!userStats) {
            return null;
        }

        // 计算排名（权重大于用户权重的数量 + 1）
        const rank = await statsCollection.countDocuments({
            domainId: this.ctx.domain!._id,
            totalWeight: { $gt: userStats.totalWeight || 0 },
        });

        // 获取总用户数
        const total = await statsCollection.countDocuments({
            domainId: this.ctx.domain!._id,
        });

        return {
            uid,
            rank: rank + 1,
            total,
            totalWeight: userStats.totalWeight || 0,
            totalCertificates: userStats.totalCertificates || 0,
            competitionStats: userStats.competitionStats || {},
            certificationStats: userStats.certificationStats || {},
        };
    }

    /**
     * 获取用户在竞赛排行榜中的排名
     * @param uid 用户ID
     * @returns 排名信息
     */
    async getUserCompetitionRank(uid: number): Promise<any> {
        const statsCollection = this.ctx.db.collection('exam.user_stats' as any);

        const userStats = await statsCollection.findOne({
            domainId: this.ctx.domain!._id,
            uid,
        });

        if (!userStats || !userStats.competitionStats?.weight) {
            return null;
        }

        const rank = await statsCollection.countDocuments({
            domainId: this.ctx.domain!._id,
            'competitionStats.weight': { $gt: userStats.competitionStats.weight },
        });

        return {
            uid,
            rank: rank + 1,
            competitionWeight: userStats.competitionStats?.weight || 0,
            competitionCount: userStats.competitionStats?.total || 0,
            competitions: userStats.competitionStats?.competitions || {},
        };
    }

    /**
     * 获取用户在考级排行榜中的排名
     * @param uid 用户ID
     * @returns 排名信息
     */
    async getUserCertificationRank(uid: number): Promise<any> {
        const statsCollection = this.ctx.db.collection('exam.user_stats' as any);

        const userStats = await statsCollection.findOne({
            domainId: this.ctx.domain!._id,
            uid,
        });

        if (!userStats || !userStats.certificationStats?.weight) {
            return null;
        }

        const rank = await statsCollection.countDocuments({
            domainId: this.ctx.domain!._id,
            'certificationStats.weight': { $gt: userStats.certificationStats.weight },
        });

        return {
            uid,
            rank: rank + 1,
            certificationWeight: userStats.certificationStats?.weight || 0,
            certificationCount: userStats.certificationStats?.total || 0,
            series: userStats.certificationStats?.series || {},
            highestLevels: userStats.certificationStats?.highestLevels || {},
        };
    }

    /**
     * 获取竞赛统计信息
     * @returns 全域竞赛统计
     */
    async getCompetitionStats(): Promise<any> {
        const statsCollection = this.ctx.db.collection('exam.user_stats' as any);

        // 聚合查询：统计所有竞赛
        const results = await statsCollection
            .aggregate([
                {
                    $match: { domainId: this.ctx.domain!._id },
                },
                {
                    $group: {
                        _id: null,
                        totalCompetitionCount: { $sum: '$competitionStats.total' },
                        totalCompetitionWeight: { $sum: '$competitionStats.weight' },
                        usersWithCompetitions: {
                            $sum: { $cond: ['$competitionStats.weight', 1, 0] },
                        },
                    },
                },
            ])
            .toArray();

        return results[0] || { totalCompetitionCount: 0, totalCompetitionWeight: 0, usersWithCompetitions: 0 };
    }

    /**
     * 获取考级统计信息
     * @returns 全域考级统计
     */
    async getCertificationStats(): Promise<any> {
        const statsCollection = this.ctx.db.collection('exam.user_stats' as any);

        // 聚合查询：统计所有考级
        const results = await statsCollection
            .aggregate([
                {
                    $match: { domainId: this.ctx.domain!._id },
                },
                {
                    $group: {
                        _id: null,
                        totalCertificationCount: { $sum: '$certificationStats.total' },
                        totalCertificationWeight: { $sum: '$certificationStats.weight' },
                        usersWithCertifications: {
                            $sum: { $cond: ['$certificationStats.weight', 1, 0] },
                        },
                    },
                },
            ])
            .toArray();

        return results[0] || {
            totalCertificationCount: 0,
            totalCertificationWeight: 0,
            usersWithCertifications: 0,
        };
    }

    /**
     * 获取所有考级系列的统计
     * @returns 按系列统计的考级数据
     */
    async getCertificationSeriesStats(): Promise<Record<string, any>> {
        const collection = this.ctx.db.collection('exam.certificates' as any);

        const results = await collection
            .aggregate([
                {
                    $match: {
                        domainId: this.ctx.domain!._id,
                        examType: 'certification',
                        status: 'active',
                    },
                },
                {
                    $group: {
                        _id: '$certificationSeries',
                        count: { $sum: 1 },
                        levels: { $addToSet: '$levelNumber' },
                        avgLevel: { $avg: '$levelNumber' },
                    },
                },
                {
                    $sort: { count: -1 },
                },
            ])
            .toArray();

        const seriesStats = {} as Record<string, any>;
        for (const item of results) {
            seriesStats[item._id || '其他'] = {
                count: item.count,
                levels: (item.levels || []).sort((a: number, b: number) => a - b),
                avgLevel: (item.avgLevel || 0).toFixed(2),
                maxLevel: Math.max(...(item.levels || [0])),
            };
        }

        return seriesStats;
    }
}

export default CertificateService;
