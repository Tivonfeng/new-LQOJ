import type { Context } from 'hydrooj';

// 题目完成情况统计
export interface ProblemCompletionStats {
    totalProblems: number; // 总题目数（已尝试）
    solvedProblems: number; // 已解决题目数
    attemptedProblems: number; // 已尝试题目数
    completionRate: number; // 完成率
    starredProblems: number; // 收藏题目数
}

// 题目难度分布
export interface ProblemDifficultyDistribution {
    difficulty: number; // 难度值
    count: number; // 该难度的题目数
    solved: number; // 已解决的题目数
}

// 题目标签分布
export interface ProblemTagDistribution {
    tag: string; // 标签名称
    count: number; // 该标签的题目数
    solved: number; // 已解决的题目数
}

// 题目统计服务
export class ProblemStatsService {
    constructor(private ctx: Context) {}

    /**
     * 获取题目完成情况统计（全域统计）
     * @param uid 用户ID
     * @returns 题目完成情况统计
     */
    async getProblemCompletionStats(
        uid: number,
    ): Promise<ProblemCompletionStats> {
        // 获取所有题目状态记录（全域）
        const statusRecords = await this.ctx.db.collection('document.status').find(
            {
                uid,
                docType: 10, // TYPE_PROBLEM
            },
            {
                projection: {
                    docId: 1,
                    domainId: 1,
                    status: 1,
                    score: 1,
                    star: 1,
                },
            },
        ).toArray();

        let solvedProblems = 0;
        let attemptedProblems = 0;
        let starredProblems = 0;

        for (const status of statusRecords) {
            attemptedProblems++;
            // 如果状态是 AC 或者分数是 100，认为已解决
            if (status.status === 1 || status.score === 100) {
                solvedProblems++;
            }
            if (status.star) {
                starredProblems++;
            }
        }

        return {
            totalProblems: attemptedProblems,
            solvedProblems,
            attemptedProblems,
            completionRate: attemptedProblems > 0
                ? Math.round((solvedProblems / attemptedProblems) * 10000) / 100
                : 0,
            starredProblems,
        };
    }

    /**
     * 获取题目难度分布（全域统计）
     * @param uid 用户ID
     * @returns 难度分布数组
     */
    async getProblemDifficultyDistribution(
        uid: number,
    ): Promise<ProblemDifficultyDistribution[]> {
        // 获取用户已尝试的题目ID（全域）
        const statusRecords = await this.ctx.db.collection('document.status').find(
            {
                uid,
                docType: 10, // TYPE_PROBLEM
            },
            {
                projection: {
                    docId: 1,
                    domainId: 1,
                    status: 1,
                    score: 1,
                },
            },
        ).toArray();

        if (statusRecords.length === 0) {
            return [];
        }

        // 按域分组题目ID
        const domainProblemMap = new Map<string, number[]>();
        for (const status of statusRecords) {
            const domainId = status.domainId;
            if (!domainProblemMap.has(domainId)) {
                domainProblemMap.set(domainId, []);
            }
            domainProblemMap.get(domainId)!.push(status.docId);
        }

        // 从各个域并行获取题目信息
        const problemQueries = Array.from(domainProblemMap.entries()).map(
            ([domainId, problemIds]) => this.ctx.db.collection('document').find(
                {
                    domainId,
                    docType: 10, // TYPE_PROBLEM
                    docId: { $in: problemIds },
                    difficulty: { $exists: true },
                },
                {
                    projection: {
                        docId: 1,
                        domainId: 1,
                        difficulty: 1,
                    },
                },
            ).toArray(),
        );
        const problemResults = await Promise.all(problemQueries);
        const allProblems = problemResults.flat();

        // 创建状态映射（使用 domainId + docId 作为 key）
        const statusMap = new Map<string, { solved: boolean }>();
        for (const status of statusRecords) {
            const solved = status.status === 1 || status.score === 100;
            const key = `${status.domainId}:${status.docId}`;
            statusMap.set(key, { solved });
        }

        // 按难度分组统计
        const difficultyMap = new Map<number, { count: number, solved: number }>();

        for (const problem of allProblems) {
            const difficulty = problem.difficulty || 0;
            const key = `${problem.domainId}:${problem.docId}`;
            const status = statusMap.get(key);
            const solved = status?.solved || false;

            if (!difficultyMap.has(difficulty)) {
                difficultyMap.set(difficulty, { count: 0, solved: 0 });
            }

            const stats = difficultyMap.get(difficulty)!;
            stats.count++;
            if (solved) {
                stats.solved++;
            }
        }

        return Array.from(difficultyMap.entries())
            .map(([difficulty, stats]) => ({
                difficulty,
                count: stats.count,
                solved: stats.solved,
            }))
            .sort((a, b) => a.difficulty - b.difficulty);
    }

    /**
     * 获取题目标签分布（全域统计）
     * @param uid 用户ID
     * @returns 标签分布数组
     */
    async getProblemTagDistribution(
        uid: number,
    ): Promise<ProblemTagDistribution[]> {
        // 获取用户已尝试的题目ID（全域）
        const statusRecords = await this.ctx.db.collection('document.status').find(
            {
                uid,
                docType: 10, // TYPE_PROBLEM
            },
            {
                projection: {
                    docId: 1,
                    domainId: 1,
                    status: 1,
                    score: 1,
                },
            },
        ).toArray();

        if (statusRecords.length === 0) {
            return [];
        }

        // 按域分组题目ID
        const domainProblemMap = new Map<string, number[]>();
        for (const status of statusRecords) {
            const domainId = status.domainId;
            if (!domainProblemMap.has(domainId)) {
                domainProblemMap.set(domainId, []);
            }
            domainProblemMap.get(domainId)!.push(status.docId);
        }

        // 从各个域并行获取题目信息
        const problemQueries = Array.from(domainProblemMap.entries()).map(
            ([domainId, problemIds]) => this.ctx.db.collection('document').find(
                {
                    domainId,
                    docType: 10, // TYPE_PROBLEM
                    docId: { $in: problemIds },
                    tag: { $exists: true, $ne: [] },
                },
                {
                    projection: {
                        docId: 1,
                        domainId: 1,
                        tag: 1,
                    },
                },
            ).toArray(),
        );
        const problemResults = await Promise.all(problemQueries);
        const allProblems = problemResults.flat();

        // 创建状态映射（使用 domainId + docId 作为 key）
        const statusMap = new Map<string, { solved: boolean }>();
        for (const status of statusRecords) {
            const solved = status.status === 1 || status.score === 100;
            const key = `${status.domainId}:${status.docId}`;
            statusMap.set(key, { solved });
        }

        // 按标签分组统计
        const tagMap = new Map<string, { count: number, solved: number }>();

        for (const problem of allProblems) {
            const tags = problem.tag || [];
            const key = `${problem.domainId}:${problem.docId}`;
            const status = statusMap.get(key);
            const solved = status?.solved || false;

            for (const tag of tags) {
                if (!tagMap.has(tag)) {
                    tagMap.set(tag, { count: 0, solved: 0 });
                }

                const stats = tagMap.get(tag)!;
                stats.count++;
                if (solved) {
                    stats.solved++;
                }
            }
        }

        return Array.from(tagMap.entries())
            .map(([tag, stats]) => ({
                tag,
                count: stats.count,
                solved: stats.solved,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20); // 返回前20个标签
    }
}
