import { Context, ObjectId, Time } from 'hydrooj';

/**
 * 聚合后的 record 统计结果
 * 一次数据库查询获取所有 record 相关的统计数据
 */
export interface AggregatedRecordStats {
    // 周统计
    weeklyStats: WeeklyAggregation[];
    // 月统计
    monthlyStats: MonthlyAggregation[];
    // 总计
    totals: TotalAggregation;
    // 按状态分布
    statusDistribution: StatusAggregation[];
    // 按小时分布
    hourDistribution: HourAggregation[];
}

export interface WeeklyAggregation {
    year: number;
    week: number;
    totalLines: number;
    totalSubmissions: number;
    uniqueProblems: number;
}

export interface MonthlyAggregation {
    year: number;
    month: number;
    totalLines: number;
    totalSubmissions: number;
    uniqueProblems: number;
}

export interface TotalAggregation {
    totalLines: number;
    totalSubmissions: number;
    uniqueProblems: number;
    acCount: number;
    waCount: number;
    tleCount: number;
    mleCount: number;
    reCount: number;
    ceCount: number;
    firstAcTime: Date | null;
    lastSubmissionTime: Date | null;
}

export interface StatusAggregation {
    status: number;
    count: number;
}

export interface HourAggregation {
    hour: number;
    count: number;
}

/**
 * Record 聚合服务
 * 使用 MongoDB $facet 一次查询完成所有 record 相关统计
 */
export class RecordAggregationService {
    constructor(private ctx: Context) {}

