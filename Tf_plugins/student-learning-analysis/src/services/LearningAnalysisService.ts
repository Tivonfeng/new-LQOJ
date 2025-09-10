import { Context, RecordDoc, ProblemDoc, STATUS } from 'hydrooj';
import {
    LearningRecord,
    KnowledgePoint,
    AnalysisCache,
    RecommendationRecord,
    LearningAnalysisConfig,
    ErrorPattern,
    EfficiencyAnalysis,
} from '../types';

/**
 * 学情分析服务
 * 负责：学习数据分析、知识点掌握度计算、学习模式识别
 */
export class LearningAnalysisService {
    private config: LearningAnalysisConfig;
    private ctx: Context;

    // 知识点分类映射
    private readonly KNOWLEDGE_CATEGORIES = {
        'data-structures': ['array', 'linked-list', 'stack', 'queue', 'tree', 'graph', 'hash-table'],
        'algorithms': ['sorting', 'searching', 'dynamic-programming', 'greedy', 'divide-conquer', 'recursion'],
        'math': ['number-theory', 'combinatorics', 'geometry', 'probability', 'linear-algebra'],
        'string': ['string-matching', 'string-processing', 'regular-expression'],
        'graph': ['graph-traversal', 'shortest-path', 'minimum-spanning-tree', 'network-flow'],
    };

    constructor(config: LearningAnalysisConfig, ctx: Context) {
        this.config = config;
        this.ctx = ctx;
    }

    /**
     * 处理新的提交记录，更新学习分析数据
     * @param recordDoc 提交记录
     * @param problemDoc 题目信息
     */
    async processSubmissionRecord(recordDoc: RecordDoc, problemDoc?: ProblemDoc): Promise<void> {
        if (!this.config.enabled) return;

        try {
            // 创建学习记录
            const learningRecord = await this.createLearningRecord(recordDoc, problemDoc);
            await this.saveLearningRecord(learningRecord);

            // 只有AC的记录才更新知识点掌握度
            if (recordDoc.status === STATUS.STATUS_ACCEPTED) {
                await this.updateKnowledgePoints(recordDoc.uid, recordDoc.domainId, learningRecord);
                
                // 生成新的推荐
                if (this.config.recommendation.enabled) {
                    await this.generateRecommendations(recordDoc.uid, recordDoc.domainId);
                }
            }

            // 清除相关缓存
            await this.clearAnalysisCache(recordDoc.uid, recordDoc.domainId);

            console.log(`[LearningAnalysis] ✅ Processed submission ${recordDoc._id} for user ${recordDoc.uid}`);
        } catch (error) {
            console.error('[LearningAnalysis] ❌ Error processing submission:', error);
        }
    }

    /**
     * 创建学习记录
     */
    private async createLearningRecord(recordDoc: RecordDoc, problemDoc?: ProblemDoc): Promise<LearningRecord> {
        // 获取之前的提交次数
        const previousAttempts = await this.ctx.db.collection('record').countDocuments({
            uid: recordDoc.uid,
            pid: recordDoc.pid,
            _id: { $lt: recordDoc._id },
        });

        // 计算解题时间（如果有开始时间）
        const solutionTime = recordDoc.judgeAt && recordDoc.judgeAt 
            ? Math.max(1, Math.round((recordDoc.judgeAt.getTime() - recordDoc.judgeAt.getTime()) / 1000))
            : 0;

        // 分析涉及的知识点
        const knowledgePoints = this.analyzeKnowledgePoints(problemDoc);

        return {
            uid: recordDoc.uid,
            domainId: recordDoc.domainId,
            problemId: recordDoc.pid,
            submissionId: recordDoc._id,
            submissionTime: recordDoc.judgeAt || new Date(),
            solutionTime,
            attemptCount: previousAttempts + 1,
            status: this.getStatusString(recordDoc.status),
            knowledgePoints,
            difficulty: problemDoc?.difficulty || 1,
            language: recordDoc.lang || 'unknown',
            codeLength: recordDoc.code?.length || 0,
            memoryUsage: recordDoc.memory,
            timeUsage: recordDoc.time,
            createdAt: new Date(),
        };
    }

