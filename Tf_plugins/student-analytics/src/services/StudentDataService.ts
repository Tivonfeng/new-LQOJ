import { Context, ObjectId, Time } from 'hydrooj';

// 每周代码统计类型
export interface WeeklyCodeStats {
    year: number;
    week: number; // ISO 周数 (1-53)
    weekStart: Date; // 周开始日期
    weekEnd: Date; // 周结束日期
    totalLines: number; // 总代码行数
    totalSubmissions: number; // 总提交数
    uniqueProblems: number; // 不同题目数
    averageLinesPerSubmission: number; // 平均每次提交的代码行数
}

// 每月代码统计类型
export interface MonthlyCodeStats {
    year: number;
    month: number; // 月份 (1-12)
    monthStart: Date; // 月开始日期
    monthEnd: Date; // 月结束日期
    totalLines: number; // 总代码行数
    totalSubmissions: number; // 总提交数
    uniqueProblems: number; // 不同题目数
    averageLinesPerSubmission: number; // 平均每次提交的代码行数
    averageLinesPerDay: number; // 平均每天代码行数
}

// 学生数据服务
export class StudentDataService {
    constructor(private ctx: Context) {}

    /**
     * 计算代码行数
     * @param code 代码字符串
     * @returns 代码行数（包括空行）
     */
    private countCodeLines(code: string): number {
        if (!code) return 0;
        // 按换行符分割，计算行数
        // 包括空行，因为空行也是代码的一部分
        return code.split(/\r?\n/).length;
    }

    /**
     * 获取 ISO 周数
     * @param date 日期
     * @returns {year, week} 年份和周数
     */
    private getISOWeek(date: Date): { year: number, week: number } {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return { year: d.getUTCFullYear(), week: weekNo };
    }

