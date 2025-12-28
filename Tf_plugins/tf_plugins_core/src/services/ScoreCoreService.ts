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
}

export default ScoreCoreService;
