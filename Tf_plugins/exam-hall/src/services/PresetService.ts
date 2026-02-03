import { Context, ObjectId } from 'hydrooj';

/**
 * 赛项类型枚举 - 用于智能权重推荐
 */
export enum ExamEventType {
    // 比赛阶段类型
    PRELIMINARY = 'preliminary',
    SEMI_FINAL = 'semi_final',
    FINAL = 'final',
    QUALIFYING = 'qualifying',
    SELECTION = 'selection',

    // 考级等级类型
    LEVEL_1 = 'level_1',
    LEVEL_2 = 'level_2',
    LEVEL_3 = 'level_3',
    LEVEL_4 = 'level_4',
    LEVEL_5 = 'level_5',
    LEVEL_6 = 'level_6',
    LEVEL_7 = 'level_7',
    LEVEL_8 = 'level_8',

    // 其他类型
    THEORY = 'theory',
    PRACTICAL = 'practical',
    COMPREHENSIVE = 'comprehensive',
    OTHER = 'other',
}

/**
 * 赛项权重推荐配置
 */
export interface ExamEventWeightConfig {
    // 比赛阶段权重映射
    competitionStages: Record<string, number>;
    // 考级等级权重映射
    certificationLevels: Record<string, number>;
    // 其他类型权重映射
    otherTypes: Record<string, number>;
}

/**
 * 赛项数据接口
 */
export interface ExamEvent {
    name: string;
    description?: string;
    // 赛项权重系数（默认为1.0，支持自动推荐）
    weight?: number;
    // 赛项类型，用于智能权重推荐
    eventType?: ExamEventType;
    // 是否使用自动推荐权重（默认为true）
    autoWeight?: boolean;
}

/**
 * 级别类型
 */
export type Level = 'city' | 'province' | 'national';

/**
 * 证书预设接口
 * 用于管理比赛/考级的预设配置
 */
export interface CertificatePreset {
    _id?: ObjectId;
    domainId: ObjectId;
    // 预设类型：竞赛(competition) 或 考级(certification)
    type: 'competition' | 'certification';
    // 预设名称（比赛/考级名称）
    name: string;
    // 认证机构
    certifyingBody: string;
    // 级别：市级(city)、省级(province)、国家级(national)
    level: Level;
    // 描述
    description?: string;
    // 赛项列表，每个赛项都有独立的权重
    events?: ExamEvent[];
    // 创建时间
    createdAt: Date;
    // 更新时间
    updatedAt: Date;
    // 是否启用
    enabled: boolean;
}

/**
 * 赛项权重推荐服务
 */
export class ExamEventWeightRecommender {
    /**
     * 默认权重配置
     */
    private static readonly DEFAULT_CONFIG: ExamEventWeightConfig = {
        // 比赛阶段权重（基于比赛重要性和难度）
        competitionStages: {
            [ExamEventType.PRELIMINARY]: 0.6,
            [ExamEventType.QUALIFYING]: 0.5,
            [ExamEventType.SELECTION]: 0.7,
            [ExamEventType.SEMI_FINAL]: 1.2,
            [ExamEventType.FINAL]: 1.5,
        },

        // 考级等级权重（基于等级难度递增）
        certificationLevels: {
            [ExamEventType.LEVEL_1]: 0.3,
            [ExamEventType.LEVEL_2]: 0.4,
            [ExamEventType.LEVEL_3]: 0.6,
            [ExamEventType.LEVEL_4]: 0.8,
            [ExamEventType.LEVEL_5]: 1.0,
            [ExamEventType.LEVEL_6]: 1.3,
            [ExamEventType.LEVEL_7]: 1.6,
            [ExamEventType.LEVEL_8]: 2.0,
        },

        // 其他类型权重
        otherTypes: {
            [ExamEventType.THEORY]: 0.8,
            [ExamEventType.PRACTICAL]: 1.2,
            [ExamEventType.COMPREHENSIVE]: 1.0,
            [ExamEventType.OTHER]: 1.0,
        },
    };