    /**
     * 获取用户所有 record 相关的聚合统计（全域）
     * @param uid 用户ID
     * @param weeks 周统计的周数（默认 12 周）
     * @param months 月统计的月数（默认 12 个月）
     */
    async getAggregatedStats(
        uid: number,
        weeks: number = 12,
        months: number = 12,
    ): Promise<AggregatedRecordStats> {
        // 计算时间范围
        const now = new Date();
        const weekStartDate = new Date();
        weekStartDate.setDate(weekStartDate.getDate() - (weeks * 7));
        weekStartDate.setHours(0, 0, 0, 0);

        const monthStartDate = new Date();
        monthStartDate.setMonth(monthStartDate.getMonth() - months);
        monthStartDate.setDate(1);
        monthStartDate.setHours(0, 0, 0, 0);

        // 使用较早的日期作为查询起始
        const startDate = weekStartDate < monthStartDate ? weekStartDate : monthStartDate;
        const startId = Time.getObjectID(startDate, true);
        const endId = Time.getObjectID(now, false);

        // 排除 pretest 和 generate 类型的提交
        const pretestId = new ObjectId('000000000000000000000000');
        const generateId = new ObjectId('000000000000000000000001');

        // 状态常量
        const STATUS_ACCEPTED = 1;
        const STATUS_WRONG_ANSWER = 2;
        const STATUS_TIME_LIMIT_EXCEEDED = 3;
        const STATUS_MEMORY_LIMIT_EXCEEDED = 4;
        const STATUS_RUNTIME_ERROR = 6;
        const STATUS_COMPILE_ERROR = 7;

        // 基础匹配条件
        const baseMatch = {
            uid,
            contest: { $nin: [pretestId, generateId] },
        };

        // 使用 $facet 一次查询完成所有统计
        const result = await this.ctx.db.collection('record').aggregate([
            // 第一阶段：基础匹配（不限时间范围，用于总计和状态统计）
            { $match: baseMatch },

            // 使用 $facet 并行执行多个聚合管道
            {
                $facet: {
                    // 周统计（带时间范围过滤）
                    // 注意：使用 Asia/Shanghai 时区，确保周统计对中国用户正确
                    weeklyStats: [
                        { $match: { _id: { $gte: startId, $lte: endId } } },
                        {
                            $project: {
                                year: {
                                    $isoWeekYear: {
                                        date: { $ifNull: ['$judgeAt', { $toDate: '$_id' }] },
                                        timezone: 'Asia/Shanghai',
                                    },
                                },
                                week: {
                                    $isoWeek: {
                                        date: { $ifNull: ['$judgeAt', { $toDate: '$_id' }] },
                                        timezone: 'Asia/Shanghai',
                                    },
                                },
                                pid: 1,
                                codeLines: {
                                    $cond: {
                                        if: {
                                            $and: [
                                                { $ne: [{ $type: '$code' }, 'missing'] },
                                                { $ne: ['$code', null] },
                                                { $ne: ['$code', ''] },
                                            ],
                                        },
                                        then: { $size: { $split: ['$code', '\n'] } },
                                        else: 0,
                                    },
                                },
                            },
                        },
                        {
                            $group: {
                                _id: { year: '$year', week: '$week' },
                                totalLines: { $sum: '$codeLines' },
                                totalSubmissions: { $sum: 1 },
                                problems: { $addToSet: '$pid' },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                year: '$_id.year',
                                week: '$_id.week',
                                totalLines: 1,
                                totalSubmissions: 1,
                                uniqueProblems: { $size: '$problems' },
                            },
                        },
                        { $sort: { year: 1, week: 1 } },
                    ],

                    // 月统计（带时间范围过滤）
                    // 注意：使用 Asia/Shanghai 时区，确保月统计对中国用户正确
                    monthlyStats: [
                        { $match: { _id: { $gte: startId, $lte: endId } } },
                        {
                            $project: {
                                year: {
                                    $year: {
                                        date: { $ifNull: ['$judgeAt', { $toDate: '$_id' }] },
                                        timezone: 'Asia/Shanghai',
                                    },
                                },
                                month: {
                                    $month: {
                                        date: { $ifNull: ['$judgeAt', { $toDate: '$_id' }] },
                                        timezone: 'Asia/Shanghai',
                                    },
                                },
                                pid: 1,
                                codeLines: {
                                    $cond: {
                                        if: {
                                            $and: [
                                                { $ne: [{ $type: '$code' }, 'missing'] },
                                                { $ne: ['$code', null] },
                                                { $ne: ['$code', ''] },
                                            ],
                                        },
                                        then: { $size: { $split: ['$code', '\n'] } },
                                        else: 0,
                                    },
                                },
                            },
                        },
                        {
                            $group: {
                                _id: { year: '$year', month: '$month' },
                                totalLines: { $sum: '$codeLines' },
                                totalSubmissions: { $sum: 1 },
                                problems: { $addToSet: '$pid' },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                year: '$_id.year',
                                month: '$_id.month',
                                totalLines: 1,
                                totalSubmissions: 1,
                                uniqueProblems: { $size: '$problems' },
                            },
                        },
                        { $sort: { year: 1, month: 1 } },
                    ],

                    // 总计统计（全量数据）
                    totals: [
                        {
                            $group: {
                                _id: null,
                                totalLines: {
                                    $sum: {
                                        $cond: {
                                            if: {
                                                $and: [
                                                    { $ne: [{ $type: '$code' }, 'missing'] },
                                                    { $ne: ['$code', null] },
                                                    { $ne: ['$code', ''] },
                                                ],
                                            },
                                            then: { $size: { $split: ['$code', '\n'] } },
                                            else: 0,
                                        },
                                    },
                                },
                                totalSubmissions: { $sum: 1 },
                                problems: { $addToSet: '$pid' },
                                acCount: {
                                    $sum: { $cond: [{ $eq: ['$status', STATUS_ACCEPTED] }, 1, 0] },
                                },
                                waCount: {
                                    $sum: { $cond: [{ $eq: ['$status', STATUS_WRONG_ANSWER] }, 1, 0] },
                                },
                                tleCount: {
                                    $sum: { $cond: [{ $eq: ['$status', STATUS_TIME_LIMIT_EXCEEDED] }, 1, 0] },
                                },
                                mleCount: {
                                    $sum: { $cond: [{ $eq: ['$status', STATUS_MEMORY_LIMIT_EXCEEDED] }, 1, 0] },
                                },
                                reCount: {
                                    $sum: { $cond: [{ $eq: ['$status', STATUS_RUNTIME_ERROR] }, 1, 0] },
                                },
                                ceCount: {
                                    $sum: { $cond: [{ $eq: ['$status', STATUS_COMPILE_ERROR] }, 1, 0] },
                                },
                                firstAcTime: {
                                    $min: {
                                        $cond: [
                                            { $eq: ['$status', STATUS_ACCEPTED] },
                                            { $ifNull: ['$judgeAt', { $toDate: '$_id' }] },
                                            null,
                                        ],
                                    },
                                },
                                lastSubmissionTime: {
                                    $max: { $ifNull: ['$judgeAt', { $toDate: '$_id' }] },
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                totalLines: 1,
                                totalSubmissions: 1,
                                uniqueProblems: { $size: '$problems' },
                                acCount: 1,
                                waCount: 1,
                                tleCount: 1,
                                mleCount: 1,
                                reCount: 1,
                                ceCount: 1,
                                firstAcTime: 1,
                                lastSubmissionTime: 1,
                            },
                        },
                    ],

                    // 状态分布（全量数据）
                    statusDistribution: [
                        { $match: { status: { $exists: true } } },
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                status: '$_id',
                                count: 1,
                            },
                        },
                        { $sort: { count: -1 } },
                    ],

                    // 小时分布（全量数据）
                    // 注意：使用 Asia/Shanghai 时区，确保小时统计对中国用户正确显示
                    hourDistribution: [
                        {
                            $project: {
                                hour: {
                                    $hour: {
                                        date: { $ifNull: ['$judgeAt', { $toDate: '$_id' }] },
                                        timezone: 'Asia/Shanghai',
                                    },
                                },
                            },
                        },
                        {
                            $group: {
                                _id: '$hour',
                                count: { $sum: 1 },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                hour: '$_id',
                                count: 1,
                            },
                        },
                        { $sort: { hour: 1 } },
                    ],
                },
            },
        ]).toArray();

