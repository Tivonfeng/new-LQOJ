import {
    Context,
} from 'hydrooj';

/**
 * 积分数据迁移服务
 * 负责将分域的积分数据合并为统一账户
 */
export class MigrationService {
    private ctx: Context;

    constructor(ctx: Context) {
        this.ctx = ctx;
    }

    /**
     * 合并用户积分数据
     * 将同一用户在不同域的积分数据合并为统一账户
     */
    async mergeUserScores(): Promise<{ mergedUsers: number, totalRecords: number }> {
        console.log('[MigrationService] Starting user score migration...');

        // 聚合查询，按用户ID分组，合并所有域的积分数据
        const pipeline = [
            {
                $group: {
                    _id: '$uid',
                    totalScore: { $sum: '$totalScore' },
                    acCount: { $sum: '$acCount' },
                    lastUpdated: { $max: '$lastUpdated' },
                    domains: { $addToSet: '$domainId' },
                },
            },
        ];

        const mergedData = await this.ctx.db.collection('score.users' as any)
            .aggregate(pipeline)
            .toArray();

        console.log(`[MigrationService] Found ${mergedData.length} users to merge`);

        let mergedUsers = 0;
        let totalRecords = 0;

        // 删除现有数据并插入合并后的数据
        await this.ctx.db.collection('score.users' as any).deleteMany({});

        for (const userData of mergedData) {
            // 插入合并后的用户积分数据（不包含domainId，表示全局积分）
            await this.ctx.db.collection('score.users' as any).insertOne({
                uid: userData._id,
                totalScore: userData.totalScore,
                acCount: userData.acCount,
                lastUpdated: userData.lastUpdated,
                migratedFrom: userData.domains, // 记录来源域，用于追踪
                migratedAt: new Date(),
            });

            mergedUsers++;
            totalRecords += userData.domains.length;
        }

        console.log(`[MigrationService] Successfully merged ${mergedUsers} users from ${totalRecords} domain records`);
        return { mergedUsers, totalRecords };
    }

    /**
     * 检查迁移状态
     * @returns 迁移状态信息
     */
    async checkMigrationStatus(): Promise<{
        hasDomainData: boolean;
        hasGlobalData: boolean;
        domainUserCount: number;
        globalUserCount: number;
    }> {
        // 检查是否还有分域数据
        const domainUserCount = await this.ctx.db.collection('score.users' as any)
            .countDocuments({ domainId: { $exists: true } });

        // 检查是否有全局数据
        const globalUserCount = await this.ctx.db.collection('score.users' as any)
            .countDocuments({ domainId: { $exists: false } });

        return {
            hasDomainData: domainUserCount > 0,
            hasGlobalData: globalUserCount > 0,
            domainUserCount,
            globalUserCount,
        };
    }

    /**
     * 回滚迁移
     * 将合并后的数据重新分解为域数据（仅用于测试或回滚）
     */
    async rollbackMigration(): Promise<{ rolledBackUsers: number }> {
        console.log('[MigrationService] Starting migration rollback...');

        const globalUsers = await this.ctx.db.collection('score.users' as any)
            .find({ domainId: { $exists: false } })
            .toArray();

        console.log(`[MigrationService] Found ${globalUsers.length} global users to rollback`);

        let rolledBackUsers = 0;

        for (const user of globalUsers) {
            if (user.migratedFrom && Array.isArray(user.migratedFrom)) {
                // 删除全局记录
                await this.ctx.db.collection('score.users' as any)
                    .deleteOne({ _id: user._id });

                // 为每个来源域创建独立记录
                // 注意：这里无法精确恢复原始分域数据，只是平均分配
                const scorePerDomain = Math.floor(user.totalScore / user.migratedFrom.length);
                const acPerDomain = Math.floor(user.acCount / user.migratedFrom.length);

                for (const domainId of user.migratedFrom) {
                    await this.ctx.db.collection('score.users' as any).insertOne({
                        uid: user.uid,
                        domainId,
                        totalScore: scorePerDomain,
                        acCount: acPerDomain,
                        lastUpdated: user.lastUpdated,
                    });
                }

                rolledBackUsers++;
            }
        }

        console.log(`[MigrationService] Successfully rolled back ${rolledBackUsers} users`);
        return { rolledBackUsers };
    }

    /**
     * 获取迁移统计信息
     */
    async getMigrationStats(): Promise<{
        totalScoreRecords: number;
        uniqueUsers: number;
        uniqueDomains: number;
        scoreRecordsPerDomain: Record<string, number>;
    }> {
        const totalScoreRecords = await this.ctx.db.collection('score.records' as any)
            .countDocuments({});

        const uniqueUsers = (await this.ctx.db.collection('score.records' as any)
            .distinct('uid')).length;

        const uniqueDomains = (await this.ctx.db.collection('score.records' as any)
            .distinct('domainId')).length;

        // 统计每个域的记录数量
        const domainStats = await this.ctx.db.collection('score.records' as any)
            .aggregate([
                {
                    $group: {
                        _id: '$domainId',
                        count: { $sum: 1 },
                    },
                },
            ])
            .toArray();

        const scoreRecordsPerDomain: Record<string, number> = {};
        for (const stat of domainStats) {
            scoreRecordsPerDomain[stat._id] = stat.count;
        }

        return {
            totalScoreRecords,
            uniqueUsers,
            uniqueDomains,
            scoreRecordsPerDomain,
        };
    }
}
