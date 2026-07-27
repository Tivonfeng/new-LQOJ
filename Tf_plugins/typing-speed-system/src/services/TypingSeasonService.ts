import { Context, ObjectId } from 'hydrooj';
import { TypingStatsService } from './TypingStatsService';
import { getWeekString } from '../utils/dateUtils';
import { safeGetService } from '../utils/ctxHelper';

// 赛季状态
export type SeasonStatus = 'pending' | 'active' | 'ended';

// 排名奖励配置
export interface RankingReward {
    rank: number;      // 名次（1=冠军，2=亚军...），0 表示"其他名次"
    score: number;     // 奖励积分
}

// 赛季配置
export interface TypingSeason {
    _id?: any;
    name: string;                    // 如 "2026年8月赛季"
    status: SeasonStatus;            // 待开始/进行中/已结束
    weekCount: number;               // 赛季周数（默认4）
    startWeek: string;               // 开始周标识 "2026-W31"
    endWeek: string;                 // 结束周标识
    startedAt: Date;                 // 管理员开启时间
    endedAt: Date | null;            // 结算时间
    // 奖励配置
    rankingRewards: RankingReward[]; // 排名奖配置
    progressTarget: number;          // 达标奖：赛季内进步目标WPM数
    progressReward: number;          // 达标奖励积分
    // 统计
    participantCount: number;        // 报名人数
}

// 赛季报名记录
export interface SeasonRegistration {
    _id?: any;
    seasonId: any;
    uid: number;
    registeredAt: Date;
    // 赛季内追踪
    baselineMaxWpm: number;          // 报名时的最高WPM（赛季起点）
    currentMaxWpm: number;           // 赛季内最新最高WPM
    seasonProgress: number;          // 赛季内进步幅度 = currentMaxWpm - baselineMaxWpm
    // 跑毒状态
    poisonStatus: 'safe' | 'in_zone';
    weeksInZone: number;             // 连续在毒圈周数
    lastSafeWeek: string;            // 最后安全周
    lastDeductWeek: string | null;   // 上次扣分周（防重复扣）
    totalDeducted: number;           // 赛季累计被扣
    // 结算
    finalized: boolean;              // 是否已结算
    finalRank: number | null;        // 最终排名
    rankingReward: number;           // 排名奖励积分
    progressRewardEarned: number;    // 达标奖励积分
}

// 默认奖励配置（单次奖励上限300分）
export const DEFAULT_RANKING_REWARDS: RankingReward[] = [
    { rank: 1, score: 300 },
    { rank: 2, score: 200 },
    { rank: 3, score: 150 },
    { rank: 10, score: 100 }, // rank:10 表示第4-10名
];

export const DEFAULT_PROGRESS_TARGET = 20;   // 赛季内进步20 WPM
export const DEFAULT_PROGRESS_REWARD = 200;  // 达标奖励200分
export const DEFAULT_WEEK_COUNT = 4;         // 默认4周赛季

/**
 * 打字赛季服务
 * 负责：赛季创建/报名/进度更新/结算/查询
 */
export class TypingSeasonService {
    private ctx: Context;
    private statsService: TypingStatsService;

    constructor(ctx: Context, statsService: TypingStatsService) {
        this.ctx = ctx;
        this.statsService = statsService;
    }

    /**
     * 创建并激活新赛季（同时结束旧赛季）
     */
    async createSeason(
        name: string,
        weekCount: number = DEFAULT_WEEK_COUNT,
        rankingRewards?: RankingReward[],
        progressTarget?: number,
        progressReward?: number,
    ): Promise<TypingSeason> {
        // 结束当前进行中的赛季（如果有）
        const current = await this.getCurrentSeason();
        if (current && current.status === 'active') {
            await this.ctx.db.collection('typing.seasons' as any).updateOne(
                { _id: current._id },
                { $set: { status: 'ended' as SeasonStatus, endedAt: new Date() } },
            );
            console.log(`[TypingSeason] Auto-ended previous season: ${current.name}`);
        }

        const startWeek = getWeekString(new Date());
        // 计算 endWeek：startWeek + weekCount 周
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + weekCount * 7);
        const endWeek = getWeekString(endDate);