    /**
     * 分析题目涉及的知识点
     */
    private analyzeKnowledgePoints(problemDoc?: ProblemDoc): string[] {
        if (!problemDoc) return [];

        const knowledgePoints: string[] = [];
        const title = (problemDoc.title || '').toLowerCase();
        const content = (problemDoc.content || '').toLowerCase();
        const tags = problemDoc.tag || [];

        // 基于标签分析
        tags.forEach(tag => {
            if (typeof tag === 'string') {
                knowledgePoints.push(tag.toLowerCase());
            }
        });

        // 基于题目标题和内容的关键词分析
        Object.entries(this.KNOWLEDGE_CATEGORIES).forEach(([category, keywords]) => {
            keywords.forEach(keyword => {
                if (title.includes(keyword) || content.includes(keyword)) {
                    knowledgePoints.push(keyword);
                }
            });
        });

        // 去重
        return [...new Set(knowledgePoints)];
    }

    /**
     * 保存学习记录
     */
    private async saveLearningRecord(record: LearningRecord): Promise<void> {
        await this.ctx.db.collection('learning.records' as any).insertOne(record);
    }

    /**
     * 更新知识点掌握度
     */
    private async updateKnowledgePoints(uid: number, domainId: string, record: LearningRecord): Promise<void> {
        for (const knowledgePoint of record.knowledgePoints) {
            await this.updateSingleKnowledgePoint(uid, domainId, knowledgePoint, record);
        }
    }

    /**
     * 更新单个知识点掌握度
     */
    private async updateSingleKnowledgePoint(
        uid: number, 
        domainId: string, 
        topic: string, 
        record: LearningRecord
    ): Promise<void> {
        const category = this.getKnowledgeCategory(topic);
        
        // 获取该知识点的所有学习记录
        const allRecords = await this.ctx.db.collection('learning.records' as any)
            .find({
                uid,
                knowledgePoints: topic,
                status: 'Accepted'
            })
            .toArray();

        // 计算掌握程度
        const totalProblems = allRecords.length;
        const averageTime = totalProblems > 0 
            ? allRecords.reduce((sum, r) => sum + r.solutionTime, 0) / totalProblems 
            : 0;
        const averageDifficulty = totalProblems > 0
            ? allRecords.reduce((sum, r) => sum + r.difficulty, 0) / totalProblems
            : 1;

        // 计算掌握度分数 (考虑解题数量、平均时间、题目难度等因素)
        let masteryLevel = Math.min(100, Math.max(0, 
            (totalProblems * 10) + // 基础分：解题数量
            (averageDifficulty * 5) - // 难度奖励
            Math.max(0, (averageTime - 300) / 60) // 时间惩罚
        ));

        // 计算置信度
        const confidence = Math.min(1, totalProblems / 10); // 解题10道以上置信度为1

        // 更新或插入知识点记录
        await this.ctx.db.collection('learning.knowledge_points' as any).updateOne(
            { uid, domainId, topic },
            {
                $set: {
                    category,
                    masteryLevel,
                    confidence,
                    lastPracticed: record.submissionTime,
                    problemsSolved: totalProblems,
                    averageTime,
                    updatedAt: new Date(),
                },
                $inc: {
                    problemsAttempted: 1,
                }
            },
            { upsert: true }
        );
    }

    /**
     * 获取知识点类别
     */
    private getKnowledgeCategory(topic: string): string {
        for (const [category, topics] of Object.entries(this.KNOWLEDGE_CATEGORIES)) {
            if (topics.includes(topic)) {
                return category;
            }
        }
        return 'other';
    }

