import { Context, ObjectId } from 'hydrooj';

// 进步奖励记录接口
export interface ProgressBonusRecord {
    _id?: any;
    uid: number;
    recordId: ObjectId;
    previousMaxWpm: number;
    newWpm: number;
    progressBonus: number; // 固定20分
    awardedAt: Date;
    awardedScoreRecordId?: ObjectId;
}

// 等级成就记录接口
export interface LevelAchievementRecord {
    _id?: any;
    uid: number;
    level: number;
    levelName: string;
    minWpm: number;
    maxWpm: number;
    targetBonus: number;
    achievedAt: Date;
    bonusAwarded: boolean;
    awardedScoreRecordId?: ObjectId;
    awardedAt?: Date;
}

// 超越对手记录接口
export interface SurpassRecord {
    _id?: any;
    uid: number;
    surpassedUid: number;
    surpassedUsername: string;
    userWpm: number;
    surpassedWpm: number;
    bonus: number;
    surpassBonus: boolean;
    surpassedAt: Date;
    awardedScoreRecordId?: ObjectId;
}

// 等级定义
export interface LevelDefinition {
    level: number;
    name: string;
    range: string;
    min: number;
    max: number;
    bonus: number;
}

/**
 * 打字奖励服务
 * 负责：进步分、升级分、超越分的计算与奖励
 */
export class TypingBonusService {
    private ctx: Context;

    // 等级定义（与前端保持一致）
    private readonly LADDER_LEVELS: LevelDefinition[] = [
        {
            level: 1,
            name: '打字萌新',
            range: '0-20',
            min: 0,
            max: 20,
            bonus: 0,
        },
        {
            level: 2,
            name: '打字小匠',
            range: '20-50',
            min: 20,
            max: 50,
            bonus: 100,
        },
        {
            level: 3,
            name: '键速高手',
            range: '50-80',
            min: 50,
            max: 80,
            bonus: 200,
        },
        {
            level: 4,
            name: '键速闪电',
            range: '80-110',
            min: 80,
            max: 110,
            bonus: 300,
        },
        {
            level: 5,
            name: '键速狂人',
            range: '110-140',
            min: 110,
            max: 140,
            bonus: 400,
        },
        {
            level: 6,
            name: '键速王者',
            range: '140-170',
            min: 140,
            max: 170,
            bonus: 500,
        },
        {
            level: 7,
            name: '键速狂魔',
            range: '170-200',
            min: 170,
            max: 200,
            bonus: 600,
        },
        {
            level: 8,
            name: '终极之神',
            range: '200+',
            min: 200,
            max: Infinity,
            bonus: 700,
        },
    ];

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    /**
     * 初始化数据库索引
     */
    async initializeIndexes(): Promise<void> {
    // 进步奖励记录索引
        await this.ctx.db.collection('typing.progress_records' as any).createIndex({ uid: 1, recordId: 1 }, { unique: true, sparse: true });
        await this.ctx.db.collection('typing.progress_records' as any).createIndex({ uid: 1, awardedAt: -1 });

        // 等级成就记录索引
        await this.ctx.db.collection('typing.level_achievements' as any).createIndex({ uid: 1, level: 1 }, { unique: true, sparse: true });
        await this.ctx.db.collection('typing.level_achievements' as any).createIndex({ uid: 1, achievedAt: -1 });

        // 超越对手记录索引
        await this.ctx.db.collection('typing.surpass_records' as any).createIndex({ uid: 1, surpassedUid: 1 }, { unique: true, sparse: true });
        await this.ctx.db.collection('typing.surpass_records' as any).createIndex({ uid: 1, surpassedAt: -1 });
        await this.ctx.db.collection('typing.surpass_records' as any).createIndex({ surpassedUid: 1, surpassedAt: -1 });
    }

    /**
     * 获取WPM对应的等级
     */
    getPlayerLevel(wpm: number): LevelDefinition | null {
        for (const level of this.LADDER_LEVELS) {
            if (wpm >= level.min && wpm < level.max) {
                return level;
            }
        }
        // 对于200+的情况
        if (wpm >= 200) {
            return this.LADDER_LEVELS[7]; // 终极之神
        }
        return null;
    }

