import { ObjectId } from 'mongodb';
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

    /**
     * 创建新预设
     */
    async createPreset(data: Omit<CertificatePreset, '_id' | 'domainId' | 'createdAt' | 'updatedAt' | 'enabled'>): Promise<CertificatePreset> {
        const collection = this.ctx.db.collection('exam.presets' as any);

        const preset: CertificatePreset = {
            domainId: this.ctx.domain!._id as any as ObjectId,
            type: data.type,
            name: data.name,
            certifyingBody: data.certifyingBody,
            weight: data.weight || 1,
            description: data.description,
            events: data.events || [],
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await collection.insertOne(preset);
        preset._id = result.insertedId;

        console.log(`[ExamHall] 创建预设成功: type=${data.type}, name=${data.name}`);
        return preset;
    }

    /**
     * 更新预设
     */
    async updatePreset(id: ObjectId, data: Partial<CertificatePreset>): Promise<CertificatePreset> {
        const collection = this.ctx.db.collection('exam.presets' as any);

        const updateData: any = {
            ...data,
            updatedAt: new Date(),
        };

        // 删除不应该被更新的字段
        delete updateData._id;
        delete updateData.domainId;
        delete updateData.createdAt;

        console.log(`[ExamHall] 执行更新: 查询条件 id=${id}, domainId=${this.ctx.domain!._id}`);

        // 首先检查预设是否存在
        const existingPreset = await collection.findOne({ _id: id });
        if (!existingPreset) {
            console.error(`[ExamHall] 预设完全不存在: id=${id}`);
            throw new Error('预设不存在');
        }

        console.log(`[ExamHall] 找到预设, domainId=${existingPreset.domainId}, ctx.domain=${this.ctx.domain!._id}`);

        const result = await collection.findOneAndUpdate(
            { _id: id, domainId: this.ctx.domain!._id },
            { $set: updateData },
            { returnDocument: 'after' },
        );

        if (!result.value) {
            console.error(`[ExamHall] 更新失败: 权限不足 id=${id}, domainId=${this.ctx.domain!._id}`);
            throw new Error('预设不存在或无权限修改');
        }

        console.log(`[ExamHall] 更新预设成功: id=${id}`);
        return result.value as CertificatePreset;
    }

    /**
     * 删除预设
     */
    async deletePreset(id: ObjectId): Promise<boolean> {
        const collection = this.ctx.db.collection('exam.presets' as any);

        const result = await collection.deleteOne({ _id: id, domainId: this.ctx.domain!._id });

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
        const collection = this.ctx.db.collection('exam.presets' as any);
        return (await collection.findOne({ _id: id, domainId: this.ctx.domain!._id })) as CertificatePreset | null;
    }

    /**
     * 获取指定类型的所有预设
     */
    async getPresetsByType(type: 'competition' | 'certification', enabledOnly = true): Promise<CertificatePreset[]> {
        const collection = this.ctx.db.collection('exam.presets' as any);

        const query: any = {
            domainId: this.ctx.domain!._id,
            type,
        };

        if (enabledOnly) {
            query.enabled = true;
        }

        return (await collection
            .find(query)
            .sort({ createdAt: -1 })
            .toArray()) as CertificatePreset[];
    }

    /**
     * 获取所有预设
     */
    async getAllPresets(enabledOnly = false): Promise<CertificatePreset[]> {
        const collection = this.ctx.db.collection('exam.presets' as any);

        const query: any = {
            domainId: this.ctx.domain!._id,
        };

        if (enabledOnly) {
            query.enabled = true;
        }

        return (await collection
            .find(query)
            .sort({ type: 1, createdAt: -1 })
            .toArray()) as CertificatePreset[];
    }

    /**
     * 切换预设的启用状态
     */
    async togglePreset(id: ObjectId, enabled: boolean): Promise<CertificatePreset> {
        const collection = this.ctx.db.collection('exam.presets' as any);

        const result = await collection.findOneAndUpdate(
            { _id: id, domainId: this.ctx.domain!._id },
            { $set: { enabled, updatedAt: new Date() } },
            { returnDocument: 'after' },
        );

        if (!result.value) {
            throw new Error('预设不存在');
        }

        return result.value as CertificatePreset;
    }

    /**
     * 批量删除预设
     */
    async deletePresets(ids: ObjectId[]): Promise<number> {
        const collection = this.ctx.db.collection('exam.presets' as any);

        const result = await collection.deleteMany({
            _id: { $in: ids },
            domainId: this.ctx.domain!._id,
        });

        console.log(`[ExamHall] 批量删除预设: 删除${result.deletedCount}个`);
        return result.deletedCount;
    }
}

export default PresetService;