    /**
     * 生成个性化推荐
     */
    async generateRecommendations(uid: number, domainId: string): Promise<void> {
        if (!this.config.recommendation.enabled) return;

        try {
            // 获取用户的知识点掌握情况
            const knowledgePoints = await this.getUserKnowledgePoints(uid, domainId);
            
            // 找到薄弱知识点
            const weakPoints = knowledgePoints
                .filter(kp => kp.masteryLevel < 70)
                .sort((a, b) => a.masteryLevel - b.masteryLevel)
                .slice(0, 3);

            const recommendedProblems: number[] = [];
            const reasons: string[] = [];

            // 基于薄弱知识点推荐题目
            for (const weakPoint of weakPoints) {
                const problems = await this.findPracticeProblems(
                    domainId, 
                    weakPoint.topic, 
                    weakPoint.masteryLevel
                );
                
                recommendedProblems.push(...problems.slice(0, 2));
                reasons.push(`加强 ${weakPoint.topic} 知识点练习`);
            }

            // 保存推荐记录
            if (recommendedProblems.length > 0) {
                await this.saveRecommendation({
                    uid,
                    domainId,
                    recommendationType: 'knowledge-based',
                    problemIds: recommendedProblems,
                    reasons,
                    priority: 8,
                    status: 'pending',
                    generatedAt: new Date(),
                });
            }
        } catch (error) {
            console.error('[LearningAnalysis] ❌ Error generating recommendations:', error);
        }
    }

    /**
     * 查找练习题目
     */
    private async findPracticeProblems(
        domainId: string, 
        knowledgePoint: string, 
        currentLevel: number
    ): Promise<number[]> {
        // 根据当前掌握水平选择合适难度的题目
        const targetDifficulty = Math.min(5, Math.max(1, Math.ceil(currentLevel / 20)));
        
        const problems = await this.ctx.db.collection('problem').find({
            domainId,
            tag: { $in: [knowledgePoint] },
            difficulty: { $in: [targetDifficulty, targetDifficulty + 1] }
        }).limit(5).toArray();

        return problems.map(p => p.docId || p._id);
    }

    /**
     * 保存推荐记录
     */
    private async saveRecommendation(recommendation: Omit<RecommendationRecord, '_id'>): Promise<void> {
        await this.ctx.db.collection('learning.recommendations' as any).insertOne(recommendation);
    }

    /**
     * 获取用户知识点掌握情况
     */
    async getUserKnowledgePoints(uid: number, domainId: string): Promise<KnowledgePoint[]> {
        return await this.ctx.db.collection('learning.knowledge_points' as any)
            .find({ uid, domainId })
            .sort({ masteryLevel: 1 })
            .toArray();
    }

    /**
     * 分析学习错误模式
     */
    async analyzeErrorPatterns(uid: number, domainId: string, days: number = 30): Promise<ErrorPattern[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const errorRecords = await this.ctx.db.collection('learning.records' as any)
            .find({
                uid,
                domainId,
                status: { $ne: 'Accepted' },
                submissionTime: { $gte: startDate }
            })
            .toArray();

        // 按状态分组统计错误类型
        const errorStats = new Map<string, number>();
        errorRecords.forEach(record => {
            const count = errorStats.get(record.status) || 0;
            errorStats.set(record.status, count + 1);
        });

        // 生成错误模式分析
        const patterns: ErrorPattern[] = [];
        for (const [errorType, frequency] of errorStats.entries()) {
            patterns.push({
                errorType,
                frequency,
                description: this.getErrorDescription(errorType),
                suggestions: this.getErrorSuggestions(errorType),
                relatedKnowledgePoints: [],
                examples: [],
            });
        }

        return patterns.sort((a, b) => b.frequency - a.frequency);
    }

