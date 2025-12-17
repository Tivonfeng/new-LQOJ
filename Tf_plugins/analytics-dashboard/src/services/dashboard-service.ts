import { Context, RecordDoc, STATUS } from 'hydrooj';
import {
    AnalyticsContestPerf,
    AnalyticsDailySnapshot,
    AnalyticsPhaseProgress,
    AnalyticsTagMastery,
} from '../types/analytics';

interface ProblemDocLite { tags?: string[] }

interface UserLoginPayload {
    _id?: number;
    domainId?: string;
}

interface ContestSubmitPayload {
    uid?: number;
    cid?: number;
    pid?: number;
    timeUsed?: number;
    domainId?: string;
}

interface ContestEndPayload {
    uid?: number;
    cid?: number;
    score?: number;
    rank?: number;
    frozenDiff?: number;
    ratingDelta?: number;
    domainId?: string;
}

export class AnalyticsDashboardService {
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    async ensureIndexes() {
        const db = this.ctx.db;
        await Promise.all([
            db.ensureIndexes(
                db.collection('analytics.phase_progress' as any),
                { key: { uid: 1, phaseId: 1 }, name: 'uid_phase', unique: true },
                { key: { domainId: 1, phaseId: 1 }, name: 'domain_phase' },
            ),
            db.ensureIndexes(
                db.collection('analytics.phases' as any),
                { key: { phaseId: 1 }, name: 'phaseId', unique: true },
                { key: { domainId: 1, problemIds: 1 }, name: 'domain_problemIds' },
            ),
            db.ensureIndexes(
                db.collection('analytics.contest_perf' as any),
                { key: { uid: 1, cid: 1 }, name: 'uid_cid', unique: true },
            ),
            db.ensureIndexes(
                db.collection('analytics.daily_snapshots' as any),
                { key: { uid: 1, date: 1 }, name: 'uid_date', unique: true },
            ),
            db.ensureIndexes(
                db.collection('analytics.tag_mastery' as any),
                { key: { uid: 1, tag: 1 }, name: 'uid_tag', unique: true },
            ),
        ]);
    }

    // 判题事件钩子：后续填充阶段进度/标签掌握/日快照逻辑
    async handleRecordJudge(
        rdoc: RecordDoc,
        _updated?: boolean,
        pdoc?: ProblemDocLite,
    ) {
        if (!rdoc) return;
        const { uid, pid, domainId, status } = rdoc;
        const isAccepted = status === STATUS.STATUS_ACCEPTED;
        const tags: string[] = Array.isArray(pdoc?.tags) ? pdoc.tags : [];

        const db = this.ctx.db;

        // 更新日快照
        const timeFallback = (rdoc as any).submitTime ?? (rdoc as any).time ?? Date.now();
        const dateStr = this.formatDate(timeFallback);
        await db.collection('analytics.daily_snapshots' as any).updateOne(
            { uid, date: dateStr },
            {
                $setOnInsert: { domainId, createdAt: new Date() },
                $inc: { submissions: 1, accepted: isAccepted ? 1 : 0 },
                $set: { updatedAt: new Date() },
            },
            { upsert: true },
        );

        // 匹配包含该题的阶段（题单匹配或标签规则匹配）
        const matchFilter: any = { domainId };
        matchFilter.$or = [{ problemIds: pid }];
        if (tags.length > 0) {
            matchFilter.$or.push({ tagRules: { $exists: true, $ne: [] } });
        }
        const phases = await db.collection('analytics.phases' as any)
            .find(matchFilter)
            .toArray();

        const updates = phases.map((phase) => {
            const hitByProblem = Array.isArray(phase.problemIds) && phase.problemIds.includes(pid);
            const hitByTag = Array.isArray(phase.tagRules) && phase.tagRules.length > 0
                ? this.matchTags(tags, phase.tagRules)
                : false;
            if (hitByProblem || hitByTag) {
                return this.updatePhaseProgress(phase, rdoc, isAccepted);
            }
            return Promise.resolve();
        });
        await Promise.all(updates);

        // 标签掌握
        if (tags.length > 0) {
            const ops = tags.map((tag) => db.collection('analytics.tag_mastery' as any).updateOne(
                { uid, tag },
                {
                    $setOnInsert: { uid, tag, domainId, accepted: 0, attempts: 0, createdAt: new Date() },
                    $inc: { attempts: 1, accepted: isAccepted ? 1 : 0 },
                    $set: { updatedAt: new Date(), domainId },
                },
                { upsert: true },
            ));
            await Promise.all(ops);
        }
    }

    // 登录事件钩子：更新活跃/连续天数等
    async handleUserLogin(user?: UserLoginPayload) {
        if (!user?._id) return;
        const uid = user._id;
        const dateStr = this.formatDate(Date.now());
        await this.ctx.db.collection('analytics.daily_snapshots' as any).updateOne(
            { uid, date: dateStr },
            {
                $setOnInsert: {
                    domainId: user.domainId,
                    submissions: 0,
                    accepted: 0,
                    createdAt: new Date(),
                },
                $set: { updatedAt: new Date(), domainId: user.domainId },
            },
            { upsert: true },
        );
    }