    /**
     * 根据赛项名称智能识别赛项类型
     */
    static recognizeEventType(eventName: string, examType: 'competition' | 'certification'): ExamEventType {
        const name = eventName.toLowerCase().trim();

        if (examType === 'competition') {
            // 比赛阶段识别
            if (name.includes('初赛') || name.includes('preliminary') || name.includes('初选')) {
                return ExamEventType.PRELIMINARY;
            }
            if (name.includes('复赛') || name.includes('semi') || name.includes('半决赛')) {
                return ExamEventType.SEMI_FINAL;
            }
            if (name.includes('决赛') || name.includes('final') || name.includes('总决赛')) {
                return ExamEventType.FINAL;
            }
            if (name.includes('资格赛') || name.includes('qualifying')) {
                return ExamEventType.QUALIFYING;
            }
            if (name.includes('选拔') || name.includes('selection')) {
                return ExamEventType.SELECTION;
            }
        } else {
            // 考级等级识别
            const levelMatch = name.match(/(\d+)级|level\s*(\d+)/i);
            if (levelMatch) {
                const level = Number.parseInt(levelMatch[1] || levelMatch[2], 10);
                switch (level) {
                    case 1: return ExamEventType.LEVEL_1;
                    case 2: return ExamEventType.LEVEL_2;
                    case 3: return ExamEventType.LEVEL_3;
                    case 4: return ExamEventType.LEVEL_4;
                    case 5: return ExamEventType.LEVEL_5;
                    case 6: return ExamEventType.LEVEL_6;
                    case 7: return ExamEventType.LEVEL_7;
                    case 8: return ExamEventType.LEVEL_8;
                }
            }
        }

        // 其他类型识别
        if (name.includes('理论') || name.includes('theory')) {
            return ExamEventType.THEORY;
        }
        if (name.includes('实践') || name.includes('practical') || name.includes('上机')) {
            return ExamEventType.PRACTICAL;
        }
        if (name.includes('综合') || name.includes('comprehensive')) {
            return ExamEventType.COMPREHENSIVE;
        }

        return ExamEventType.OTHER;
    }

    /**
     * 获取赛项推荐权重
     */
    static getRecommendedWeight(eventType: ExamEventType, examType: 'competition' | 'certification'): number {
        if (examType === 'competition') {
            return this.DEFAULT_CONFIG.competitionStages[eventType]
                || this.DEFAULT_CONFIG.otherTypes[eventType]
                || 1.0;
        } else {
            return (
                this.DEFAULT_CONFIG.certificationLevels[eventType]
                || this.DEFAULT_CONFIG.otherTypes[eventType]
                || 1.0
            );
        }
    }

    /**
     * 为赛项列表自动推荐权重
     */
    static recommendWeightsForEvents(
        events: ExamEvent[],
        examType: 'competition' | 'certification',
    ): ExamEvent[] {
        return events.map((event) => {
            if (event.autoWeight !== false) { // 默认开启自动权重
                const recognizedType = event.eventType
                    || this.recognizeEventType(event.name, examType);
                const recommendedWeight = this.getRecommendedWeight(recognizedType, examType);

                return {
                    ...event,
                    eventType: recognizedType,
                    weight: event.weight || recommendedWeight,
                };
            }
            return event;
        });
    }

    /**
     * 获取权重配置说明
     */
    static getWeightConfigDescription(): string {
        return `
赛项权重智能推荐配置：

🎯 比赛阶段权重：
  - 资格赛/选拔赛: 0.5-0.7 (基础难度)
  - 初赛: 0.6 (入门级别)
  - 复赛: 1.2 (决赛圈)
  - 决赛: 1.5 (最高荣誉)

📚 考级等级权重：
  - 1-2级: 0.3-0.4 (基础等级)
  - 3-4级: 0.6-0.8 (进阶等级)
  - 5级: 1.0 (标准水平)
  - 6-7级: 1.3-1.6 (专业水平)
  - 8级: 2.0 (最高等级)

🔧 其他类型权重：
  - 理论考试: 0.8
  - 实践考试: 1.2
  - 综合考试: 1.0
        `.trim();
    }
}

/**
 * 证书预设服务类
 */
export class PresetService {
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    private get domainId(): ObjectId {
        return this.ctx.domain!._id as any as ObjectId;
    }

    private get presets(): any {
        return this.ctx.db.collection('exam.presets' as any);
    }

    private buildDomainQuery(filter: any = {}): any {
        return {
            domainId: this.domainId,
            ...filter,
        };
    }

