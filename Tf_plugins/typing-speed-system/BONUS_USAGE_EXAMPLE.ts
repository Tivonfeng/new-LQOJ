/**
 * 打字奖励系统使用示例
 * 展示如何在实际代码中使用TypingBonusService
 */

import { Context, ObjectId } from 'hydrooj';
import {
    TypingRecordService,
    TypingStatsService,
    TypingBonusService,
} from './src/services';

/**
 * 示例1: 添加单条打字记录并处理奖励
 */
async function exampleAddRecordWithBonus(
    ctx: Context,
    userId: number,
    wpm: number,
    domainId: string,
    adminId: number,
) {
    const recordService = new TypingRecordService(ctx);
    const statsService = new TypingStatsService(ctx, recordService);
    const bonusService = new TypingBonusService(ctx);

    try {
        // 1. 获取用户当前统计
        const currentStats = await statsService.getUserStats(userId);
        const previousMaxWpm = currentStats?.maxWpm || 0;

        // 2. 添加新记录
        const insertResult = await ctx.db.collection('typing.records' as any).insertOne({
            uid: userId,
            domainId,
            wpm,
            createdAt: new Date(),
            recordedBy: adminId,
            note: '通过管理员添加',
        });

        const recordId = insertResult.insertedId;

        // 3. 更新统计数据
        await statsService.updateUserStats(userId, domainId);
        await statsService.updateWeeklySnapshot(userId);

        // 4. 处理所有奖励
        const bonusInfo = await bonusService.processBonuses(userId, recordId, wpm, previousMaxWpm);

        // 5. 如果有奖励，更新积分系统
        if (bonusInfo.totalBonus > 0) {
            // 为每个奖励添加积分记录
            for (const bonus of bonusInfo.bonuses) {
                // 插入积分记录
                await ctx.db.collection('score.records' as any).insertOne({
                    uid: userId,
                    domainId,
                    pid: 0, // 0表示管理员操作
                    recordId: null,
                    score: bonus.bonus,
                    reason: bonus.reason,
                    createdAt: new Date(),
                });

                // 更新用户总积分
                await ctx.db.collection('score.users' as any).updateOne(
                    { uid: userId },
                    {
                        $inc: { totalScore: bonus.bonus },
                        $set: { lastUpdated: new Date() },
                    },
                    { upsert: true },
                );

                console.log(`[Bonus] User ${userId}: ${bonus.reason} → +${bonus.bonus}分`);
            }
        }

        console.log(`[Success] Record added for user ${userId}: ${wpm} WPM, total bonus: +${bonusInfo.totalBonus}`);
        return {
            success: true,
            recordId,
            bonusInfo,
        };
    } catch (error) {
        console.error('[Error] Failed to add record with bonus:', error);
        throw error;
    }
}

/**
 * 示例2: 获取用户的奖励统计
 */
async function exampleGetUserBonusStats(ctx: Context, userId: number) {
    const bonusService = new TypingBonusService(ctx);

    try {
        // 获取用户的所有奖励统计
        const stats = await bonusService.getUserBonusStats(userId);

        console.log(`User ${userId} Bonus Statistics:`);
        console.log(`  进步分: ${stats.totalProgressBonus} (${stats.progressCount}次)`);
        console.log(`  升级分: ${stats.totalLevelBonus} (${stats.levelCount}次)`);
        console.log(`  超越分: ${stats.totalSurpassBonus} (${stats.surpassCount}次)`);
        console.log(`  总计: ${stats.totalBonus}分`);

        return stats;
    } catch (error) {
        console.error('[Error] Failed to get bonus stats:', error);
        throw error;
    }
}

/**
 * 示例3: 显示用户的进步记录
 */
async function exampleShowProgressRecords(ctx: Context, userId: number) {
    const bonusService = new TypingBonusService(ctx);

    try {
        const records = await bonusService.getUserProgressRecords(userId, 10);

        console.log(`User ${userId} Progress Records:`);
        for (const record of records) {
            console.log(`  ${record.previousMaxWpm} → ${record.newWpm} WPM (+20分)`);
        }

        return records;
    } catch (error) {
        console.error('[Error] Failed to get progress records:', error);
        throw error;
    }
}

/**
 * 示例4: 显示用户的等级成就
 */
