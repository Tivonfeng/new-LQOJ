import { Context } from 'hydrooj';
import { TypingSeasonService, SeasonRegistration } from './TypingSeasonService';
import { TypingRecordService } from './TypingRecordService';
import { getWeekString, getWeekStart } from '../utils/dateUtils';
import { safeGetService } from '../utils/ctxHelper';

// 扣分日志
export interface PoisonLog {
    _id?: any;
    seasonId: any;
    uid: number;
    week: string;            // 扣分周标识
    weekNumber: number;      // 赛季第几周
    deductAmount: number;    // 扣分额度
    weeksInZone: number;     // 当时的连续毒圈周数
    reason: string;
    deductedAt: Date;
}

/**
 * 打字毒圈服务
 * 负责：跑毒核心逻辑（扣分阶梯/入毒出毒/每周结算）
 *
 * 扣分阶梯（赛季内按周递增）：
 *   第1周未进步: -10
 *   第2周未进步: -20
 *   第3周未进步: -30
 *   第4周+(赛季末): -50
 *
 * 出毒条件：刷新个人历史最高WPM（哪怕+1）
 */
export class TypingPoisonZoneService {
    private ctx: Context;
    private seasonService: TypingSeasonService;
    private recordService: TypingRecordService;

    constructor(ctx: Context, seasonService: TypingSeasonService, recordService: TypingRecordService) {
        this.ctx = ctx;
        this.seasonService = seasonService;
        this.recordService = recordService;
    }

    /**
     * 计算扣分额度
     * @param weekNumber 赛季第几周（1-based）
     * @param weeksInZone 连续在毒圈周数
     */
    getDeductAmount(weekNumber: number, weeksInZone: number): number {
        // 按赛季周次决定基础扣分，与连续毒圈周数取较大值
        // 第1周 -10，第2周 -20，第3周 -30，第4周+ -50
        if (weekNumber >= 4 || weeksInZone >= 4) return 50;
        if (weekNumber === 3 || weeksInZone === 3) return 30;
        if (weekNumber === 2 || weeksInZone === 2) return 20;
        return 10;
    }

    /**
     * 录入新成绩时调用：检查是否出毒并更新状态
     * @param uid 用户ID
     * @param newWpm 本次录入的WPM
     * @param newMaxWpm 该用户最新的最高WPM（更新统计后的值）
     */
    async refreshZoneState(uid: number, newWpm: number, newMaxWpm: number): Promise<void> {
        const season = await this.seasonService.getCurrentSeason();
        if (!season) return;

        const registration = await this.seasonService.getRegistration(season._id, uid);
        if (!registration) return;
        if (registration.finalized) return;

        // 更新赛季进度（currentMaxWpm / seasonProgress）
        await this.seasonService.updateRegistrationProgress(uid, newMaxWpm);

        // 检查是否刷新了个人最高 -> 出毒
        // newWpm 是本次录入的值，若它大于 currentMaxWpm 说明是新高
        const updatedReg = await this.seasonService.getRegistration(season._id, uid);
        if (!updatedReg) return;

        // 如果本次录入的成绩刷新了赛季内最高（即 currentMaxWpm 增加了），视为出毒
        if (newWpm > updatedReg.baselineMaxWpm && newWpm >= updatedReg.currentMaxWpm && updatedReg.poisonStatus === 'in_zone') {
            const currentWeek = getWeekString(new Date());
            await this.ctx.db.collection('typing.season_registrations' as any).updateOne(
                { _id: updatedReg._id },
                {
                    $set: {
                        poisonStatus: 'safe',
                        weeksInZone: 0,
                        lastSafeWeek: currentWeek,
                    },
                },
            );

            // 发送出毒成功通知
            try {
                const MessageModel = global.Hydro.model.message;
                await MessageModel.send(
                    1,
                    uid,
                    `🎉 恭喜！你以 ${newWpm} WPM 刷新个人最高成绩，成功出毒！本赛季累计进步 ${updatedReg.seasonProgress} WPM。`,
                    MessageModel.FLAG_UNREAD,
                );
            } catch (err: any) {
                console.error(`[PoisonZone] Failed to send escape notification to uid ${uid}: ${err.message}`);
            }

            console.log(`[PoisonZone] User ${uid} escaped poison zone with ${newWpm} WPM`);
        }
    }

