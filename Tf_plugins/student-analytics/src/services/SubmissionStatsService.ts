import { Context, ObjectId, STATUS } from 'hydrooj';

// 提交统计类型
export interface SubmissionStats {
    totalSubmissions: number; // 总提交数
    acCount: number; // AC 数量
    waCount: number; // WA 数量
    tleCount: number; // TLE 数量
    mleCount: number; // MLE 数量
    reCount: number; // RE 数量
    ceCount: number; // CE 数量
    acRate: number; // AC 率
    uniqueProblems: number; // 不同题目数
    firstAcTime?: Date; // 首次 AC 时间
    lastSubmissionTime?: Date; // 最后提交时间
}

// 提交时间分布统计
export interface SubmissionTimeDistribution {
    hour: number; // 小时 (0-23)
    count: number; // 该小时的提交数
}

// 提交状态分布
export interface SubmissionStatusDistribution {
    status: string; // 状态名称
    count: number; // 数量
    percentage: number; // 百分比
}

// 提交统计服务
export class SubmissionStatsService {
    constructor(private ctx: Context) {}

    /**
     * 获取学生提交统计
     * @param domainId 域ID
     * @param uid 用户ID
     * @returns 提交统计
     */
    async getSubmissionStats(domainId: string, uid: number): Promise<SubmissionStats> {
        const pretestId = new ObjectId('000000000000000000000000');
        const generateId = new ObjectId('000000000000000000000001');

        // 获取所有提交记录（排除 pretest 和 generate）
        const records = await this.ctx.db.collection('record').find(
            {
                domainId,
                uid,
                contest: {
                    $nin: [pretestId, generateId],
                },
                status: { $exists: true },
            },
            {
                projection: {
                    status: 1,
                    pid: 1,
                    _id: 1,
                    judgeAt: 1,
                },
            },
        ).toArray();

        const stats: SubmissionStats = {
            totalSubmissions: records.length,
            acCount: 0,
            waCount: 0,
            tleCount: 0,
            mleCount: 0,
            reCount: 0,
            ceCount: 0,
            acRate: 0,
            uniqueProblems: 0,
        };

        const problemSet = new Set<number>();
        let firstAcTime: Date | undefined;
        let lastSubmissionTime: Date | undefined;

        for (const record of records) {
            // 统计题目数
            problemSet.add(record.pid);

            // 统计状态
            const status = record.status;
            if (status === STATUS.STATUS_ACCEPTED) {
                stats.acCount++;
                // 记录首次 AC 时间
                const submitTime = record.judgeAt instanceof Date
                    ? record.judgeAt
                    : record._id.getTimestamp();
                if (!firstAcTime || submitTime < firstAcTime) {
                    firstAcTime = submitTime;
                }
            } else if (status === STATUS.STATUS_WRONG_ANSWER) {
                stats.waCount++;
            } else if (status === STATUS.STATUS_TIME_LIMIT_EXCEEDED) {
                stats.tleCount++;
            } else if (status === STATUS.STATUS_MEMORY_LIMIT_EXCEEDED) {
                stats.mleCount++;
            } else if (status === STATUS.STATUS_RUNTIME_ERROR) {
                stats.reCount++;
            } else if (status === STATUS.STATUS_COMPILE_ERROR) {
                stats.ceCount++;
            }

            // 记录最后提交时间
            const submitTime = record.judgeAt instanceof Date
                ? record.judgeAt
                : record._id.getTimestamp();
            if (!lastSubmissionTime || submitTime > lastSubmissionTime) {
                lastSubmissionTime = submitTime;
            }
        }

        stats.uniqueProblems = problemSet.size;
        stats.acRate = stats.totalSubmissions > 0
            ? Math.round((stats.acCount / stats.totalSubmissions) * 10000) / 100
            : 0;
        stats.firstAcTime = firstAcTime;
        stats.lastSubmissionTime = lastSubmissionTime;

        return stats;
    }

    /**
     * 获取提交时间分布（按小时）
     * @param domainId 域ID
     * @param uid 用户ID
     * @returns 时间分布数组
     */
    async getSubmissionTimeDistribution(
        domainId: string,
        uid: number,
    ): Promise<SubmissionTimeDistribution[]> {
        const pretestId = new ObjectId('000000000000000000000000');
        const generateId = new ObjectId('000000000000000000000001');

        const records = await this.ctx.db.collection('record').find(
            {
                domainId,
                uid,
                contest: {
                    $nin: [pretestId, generateId],
                },
            },
            {
                projection: {
                    _id: 1,
                    judgeAt: 1,
                },
            },
        ).toArray();

        // 按小时统计
        const hourMap = new Map<number, number>();
        for (let i = 0; i < 24; i++) {
            hourMap.set(i, 0);
        }

        for (const record of records) {
            const submitTime = record.judgeAt instanceof Date
                ? record.judgeAt
                : record._id.getTimestamp();
            const hour = submitTime.getHours();
            hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
        }

        return Array.from(hourMap.entries())
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => a.hour - b.hour);
    }

    /**
     * 获取提交状态分布
     * @param domainId 域ID
     * @param uid 用户ID
     * @returns 状态分布数组
     */
    async getSubmissionStatusDistribution(
        domainId: string,
        uid: number,
    ): Promise<SubmissionStatusDistribution[]> {
        const pretestId = new ObjectId('000000000000000000000000');
        const generateId = new ObjectId('000000000000000000000001');

        const records = await this.ctx.db.collection('record').find(
            {
                domainId,
                uid,
                contest: {
                    $nin: [pretestId, generateId],
                },
                status: { $exists: true },
            },
            {
                projection: {
                    status: 1,
                },
            },
        ).toArray();

        const statusMap = new Map<number, number>();
        const total = records.length;

        for (const record of records) {
            const status = record.status;
            statusMap.set(status, (statusMap.get(status) || 0) + 1);
        }

        const statusNames: Record<number, string> = {
            [STATUS.STATUS_ACCEPTED]: 'AC',
            [STATUS.STATUS_WRONG_ANSWER]: 'WA',
            [STATUS.STATUS_TIME_LIMIT_EXCEEDED]: 'TLE',
            [STATUS.STATUS_MEMORY_LIMIT_EXCEEDED]: 'MLE',
            [STATUS.STATUS_RUNTIME_ERROR]: 'RE',
            [STATUS.STATUS_COMPILE_ERROR]: 'CE',
            [STATUS.STATUS_SYSTEM_ERROR]: 'SE',
            [STATUS.STATUS_CANCELED]: 'IGN',
        };

        return Array.from(statusMap.entries())
            .map(([status, count]) => ({
                status: statusNames[status] || `Status ${status}`,
                count,
                percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
            }))
            .sort((a, b) => b.count - a.count);
    }
}
