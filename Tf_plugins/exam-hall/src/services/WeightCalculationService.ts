import { Context } from 'hydrooj';
import { Certificate } from './CertificateService';
import { CertificatePreset, Level } from './PresetService';

/**
 * 权重计算配置
 */
export interface WeightConfig {
    // 级别权重系数 (40% 权重)
    levelWeights: Record<Level, number>;

    // 奖项权重系数 (30% 权重)
    awardWeights: {
        competition: Record<string, number>;
        certification: Record<string, number>;
    };

    // 赛考类型权重系数 (15% 权重)
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
        categoryFactor: number;
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
     * 竞赛权重范围: 10 ~ 80 分
     * 考级权重范围: 5 ~ 24 分（降低，因为考级通过不能和竞赛获奖相提并论）
     * 竞赛积分 = 权重 × 10，范围: 100 ~ 800 分
     * 考级积分 = 权重 × 20，范围: 100 ~ 480 分
     */
    private getDefaultConfig(): WeightConfig {
        return {
            levelWeights: {
                city: 1.0, // 市级基础权重
                province: 2.0, // 省级 +100%
                national: 4.0, // 国家级 +300%
            },

            awardWeights: {
                competition: {
                    一等奖: 2.0,
                    二等奖: 1.6,
                    三等奖: 1.3,
                    优秀奖: 1.0,
                },
                certification: {
                    通过: 1.2, // 考级统一权重
                },
            },

            examTypeWeights: {
                competition: 1.0, // 竞赛基础权重
                certification: 0.5, // 考级基础权重（降低，因为考级通过不能和竞赛获奖相提并论）
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
            categoryFactor: 1.0,
            calculation: '',
        };

        // 1. 级别权重系数 (40% 权重)
        if (preset?.level) {
            breakdown.levelFactor = this.config.levelWeights[preset.level] || 1.0;
        }

        // 2. 奖项权重系数 (30% 权重)
        if (certificate.level && certificate.examType) {
            const awardWeights = this.config.awardWeights[certificate.examType];
            breakdown.awardFactor = awardWeights?.[certificate.level] || 1.0;
        }

        // 3. 赛考类型权重系数 (15% 权重)
        if (certificate.examType) {
            breakdown.typeFactor = this.config.examTypeWeights[certificate.examType] || 1.0;
        }

        // 4. 赛项权重系数 (15% 权重)
        if (certificate.category && preset?.events) {
            // 从预设的赛项列表中查找匹配的赛项权重
            const matchedEvent = preset.events.find(event => event.name === certificate.category);
            breakdown.categoryFactor = matchedEvent?.weight || 1.0;
        }

        // 计算最终权重
        const finalWeight = Math.round(
            breakdown.baseWeight
            * breakdown.levelFactor
            * breakdown.awardFactor
            * breakdown.typeFactor
            * breakdown.categoryFactor
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

        if (breakdown.categoryFactor !== 1.0) {
            parts.push(`${certificate?.category || '赛项'}系数: ×${breakdown.categoryFactor}`);
        }

        return parts.join(' → ');
    }

    /**
     * 获取级别文本
     */
    private getLevelText(level?: Level): string {
        const levelTexts: Record<Level, string> = {
            city: '市级',
            province: '省级',
            national: '国家级',
        };
        return level ? levelTexts[level] : '未知级别';
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
        level: Level,
        awardLevel: string,
        preset?: CertificatePreset,
        category?: string,
    ): Promise<WeightCalculationResult> {
        const mockCertificate: Partial<Certificate> = {
            examType,
            level: awardLevel,
            category,
        };

        return this.calculateCertificateWeight(
            mockCertificate as Certificate,
            preset,
        );
    }
}

export default WeightCalculationService;