    /**
     * 每周一定时执行：扫描所有报名学生，判断本周是否进步，未进步则扣分
     * 挂载到 Hydro 的 task/daily 钩子（每天凌晨3点触发），内部判断周一才执行
     */
    async runWeeklySettlement(): Promise<{ processed: number; deducted: number; totalDeductAmount: number }> {
        const season = await this.seasonService.getCurrentSeason();
        if (!season) {
            console.log('[PoisonZone] No active season, skipping weekly settlement');
            return { processed: 0, deducted: 0, totalDeductAmount: 0 };
        }

        const currentWeek = getWeekString(new Date());

        // 防重复：检查本周是否已结算过
        const existingLog = await this.ctx.db.collection('typing.poison_logs' as any).findOne({
            seasonId: season._id,
            week: currentWeek,
        });
        if (existingLog) {
            console.log(`[PoisonZone] Week ${currentWeek} already settled for season ${season.name}, skipping`);
            return { processed: 0, deducted: 0, totalDeductAmount: 0 };
        }

        // 计算当前是赛季第几周
        const weekNumber = this.calculateWeekNumber(season.startWeek, currentWeek);
        if (weekNumber < 1 || weekNumber > season.weekCount) {
            console.log(`[PoisonZone] Week ${weekNumber} out of season range (1-${season.weekCount}), skipping`);
            return { processed: 0, deducted: 0, totalDeductAmount: 0 };
        }

        // 获取所有未结算的报名记录
        const registrations = await this.ctx.db.collection('typing.season_registrations' as any)
            .find({ seasonId: season._id, finalized: { $ne: true } })
            .toArray();

        const MessageModel = global.Hydro.model.message;
        const scoreCore = safeGetService<any>(this.ctx, 'scoreCore');

        let processed = 0;
        let deducted = 0;
        let totalDeductAmount = 0;

        for (const reg of registrations) {
            processed++;

            // 判断本周是否有进步记录（本周内录入的成绩是否刷新了赛季内最高）
            const hasProgressThisWeek = await this.checkWeekProgress(reg, currentWeek);

            if (hasProgressThisWeek) {
                // 本周有进步 -> 保持安全
                if (reg.poisonStatus === 'in_zone') {
                    // 已在毒圈但有进步 -> 出毒
                    await this.ctx.db.collection('typing.season_registrations' as any).updateOne(
                        { _id: reg._id },
                        { $set: { poisonStatus: 'safe', weeksInZone: 0, lastSafeWeek: currentWeek } },
                    );
                    console.log(`[PoisonZone] User ${reg.uid} escaped poison zone (weekly check)`);
                } else {
                    // 本来就安全，更新 lastSafeWeek
                    await this.ctx.db.collection('typing.season_registrations' as any).updateOne(
                        { _id: reg._id },
                        { $set: { lastSafeWeek: currentWeek } },
                    );
                }
                continue;
            }

            // 本周无进步 -> 进入/加深毒圈
            const newWeeksInZone = reg.poisonStatus === 'in_zone' ? reg.weeksInZone + 1 : 1;
            const deductAmount = this.getDeductAmount(weekNumber, newWeeksInZone);

            // 扣分
            if (scoreCore) {
                try {
                    await scoreCore.recordScoreChange({
                        uid: reg.uid,
                        domainId: 'system',
                        pid: -9999995 - Date.now() - Math.floor(Math.random() * 1000),
                        recordId: `typing_poison_${season._id}_${reg.uid}_${currentWeek}_${Date.now()}`,
                        score: -deductAmount,
                        reason: `${season.name}第${weekNumber}周毒圈扣分：连续${newWeeksInZone}周未进步`,
                        category: '打字挑战',
                        title: `毒圈扣分 -${deductAmount}积分`,
                    });
                    totalDeductAmount += deductAmount;
                    deducted++;
                } catch (err: any) {
                    console.error(`[PoisonZone] Failed to deduct score for uid ${reg.uid}: ${err.message}`);
                }
            } else {
                console.warn('[PoisonZone] scoreCore unavailable, skipping deduction');
            }

            // 发送站内通知
            const weekLabels = ['', '第一周', '第二周', '第三周', '第四周'];
            const weekLabel = weekLabels[Math.min(weekNumber, 4)] || `第${weekNumber}周`;
            try {
                const isDeepZone = newWeeksInZone >= 3;
                const flag = isDeepZone
                    ? MessageModel.FLAG_UNREAD | MessageModel.FLAG_ALERT
                    : MessageModel.FLAG_UNREAD;
                await MessageModel.send(
                    1,
                    reg.uid,
                    `⚠️ ${season.name}${weekLabel}结算：你已连续${newWeeksInZone}周未刷新个人最高成绩，进入毒圈，扣除${deductAmount}积分。请尽快练习并请老师录入新成绩出毒！`,
                    flag,
                );
            } catch (err: any) {
                console.error(`[PoisonZone] Failed to send notification to uid ${reg.uid}: ${err.message}`);
            }

            // 写扣分日志
            await this.ctx.db.collection('typing.poison_logs' as any).insertOne({
                seasonId: season._id,
                uid: reg.uid,
                week: currentWeek,
                weekNumber,
                deductAmount,
                weeksInZone: newWeeksInZone,
                reason: `第${weekNumber}周连续${newWeeksInZone}周未进步`,
                deductedAt: new Date(),
            } as Omit<PoisonLog, '_id'>);

            // 更新报名记录
            await this.ctx.db.collection('typing.season_registrations' as any).updateOne(
                { _id: reg._id },
                {
                    $set: {
                        poisonStatus: 'in_zone',
                        weeksInZone: newWeeksInZone,
                        lastDeductWeek: currentWeek,
                    },
                    $inc: { totalDeducted: deductAmount },
                },
            );

            console.log(`[PoisonZone] User ${reg.uid} deducted ${deductAmount} (week ${weekNumber}, ${newWeeksInZone} weeks in zone)`);
        }

        console.log(`[PoisonZone] Weekly settlement done: ${processed} processed, ${deducted} deducted, ${totalDeductAmount} total`);
        return { processed, deducted, totalDeductAmount };
    }