async function exampleShowLevelAchievements(ctx: Context, userId: number) {
    const bonusService = new TypingBonusService(ctx);

    try {
        const achievements = await bonusService.getUserLevelAchievements(userId);

        console.log(`User ${userId} Level Achievements:`);
        for (const achievement of achievements) {
            console.log(`  ✓ ${achievement.levelName} (${achievement.minWpm}-${achievement.maxWpm} WPM) → +${achievement.targetBonus}分`);
        }

        return achievements;
    } catch (error) {
        console.error('[Error] Failed to get level achievements:', error);
        throw error;
    }
}

/**
 * 示例5: 显示用户的超越记录
 */
async function exampleShowSurpassRecords(ctx: Context, userId: number) {
    const bonusService = new TypingBonusService(ctx);

    try {
        const records = await bonusService.getUserSurpassRecords(userId, 10);

        console.log(`User ${userId} Surpass Records:`);
        for (const record of records) {
            console.log(`  超越 ${record.surpassedUsername} (${record.surpassedWpm} → ${record.userWpm} WPM) → +${record.bonus}分`);
        }

        return records;
    } catch (error) {
        console.error('[Error] Failed to get surpass records:', error);
        throw error;
    }
}

/**
 * 示例6: 显示超越某个用户的对手
 */
async function exampleShowWhoSurpassedUser(ctx: Context, userId: number) {
    const bonusService = new TypingBonusService(ctx);

    try {
        const records = await bonusService.getWhoSurpassedUser(userId, 10);

        console.log(`Who Surpassed User ${userId}:`);
        for (const record of records) {
            console.log(`  ${record.surpassedUsername} 被 User ${record.uid} 超越 (${record.surpassedWpm} → ${record.userWpm} WPM)`);
        }

        return records;
    } catch (error) {
        console.error('[Error] Failed to get surpass records:', error);
        throw error;
    }
}

/**
 * 示例7: 初始化奖励系统（应在应用启动时执行）
 */
async function exampleInitializeBonus(ctx: Context) {
    const bonusService = new TypingBonusService(ctx);

    try {
        console.log('[Init] Initializing typing bonus system indexes...');
        await bonusService.initializeIndexes();
        console.log('[Init] Typing bonus system indexes initialized successfully');
    } catch (error) {
        console.error('[Error] Failed to initialize bonus system:', error);
        throw error;
    }
}

/**
 * 示例8: 完整的CSV批量导入流程（含奖励处理）
 */
async function exampleImportCsvWithBonuses(
    ctx: Context,
    csvData: string,
    domainId: string,
    adminId: number,
) {
    const recordService = new TypingRecordService(ctx);
    const statsService = new TypingStatsService(ctx, recordService);
    const bonusService = new TypingBonusService(ctx);

    let totalRecords = 0;
    let totalBonus = 0;
    const results = [];

    try {
        const lines = csvData.trim().split('\n');
        const hasHeader = lines[0].toLowerCase().includes('username') && lines[0].toLowerCase().includes('wpm');
        const startLine = hasHeader ? 1 : 0;

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            const username = parts[0].trim();
            const wpm = Number.parseInt(parts[1].trim());
            const note = parts[2]?.trim() || '';

            try {
                // 1. 获取用户
                const UserModel = global.Hydro.model.user;
                const user = await UserModel.getByUname(domainId, username);
                if (!user) {
                    results.push({ username, success: false, error: '用户不存在' });
                    continue;
                }

                // 2. 获取当前统计
                const currentStats = await statsService.getUserStats(user._id);
                const previousMaxWpm = currentStats?.maxWpm || 0;

                // 3. 添加记录
                const insertResult = await ctx.db.collection('typing.records' as any).insertOne({
                    uid: user._id,
                    domainId,
                    wpm,
                    createdAt: new Date(),
                    recordedBy: adminId,
                    note,
                });

                const recordId = insertResult.insertedId;

                // 4. 更新统计
                await statsService.updateUserStats(user._id, domainId);
                await statsService.updateWeeklySnapshot(user._id);

                // 5. 处理奖励
                const bonusInfo = await bonusService.processBonuses(user._id, recordId, wpm, previousMaxWpm);

                // 6. 添加积分记录
                if (bonusInfo.totalBonus > 0) {
                    for (const bonus of bonusInfo.bonuses) {
                        await ctx.db.collection('score.records' as any).insertOne({
                            uid: user._id,
                            domainId,
                            pid: 0,
                            recordId: null,
                            score: bonus.bonus,
                            reason: bonus.reason,
                            createdAt: new Date(),
                        });

                        await ctx.db.collection('score.users' as any).updateOne(
                            { uid: user._id },
                            {
                                $inc: { totalScore: bonus.bonus },
                                $set: { lastUpdated: new Date() },
                            },
                            { upsert: true },
                        );
                    }
                }

                totalRecords++;
                totalBonus += bonusInfo.totalBonus;

                results.push({
                    username,
                    success: true,
                    wpm,
                    bonus: bonusInfo.totalBonus,
                });
            } catch (error) {
                results.push({ username, success: false, error: error.message });
            }
        }

        console.log(`[Import Complete] ${totalRecords} records imported, total bonus: +${totalBonus}`);
        return { totalRecords, totalBonus, results };
    } catch (error) {
        console.error('[Error] CSV import failed:', error);
        throw error;
    }
}

