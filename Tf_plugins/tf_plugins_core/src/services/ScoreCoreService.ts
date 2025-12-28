import { Context } from 'hydrooj';

export const ScoreCategory = {
    AC_PROBLEM: 'AC题目',
    GAME_ENTERTAINMENT: '游戏娱乐',
    TYPING_CHALLENGE: '打字挑战',
    WORK_INTERACTION: '作品互动',
    AI_ASSISTANT: 'AI辅助',
    TRANSFER: '积分转账',
    DAILY_CHECKIN: '每日签到',
    CERTIFICATE: '证书奖励',
    ADMIN_OPERATION: '管理员操作',
} as const;

export type ScoreCategoryType = typeof ScoreCategory[keyof typeof ScoreCategory];

export interface ScoreRecord {
    _id?: any;
    uid: number;
    domainId: string;
    pid: number;
    recordId: any;
    score: number;
    reason: string;
    createdAt: Date;
    category?: ScoreCategoryType;
    title?: string;
}

export interface UserScore {
    _id?: any;
    uid: number;
    domainId?: string;
    totalScore: number;
    acCount: number;
    lastUpdated: Date;
}

export interface AwardIfFirstACParams {
    uid: number;
    pid: number;
    domainId: string;
    recordId: any;
    score: number;
    reason: string;
    category?: ScoreCategoryType;
    title?: string;
}

export interface AwardIfFirstACResult {
    isFirstAC: boolean;
    awarded: number;
}

export class ScoreCoreService {
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    async addScoreRecord(record: Omit<ScoreRecord, '_id' | 'createdAt'>): Promise<void> {
        await this.ctx.db.collection('score.records' as any).insertOne({
            ...record,
            createdAt: new Date(),
        });
    }

    async updateUserScore(_domainId: string, uid: number, scoreChange: number): Promise<void> {
        await this.ctx.db.collection('score.users' as any).updateOne(
            { uid },
            {
                $inc: { totalScore: scoreChange, acCount: scoreChange > 0 ? 1 : 0 },
                $set: { lastUpdated: new Date() },
            },
            { upsert: true },
        );
    }

    /**
     * 原子化：判断是否首次 AC 并在首次时发放积分
     * 返回 { isFirstAC, awarded }，不会在重复 AC 时抛出错误
     */
    async awardIfFirstAC(params: AwardIfFirstACParams): Promise<AwardIfFirstACResult> {
        const { uid, pid, domainId, recordId, score, reason, category, title } = params;
        try {
            await this.ctx.db.collection('score.records' as any).insertOne({
                uid,
                pid,
                domainId,
                recordId,
                score,
                reason,
                category,
                title,
                createdAt: new Date(),
            });

            // 插入成功，说明是首次 AC，更新用户积分
            await this.updateUserScore(domainId, uid, score);
            return { isFirstAC: true, awarded: score };
        } catch (err: any) {
            // 处理重复键（已存在积分记录）——非首次 AC
            if (err && (err.code === 11000 || (err.message && err.message.includes('E11000')))) {
                return { isFirstAC: false, awarded: 0 };
            }
            // 其它错误向上抛出
            throw err;
        }
    }

    /**
     * 转账帮助方法：从 fromUid 扣除积分并给 toUid 增加积分，并写入两条记录
     */
    async transferPoints(domainId: string, fromUid: number, toUid: number, amount: number, reason?: string): Promise<void> {
        if (!amount || amount <= 0) throw new Error('amount must be positive');

        const timestamp = Date.now();
        const uniquePidFrom = -7000000 - timestamp;
        const uniquePidTo = -7000000 - timestamp - 1;

        // 扣除转出用户
        await this.updateUserScore(domainId, fromUid, -amount);
        await this.addScoreRecord({
            uid: fromUid,
            domainId,
            pid: uniquePidFrom,
            recordId: null,
            score: -amount,
            reason: reason || `Transfer to ${toUid}`,
        });

        // 增加接收用户
        await this.updateUserScore(domainId, toUid, amount);
        await this.addScoreRecord({
            uid: toUid,
            domainId,
            pid: uniquePidTo,
            recordId: null,
            score: amount,
            reason: reason || `Transfer from ${fromUid}`,
        });
    }

    async getUserScore(_domainId: string, uid: number): Promise<UserScore | null> {
        return await this.ctx.db.collection('score.users' as any).findOne({ uid });
    }

    async getScoreRanking(_domainId: string, limit: number = 50): Promise<UserScore[]> {
        return await this.ctx.db.collection('score.users' as any)
            .find({})
            .sort({ totalScore: -1, lastUpdated: 1 })
            .limit(limit)
            .toArray();
    }

    async getUserScoreRecords(_domainId: string, uid: number, limit: number = 20): Promise<ScoreRecord[]> {
        return await this.ctx.db.collection('score.records' as any)
            .find({ uid })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray() as ScoreRecord[];
    }

    async getUserRank(_domainId: string, uid: number): Promise<number | null> {
        const userScore = await this.getUserScore(_domainId, uid);
        if (!userScore) return null;
        const higherRankCount = await this.ctx.db.collection('score.users' as any)
            .countDocuments({ totalScore: { $gt: userScore.totalScore } });
        return higherRankCount + 1;
    }

    async getTodayStats(_domainId: string): Promise<{
        totalScore: number;
        activeUsers: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayScores = await this.ctx.db.collection('score.records' as any)
            .find({ createdAt: { $gte: today } })
            .toArray();
        const totalScore = todayScores.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
        const activeUsers = new Set(todayScores.map((r: any) => r.uid)).size;
        return { totalScore, activeUsers };
    }

    async getScoreRankingWithPagination(_domainId: string, page: number, limit: number): Promise<{
        users: UserScore[];
        total: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        const users = await this.ctx.db.collection('score.users' as any)
            .find({})
            .sort({ totalScore: -1, lastUpdated: 1 })
            .skip(skip)
            .limit(limit)
            .toArray() as UserScore[];

        const total = await this.ctx.db.collection('score.users' as any).countDocuments();
        const totalPages = Math.ceil(total / limit);

        return { users, total, totalPages };
    }

    async getScoreRecordsWithPagination(domainId: string, page: number, limit: number, category?: string): Promise<{
        records: ScoreRecord[];
        total: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;
        const query: any = {};
        if (category) query.category = category;

        const records = await this.ctx.db.collection('score.records' as any)
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray() as ScoreRecord[];

        const total = await this.ctx.db.collection('score.records' as any).countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        return { records, total, totalPages };
    }
}

export default ScoreCoreService;