    /**
     * 奖励进步分
     * 当新记录比用户历史最高速度更高时，奖励20分
     */
    async awardProgressBonus(
        uid: number,
        recordId: ObjectId,
        previousMaxWpm: number,
        newWpm: number,
    ): Promise<{ awarded: boolean, bonus: number, reason: string }> {
    // 检查是否进步
        if (newWpm <= previousMaxWpm) {
            return { awarded: false, bonus: 0, reason: '没有进步' };
        }

        const progressBonus = 20;

        // 检查是否已奖励过此记录
        try {
            const existingRecord = await this.ctx.db.collection('typing.progress_records' as any).findOne({
                uid,
                recordId,
            });

            if (existingRecord) {
                return { awarded: false, bonus: 0, reason: '已奖励过' };
            }

            // 插入进度奖励记录
            const progressRecord: ProgressBonusRecord = {
                uid,
                recordId,
                previousMaxWpm,
                newWpm,
                progressBonus,
                awardedAt: new Date(),
            };

            await this.ctx.db.collection('typing.progress_records' as any).insertOne(progressRecord);

            return {
                awarded: true,
                bonus: progressBonus,
                reason: `打字进步分: ${previousMaxWpm} → ${newWpm} WPM`,
            };
        } catch (error) {
            if ((error as any).code === 11000) {
                // 唯一索引冲突，已经奖励过
                return { awarded: false, bonus: 0, reason: '已奖励过' };
            }
            throw error;
        }
    }

    /**
     * 奖励等级升级分
     * 当用户升级到更高等级时，奖励该等级对应的分数
     */
    async awardLevelBonus(
        uid: number,
        newLevel: LevelDefinition,
        newWpm: number,
    ): Promise<{ awarded: boolean, bonus: number, reason: string }> {
    // 检查该等级是否已奖励过
        try {
            const existingRecord = await this.ctx.db.collection('typing.level_achievements' as any).findOne({
                uid,
                level: newLevel.level,
            });

            if (existingRecord && existingRecord.bonusAwarded) {
                return { awarded: false, bonus: 0, reason: '该等级已奖励过' };
            }

            const levelAchievement: LevelAchievementRecord = {
                uid,
                level: newLevel.level,
                levelName: newLevel.name,
                minWpm: newLevel.min,
                maxWpm: newLevel.max,
                targetBonus: newLevel.bonus,
                achievedAt: new Date(),
                bonusAwarded: true,
                awardedAt: new Date(),
            };

            // 使用 insertOne，由于唯一索引，如果已存在会失败
            try {
                await this.ctx.db.collection('typing.level_achievements' as any).insertOne(levelAchievement);
            } catch (error) {
                if ((error as any).code === 11000) {
                    // 已存在，尝试更新
                    const existing = await this.ctx.db.collection('typing.level_achievements' as any).findOne({
                        uid,
                        level: newLevel.level,
                    });

                    if (existing?.bonusAwarded) {
                        return { awarded: false, bonus: 0, reason: '该等级已奖励过' };
                    }

                    // 更新为已奖励
                    await this.ctx.db.collection('typing.level_achievements' as any).updateOne(
                        { uid, level: newLevel.level },
                        {
                            $set: {
                                bonusAwarded: true,
                                awardedAt: new Date(),
                            },
                        },
                    );
                } else {
                    throw error;
                }
            }

            return {
                awarded: true,
                bonus: newLevel.bonus,
                reason: `打字目标分: 升级至 ${newLevel.name} (${newWpm} WPM)`,
            };
        } catch (error) {
            console.error('[TypingBonusService] Error awarding level bonus:', error);
            throw error;
        }
    }

