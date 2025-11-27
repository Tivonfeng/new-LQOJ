import { Context } from 'hydrooj';
import { Certificate } from './CertificateService';
import { CertificatePreset, Level } from './PresetService';

/**
 * 权重计算配置
 */
export interface WeightConfig {
    // 级别权重系数 (40% 权重)
    levelWeights: Record<Level | 'international', number>;

    // 奖项权重系数 (35% 权重)
    awardWeights: {
        competition: Record<string, number>;
        certification: Record<string, number>;
    };

    // 赛考类型权重系数 (20% 权重)
    examTypeWeights: {
        competition: number;
        certification: number;
    };

    // 基础权重
    baseWeight: number;
}

/**
 * 权重计算结果
 */
export interface WeightCalculationResult {
    finalWeight: number;
    breakdown: {
        baseWeight: number;
        levelFactor: number;
        awardFactor: number;
        typeFactor: number;
        calculation: string; // 计算过程说明
    };
}

/**
 * 权重计算服务
 * 基于多个维度自动计算证书权重
 */
export class WeightCalculationService {
    private ctx: Context;
    private config: WeightConfig;

    constructor(ctx: Context) {
        this.ctx = ctx;
        this.config = this.getDefaultConfig();
    }

    /**
     * 获取默认权重配置
     */
    private getDefaultConfig(): WeightConfig {
        return {
            levelWeights: {
                city: 1.0, // 市级基础权重
                province: 1.5, // 省级 +50%
                national: 2.0, // 国家级 +100%
                international: 3.0, // 国际级 +200%
            },

            awardWeights: {
                competition: {
                    一等奖: 1.0,
                    二等奖: 0.8,
                    三等奖: 0.6,
                    优秀奖: 0.4,
                    参与奖: 0.2,
                    入围奖: 0.3,
                    鼓励奖: 0.2,
                },
                certification: {
                    通过: 1.0,
                    优秀: 1.2,
                    良好: 1.1,
                    合格: 1.0,
                },
            },

            examTypeWeights: {
                competition: 1.2, // 竞赛权重稍高
                certification: 1.0, // 考级基础权重
            },

            baseWeight: 10, // 基础权重分
        };
    }

    /**
     * 计算证书权重
     */
    async calculateCertificateWeight(
        certificate: Certificate,
        preset?: CertificatePreset,
    ): Promise<WeightCalculationResult> {
        const breakdown = {
            baseWeight: this.config.baseWeight,
            levelFactor: 1.0,
            awardFactor: 1.0,
            typeFactor: 1.0,
            calculation: '',
        };

        // 1. 级别权重系数 (50% 权重)
        if (preset?.level) {
            breakdown.levelFactor = this.config.levelWeights[preset.level] || 1.0;
        }

        // 2. 奖项权重系数 (40% 权重)
        if (certificate.level && certificate.examType) {
            const awardWeights = this.config.awardWeights[certificate.examType];
            breakdown.awardFactor = awardWeights?.[certificate.level] || 1.0;
        }

        // 3. 赛考类型权重系数 (10% 权重)
        if (certificate.examType) {
            breakdown.typeFactor = this.config.examTypeWeights[certificate.examType] || 1.0;
        }

        // 计算最终权重
        const finalWeight = Math.round(
            breakdown.baseWeight
            * breakdown.levelFactor
            * breakdown.awardFactor
            * breakdown.typeFactor
            * 100,
        ) / 100; // 保留两位小数

        // 生成计算说明
        breakdown.calculation = this.generateCalculationExplanation(breakdown, preset, certificate);

        return {
            finalWeight,
            breakdown,
        };
    }

    /**
     * 生成权重计算说明
     */
    private generateCalculationExplanation(
        breakdown: WeightCalculationResult['breakdown'],
        preset?: CertificatePreset,
        certificate?: Certificate,
    ): string {
        const parts = [
            `基础权重: ${breakdown.baseWeight}分`,
        ];

        if (breakdown.levelFactor !== 1.0) {
            const levelText = this.getLevelText(preset?.level);
            parts.push(`${levelText}系数: ×${breakdown.levelFactor}`);
        }

        if (breakdown.awardFactor !== 1.0) {
            parts.push(`${certificate?.level}系数: ×${breakdown.awardFactor}`);
        }

        if (breakdown.typeFactor !== 1.0) {
            const typeText = certificate?.examType === 'competition' ? '竞赛' : '考级';
            parts.push(`${typeText}系数: ×${breakdown.typeFactor}`);
        }

        return parts.join(' → ');
    }

    /**
     * 获取级别文本
     */
    private getLevelText(level?: Level | 'international'): string {
        const levelTexts = {
            city: '市级',
            province: '省级',
            national: '国家级',
            international: '国际级',
        };
        return levelTexts[level as keyof typeof levelTexts] || '未知级别';
    }

    /**
     * 批量计算证书权重
     */
    async batchCalculateWeights(
        certificates: Certificate[],
        presets: Map<string, CertificatePreset>,
    ): Promise<Map<string, WeightCalculationResult>> {
        const results = new Map<string, WeightCalculationResult>();

        // 批量处理以提高性能
        const promises = certificates.map(async (cert) => {
            if (!cert._id) return null;

            const preset = cert.presetId ? presets.get(cert.presetId.toString()) : undefined;
            const result = await this.calculateCertificateWeight(cert, preset);
            return { id: cert._id.toString(), result };
        });

        const resolvedResults = await Promise.all(promises);
        for (const item of resolvedResults) {
            if (item) {
                results.set(item.id, item.result);
            }
        }

        return results;
    }

    /**
     * 获取权重配置
     */
    getConfig(): WeightConfig {
        return { ...this.config };
    }

    /**
     * 更新权重配置
     */
    updateConfig(newConfig: Partial<WeightConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('[WeightCalculationService] 权重配置已更新');
    }

    /**
     * 预览权重计算结果（不保存）
     */
    async previewWeight(
        examType: 'competition' | 'certification',
        level: Level | 'international',
        awardLevel: string,
    ): Promise<WeightCalculationResult> {
        const mockCertificate: Partial<Certificate> = {
            examType,
            level: awardLevel,
        };

        const mockPreset: Partial<CertificatePreset> = {
            level: level as Level,
        };

        return this.calculateCertificateWeight(
            mockCertificate as Certificate,
            mockPreset as CertificatePreset,
        );
    }
}

export default WeightCalculationService;
