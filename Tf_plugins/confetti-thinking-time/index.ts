import {
    Context,
    db,
    Handler,
    ObjectId,
    ProblemModel,
    RecordModel,
} from 'hydrooj';

// 时间记录服务 - 直接操作Record集合
export class ThinkingTimeService {
    constructor(private ctx: Context) {}

    get recordColl() {
        return db.collection('record');
    }

    get documentColl() {
        return db.collection('document');
    }

    // 更新提交记录的思考时间
    async updateRecordThinkingTime(rid: ObjectId, thinkingTime: number): Promise<void> {
        const result = await this.recordColl.updateOne(
            { _id: rid },
            {
                $set: {
                    thinkingTime,
                },
            },
        );

        if (result.matchedCount === 0) {
            throw new Error(`提交记录不存在: ${rid}`);
        }

        // 获取提交记录信息，触发题目统计更新
        const record = await this.recordColl.findOne({ _id: rid });
        if (record) {
            // 延迟更新，给足够时间让评测完成
            setTimeout(() => {
                this.updateProblemThinkingTimeStats(record.pid, record.domainId).catch(console.error);
            }, 5000); // 增加到5秒，给评测充足时间
        }
    }

    // 更新题目的思考时间统计数据
    async updateProblemThinkingTimeStats(pid: number, domainId: string): Promise<void> {
        const stats = await this.calculateProblemThinkingTimeStats(pid, domainId);

        if (stats) {
            await this.documentColl.updateOne(
                { docType: 10, domainId, docId: pid }, // TYPE_PROBLEM = 10
                {
                    $set: {
                        thinkingTimeStats: {
                            acAvgTime: Math.round(stats.acAvgTime || 0),
                            lastUpdated: new Date(),
                        },
                    },
                },
            );
        }
    }

    // 计算题目思考时间统计
    async calculateProblemThinkingTimeStats(pid: number, domainId: string): Promise<any> {
        const pipeline = [
            { $match: { pid, domainId, thinkingTime: { $exists: true, $gt: 0 }, status: 1 } },
            {
                $group: {
                    _id: null,
                    acAvgTime: { $avg: '$thinkingTime' },
                },
            },
        ];

        const [basicStats] = await this.recordColl.aggregate(pipeline).toArray();
        return basicStats || null;
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
        const { thinkingTime, rid, action, pid } = args;

        // 处理手动更新统计的请求
        if (action === 'forceUpdateStats') {
            try {
                if (!pid) {
                    this.response.body = { success: false, message: '缺少题目ID' };
                    return;
                }

                const service = new ThinkingTimeService(this.ctx);

                // 检查是否有AC记录和思考时间数据
                const acRecords = await service.recordColl.find({
                    pid,
                    domainId: this.domain._id,
                    status: 1, // AC
                    thinkingTime: { $exists: true, $gt: 0 },
                }).limit(5).toArray();

                // 强制重新计算并更新
                if (acRecords.length > 0) {
                    await service.updateProblemThinkingTimeStats(pid, this.domain._id);
                }

                // 获取更新后的数据
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

        // 原有的思考时间记录逻辑
        if (!thinkingTime || !rid) {
            throw new Error('缺少必要参数');
        }

        if (thinkingTime > 24 * 60 * 60) { // 超过24小时认为不合理
            throw new Error('思考时间过长，请检查数据');
        }

        let objectId: ObjectId;
        try {
            // 转换为ObjectId
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

    async getProblemThinkingTimeStats(args: any) {
        const { pid } = args;
        if (!pid) {
            throw new Error('缺少题目ID');
        }

        const service = new ThinkingTimeService(this.ctx);

        // 从题目文档中获取缓存的统计数据
        const problemDoc = await service.documentColl.findOne({
            docType: 10, // TYPE_PROBLEM
            domainId: this.domain._id,
            docId: pid,
        });

        if (problemDoc?.thinkingTimeStats) {
            this.response.body = {
                success: true,
                stats: problemDoc.thinkingTimeStats,
            };
        } else {
            // 如果没有缓存数据，实时计算
            const stats = await service.calculateProblemThinkingTimeStats(pid, this.domain._id);
            if (stats) {
                // 异步更新缓存
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

// 彩带状态处理器
class ConfettiStatusHandler extends Handler {
    async get() {
        this.response.body = {
            status: 'active',
            message: 'Confetti thinking time plugin is running',
        };
    }
}

// 插件主函数
export default function apply(ctx: Context) {
    // 注册思考时间 API 路由
    ctx.Route('thinking_time', '/thinking-time', ThinkingTimeHandler);

    // 注册彩带状态接口
    ctx.Route('confetti_status', '/confetti/status', ConfettiStatusHandler);

    // 创建数据库索引以提高查询性能
    ctx.on('app/started' as any, async () => {
        try {
            // 动态添加 thinkingTime 到 RecordModel 的 PROJECTION_LIST
            if (RecordModel && RecordModel.PROJECTION_LIST) {
                if (!RecordModel.PROJECTION_LIST.includes('thinkingTime' as any)) {
                    RecordModel.PROJECTION_LIST.push('thinkingTime' as any);
                    console.log('✅ 已添加 thinkingTime 到 RecordModel PROJECTION_LIST');
                }
            } else {
                console.warn('⚠️ 无法找到 RecordModel 或 PROJECTION_LIST');
            }

            // 动态添加 thinkingTimeStats 到 ProblemModel 的所有 PROJECTION 列表
            if (ProblemModel) {
                // 添加到所有相关的投影列表
                const projectionLists = ['PROJECTION_LIST', 'PROJECTION_PUBLIC', 'PROJECTION_CONTEST_LIST'];
                for (const listName of projectionLists) {
                    if (ProblemModel[listName] && Array.isArray(ProblemModel[listName])) {
                        if (!ProblemModel[listName].includes('thinkingTimeStats' as any)) {
                            ProblemModel[listName].push('thinkingTimeStats' as any);
                            console.log(`✅ 已添加 thinkingTimeStats 到 ProblemModel.${listName}`);
                        }
                    }
                }
            } else {
                console.warn('⚠️ 无法找到 ProblemModel');
            }

            const recordColl = db.collection('record');

            // 为思考时间查询创建复合索引
            await recordColl.createIndex(
                { uid: 1, domainId: 1, thinkingTime: 1 },
                {
                    name: 'thinking_time_user_stats',
                    background: true,
                    sparse: true, // 只为有thinkingTime字段的文档创建索引
                },
            );

            // 为题目统计创建复合索引
            await recordColl.createIndex(
                { pid: 1, domainId: 1, thinkingTime: 1 },
                {
                    name: 'thinking_time_problem_stats',
                    background: true,
                    sparse: true,
                },
            );

            console.log('✅ 思考时间插件索引创建成功');
        } catch (error) {
            console.warn('⚠️ 思考时间插件索引创建失败:', error);
        }
    });

    console.log('Confetti thinking time plugin loaded successfully!');
}
