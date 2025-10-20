import { Handler, PERM, PRIV } from 'hydrooj';
import {
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
        const statsService = new TypingStatsService(this.ctx, recordService);

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

            // 添加记录
            const recordService = new TypingRecordService(this.ctx);
            await recordService.addRecord(
                user._id,
                this.domain._id,
                wpmNum,
                this.user._id,
                note || '',
            );

            // 更新用户统计
            const statsService = new TypingStatsService(this.ctx, recordService);
            await statsService.updateUserStats(user._id, this.domain._id);

            // 更新周快照
            await statsService.updateWeeklySnapshot(user._id);

            console.log(`[TypingAdmin] Admin ${this.user._id} added record for user ${user._id}: ${wpmNum} WPM`);

            this.response.body = {
                success: true,
                message: `成功为 ${username} 录入打字速度: ${wpmNum} WPM`,
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

            // 导入记录
            const result = await recordService.importRecordsFromCSV(
                csvData,
                this.user._id,
                this.domain._id,
            );

            // 更新所有涉及用户的统计（异步执行）
            const lines = csvData.trim().split('\n');
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const parts = line.split(',');
                const username = parts[0].trim();

                try {
                    const UserModel = global.Hydro.model.user;
                    const user = await UserModel.getByUname(this.domain._id, username);
                    if (user) {
                        await statsService.updateUserStats(user._id, this.domain._id);
                        await statsService.updateWeeklySnapshot(user._id);
                    }
                } catch (error) {
                    // 忽略统计更新错误
                    console.error(`[TypingAdmin] Error updating stats for ${username}:`, error);
                }
            }

            console.log(`[TypingAdmin] Admin ${this.user._id} imported ${result.success} records`);

            this.response.body = {
                success: true,
                message: `成功导入 ${result.success} 条记录，失败 ${result.failed} 条`,
                data: result,
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
     * 重新计算所有用户统计
     */
    private async handleRecalculateStats() {
        try {
            const recordService = new TypingRecordService(this.ctx);
            const statsService = new TypingStatsService(this.ctx, recordService);

            // 获取所有有记录的用户（当前域）
            const allRecords = await this.ctx.db.collection('typing.records' as any)
                .find({ domainId: this.domain._id })
                .toArray();

            const uniqueUsers = [...new Set(allRecords.map((r) => r.uid))];

            if (uniqueUsers.length === 0) {
                // 如果没有任何记录，清空统计表和快照表（当前域）
                await this.ctx.db.collection('typing.stats' as any).deleteMany({ domainId: this.domain._id });
                await this.ctx.db.collection('typing.weekly_snapshots' as any).deleteMany({ domainId: this.domain._id });

                console.log(`[TypingAdmin] Admin ${this.user._id} cleared all stats (no records found)`);

                this.response.body = {
                    success: true,
                    message: '没有找到任何记录，已清空所有统计数据',
                };
                return;
            }

            // 重新计算每个用户的统计
            let updated = 0;
            for (const uid of uniqueUsers) {
                await statsService.updateUserStats(uid, this.domain._id);
                await statsService.updateWeeklySnapshot(uid);
                updated++;
            }

            // 删除没有对应记录的统计数据（当前域）
            await this.ctx.db.collection('typing.stats' as any).deleteMany({
                domainId: this.domain._id,
                uid: { $nin: uniqueUsers },
            });

            console.log(`[TypingAdmin] Admin ${this.user._id} recalculated stats for ${updated} users`);

            this.response.body = {
                success: true,
                message: `成功重新计算 ${updated} 个用户的统计数据`,
            };
        } catch (error) {
            console.error('[TypingAdmin] Error recalculating stats:', error);
            this.response.body = { success: false, message: `重新计算失败：${error.message}` };
        }
    }
}