    /**
     * 创建新预设
     */
    async createPreset(data: Omit<CertificatePreset, '_id' | 'domainId' | 'createdAt' | 'updatedAt' | 'enabled'>): Promise<CertificatePreset> {
        // 为赛项自动推荐权重
        const eventsWithWeights = ExamEventWeightRecommender.recommendWeightsForEvents(
            data.events ?? [],
            data.type,
        );

        const preset: CertificatePreset = {
            domainId: this.domainId,
            type: data.type,
            name: data.name,
            certifyingBody: data.certifyingBody,
            level: data.level,
            description: data.description,
            events: eventsWithWeights,
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await this.presets.insertOne(preset);
        preset._id = result.insertedId;

        console.log(`[ExamHall] 创建预设成功: type=${data.type}, name=${data.name}, level=${data.level}`);
        return preset;
    }

    /**
     * 更新预设
     */
    async updatePreset(id: ObjectId, data: Partial<CertificatePreset>): Promise<CertificatePreset> {
        const updateData: any = {
            ...data,
            updatedAt: new Date(),
        };

        // 删除不应该被更新的字段
        delete updateData._id;
        delete updateData.domainId;
        delete updateData.createdAt;

        // 如果更新了赛项，为赛项自动推荐权重
        if (updateData.events) {
            // 获取当前预设以确定类型
            const currentPreset = await this.presets.findOne({ _id: id, domainId: this.domainId });
            if (currentPreset) {
                updateData.events = ExamEventWeightRecommender.recommendWeightsForEvents(
                    updateData.events,
                    currentPreset.type,
                );
            }
        }

        // 使用 findOneAndUpdate 进行原子操作，会自动返回 null 如果找不到文档
        const updatedPreset = await this.presets.findOneAndUpdate(
            { _id: id, domainId: this.domainId },
            { $set: updateData },
            { returnDocument: 'after' },
        );

        if (!updatedPreset) {
            console.error(`[ExamHall] 更新失败: 权限不足 id=${id}, domainId=${this.ctx.domain!._id}`);
            throw new Error('预设不存在或无权限修改');
        }

        console.log(`[ExamHall] 更新预设成功: id=${id}`);
        return updatedPreset as CertificatePreset;
    }

    /**
     * 删除预设
     */
    async deletePreset(id: ObjectId): Promise<boolean> {
        const result = await this.presets.deleteOne({ _id: id, domainId: this.domainId });

        if (result.deletedCount > 0) {
            console.log(`[ExamHall] 删除预设成功: id=${id}`);
            return true;
        }

        return false;
    }

    /**
     * 获取预设详情
     */
    async getPresetById(id: ObjectId): Promise<CertificatePreset | null> {
        return this.presets.findOne({ _id: id, domainId: this.domainId });
    }

    /**
     * 获取指定类型的所有预设
     */
    async getPresetsByType(type: 'competition' | 'certification', enabledOnly = true): Promise<CertificatePreset[]> {
        const query = this.buildDomainQuery({ type });

        if (enabledOnly) {
            query.enabled = true;
        }

        return this.presets
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();
    }

    /**
     * 获取所有预设
     */
    async getAllPresets(enabledOnly = false): Promise<CertificatePreset[]> {
        const query = this.buildDomainQuery();

        if (enabledOnly) {
            query.enabled = true;
        }

        return this.presets
            .find(query)
            .sort({ type: 1, createdAt: -1 })
            .toArray();
    }

    /**
     * 切换预设的启用状态
     */
    async togglePreset(id: ObjectId, enabled: boolean): Promise<CertificatePreset> {
        const updatedPreset = await this.presets.findOneAndUpdate(
            { _id: id, domainId: this.domainId },
            { $set: { enabled, updatedAt: new Date() } },
            { returnDocument: 'after' },
        );

        if (!updatedPreset) {
            throw new Error('预设不存在');
        }

        return updatedPreset as CertificatePreset;
    }

    /**
     * 批量删除预设
     */
    async deletePresets(ids: ObjectId[]): Promise<number> {
        const result = await this.presets.deleteMany({
            _id: { $in: ids },
            domainId: this.domainId,
        });

        console.log(`[ExamHall] 批量删除预设: 删除${result.deletedCount}个`);
        return result.deletedCount;
    }
}

export default PresetService;