/**
 * 示例9: 检查用户是否已获得某个等级的奖励
 */
async function exampleCheckLevelAchievementStatus(ctx: Context, userId: number, level: number) {
    const bonusService = new TypingBonusService(ctx);

    try {
        const achievements = await bonusService.getUserLevelAchievements(userId);
        const levelAchieved = achievements.some((a) => a.level === level);

        console.log(`User ${userId} Level ${level}: ${levelAchieved ? 'Achieved' : 'Not achieved'}`);
        return levelAchieved;
    } catch (error) {
        console.error('[Error] Failed to check level achievement status:', error);
        throw error;
    }
}

/**
 * 示例10: 生成用户的奖励报告
 */
async function exampleGenerateBonusReport(ctx: Context, userId: number) {
    const bonusService = new TypingBonusService(ctx);

    try {
        const stats = await bonusService.getUserBonusStats(userId);
        const progressRecords = await bonusService.getUserProgressRecords(userId, 100);
        const achievements = await bonusService.getUserLevelAchievements(userId);
        const surpassRecords = await bonusService.getUserSurpassRecords(userId, 100);

        console.log(`\n========== 用户 ${userId} 奖励报告 ==========`);
        console.log(`\n统计信息:`);
        console.log(`  进步分: ${stats.totalProgressBonus}分 (${stats.progressCount}次)`);
        console.log(`  升级分: ${stats.totalLevelBonus}分 (${stats.levelCount}次)`);
        console.log(`  超越分: ${stats.totalSurpassBonus}分 (${stats.surpassCount}次)`);
        console.log(`  ━━━━━━━━━━━━`);
        console.log(`  总计: ${stats.totalBonus}分`);

        console.log(`\n已解锁的等级 (${achievements.length}/8):`);
        for (const achievement of achievements) {
            console.log(`  ✓ ${achievement.levelName} (${achievement.minWpm}-${achievement.maxWpm} WPM) → +${achievement.targetBonus}分`);
        }

        console.log(`\n最近进步记录 (显示最新10条):`);
        const recentProgress = progressRecords.slice(0, 10);
        for (let i = 0; i < recentProgress.length; i++) {
            const r = recentProgress[i];
            console.log(`  ${i + 1}. ${r.previousMaxWpm} → ${r.newWpm} WPM (+20分) @ ${r.awardedAt.toLocaleDateString()}`);
        }

        console.log(`\n最近超越记录 (显示最新10条):`);
        const recentSurpass = surpassRecords.slice(0, 10);
        for (let i = 0; i < recentSurpass.length; i++) {
            const r = recentSurpass[i];
            console.log(`  ${i + 1}. 超越 ${r.surpassedUsername} (${r.surpassedWpm} → ${r.userWpm} WPM, +${r.bonus}分) @ ${r.surpassedAt.toLocaleDateString()}`);
        }

        console.log(`\n========== 报告结束 ==========\n`);

        return {
            stats,
            achievements,
            progressRecords,
            surpassRecords,
        };
    } catch (error) {
        console.error('[Error] Failed to generate bonus report:', error);
        throw error;
    }
}

// 导出所有示例函数
export {
    exampleAddRecordWithBonus,
    exampleGetUserBonusStats,
    exampleShowProgressRecords,
    exampleShowLevelAchievements,
    exampleShowSurpassRecords,
    exampleShowWhoSurpassedUser,
    exampleInitializeBonus,
    exampleImportCsvWithBonuses,
    exampleCheckLevelAchievementStatus,
    exampleGenerateBonusReport,
};