        const season: Omit<TypingSeason, '_id'> = {
            name,
            status: 'active',
            weekCount,
            startWeek,
            endWeek,
            startedAt: new Date(),
            endedAt: null,
            rankingRewards: rankingRewards || DEFAULT_RANKING_REWARDS,
            progressTarget: progressTarget ?? DEFAULT_PROGRESS_TARGET,
            progressReward: progressReward ?? DEFAULT_PROGRESS_REWARD,
            participantCount: 0,
        };

        const result = await this.ctx.db.collection('typing.seasons' as any).insertOne(season);
        console.log(`[TypingSeason] Created new season: ${name} (${startWeek} ~ ${endWeek}, ${weekCount} weeks)`);

        return { ...season, _id: result.insertedId };
    }

    /**
     * 获取当前进行中的赛季
     */
    async getCurrentSeason(): Promise<TypingSeason | null> {
        return await this.ctx.db.collection('typing.seasons' as any).findOne({ status: 'active' });
    }

    /**
     * 获取最近 N 个赛季（含已结束）
     */
    async getRecentSeasons(limit: number = 5): Promise<TypingSeason[]> {
        return await this.ctx.db.collection('typing.seasons' as any)
            .find({})
            .sort({ startedAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 学生报名当前赛季
     */
    async register(uid: number): Promise<{ success: boolean; message: string; registration?: SeasonRegistration }> {
        const season = await this.getCurrentSeason();
        if (!season) {
            return { success: false, message: '当前没有进行中的赛季' };
        }

        // 检查是否已报名
        const existing = await this.ctx.db.collection('typing.season_registrations' as any).findOne({
            seasonId: season._id,
            uid,
        });
        if (existing) {
            return { success: false, message: '你已经报名了本赛季' };
        }

        // 获取当前最高WPM作为基线
        const userStats = await this.statsService.getUserStats(uid);
        const baselineMaxWpm = userStats?.maxWpm || 0;
        const currentWeek = getWeekString(new Date());

        const registration: Omit<SeasonRegistration, '_id'> = {
            seasonId: season._id,
            uid,
            registeredAt: new Date(),
            baselineMaxWpm,
            currentMaxWpm: baselineMaxWpm,
            seasonProgress: 0,
            poisonStatus: 'safe',
            weeksInZone: 0,
            lastSafeWeek: currentWeek,
            lastDeductWeek: null,
            totalDeducted: 0,
            finalized: false,
            finalRank: null,
            rankingReward: 0,
            progressRewardEarned: 0,
        };

        try {
            const result = await this.ctx.db.collection('typing.season_registrations' as any).insertOne(registration);
            // 报名人数 +1
            await this.ctx.db.collection('typing.seasons' as any).updateOne(
                { _id: season._id },
                { $inc: { participantCount: 1 } },
            );
            console.log(`[TypingSeason] User ${uid} registered for season ${season.name}, baseline=${baselineMaxWpm}`);
            return { success: true, message: '报名成功！', registration: { ...registration, _id: result.insertedId } };
        } catch (error: any) {
            if ((error as any).code === 11000) {
                return { success: false, message: '你已经报名了本赛季' };
            }
            throw error;
        }
    }

    /**
     * 获取用户的报名记录
     */
    async getRegistration(seasonId: any, uid: number): Promise<SeasonRegistration | null> {
        return await this.ctx.db.collection('typing.season_registrations' as any).findOne({
            seasonId,
            uid,
        });
    }

    /**
     * 获取当前赛季用户的报名记录
     */
    async getCurrentRegistration(uid: number): Promise<SeasonRegistration | null> {
        const season = await this.getCurrentSeason();
        if (!season) return null;
        return await this.getRegistration(season._id, uid);
    }

    /**
     * 获取赛季全部报名记录（用于结算，按赛季进步幅度降序）
     */
    async getRegistrations(seasonId: any): Promise<SeasonRegistration[]> {
        return await this.ctx.db.collection('typing.season_registrations' as any)
            .find({ seasonId })
            .sort({ seasonProgress: -1 })
            .toArray();
    }

    /**
     * 获取赛季排行榜（按净分 = 进步WPM - 累计扣分 降序）
     * 净分体现综合表现：进步贡献减去毒圈惩罚
     */
    async getSeasonRanking(seasonId: any, limit: number = 50): Promise<any[]> {
        const registrations = await this.ctx.db.collection('typing.season_registrations' as any)
            .find({ seasonId, finalized: { $ne: true } })
            .toArray();
        // 按净分排序：进步分 - 累计扣分
        const ranked = registrations.map((reg) => ({
            ...reg,
            netScore: reg.seasonProgress - (reg.totalDeducted || 0),
        })).sort((a, b) => b.netScore - a.netScore || a.registeredAt.getTime() - b.registeredAt.getTime());
        return ranked.slice(0, limit);
    }

    /**
     * 录入新成绩时更新赛季进度
     * @param uid 用户ID
     * @param newMaxWpm 该用户最新的最高WPM（更新统计后的值）
     */
    async updateRegistrationProgress(uid: number, newMaxWpm: number): Promise<void> {
        const season = await this.getCurrentSeason();
        if (!season) return;

        const registration = await this.getRegistration(season._id, uid);
        if (!registration) return;

        // 更新当前最高WPM和进步幅度
        const updatedCurrentMaxWpm = Math.max(registration.currentMaxWpm, newMaxWpm);
        const seasonProgress = updatedCurrentMaxWpm - registration.baselineMaxWpm;

        await this.ctx.db.collection('typing.season_registrations' as any).updateOne(
            { _id: registration._id },
            {
                $set: {
                    currentMaxWpm: updatedCurrentMaxWpm,
                    seasonProgress,
                },
            },
        );
    }

    /**
     * 结束赛季并结算奖励
     * 发放排名奖 + 达标奖
     *
     * 排名规则：按「净分 = 赛季进步分 - 毒圈累计扣分」降序排名
     * 资格门槛：赛季内至少有1WPM进步（seasonProgress > 0）才有资格拿排名奖
     *           被扣分超过进步分的用户不发放排名奖（净分为负不奖励）
     */
    async finalizeSeason(seasonId: any): Promise<{
        finalizedCount: number;
        totalRewardDispensed: number;
    }> {
        // seasonId 可能为字符串（前端 POST 传来），需转为 ObjectId
        const oid = typeof seasonId === 'string' ? new ObjectId(seasonId) : seasonId;
        const season = await this.ctx.db.collection('typing.seasons' as any).findOne({ _id: oid });
        if (!season) {
            throw new Error('赛季不存在');
        }
        if (season.status === 'ended') {
            throw new Error('赛季已结束');
        }

        const registrations = await this.getRegistrations(seasonId);
        const MessageModel = global.Hydro.model.message;
        const scoreCore = safeGetService<any>(this.ctx, 'scoreCore');

        // 计算每个人的净分 = 赛季进步分 - 毒圈累计扣分
        // 进步分：每1 WPM进步折算为1分（与扣分对等）
        // 净分用于排名，体现"进步贡献 - 毒圈惩罚"的综合表现
        const ranked = registrations.map((reg) => ({
            reg,
            progressScore: reg.seasonProgress,        // 进步分 = 进步WPM数
            netScore: reg.seasonProgress - reg.totalDeducted, // 净分 = 进步分 - 被扣分
        })).sort((a, b) => b.netScore - a.netScore);  // 按净分降序

        let finalizedCount = 0;
        let totalRewardDispensed = 0;

        for (let i = 0; i < ranked.length; i++) {
            const { reg, netScore } = ranked[i];
            const rank = i + 1;

            // 资格门槛：赛季内至少有1WPM进步，且净分 > 0 才能拿排名奖
            // 一直在毒圈被扣分、几乎没进步的人不奖励
            const eligibleForRanking = reg.seasonProgress > 0 && netScore > 0;

            // 计算排名奖励
            let rankingReward = 0;
            if (eligibleForRanking) {
                for (const reward of season.rankingRewards) {
                    if (reward.rank === rank) {
                        rankingReward = reward.score;
                        break;
                    }
                    // rank:10 表示第4-10名（rank <= reward.rank 且 rank > 3）
                    if (reward.rank === 10 && rank >= 4 && rank <= 10) {
                        rankingReward = reward.score;
                        break;
                    }
                }
            }

            // 计算达标奖励（必须有实际进步才可能达标，被扣分不影响达标判定）
            const progressRewardEarned = reg.seasonProgress >= season.progressTarget ? season.progressReward : 0;
            const totalReward = rankingReward + progressRewardEarned;

            // 发放奖励积分
            if (totalReward > 0 && scoreCore) {
                try {
                    await scoreCore.recordScoreChange({
                        uid: reg.uid,
                        domainId: 'system',
                        pid: -9999996 - Date.now() - Math.floor(Math.random() * 1000),
                        recordId: `typing_season_final_${seasonId}_${reg.uid}_${Date.now()}`,
                        score: totalReward,
                        reason: `${season.name}结算奖励：排名${rank}名${rankingReward > 0 ? `，排名奖+${rankingReward}` : ''}${progressRewardEarned > 0 ? `，达标奖+${progressRewardEarned}` : ''}`,
                        category: '打字挑战',
                        title: `赛季结算 +${totalReward}积分`,
                    });
                    totalRewardDispensed += totalReward;
                } catch (err: any) {
                    console.error(`[TypingSeason] Failed to dispense season reward for uid ${reg.uid}: ${err.message}`);
                }
            }

            // 发送站内通知
            try {
                const msgParts: string[] = [];
                if (rankingReward > 0) msgParts.push(`排名第${rank}名，获得排名奖励${rankingReward}积分`);
                if (progressRewardEarned > 0) msgParts.push(`达成进步目标，获得达标奖励${progressRewardEarned}积分`);
                if (totalReward === 0) {
                    if (!eligibleForRanking && reg.totalDeducted > 0) {
                        msgParts.push(`本赛季进步${reg.seasonProgress}WPM，毒圈累计扣${reg.totalDeducted}分，未达到奖励资格，继续加油！`);
                    } else {
                        msgParts.push(`本赛季排名第${rank}名，进步${reg.seasonProgress}WPM，继续加油！`);
                    }
                }
                await MessageModel.send(
                    1,
                    reg.uid,
                    `${season.name}已结束！${msgParts.join('；')}${totalReward > 0 ? `，共获得${totalReward}积分` : ''}`,
                    MessageModel.FLAG_UNREAD,
                );
            } catch (err: any) {
                console.error(`[TypingSeason] Failed to send notification to uid ${reg.uid}: ${err.message}`);
            }

            // 标记已结算
            await this.ctx.db.collection('typing.season_registrations' as any).updateOne(
                { _id: reg._id },
                {
                    $set: {
                        finalized: true,
                        finalRank: rank,
                        rankingReward,
                        progressRewardEarned,
                    },
                },
            );
            finalizedCount++;
        }

        // 更新赛季状态
        await this.ctx.db.collection('typing.seasons' as any).updateOne(
            { _id: oid },
            { $set: { status: 'ended' as SeasonStatus, endedAt: new Date() } },
        );

        console.log(`[TypingSeason] Finalized season ${season.name}: ${finalizedCount} users, ${totalRewardDispensed} score dispensed`);
        return { finalizedCount, totalRewardDispensed };
    }

    /**
     * 获取赛季统计信息（用于管理面板）
     */
    async getSeasonStats(seasonId: any): Promise<{
        totalParticipants: number;
        safeCount: number;
        inZoneCount: number;
        finalizedCount: number;
    }> {
        const registrations = await this.ctx.db.collection('typing.season_registrations' as any)
            .find({ seasonId })
            .toArray();

        return {
            totalParticipants: registrations.length,
            safeCount: registrations.filter((r: any) => r.poisonStatus === 'safe').length,
            inZoneCount: registrations.filter((r: any) => r.poisonStatus === 'in_zone').length,
            finalizedCount: registrations.filter((r: any) => r.finalized).length,
        };
    }
}
