import {
    Handler,
    ObjectId,
} from 'hydrooj';
import { ThinkingTimeService } from '../services';

export class ThinkingTimeHandler extends Handler {
    async post(args: any) {
        const { thinkingTime, rid, action, pid } = args;

        if (action === 'forceUpdateStats') {
            try {
                if (!pid) {
                    this.response.body = { success: false, message: '缺少题目ID' };
                    return;
                }

                const service = new ThinkingTimeService(this.ctx);

                const acRecords = await service.recordColl.find({
                    pid,
                    domainId: this.domain._id,
                    status: 1,
                    thinkingTime: { $exists: true, $gt: 0 },
                }).limit(5).toArray();

                if (acRecords.length > 0) {
                    await service.updateProblemThinkingTimeStats(pid, this.domain._id);
                }

                const problemDoc = await service.documentColl.findOne({
                    docType: 10,
                    domainId: this.domain._id,
                    docId: pid,
                });

                this.response.body = {
                    success: true,
                    message: `统计数据已更新，找到${acRecords.length}条AC记录`,
                    acRecordsCount: acRecords.length,
                    updatedStats: problemDoc?.thinkingTimeStats || null,
                };
                return;
            } catch (error: any) {
                this.response.body = {
                    success: false,
                    message: `更新失败: ${error.message}`,
                };
                return;
            }
        }

        if (!thinkingTime || !rid) {
            throw new Error('缺少必要参数');
        }

        if (thinkingTime > 24 * 60 * 60) {
            throw new Error('思考时间过长，请检查数据');
        }

        let objectId: ObjectId;
        try {
            if (typeof rid === 'string') {
                objectId = new ObjectId(rid);
            } else if (rid instanceof ObjectId) {
                objectId = rid;
            } else {
                throw new TypeError('无效的记录ID格式');
            }
        } catch (error) {
            throw new Error(`无效的记录ID: ${rid}`);
        }

        const service = new ThinkingTimeService(this.ctx);
        await service.updateRecordThinkingTime(objectId, thinkingTime);

        this.response.body = {
            success: true,
            message: `记录思考时间成功: ${Math.round(thinkingTime / 60)}分${thinkingTime % 60}秒`,
        };
    }

    async getUserStats(args: any) {
        const { uid } = args;
        const targetUid = uid || Number(this.user._id);

        if (targetUid !== Number(this.user._id)) {
            throw new Error('无权限查看其他用户数据');
        }

        const service = new ThinkingTimeService(this.ctx);
        const stats = await service.getUserStats(targetUid, this.domain._id);
        this.response.body = { stats };
    }

    async getProblemStats(args: any) {
        const { pid } = args;
        if (!pid) {
            throw new Error('缺少题目ID');
        }

        const service = new ThinkingTimeService(this.ctx);
        const stats = await service.getProblemStats(pid, this.domain._id);
        this.response.body = { stats };
    }

    async getProblemThinkingTimeStats(args: any) {
        const { pid } = args;
        if (!pid) {
            throw new Error('缺少题目ID');
        }

        const service = new ThinkingTimeService(this.ctx);

        const problemDoc = await service.documentColl.findOne({
            docType: 10,
            domainId: this.domain._id,
            docId: pid,
        });

        if (problemDoc?.thinkingTimeStats) {
            this.response.body = {
                success: true,
                stats: problemDoc.thinkingTimeStats,
            };
        } else {
            const stats = await service.calculateProblemThinkingTimeStats(pid, this.domain._id);
            if (stats) {
                service.updateProblemThinkingTimeStats(pid, this.domain._id).catch(console.error);

                this.response.body = {
                    success: true,
                    stats: {
                        acAvgTime: Math.round(stats.acAvgTime || 0),
                        lastUpdated: new Date(),
                    },
                };
            } else {
                this.response.body = {
                    success: false,
                    message: '暂无思考时间数据',
                };
            }
        }
    }
}
