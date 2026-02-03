import { Handler, ObjectId, PRIV } from 'hydrooj';
import { Certificate, CertificateService } from '../services/CertificateService';
import { PresetService } from '../services/PresetService';
import WeightCalculationService from '../services/WeightCalculationService';

/**
 * 权重管理基础处理器
 */
abstract class WeightHandlerBase extends Handler {
    protected checkManagePermission(): void {
        if (this.user.role !== 'admin' && !(this.user.perm & BigInt(PRIV.PRIV_EDIT_SYSTEM))) {
            this.sendError('权限不足', 403);
            throw new Error('PERMISSION_DENIED');
        }
    }

    protected sendSuccess(data: any): void {
        this.response.body = data;
    }

    protected sendError(message: string, code = 400): void {
        this.response.status = code;
        this.response.body = {
            success: false,
            error: message,
        };
    }
}

/**
 * 权重配置处理器
 * GET /exam/admin/weight-config - 获取权重配置
 * PUT /exam/admin/weight-config - 更新权重配置
 */
export class WeightConfigHandler extends WeightHandlerBase {
    /**
     * 获取权重配置
     */
    async get() {
        try {
            this.checkManagePermission();

            const weightService = new WeightCalculationService(this.ctx);
            const config = weightService.getConfig();

            this.sendSuccess({
                success: true,
                data: config,
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            console.error('[WeightHandler] 获取权重配置失败:', err);
            this.sendError(err.message, 500);
        }
    }

    /**
     * 更新权重配置
     */
    async put() {
        try {
            this.checkManagePermission();

            const {
                levelWeights,
                awardWeights,
                examTypeWeights,
                baseWeight,
            } = this.request.body;

            // 验证配置数据
            if (baseWeight !== undefined && (typeof baseWeight !== 'number' || baseWeight <= 0)) {
                this.sendError('基础权重必须是正数', 400);
                return;
            }

            if (levelWeights) {
                const validLevels = ['city', 'province', 'national', 'international'];
                for (const level of validLevels) {
                    if (levelWeights[level] !== undefined && (typeof levelWeights[level] !== 'number' || levelWeights[level] <= 0)) {
                        this.sendError(`级别权重 ${level} 必须是正数`, 400);
                        return;
                    }
                }
            }

            const weightService = new WeightCalculationService(this.ctx);
            weightService.updateConfig({
                levelWeights,
                awardWeights,
                examTypeWeights,
                baseWeight,
            });

            this.sendSuccess({
                success: true,
                message: '权重配置已更新',
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            console.error('[WeightHandler] 更新权重配置失败:', err);
            this.sendError(err.message, 500);
        }
    }
}

/**
 * 权重预览处理器
 * POST /exam/admin/weight-preview - 预览权重计算结果
 */
export class WeightPreviewHandler extends WeightHandlerBase {
    async post() {
        try {
            this.checkManagePermission();

            const { examType, level, awardLevel, presetId, category } = this.request.body;

            // 验证参数
            if (!examType || !['competition', 'certification'].includes(examType)) {
                this.sendError('无效的赛考类型', 400);
                return;
            }

            const validLevels = ['city', 'province', 'national', 'international'];
            if (!level || !validLevels.includes(level)) {
                this.sendError('无效的级别', 400);
                return;
            }

            if (!awardLevel) {
                this.sendError('缺少获奖等级参数', 400);
                return;
            }

            const weightService = new WeightCalculationService(this.ctx);

            // 如果提供了预设ID，获取预设信息
            let preset;
            if (presetId) {
                const presetService = new PresetService(this.ctx);
                preset = await presetService.getPresetById(presetId);
            }

            const result = await weightService.previewWeight(
                examType as 'competition' | 'certification',
                level as any,
                awardLevel,
                preset,
                category,
            );

            this.sendSuccess({
                success: true,
                data: result,
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            console.error('[WeightHandler] 权重预览失败:', err);
            this.sendError(err.message, 500);
        }
    }
}

/**
 * 批量重新计算权重处理器
 * POST /exam/admin/recalculate-weights - 重新计算所有证书权重
 */
export class WeightRecalculationHandler extends WeightHandlerBase {
    async post() {
        try {
            this.checkManagePermission();

            const { certificateIds, recalculateAll = false } = this.request.body;

            const certificateService = new CertificateService(this.ctx);
            const presetService = new PresetService(this.ctx);
            const weightService = new WeightCalculationService(this.ctx);

            let certificates: Certificate[];
            if (recalculateAll) {
                // 重新计算所有证书
                certificates = await certificateService.getAllCertificates();
            } else if (certificateIds && Array.isArray(certificateIds)) {
                // 重新计算指定证书
                const objectIds = certificateIds
                    .filter((id: any) => ObjectId.isValid(id))
                    .map((id: any) => new ObjectId(id));

                if (objectIds.length === 0) {
                    this.sendError('无效的证书ID列表', 400);
                    return;
                }

                certificates = await certificateService.getCertificatesByIds(objectIds);
            } else {
                this.sendError('请提供证书ID列表或设置 recalculateAll 为 true', 400);
                return;
            }

            // 获取所有预设
            const allPresets = await presetService.getAllPresets();
            const presetMap = new Map(
                allPresets.map((preset) => [preset._id!.toString(), preset]),
            );

            // 批量计算权重
            const weightResults = await weightService.batchCalculateWeights(certificates, presetMap);

            // 优化：批量更新证书权重，使用 Promise.all 并发执行
            const updatePromises = certificates.map(async (cert) => {
                if (!cert._id) return false;

                const weightResult = weightResults.get(cert._id.toString());
                if (weightResult) {
                    await certificateService.updateCertificate(cert._id, {
                        calculatedWeight: weightResult.finalWeight,
                        weightBreakdown: weightResult.breakdown,
                    });
                    return true;
                }
                return false;
            });

            const updateResults = await Promise.all(updatePromises);
            const updatedCount = updateResults.filter((success) => success).length;

            // 优化：批量重新计算用户统计，使用 Promise.all 并发执行
            const affectedUsers = [...new Set(certificates.map((cert) => cert.uid))];
            await Promise.all(
                affectedUsers.map((uid: number) => certificateService.updateUserStats(uid)),
            );

            this.sendSuccess({
                success: true,
                message: `成功重新计算 ${updatedCount} 个证书的权重`,
                data: {
                    totalCertificates: certificates.length,
                    updatedCount,
                    affectedUsers: affectedUsers.length,
                },
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            console.error('[WeightHandler] 批量重新计算权重失败:', err);
            this.sendError(err.message, 500);
        }
    }
}

/**
 * 权重统计处理器
 * GET /exam/admin/weight-stats - 获取权重分布统计
 */
export class WeightStatsHandler extends WeightHandlerBase {
    async get() {
        try {
            this.checkManagePermission();

            const certificateService = new CertificateService(this.ctx);
            const certificates = await certificateService.getAllCertificates();

            // 统计权重分布
            const weightRanges = [
                { min: 0, max: 10, label: '0-10分' },
                { min: 10, max: 20, label: '10-20分' },
                { min: 20, max: 30, label: '20-30分' },
                { min: 30, max: 50, label: '30-50分' },
                { min: 50, max: 100, label: '50-100分' },
                { min: 100, max: Infinity, label: '100分以上' },
            ];

            const distribution = weightRanges.map((range) => ({
                ...range,
                count: certificates.filter((cert) => {
                    const weight = cert.calculatedWeight || cert.weight || 0;
                    return weight >= range.min && weight < range.max;
                }).length,
            }));

            // 按级别统计
            const levelStats = certificates.reduce((acc, cert) => {
                // 从预设获取级别信息（这里简化处理）
                const level = 'unknown'; // 实际应该从预设中获取
                acc[level] = (acc[level] || 0) + (cert.calculatedWeight || cert.weight || 0);
                return acc;
            }, {} as Record<string, number>);

            // 按类型统计
            const typeStats = certificates.reduce((acc, cert) => {
                const type = cert.examType || 'unknown';
                acc[type] = (acc[type] || 0) + (cert.calculatedWeight || cert.weight || 0);
                return acc;
            }, {} as Record<string, number>);

            this.sendSuccess({
                success: true,
                data: {
                    totalCertificates: certificates.length,
                    averageWeight: certificates.length > 0
                        ? certificates.reduce((sum, cert) => sum + (cert.calculatedWeight || cert.weight || 0), 0) / certificates.length
                        : 0,
                    distribution,
                    levelStats,
                    typeStats,
                },
            });
        } catch (err: any) {
            if (err.message === 'PERMISSION_DENIED') return;
            console.error('[WeightHandler] 获取权重统计失败:', err);
            this.sendError(err.message, 500);
        }
    }
}

export default {
    WeightConfigHandler,
    WeightPreviewHandler,
    WeightRecalculationHandler,
    WeightStatsHandler,
};