    /**
     * 奖励超越对手分
     * 当用户的新速度超过排名紧邻的前一位对手时，奖励固定20分
     * @param uid 用户ID
     * @param newMaxWpm 用户新的最高WPM
     * @param oldRanking 可选的旧排行榜数据，用于在更新前进行超越检查
     */
    async awardSurpassBonus(
        uid: number,
        newMaxWpm: number,
        oldRanking?: any[],
    ): Promise<{ awarded: boolean, bonus: number, reason: string, surpassedUser?: string }> {
    // 1. 获取排行榜（如果提供了oldRanking则使用旧排行榜，否则查询当前排行榜）
        const ranking = oldRanking || (await this.ctx.db.collection('typing.stats' as any)
            .find({})
            .sort({ maxWpm: -1, lastUpdated: 1 })
            .toArray());

        // 2. 找到当前用户在排行榜中的位置（基于新的maxWpm）
        let userNewRankIndex = -1;
        for (let i = 0; i < ranking.length; i++) {
            if (ranking[i].uid === uid) {
                userNewRankIndex = i;
                break;
            }
        }

        // 3. 如果排行榜不存在该用户，也不应该出现，但保险起见
        if (userNewRankIndex === -1) {
            return { awarded: false, bonus: 0, reason: '用户不在排行榜中' };
        }

        // 4. 获取排名紧邻的前一位对手
        // 注意：排行榜是降序排列，前一位在索引-1的位置
        if (userNewRankIndex === 0) {
            // 用户是第一名，没有前一位
            return { awarded: false, bonus: 0, reason: '已是排名第一' };
        }

        const previousRanker = ranking[userNewRankIndex - 1];
        const surpassedUid = previousRanker.uid;
        const surpassedWpm = previousRanker.maxWpm;

        // 5. 检查是否真的超越了对手
        if (newMaxWpm <= surpassedWpm) {
            return { awarded: false, bonus: 0, reason: '没有超越前一位' };
        }

        // 6. 检查是否已超越过此对手
        try {
            const existingRecord = await this.ctx.db.collection('typing.surpass_records' as any).findOne({
                uid,
                surpassedUid,
            });

            if (existingRecord) {
                return { awarded: false, bonus: 0, reason: '已超越过该对手' };
            }

            // 7. 设置固定奖励
            const surpassBonus = 20;

            // 8. 获取被超越用户的信息（用户名）
            let surpassedUsername = `User ${surpassedUid}`;
            try {
                // 直接从用户表查询用户名
                const userCollection = await this.ctx.db.collection('user').findOne({ _id: surpassedUid });
                if (userCollection?.uname) {
                    surpassedUsername = userCollection.uname;
                }
            } catch (error) {
                // 获取用户名失败，使用默认值
                console.warn(`[TypingBonusService] Failed to get username for uid ${surpassedUid}:`, error);
            }

            // 9. 插入超越记录到数据库
            const surpassRecord: SurpassRecord = {
                uid,
                surpassedUid,
                surpassedUsername,
                userWpm: newMaxWpm,
                surpassedWpm,
                bonus: surpassBonus,
                surpassBonus: true,
                surpassedAt: new Date(),
            };

            await this.ctx.db.collection('typing.surpass_records' as any).insertOne(surpassRecord);

            return {
                awarded: true,
                bonus: surpassBonus,
                reason: `超越对手奖: 超越 ${surpassedUsername}`,
                surpassedUser: surpassedUsername,
            };
        } catch (error) {
            if ((error as any).code === 11000) {
                // 唯一索引冲突，已经奖励过
                return { awarded: false, bonus: 0, reason: '已超越过该对手' };
            }
            console.error('[TypingBonusService] Error awarding surpass bonus:', error);
            throw error;
        }
    }

