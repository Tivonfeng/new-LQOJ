import { Handler, PERM, PRIV } from 'hydrooj';
import {
    TypingBonusService,
    TypingRecordService,
    TypingStatsService,
} from '../services';

/**
 * 管理员页面处理器
 * 路由: /typing/admin
 * 功能: 管理员录入打字成绩、批量导入、查看统计
 */
export class TypingAdminHandler extends Handler {
    async prepare() {
        // 检查系统管理权限或域管理权限
        if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
            this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        }
    }

    async get() {
        const recordService = new TypingRecordService(this.ctx);

        // 获取最近录入的记录
        const recentRecords = await recordService.getRecentRecords(20);

        // 获取用户信息
        const uids = [...new Set(recentRecords.map((r) => r.uid))];
        const UserModel = global.Hydro.model.user;
        const udocs = await UserModel.getList(this.domain._id, uids);

        // 格式化记录
        const formattedRecords = recordService.formatRecords(recentRecords);

        this.response.template = 'typing_admin.html';
        this.response.body = {
            recentRecords: formattedRecords,
            udocs,
        };
    }

    async post() {
        const { action } = this.request.body;

        if (action === 'add_record') {
            await this.handleAddRecord();
        } else if (action === 'import_csv') {
            await this.handleImportCSV();
        } else if (action === 'delete_record') {
            await this.handleDeleteRecord();
        } else if (action === 'recalculate_stats') {
            await this.handleRecalculateStats();
        } else {
            this.response.body = { success: false, message: '无效的操作' };
        }
    }

    /**
     * 处理单个记录添加
     */
    private async handleAddRecord() {
        const { username, wpm, note } = this.request.body;

        try {
            // 验证输入
            const wpmNum = Number.parseInt(wpm);
            if (!wpmNum || wpmNum < 0 || wpmNum > 300) {
                this.response.body = { success: false, message: 'WPM必须在0-300之间' };
                return;
            }

            // 查找用户
            const UserModel = global.Hydro.model.user;
            const user = await UserModel.getByUname(this.domain._id, username);

            if (!user) {
                this.response.body = { success: false, message: '用户不存在' };
                return;
            }

            // 获取用户当前统计（用于计算进步和超越）
            const recordService = new TypingRecordService(this.ctx);
            const statsService = new TypingStatsService(this.ctx, recordService);
            const currentStats = await statsService.getUserStats(user._id);
            const previousMaxWpm = currentStats?.maxWpm || 0;

            // 获取更新前的排行榜（用于超越检查）
            const oldRanking = await statsService.getAllStats();

            // 添加记录
            const recordId = await recordService.addRecord(
                user._id,
                this.domain._id,
                wpmNum,
                this.user._id,
                note,
            );

            // 更新用户统计
            await statsService.updateUserStats(user._id, this.domain._id);

            // 更新周快照
            await statsService.updateWeeklySnapshot(user._id);

            // 处理奖励（传递旧排行榜用于超越检查）
            const bonusService = new TypingBonusService(this.ctx);
            const bonusInfo = await bonusService.processBonuses(user._id, recordId, wpmNum, previousMaxWpm, oldRanking);

            let bonusMessage = '';
            if (bonusInfo.totalBonus > 0) {
                // 触发打字奖励事件，由积分系统处理积分增加
                for (const bonus of bonusInfo.bonuses) {
                    try {
                        this.ctx.emit('typing/bonus-awarded', {
                            uid: user._id,
                            domainId: this.domain._id.toString(),
                            bonus: bonus.bonus,
                            reason: bonus.reason,
                            bonusType: bonus.type,
                            recordId,
                        });
                    } catch (err: any) {
                        console.error(`[TypingSpeed] 触发打字奖励事件失败: ${err.message}`);
                        // 事件触发失败不影响奖励记录
                    }
                }
                bonusMessage = `，获得奖励: +${bonusInfo.totalBonus}分`;
            }

            console.log(`[TypingAdmin] Admin ${this.user._id} added record for user ${user._id}: ${wpmNum} WPM, bonus: +${bonusInfo.totalBonus}`);

            this.response.body = {
                success: true,
                message: `成功为 ${username} 录入打字速度: ${wpmNum} WPM${bonusMessage}`,
                bonusInfo,
            };
        } catch (error) {
            console.error('[TypingAdmin] Error adding record:', error);
            this.response.body = { success: false, message: `操作失败：${error.message}` };
        }
    }

    /**
     * 处理CSV批量导入
     */
    private async handleImportCSV() {
        const { csvData } = this.request.body;

        try {
            if (!csvData || !csvData.trim()) {
                this.response.body = { success: false, message: 'CSV数据为空' };
                return;
            }

            const recordService = new TypingRecordService(this.ctx);
            const statsService = new TypingStatsService(this.ctx, recordService);
            const bonusService = new TypingBonusService(this.ctx);

            // 获取更新前的排行榜（用于超越检查）
            const oldRanking = await statsService.getAllStats();

            // 导入记录
            const result = await recordService.importRecordsFromCSV(
                csvData,
                this.user._id,
                this.domain._id,
            );

            let totalBonus = 0;
            const bonusDetails: Array<{ username: string, wpm: number, bonus: number }> = [];

            // 更新所有涉及用户的统计和处理奖励
            const lines = csvData.trim().split('\n');
            const hasHeader = lines[0].trim().toLowerCase().includes('username')
                && (lines[0].trim().toLowerCase().includes('wpm')
                    || lines[0].trim().toLowerCase().includes('speed'));
            const startLine = hasHeader ? 1 : 0;

            for (let i = startLine; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const parts = line.split(',');
                const username = parts[0].trim();
                const wpm = Number.parseInt(parts[1].trim());

                try {
                    const UserModel = global.Hydro.model.user;
                    const user = await UserModel.getByUname(this.domain._id, username);
                    if (!user) continue;

                    // 获取该用户的前一条最高速度
                    const currentStats = await statsService.getUserStats(user._id);
                    const previousMaxWpm = currentStats?.maxWpm || 0;

                    // 获取该用户最新的记录
                    const latestRecord = await recordService.getLatestRecord(user._id);

                    if (latestRecord && latestRecord.wpm === wpm) {
                        // 处理奖励（传递旧排行榜用于超越检查）
                        const bonusInfo = await bonusService.processBonuses(
                            user._id,
                            latestRecord._id,
                            wpm,
                            previousMaxWpm,
                            oldRanking,
                        );

                        if (bonusInfo.totalBonus > 0) {
                            // 触发打字奖励事件，由积分系统处理积分增加
                            for (const bonus of bonusInfo.bonuses) {
                                try {
                                    this.ctx.emit('typing/bonus-awarded', {
                                        uid: user._id,
                                        domainId: this.domain._id.toString(),
                                        bonus: bonus.bonus,
                                        reason: bonus.reason,
                                        bonusType: bonus.type,
                                        recordId: latestRecord._id,
                                    });
                                } catch (err: any) {
                                    console.error(`[TypingSpeed] 触发打字奖励事件失败: ${err.message}`);
                                    // 事件触发失败不影响奖励记录
                                }
                            }

                            totalBonus += bonusInfo.totalBonus;
                            bonusDetails.push({
                                username,
                                wpm,
                                bonus: bonusInfo.totalBonus,
                            });
                        }
                    }

                    // 更新统计
                    await statsService.updateUserStats(user._id, this.domain._id);
                    await statsService.updateWeeklySnapshot(user._id);
                } catch (error) {
                    console.error(`[TypingAdmin] Error processing bonus for ${username}:`, error);
                }
            }

            console.log(`[TypingAdmin] Admin ${this.user._id} imported ${result.success} records, total bonus: +${totalBonus}`);

            this.response.body = {
                success: true,
                message: `成功导入 ${result.success} 条记录，失败 ${result.failed} 条，总奖励: +${totalBonus}分`,
                data: result,
                bonusDetails,
                totalBonus,
            };
        } catch (error) {
            console.error('[TypingAdmin] Error importing CSV:', error);
            this.response.body = { success: false, message: `导入失败：${error.message}` };
        }
    }

    /**
     * 处理删除记录
     */
    private async handleDeleteRecord() {
        const { recordId } = this.request.body;

        try {
            if (!recordId) {
                this.response.body = { success: false, message: '记录ID不能为空' };
                return;
            }

            const recordService = new TypingRecordService(this.ctx);
            const statsService = new TypingStatsService(this.ctx, recordService);

            // 获取记录信息（用于更新统计）
            const record = await recordService.getRecordById(recordId);
            if (!record) {
                this.response.body = { success: false, message: '记录不存在' };
                return;
            }

            // 删除记录
            await recordService.deleteRecord(recordId);

            // 更新用户统计
            await statsService.updateUserStats(record.uid, record.domainId);

            // 更新周快照
            await statsService.updateWeeklySnapshot(record.uid);

            console.log(`[TypingAdmin] Admin ${this.user._id} deleted record ${recordId} for user ${record.uid}`);

            this.response.body = {
                success: true,
                message: '记录删除成功',
            };
        } catch (error) {
            console.error('[TypingAdmin] Error deleting record:', error);
            this.response.body = { success: false, message: `删除失败：${error.message}` };
        }
    }

    /**
     * 重新计算所有用户统计（全域）
     */
    private async handleRecalculateStats() {
        try {
            const recordService = new TypingRecordService(this.ctx);
            const statsService = new TypingStatsService(this.ctx, recordService);

            // 获取所有有记录的用户（全域）
            const allRecords = await recordService.getAllRecords();

            // 按 uid 提取唯一用户（全域统一数据）
            const validUids = [...new Set(allRecords.map((r) => r.uid))];

            if (validUids.length === 0) {
                // 如果没有任何记录，清空统计表和快照表（全域）
                await statsService.clearAllStats();
                await statsService.clearAllWeeklySnapshots();

                console.log(`[TypingAdmin] Admin ${this.user._id} cleared all stats (no records found)`);

                this.response.body = {
                    success: true,
                    message: '没有找到任何记录，已清空所有统计数据',
                };
                return;
            }

            // 重新计算每个用户的统计（全域统一）
            let updated = 0;
            for (const uid of validUids) {
                await statsService.updateUserStats(uid, this.domain._id);
                await statsService.updateWeeklySnapshot(uid);
                updated++;
            }

            // 删除没有对应记录的统计数据（全域）
            const allStats = await statsService.getAllStats();
            const uidsToDelete = allStats
                .filter((stat) => !validUids.includes(stat.uid))
                .map((stat) => stat.uid);
            if (uidsToDelete.length > 0) {
                await statsService.deleteStatsByUids(uidsToDelete);
            }

            console.log(`[TypingAdmin] Admin ${this.user._id} recalculated stats for ${updated} users (全域)`);

            this.response.body = {
                success: true,
                message: `成功重新计算 ${updated} 个用户的统计数据（全域）`,
            };
        } catch (error) {
            console.error('[TypingAdmin] Error recalculating stats:', error);
            this.response.body = { success: false, message: `重新计算失败：${error.message}` };
        }
    }
}