    async handleContestSubmit(data?: ContestSubmitPayload) {
        const { uid, cid, pid, timeUsed } = data || {};
        if (!uid || !cid) return data;
        const collection = this.ctx.db.collection('analytics.contest_perf' as any);
        await collection.updateOne(
            { uid, cid },
            {
                $setOnInsert: { domainId: data?.domainId, createdAt: new Date() },
                $inc: { [`tries.${pid}`]: 1 },
                ...(timeUsed ? { $set: { [`timeUsed.${pid}`]: timeUsed, updatedAt: new Date() } } : { $set: { updatedAt: new Date() } }),
            },
            { upsert: true },
        );
        return data;
    }

    async handleContestEnd(data?: ContestEndPayload) {
        const { uid, cid } = data || {};
        if (!uid || !cid) return data;
        const collection = this.ctx.db.collection('analytics.contest_perf' as any);
        const update: any = {
            $set: { updatedAt: new Date() },
        };
        if (data?.score !== undefined) update.$set.score = data.score;
        if (data?.rank !== undefined) update.$set.rank = data.rank;
        if (data?.frozenDiff !== undefined) update.$set.frozenDiff = data.frozenDiff;
        if (data?.ratingDelta !== undefined) update.$set.ratingDelta = data.ratingDelta;
        await collection.updateOne(
            { uid, cid },
            {
                $setOnInsert: { domainId: data?.domainId, createdAt: new Date() },
                ...update,
            },
            { upsert: true },
        );
        return data;
    }

    async getPhaseProgress(uid: number, phaseId?: string) {
        const query: any = { uid };
        if (phaseId) query.phaseId = phaseId;
        return this.ctx.db.collection('analytics.phase_progress' as any)
            .find(query)
            .toArray() as Promise<AnalyticsPhaseProgress[]>;
    }

    async getDaily(uid: number, start?: string, end?: string) {
        const query: any = { uid };
        if (start || end) {
            query.date = {};
            if (start) query.date.$gte = start;
            if (end) query.date.$lte = end;
        }
        return this.ctx.db.collection('analytics.daily_snapshots' as any)
            .find(query)
            .sort({ date: 1 })
            .toArray() as Promise<AnalyticsDailySnapshot[]>;
    }

    async getContestPerf(uid: number, cid: number) {
        return this.ctx.db.collection('analytics.contest_perf' as any)
            .findOne({ uid, cid }) as Promise<AnalyticsContestPerf | null>;
    }

    async getTagMastery(uid: number) {
        return this.ctx.db.collection('analytics.tag_mastery' as any)
            .find({ uid })
            .sort({ updatedAt: -1 })
            .toArray() as Promise<AnalyticsTagMastery[]>;
    }

    private formatDate(ts: number | Date) {
        const d = typeof ts === 'number' ? new Date(ts) : ts;
        return d.toISOString().substring(0, 10);
    }

    private matchTags(tags: string[], rules: string[]) {
        if (tags.length === 0 || rules.length === 0) return false;
        const tagSet = new Set(tags.map((t) => t.toLowerCase()));
        return rules.some((r) => tagSet.has(r.toLowerCase()));
    }

    private async updatePhaseProgress(phase: any, rdoc: RecordDoc, isAccepted: boolean) {
        const { uid, pid, domainId } = rdoc;
        const collection = this.ctx.db.collection('analytics.phase_progress' as any);
        const doc = await collection.findOne({ uid, phaseId: phase.phaseId });

        const solvedPids = Array.from(new Set([...(doc?.solvedPids || []), ...(isAccepted ? [pid] : [])]));
        const total = Array.isArray(phase.problemIds) ? phase.problemIds.length : doc?.total || solvedPids.length;
        const covered = solvedPids.length;

        const errorBreakdown = { ...(doc?.errorBreakdown || {}) };
        if (!isAccepted) {
            const statusKey = this.mapStatus(rdoc.status);
            errorBreakdown[statusKey] = (errorBreakdown[statusKey] || 0) + 1;
        }

        await collection.updateOne(
            { uid, phaseId: phase.phaseId },
            {
                $setOnInsert: { domainId, createdAt: new Date() },
                $set: {
                    solved: solvedPids.length,
                    total,
                    covered,
                    errorBreakdown,
                    lastSubmitAt: new Date(),
                    updatedAt: new Date(),
                    solvedPids,
                },
            },
            { upsert: true },
        );
    }

    private mapStatus(status: number) {
        switch (status) {
            case STATUS.STATUS_WRONG_ANSWER: return 'WA';
            case STATUS.STATUS_TIME_LIMIT_EXCEEDED: return 'TLE';
            case STATUS.STATUS_MEMORY_LIMIT_EXCEEDED: return 'MLE';
            case STATUS.STATUS_RUNTIME_ERROR: return 'RE';
            case STATUS.STATUS_COMPILE_ERROR: return 'CE';
            default: return 'other';
        }
    }
}