    /**
     * 分析学习效率
     */
    async analyzeEfficiency(uid: number, domainId: string): Promise<EfficiencyAnalysis> {
        const userRecords = await this.ctx.db.collection('learning.records' as any)
            .find({ uid, domainId })
            .sort({ submissionTime: -1 })
            .limit(100)
            .toArray();

        // 时间分布分析
        const hourlyActivity = new Array(24).fill(0);
        let totalTime = 0;
        let effectiveTime = 0;

        userRecords.forEach(record => {
            const hour = record.submissionTime.getHours();
            hourlyActivity[hour]++;
            
            totalTime += record.solutionTime;
            if (record.status === 'Accepted') {
                effectiveTime += record.solutionTime;
            }
        });

        // 找到高效时段（前3个最活跃时段）
        const peakHours = hourlyActivity
            .map((count, hour) => ({ hour, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(item => item.hour);

        // 难度进阶分析
        const recentProblems = userRecords.slice(0, 20);
        const averageDifficulty = recentProblems.reduce((sum, r) => sum + r.difficulty, 0) / recentProblems.length;
        const successRate = recentProblems.filter(r => r.status === 'Accepted').length / recentProblems.length;

        return {
            uid,
            domainId,
            timeDistribution: {
                peakHours,
                totalHours: Math.round(totalTime / 3600),
                effectiveHours: Math.round(effectiveTime / 3600),
            },
            difficultyProgression: {
                currentLevel: Math.round(averageDifficulty),
                recommendedLevel: Math.min(5, Math.max(1, Math.round(averageDifficulty + successRate))),
                progressRate: successRate,
            },
            learningVelocity: {
                problemsPerHour: userRecords.length / Math.max(1, totalTime / 3600),
                conceptsPerWeek: 0, // TODO: 实现概念学习速度计算
                improvementRate: successRate,
            },
        };
    }

    /**
     * 清除分析缓存
     */
    private async clearAnalysisCache(uid: number, domainId: string): Promise<void> {
        await this.ctx.db.collection('learning.analysis_cache' as any).deleteMany({
            uid,
            domainId,
            expiresAt: { $lt: new Date() }
        });
    }

    /**
     * 获取状态字符串
     */
    private getStatusString(status: number): string {
        const statusMap: Record<number, string> = {
            [STATUS.STATUS_ACCEPTED]: 'Accepted',
            [STATUS.STATUS_WRONG_ANSWER]: 'Wrong Answer',
            [STATUS.STATUS_TIME_LIMIT_EXCEEDED]: 'Time Limit Exceeded',
            [STATUS.STATUS_MEMORY_LIMIT_EXCEEDED]: 'Memory Limit Exceeded',
            [STATUS.STATUS_COMPILE_ERROR]: 'Compile Error',
            [STATUS.STATUS_RUNTIME_ERROR]: 'Runtime Error',
        };
        return statusMap[status] || 'Unknown';
    }

    /**
     * 获取错误描述
     */
    private getErrorDescription(errorType: string): string {
        const descriptions: Record<string, string> = {
            'Wrong Answer': '答案错误，逻辑或算法实现有问题',
            'Time Limit Exceeded': '超时，算法效率需要优化',
            'Memory Limit Exceeded': '内存超限，需要优化空间复杂度',
            'Compile Error': '编译错误，语法或类型错误',
            'Runtime Error': '运行时错误，可能存在数组越界、空指针等问题',
        };
        return descriptions[errorType] || '未知错误类型';
    }

    /**
     * 获取错误改进建议
     */
    private getErrorSuggestions(errorType: string): string[] {
        const suggestions: Record<string, string[]> = {
            'Wrong Answer': [
                '仔细阅读题目要求，确保理解正确',
                '验证算法逻辑，考虑边界情况',
                '使用样例数据进行测试',
                '检查数据类型和范围'
            ],
            'Time Limit Exceeded': [
                '分析算法时间复杂度，寻找更高效的解法',
                '优化循环和递归',
                '考虑使用更合适的数据结构',
                '减少重复计算'
            ],
            'Memory Limit Exceeded': [
                '优化数据结构，减少内存占用',
                '避免创建不必要的对象',
                '考虑使用原地算法',
                '释放不再使用的内存'
            ],
            'Compile Error': [
                '检查语法错误',
                '确认变量声明和类型',
                '检查函数签名和调用',
                '确保导入所需的库'
            ],
            'Runtime Error': [
                '检查数组边界',
                '验证指针和引用',
                '处理除零错误',
                '检查递归终止条件'
            ],
        };
        return suggestions[errorType] || ['请检查代码实现'];
    }
}