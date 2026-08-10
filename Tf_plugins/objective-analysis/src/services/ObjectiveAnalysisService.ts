import { STATUS } from '@hydrooj/common';
import { yaml } from '@hydrooj/utils';
import { streamToBuffer } from '@hydrooj/utils/lib/utils';
import { Context, ProblemModel, RecordModel, StorageModel } from 'hydrooj';

export interface ObjectiveAnalysisDoc {
    domainId: string;
    pid: number | string;
    analysis: Record<string, string>;
    updatedAt: Date;
    updatedBy: number;
}

const COLLECTION = 'objective.analysis';

export class ObjectiveAnalysisService {
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    private collection() {
        return this.ctx.db.collection(COLLECTION as any);
    }

    /**
     * 读取题目 testdata 中的 config.yaml 原始内容（权威来源，与判分同一文件）
     */
    async getConfig(domainId: string, pid: string | number) {
        const pdoc = await ProblemModel.get(domainId, pid);
        if (!pdoc) return null;
        const configFile = (pdoc.data || []).find((i) => i.name.toLowerCase() === 'config.yaml');
        if (!configFile) return { pdoc, raw: '', config: null };
        let raw = '';
        try {
            raw = (await streamToBuffer(
                await StorageModel.get(`problem/${pdoc.domainId}/${pdoc.docId}/testdata/${configFile.name}`),
            )).toString();
        } catch (e) { /* 文件可能不存在，忽略 */ }
        let config: any = null;
        try {
            config = yaml.load(raw);
        } catch (e) { /* 解析失败忽略 */ }
        return { pdoc, raw, config };
    }

    /**
     * 备份集合：解析的唯一权威数据源（与答案分离存储，避免核心配置编辑器过滤冲突）
     */
    async getBackup(domainId: string, pid: string | number): Promise<ObjectiveAnalysisDoc | null> {
        return await this.collection().findOne({ domainId, pid }) as ObjectiveAnalysisDoc | null;
    }

    async setBackup(domainId: string, pid: string | number, analysis: Record<string, string>, uid: number) {
        await this.collection().updateOne(
            { domainId, pid },
            { $set: { analysis, updatedAt: new Date(), updatedBy: uid } },
            { upsert: true },
        );
    }

    /**
     * 查询用户对该题的最新一条提交记录
     */
    async getLatestRecord(domainId: string, pid: string | number, uid: number) {
        const docId = Number.isSafeInteger(+pid) ? +pid : (pid as number);
        return await RecordModel.coll.find(
            { domainId, pid: docId, uid, status: { $ne: STATUS.STATUS_CANCELED } },
            { sort: { _id: -1 } },
        ).next() as any;
    }
}