    /**
     * 检查用户本周是否有进步记录
     * 判断标准：本周内录入的记录中，是否有成绩 >= 当前赛季内最高WPM
     * （即本周是否刷新了赛季内的最高成绩）
     */
    private async checkWeekProgress(reg: SeasonRegistration, currentWeek: string): Promise<boolean> {
        const weekStart = getWeekStart(new Date());

        // 获取本周的打字记录
        const records = await this.ctx.db.collection('typing.records' as any)
            .find({
                uid: reg.uid,
                createdAt: { $gte: weekStart },
            })
            .sort({ createdAt: -1 })
            .toArray();

        if (records.length === 0) return false;

        // 本周有记录，检查是否有刷新赛季内最高的
        // 即本周某条记录的 wpm >= registration.currentMaxWpm（更新前的值）
        // 由于 refreshZoneState 在录入时已更新 currentMaxWpm，这里检查本周记录是否有 wpm >= baselineMaxWpm 且为新高
        // 简化判断：本周有任何一条记录的 wpm > 该用户报名时的基线（说明本赛季有进步记录在本周）
        // 更准确：本周有记录的 wpm >= currentMaxWpm（当前最高就是本周刷新的）
        const hasNewHigh = records.some((r: any) => r.wpm >= reg.currentMaxWpm && r.wpm > reg.baselineMaxWpm);
        return hasNewHigh;
    }

    /**
     * 计算当前是赛季第几周
     * @param startWeek 赛季开始周标识 "2026-W31"
     * @param currentWeek 当前周标识 "2026-W33"
     * @returns 周数（1-based），若在开始周之前返回0
     */
    private calculateWeekNumber(startWeek: string, currentWeek: string): number {
        const startMatch = startWeek.match(/^(\d{4})-W(\d{2})$/);
        const currentMatch = currentWeek.match(/^(\d{4})-W(\d{2})$/);
        if (!startMatch || !currentMatch) return 0;

        const startYear = parseInt(startMatch[1], 10);
        const startWeekNum = parseInt(startMatch[2], 10);
        const currentYear = parseInt(currentMatch[1], 10);
        const currentWeekNum = parseInt(currentMatch[2], 10);

        // 计算总周数差（跨年处理）
        const startTotalWeeks = startYear * 52 + startWeekNum;
        const currentTotalWeeks = currentYear * 52 + currentWeekNum;
        const diff = currentTotalWeeks - startTotalWeeks;

        return diff + 1; // 1-based
    }

    /**
     * 获取用户本周扣分预览（用于前端展示"如果不出毒会扣多少"）
     */
    async getUpcomingDeductPreview(uid: number): Promise<{
        weekNumber: number;
        potentialDeduct: number;
        weeksInZone: number;
    } | null> {
        const season = await this.seasonService.getCurrentSeason();
        if (!season) return null;

        const reg = await this.seasonService.getRegistration(season._id, uid);
        if (!reg || reg.finalized) return null;

        const currentWeek = getWeekString(new Date());
        const weekNumber = this.calculateWeekNumber(season.startWeek, currentWeek);
        if (weekNumber < 1 || weekNumber > season.weekCount) return null;

        // 预测下周扣分（当前在毒圈则 weeksInZone+1，否则若下周不进步则入毒=1）
        const predictedWeeksInZone = reg.poisonStatus === 'in_zone' ? reg.weeksInZone + 1 : 1;
        const potentialDeduct = this.getDeductAmount(weekNumber, predictedWeeksInZone);

        return {
            weekNumber,
            potentialDeduct,
            weeksInZone: reg.weeksInZone,
        };
    }

    /**
     * 获取赛季毒圈统计
     */
    async getPoisonStats(seasonId: any): Promise<{
        totalLogs: number;
        totalDeducted: number;
        currentInZone: number;
    }> {
        const logs = await this.ctx.db.collection('typing.poison_logs' as any)
            .find({ seasonId })
            .toArray();

        const currentInZone = await this.ctx.db.collection('typing.season_registrations' as any)
            .countDocuments({ seasonId, poisonStatus: 'in_zone', finalized: { $ne: true } });

        return {
            totalLogs: logs.length,
            totalDeducted: logs.reduce((sum, l: any) => sum + (l.deductAmount || 0), 0),
            currentInZone,
        };
    }
}
