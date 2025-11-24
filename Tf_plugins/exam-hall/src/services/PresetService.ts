import { Collection, Filter, ObjectId } from 'mongodb';
import { Context } from 'hydrooj';

/**
 * 赛项数据接口
 */
export interface ExamEvent {
    name: string;
    description?: string;
}

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
    // 权重值（用于排行榜计算）
    weight?: number;
    // 描述
    description?: string;
    // 赛项列表
    events?: ExamEvent[];
    // 创建时间
    createdAt: Date;
    // 更新时间
    updatedAt: Date;
    // 是否启用
    enabled: boolean;
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

    private get presets(): Collection<CertificatePreset> {
        return this.ctx.db.collection('exam.presets' as any) as Collection<CertificatePreset>;
    }

    private buildDomainQuery(filter: Filter<CertificatePreset> = {}): Filter<CertificatePreset> {
        return {
            domainId: this.domainId,
            ...filter,
        };
    }

    /**
     * 创建新预设
     */
    async createPreset(data: Omit<CertificatePreset, '_id' | 'domainId' | 'createdAt' | 'updatedAt' | 'enabled'>): Promise<CertificatePreset> {
        const preset: CertificatePreset = {
            domainId: this.domainId,
            type: data.type,
            name: data.name,
            certifyingBody: data.certifyingBody,
            weight: data.weight ?? 1,
            description: data.description,
            events: data.events ?? [],
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await this.presets.insertOne(preset);
        preset._id = result.insertedId;

        console.log(`[ExamHall] 创建预设成功: type=${data.type}, name=${data.name}`);
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
