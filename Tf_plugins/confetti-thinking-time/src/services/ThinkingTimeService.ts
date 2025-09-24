import {
    Context,
    db,
    ObjectId,
} from 'hydrooj';

export class ThinkingTimeService {
    constructor(private ctx: Context) {}

    get recordColl() {
        return db.collection('record');
    }

    get documentColl() {
        return db.collection('document');
    }

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

        const record = await this.recordColl.findOne({ _id: rid });
        if (record) {
            setTimeout(() => {
                this.updateProblemThinkingTimeStats(record.pid, record.domainId).catch(console.error);
            }, 5000);
        }
    }

    async updateProblemThinkingTimeStats(pid: number, domainId: string): Promise<void> {
        const stats = await this.calculateProblemThinkingTimeStats(pid, domainId);

        if (stats) {
            await this.documentColl.updateOne(
                { docType: 10, domainId, docId: pid },
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
