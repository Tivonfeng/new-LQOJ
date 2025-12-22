import type { Context } from 'hydrooj';

/**
 * 聚合后的题目统计结果
 * 一次查询获取所有题目相关的统计数据
 */
export interface AggregatedProblemStats {
    // 完成情况统计
    completion: ProblemCompletionAggregation;
    // 难度分布
    difficultyDistribution: DifficultyAggregation[];
    // 标签分布
    tagDistribution: TagAggregation[];
}

export interface ProblemCompletionAggregation {
    totalProblems: number;
    solvedProblems: number;
    attemptedProblems: number;
    completionRate: number;
    starredProblems: number;
}

export interface DifficultyAggregation {
    difficulty: number;
    count: number;
    solved: number;
}

export interface TagAggregation {
    tag: string;
    count: number;
    solved: number;
}

// 内部使用的状态记录类型
interface StatusRecord {
    docId: number;
    domainId: string;
    status: number;
    score: number;
    star?: boolean;
}

/**
 * Problem 聚合服务
 * 优化题目相关的查询，减少数据库往返
 */
export class ProblemAggregationService {
    constructor(private ctx: Context) {}

    /**
     * 获取用户所有题目相关的聚合统计（全域）
     * @param uid 用户ID
     * @param topTags 返回前 N 个标签（默认 20）
     */
    async getAggregatedStats(
        uid: number,
        topTags: number = 20,
    ): Promise<AggregatedProblemStats> {
        // 第一步：一次性获取所有题目状态记录
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
        ).toArray() as StatusRecord[];

        if (statusRecords.length === 0) {
            return {
                completion: {
                    totalProblems: 0,
                    solvedProblems: 0,
                    attemptedProblems: 0,
                    completionRate: 0,
                    starredProblems: 0,
                },
                difficultyDistribution: [],
                tagDistribution: [],
            };
        }

        // 计算完成情况统计（直接在内存中处理，不需要额外查询）
        let solvedProblems = 0;
        let starredProblems = 0;

        // 创建状态映射（使用 domainId:docId 作为 key）
        const statusMap = new Map<string, { solved: boolean }>();

        for (const status of statusRecords) {
            const solved = status.status === 1 || status.score === 100;
            if (solved) solvedProblems++;
            if (status.star) starredProblems++;

            const key = `${status.domainId}:${status.docId}`;
            statusMap.set(key, { solved });
        }

        const attemptedProblems = statusRecords.length;
        const completion: ProblemCompletionAggregation = {
            totalProblems: attemptedProblems,
            solvedProblems,
            attemptedProblems,
            completionRate: attemptedProblems > 0
                ? Math.round((solvedProblems / attemptedProblems) * 10000) / 100
                : 0,
            starredProblems,
        };

        // 按域分组题目ID，用于后续查询题目详情
        const domainProblemMap = new Map<string, number[]>();
        for (const status of statusRecords) {
            const { domainId, docId } = status;
            if (!domainProblemMap.has(domainId)) {
                domainProblemMap.set(domainId, []);
            }
            domainProblemMap.get(domainId)!.push(docId);
        }

        // 第二步：并行查询所有域的题目信息（难度和标签）
        // 使用一次查询获取 difficulty 和 tag
        const problemQueries = Array.from(domainProblemMap.entries()).map(
            ([domainId, problemIds]) => this.ctx.db.collection('document').find(
                {
                    domainId,
                    docType: 10, // TYPE_PROBLEM
                    docId: { $in: problemIds },
                },
                {
                    projection: {
                        docId: 1,
                        domainId: 1,
                        difficulty: 1,
                        tag: 1,
                    },
                },
            ).toArray(),
        );

        const problemResults = await Promise.all(problemQueries);
        const allProblems = problemResults.flat();

        // 计算难度分布
        const difficultyMap = new Map<number, { count: number, solved: number }>();
        // 计算标签分布
        const tagMap = new Map<string, { count: number, solved: number }>();

        for (const problem of allProblems) {
            const key = `${problem.domainId}:${problem.docId}`;
            const status = statusMap.get(key);
            const solved = status?.solved || false;

            // 难度统计
            if (problem.difficulty !== undefined && problem.difficulty !== null) {
                const difficulty = problem.difficulty;
                if (!difficultyMap.has(difficulty)) {
                    difficultyMap.set(difficulty, { count: 0, solved: 0 });
                }
                const diffStats = difficultyMap.get(difficulty)!;
                diffStats.count++;
                if (solved) diffStats.solved++;
            }

            // 标签统计
            const tags = problem.tag || [];
            for (const tag of tags) {
                if (!tag) continue;
                if (!tagMap.has(tag)) {
                    tagMap.set(tag, { count: 0, solved: 0 });
                }
                const tagStats = tagMap.get(tag)!;
                tagStats.count++;
                if (solved) tagStats.solved++;
            }
        }

        // 转换难度分布
        const difficultyDistribution: DifficultyAggregation[] = Array.from(difficultyMap.entries())
            .map(([difficulty, stats]) => ({
                difficulty,
                count: stats.count,
                solved: stats.solved,
            }))
            .sort((a, b) => a.difficulty - b.difficulty);

        // 转换标签分布（取前 N 个）
        const tagDistribution: TagAggregation[] = Array.from(tagMap.entries())
            .map(([tag, stats]) => ({
                tag,
                count: stats.count,
                solved: stats.solved,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, topTags);

        return {
            completion,
            difficultyDistribution,
            tagDistribution,
        };
    }
}
