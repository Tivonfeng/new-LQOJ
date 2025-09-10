import {
    Context,
    Handler,
    ObjectId,
    STATUS,
} from 'hydrooj';

// 时间记录服务 - 直接操作Record集合
export class ThinkingTimeService {
    constructor(private ctx: Context) {}

    get recordColl() {
        return this.ctx.db.collection('record');
    }

    // 更新提交记录的思考时间
    async updateRecordThinkingTime(rid: ObjectId, thinkingTime: number): Promise<void> {
        await this.recordColl.updateOne(
            { _id: rid },
            {
                $set: {
                    thinkingTime,
                },
            },
        );
    }

    // 重置思考时间（AC时调用）
    async resetThinkingTime(rid: ObjectId): Promise<void> {
        await this.recordColl.updateOne(
            { _id: rid },
            {
                $unset: {
                    thinkingTime: '',
                },
            },
        );
    }

    // 获取用户统计数据
    async getUserStats(uid: number, domainId: string) {
        const pipeline = [
            { $match: { uid, domainId, thinkingTime: { $exists: true } } },
            {
                $group: {
                    _id: null,
                    totalProblems: { $sum: 1 },
                    totalThinkingTime: { $sum: '$thinkingTime' },
                    avgThinkingTime: { $avg: '$thinkingTime' },
                    acProblems: {
                        $sum: { $cond: [{ $eq: ['$status', 1] }, 1, 0] },
                    },
                },
            },
        ];
        const result = await this.recordColl.aggregate(pipeline).toArray();
        return result[0] || null;
    }

    // 获取题目统计数据
    async getProblemStats(pid: number, domainId: string) {
        const pipeline = [
            { $match: { pid, domainId, thinkingTime: { $exists: true } } },
            {
                $group: {
                    _id: null,
                    totalSubmissions: { $sum: 1 },
                    avgThinkingTime: { $avg: '$thinkingTime' },
                    minThinkingTime: { $min: '$thinkingTime' },
                    maxThinkingTime: { $max: '$thinkingTime' },
                    acCount: {
                        $sum: { $cond: [{ $eq: ['$status', 1] }, 1, 0] },
                    },
                },
            },
        ];
        const result = await this.recordColl.aggregate(pipeline).toArray();
        return result[0] || null;
    }
}

// API 处理器
export class ThinkingTimeHandler extends Handler {
    async post(args: any) {
        const { thinkingTime, rid } = args;

        // 验证数据合理性
        if (!thinkingTime || !rid) {
            throw new Error('缺少必要参数');
        }

        if (thinkingTime > 24 * 60 * 60) { // 超过24小时认为不合理
            throw new Error('思考时间过长，请检查数据');
        }

        const service = new ThinkingTimeService(this.ctx);
        await service.updateRecordThinkingTime(rid, thinkingTime);

        this.response.body = {
            success: true,
            message: `记录思考时间成功: ${Math.round(thinkingTime / 60)}分${thinkingTime % 60}秒`,
        };
    }

    async getUserStats(args: any) {
        const { uid } = args;
        const targetUid = uid || Number(this.user._id);

        // 只允许查看自己的数据，除非有管理权限
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
}

// 插件主函数
export default function apply(ctx: Context) {
    const service = new ThinkingTimeService(ctx);

    // 注册 API 路由
    ctx.Route('thinking_time', '/thinking-time', ThinkingTimeHandler);

    // 监听判题完成事件
    ctx.on('record/judge', async (rdoc: any, updated: boolean) => {
        try {
            // 只有当记录更新且状态改变时才处理
            if (!updated || !rdoc.thinkingTime) return;

            // 如果AC了，清除思考时间字段（表示计时重置）
            if (rdoc.status === STATUS.STATUS_ACCEPTED) {
                console.log(`🎉 记录 ${rdoc._id} AC成功，清除思考时间字段`);
                await service.resetThinkingTime(rdoc._id);
            } else if (rdoc.status > 0) {
                // 其他终结状态（WA、TLE等），保留思考时间
                console.log(`❌ 记录 ${rdoc._id} 未AC (status: ${rdoc.status})，保留思考时间: ${rdoc.thinkingTime}秒`);
            }
        } catch (error) {
            console.warn('处理判题完成事件失败:', error);
        }
    });

    console.log('Thinking Time Tracker plugin loaded successfully!');
    console.log('思考时间将直接存储到提交记录(record)中');
}