    /**
     * 处理完整的奖励流程（一条记录的所有奖励）
     * 返回总奖励积分
     * @param uid 用户ID
     * @param recordId 记录ID
     * @param newWpm 新的WPM值
     * @param previousMaxWpm 用户之前的最高WPM
     * @param oldRanking 可选的旧排行榜数据，用于超越检查
     */
    async processBonuses(
        uid: number,
        recordId: ObjectId,
        newWpm: number,
        previousMaxWpm: number,
        oldRanking?: any[],
    ): Promise<{
        totalBonus: number;
        bonuses: Array<{
            type: 'progress' | 'level' | 'surpass';
            bonus: number;
            reason: string;
        }>;
    }> {
        const bonuses: Array<{
            type: 'progress' | 'level' | 'surpass';
            bonus: number;
            reason: string;
        }> = [];
        let totalBonus = 0;

        // 计算新的最高速度
        const newMaxWpm = Math.max(newWpm, previousMaxWpm);

        // 1. 检查进步奖励
        if (newWpm > previousMaxWpm) {
            const progressResult = await this.awardProgressBonus(uid, recordId, previousMaxWpm, newWpm);
            if (progressResult.awarded) {
                bonuses.push({
                    type: 'progress',
                    bonus: progressResult.bonus,
                    reason: progressResult.reason,
                });
                totalBonus += progressResult.bonus;
            }

            // 2. 检查等级升级奖励
            const newLevel = this.getPlayerLevel(newWpm);
            if (newLevel && newLevel.bonus > 0) {
                const levelResult = await this.awardLevelBonus(uid, newLevel, newWpm);
                if (levelResult.awarded) {
                    bonuses.push({
                        type: 'level',
                        bonus: levelResult.bonus,
                        reason: levelResult.reason,
                    });
                    totalBonus += levelResult.bonus;
                }
            }

            // 3. 检查超越对手奖励（使用旧排行榜）
            const surpassResult = await this.awardSurpassBonus(uid, newMaxWpm, oldRanking);
            if (surpassResult.awarded) {
                bonuses.push({
                    type: 'surpass',
                    bonus: surpassResult.bonus,
                    reason: surpassResult.reason,
                });
                totalBonus += surpassResult.bonus;
            }
        }

        return { totalBonus, bonuses };
    }

    /**
     * 获取用户的进步记录
     */
    async getUserProgressRecords(uid: number, limit: number = 20): Promise<ProgressBonusRecord[]> {
        return await this.ctx.db.collection('typing.progress_records' as any)
            .find({ uid })
            .sort({ awardedAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取用户的等级成就
     */
    async getUserLevelAchievements(uid: number): Promise<LevelAchievementRecord[]> {
        return await this.ctx.db.collection('typing.level_achievements' as any)
            .find({ uid, bonusAwarded: true })
            .sort({ level: 1 })
            .toArray();
    }

    /**
     * 获取用户的超越记录
     */
    async getUserSurpassRecords(uid: number, limit: number = 20): Promise<SurpassRecord[]> {
        return await this.ctx.db.collection('typing.surpass_records' as any)
            .find({ uid })
            .sort({ surpassedAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取超越该用户的对手列表
     */
    async getWhoSurpassedUser(uid: number, limit: number = 20): Promise<SurpassRecord[]> {
        return await this.ctx.db.collection('typing.surpass_records' as any)
            .find({ surpassedUid: uid })
            .sort({ surpassedAt: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * 获取用户的奖励总额统计
     */
    async getUserBonusStats(uid: number): Promise<{
        totalProgressBonus: number;
        totalLevelBonus: number;
        totalSurpassBonus: number;
        totalBonus: number;
        progressCount: number;
        levelCount: number;
        surpassCount: number;
    }> {
        const progressRecords = await this.ctx.db.collection('typing.progress_records' as any)
            .find({ uid })
            .toArray();

        const levelRecords = await this.ctx.db.collection('typing.level_achievements' as any)
            .find({ uid, bonusAwarded: true })
            .toArray();

        const surpassRecords = await this.ctx.db.collection('typing.surpass_records' as any)
            .find({ uid })
            .toArray();

        const totalProgressBonus = progressRecords.reduce((sum, r) => sum + r.progressBonus, 0);
        const totalLevelBonus = levelRecords.reduce((sum, r) => sum + r.targetBonus, 0);
        const totalSurpassBonus = surpassRecords.reduce((sum, r) => sum + r.bonus, 0);

        return {
            totalProgressBonus,
            totalLevelBonus,
            totalSurpassBonus,
            totalBonus: totalProgressBonus + totalLevelBonus + totalSurpassBonus,
            progressCount: progressRecords.length,
            levelCount: levelRecords.length,
            surpassCount: surpassRecords.length,
        };
    }
}