        const aggregation = result[0] || {};

        // 处理结果，填充默认值
        const totals = aggregation.totals?.[0] || {
            totalLines: 0,
            totalSubmissions: 0,
            uniqueProblems: 0,
            acCount: 0,
            waCount: 0,
            tleCount: 0,
            mleCount: 0,
            reCount: 0,
            ceCount: 0,
            firstAcTime: null,
            lastSubmissionTime: null,
        };

        return {
            weeklyStats: aggregation.weeklyStats || [],
            monthlyStats: aggregation.monthlyStats || [],
            totals,
            statusDistribution: aggregation.statusDistribution || [],
            hourDistribution: aggregation.hourDistribution || [],
        };
    }

    /**
     * 填充周统计的缺失周
     */
    fillWeeklyGaps(
        weeklyStats: WeeklyAggregation[],
        weeks: number,
    ): WeeklyAggregation[] {
        const result: WeeklyAggregation[] = [];
        const statsMap = new Map<string, WeeklyAggregation>();

        for (const stat of weeklyStats) {
            const key = `${stat.year}-W${stat.week.toString().padStart(2, '0')}`;
            statsMap.set(key, stat);
        }

        // 生成所有周
        const currentDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (weeks * 7));

        const tempDate = new Date(startDate);
        while (tempDate.getTime() <= currentDate.getTime()) {
            const { year, week } = this.getISOWeek(tempDate);
            const key = `${year}-W${week.toString().padStart(2, '0')}`;

            if (!result.some((r) => r.year === year && r.week === week)) {
                const existing = statsMap.get(key);
                result.push(existing || {
                    year,
                    week,
                    totalLines: 0,
                    totalSubmissions: 0,
                    uniqueProblems: 0,
                });
            }

            tempDate.setDate(tempDate.getDate() + 7);
        }

        return result.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.week - b.week;
        });
    }

    /**
     * 填充月统计的缺失月
     */
    fillMonthlyGaps(
        monthlyStats: MonthlyAggregation[],
        months: number,
    ): MonthlyAggregation[] {
        const result: MonthlyAggregation[] = [];
        const statsMap = new Map<string, MonthlyAggregation>();

        for (const stat of monthlyStats) {
            const key = `${stat.year}-${stat.month.toString().padStart(2, '0')}`;
            statsMap.set(key, stat);
        }

        // 生成所有月份
        const currentDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        startDate.setDate(1);

        let year = startDate.getFullYear();
        let month = startDate.getMonth() + 1;
        const endYear = currentDate.getFullYear();
        const endMonth = currentDate.getMonth() + 1;

        while (year < endYear || (year === endYear && month <= endMonth)) {
            const key = `${year}-${month.toString().padStart(2, '0')}`;
            const existing = statsMap.get(key);

            result.push(existing || {
                year,
                month,
                totalLines: 0,
                totalSubmissions: 0,
                uniqueProblems: 0,
            });

            month++;
            if (month > 12) {
                month = 1;
                year++;
            }
        }

        return result;
    }

    /**
     * 填充小时分布的缺失小时
     */
    fillHourGaps(hourDistribution: HourAggregation[]): HourAggregation[] {
        const hourMap = new Map<number, number>();
        for (let i = 0; i < 24; i++) {
            hourMap.set(i, 0);
        }

        for (const stat of hourDistribution) {
            hourMap.set(stat.hour, stat.count);
        }

        return Array.from(hourMap.entries())
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => a.hour - b.hour);
    }

    /**
     * 获取 ISO 周数
     */
    private getISOWeek(date: Date): { year: number, week: number } {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return { year: d.getUTCFullYear(), week: weekNo };
    }
}