    /**
     * 获取周的开始和结束日期
     * @param year 年份
     * @param week ISO 周数
     * @returns 周的开始和结束日期
     */
    private getWeekRange(year: number, week: number): { weekStart: Date, weekEnd: Date } {
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dow = simple.getDay();
        const ISOweekStart = simple;
        if (dow <= 4) {
            ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        } else {
            ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        }
        const weekStart = new Date(ISOweekStart);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(ISOweekStart);
        weekEnd.setDate(ISOweekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return { weekStart, weekEnd };
    }

    /**
     * 获取学生每周代码行数统计（全域统计）
     * @param uid 用户ID
     * @param weeks 统计周数（默认最近12周）
     * @returns 每周代码统计数组
     */
    async getWeeklyCodeStats(
        uid: number,
        weeks: number = 12,
    ): Promise<WeeklyCodeStats[]> {
        // 计算开始日期（从最近 N 周前开始）
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (weeks * 7));
        startDate.setHours(0, 0, 0, 0);

        // 创建用于时间范围查询的 ObjectId
        // 使用 Time.getObjectID 来正确创建基于时间戳的 ObjectId
        const startId = Time.getObjectID(startDate, true);
        const endId = Time.getObjectID(endDate, false);

        // 排除 pretest 和 generate 类型的提交
        const pretestId = new ObjectId('000000000000000000000000');
        const generateId = new ObjectId('000000000000000000000001');

        // 查询该时间段内的所有提交记录（全域）
        // 注意：需要包含 code 字段，但 code 可能很大，所以需要明确指定
        const records = await this.ctx.db.collection('record').find(
            {
                uid,
                _id: {
                    $gte: startId,
                    $lte: endId,
                },
                // 排除 pretest 和 generate 类型的提交
                contest: {
                    $nin: [pretestId, generateId],
                },
                code: { $exists: true, $ne: null as any },
            },
            {
                projection: {
                    _id: 1,
                    code: 1,
                    pid: 1,
                    judgeAt: 1,
                },
            },
        ).toArray();

        // 按周分组统计
        const weeklyMap = new Map<string, {
            totalLines: number;
            submissions: number;
            problems: Set<number>;
        }>();

        for (const record of records) {
            // 使用 _id 的时间戳或 judgeAt 来确定提交时间
            let submitDate: Date;
            if (record.judgeAt) {
                submitDate = record.judgeAt instanceof Date ? record.judgeAt : new Date(record.judgeAt);
            } else {
                // 从 ObjectId 提取时间戳
                submitDate = record._id.getTimestamp();
            }

            const { year, week } = this.getISOWeek(submitDate);
            const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;

            if (!weeklyMap.has(weekKey)) {
                weeklyMap.set(weekKey, {
                    totalLines: 0,
                    submissions: 0,
                    problems: new Set(),
                });
            }

            const weekData = weeklyMap.get(weekKey)!;
            const codeLines = this.countCodeLines(record.code || '');
            weekData.totalLines += codeLines;
            weekData.submissions += 1;
            weekData.problems.add(record.pid);
        }

        // 生成所有周的数据（包括没有提交记录的周）
        const result: WeeklyCodeStats[] = [];
        const resultMap = new Map<string, WeeklyCodeStats>();

        // 从开始日期到结束日期，逐周遍历
        const currentDate = new Date(startDate);
        const endDateCopy = new Date(endDate);

        while (currentDate.getTime() <= endDateCopy.getTime()) {
            // 获取当前日期所在的ISO周
            const { year, week } = this.getISOWeek(currentDate);
            const weekKey = `${year}-W${week.toString().padStart(2, '0')}`;

            // 如果这周还没有处理过，添加到结果中
            if (!resultMap.has(weekKey)) {
                const { weekStart, weekEnd } = this.getWeekRange(year, week);
                const weekData = weeklyMap.get(weekKey);

                resultMap.set(weekKey, {
                    year,
                    week,
                    weekStart,
                    weekEnd,
                    totalLines: weekData?.totalLines || 0,
                    totalSubmissions: weekData?.submissions || 0,
                    uniqueProblems: weekData?.problems.size || 0,
                    averageLinesPerSubmission: weekData && weekData.submissions > 0
                        ? Math.round((weekData.totalLines / weekData.submissions) * 100) / 100
                        : 0,
                });
            }

            // 移动到下一周（加7天）
            currentDate.setDate(currentDate.getDate() + 7);
        }

        // 转换为数组并按周排序（从早到晚）
        result.push(...Array.from(resultMap.values()));
        result.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.week - b.week;
        });

        return result;
    }

    /**
     * 获取学生每月代码行数统计（全域统计）
     * @param uid 用户ID
     * @param months 统计月数（默认最近12个月）
     * @returns 每月代码统计数组
     */
    async getMonthlyCodeStats(
        uid: number,
        months: number = 12,
    ): Promise<MonthlyCodeStats[]> {
        // 计算开始日期（从最近 N 个月前开始）
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        startDate.setDate(1); // 从月初开始
        startDate.setHours(0, 0, 0, 0);

        // 创建用于时间范围查询的 ObjectId
        // 使用 Time.getObjectID 来正确创建基于时间戳的 ObjectId
        const startId = Time.getObjectID(startDate, true);
        const endId = Time.getObjectID(endDate, false);

        // 排除 pretest 和 generate 类型的提交
        const pretestId = new ObjectId('000000000000000000000000');
        const generateId = new ObjectId('000000000000000000000001');

        // 查询该时间段内的所有提交记录（全域）
        const records = await this.ctx.db.collection('record').find(
            {
                uid,
                _id: {
                    $gte: startId,
                    $lte: endId,
                },
                contest: {
                    $nin: [pretestId, generateId],
                },
                code: { $exists: true, $ne: null as any },
            },
            {
                projection: {
                    _id: 1,
                    code: 1,
                    pid: 1,
                    judgeAt: 1,
                },
            },
        ).toArray();

        // 按月分组统计
        const monthlyMap = new Map<string, {
            totalLines: number;
            submissions: number;
            problems: Set<number>;
        }>();

        for (const record of records) {
            // 使用 _id 的时间戳或 judgeAt 来确定提交时间
            let submitDate: Date;
            if (record.judgeAt) {
                submitDate = record.judgeAt instanceof Date ? record.judgeAt : new Date(record.judgeAt);
            } else {
                submitDate = record._id.getTimestamp();
            }

            const year = submitDate.getFullYear();
            const month = submitDate.getMonth() + 1; // getMonth() 返回 0-11
            const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

            if (!monthlyMap.has(monthKey)) {
                monthlyMap.set(monthKey, {
                    totalLines: 0,
                    submissions: 0,
                    problems: new Set(),
                });
            }

            const monthData = monthlyMap.get(monthKey)!;
            const codeLines = this.countCodeLines(record.code || '');
            monthData.totalLines += codeLines;
            monthData.submissions += 1;
            monthData.problems.add(record.pid);
        }

        // 生成所有月份的数据（包括没有提交记录的月份）
        const result: MonthlyCodeStats[] = [];
        const currentDate = new Date();
        const endYear = currentDate.getFullYear();
        const endMonth = currentDate.getMonth() + 1; // getMonth() 返回 0-11

        // 从开始日期到当前日期，生成每个月的统计数据
        let year = startDate.getFullYear();
        let month = startDate.getMonth() + 1;

        while (year < endYear || (year === endYear && month <= endMonth)) {
            const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
            const monthData = monthlyMap.get(monthKey);

            // 计算月的开始和结束日期
            const monthStart = new Date(year, month - 1, 1);
            monthStart.setHours(0, 0, 0, 0);
            const monthEnd = new Date(year, month, 0); // 下个月的第0天 = 这个月的最后一天
            monthEnd.setHours(23, 59, 59, 999);

            // 计算该月的天数
            const daysInMonth = monthEnd.getDate();

            // 如果有数据，使用实际数据；如果没有数据，使用0
            result.push({
                year,
                month,
                monthStart,
                monthEnd,
                totalLines: monthData?.totalLines || 0,
                totalSubmissions: monthData?.submissions || 0,
                uniqueProblems: monthData?.problems.size || 0,
                averageLinesPerSubmission: monthData && monthData.submissions > 0
                    ? Math.round((monthData.totalLines / monthData.submissions) * 100) / 100
                    : 0,
                averageLinesPerDay: daysInMonth > 0 && monthData
                    ? Math.round((monthData.totalLines / daysInMonth) * 100) / 100
                    : 0,
            });

            // 移动到下一个月
            month++;
            if (month > 12) {
                month = 1;
                year++;
            }
        }

        return result;
    }

    /**
     * 获取学生总代码行数（全域统计所有提交）
     * @param uid 用户ID
     * @returns 总代码行数
     */
    async getTotalCodeLines(uid: number): Promise<number> {
        // 排除 pretest 和 generate 类型的提交
        const pretestId = new ObjectId('000000000000000000000000');
        const generateId = new ObjectId('000000000000000000000001');

        // 构建查询条件（全域统计所有提交，不限制状态）
        const query: any = {
            uid,
            contest: {
                $nin: [pretestId, generateId],
            },
            code: {
                $exists: true,
                $ne: null as any,
                $not: { $eq: '' }, // 排除空字符串
            },
        };

        // 使用聚合管道在数据库层面计算行数，避免加载所有代码到内存
        // 使用 $split 按 \n 分割代码字符串，然后计算数组长度
        // 注意：$split 会将字符串按分隔符分割，数组长度即为行数（包括最后一行，即使没有换行符）
        // 对于 \r\n，按 \n 分割时 \r 会留在行尾，但不影响行数统计的准确性
        const result = await this.ctx.db.collection('record').aggregate([
            {
                $match: query,
            },
            {
                $project: {
                    codeLines: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: [{ $ifNull: ['$code', ''] }, ''] },
                                    { $ne: [{ $ifNull: ['$code', null] }, null] },
                                ],
                            },
                            then: {
                                // 按 \n 分割代码，计算行数
                                // 如果代码为空字符串，$split 会返回包含一个空字符串的数组，所以需要特殊处理
                                $let: {
                                    vars: {
                                        codeStr: { $ifNull: ['$code', ''] },
                                    },
                                    in: {
                                        $cond: {
                                            if: { $eq: ['$$codeStr', ''] },
                                            then: 0,
                                            else: {
                                                $size: {
                                                    $split: ['$$codeStr', '\n'],
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            else: 0,
                        },
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    totalLines: { $sum: '$codeLines' },
                },
            },
        ]).toArray();

        return result.length > 0 ? result[0].totalLines : 0;
    }

    // TODO: 实现数据收集相关方法
    async collectStudentData(_uid: number, _data: Record<string, any>): Promise<void> {
        // 收集学生学习数据
    }

    async aggregateStudentStats(_uid: number): Promise<void> {
        // 聚合学生统计数据
    }
}
