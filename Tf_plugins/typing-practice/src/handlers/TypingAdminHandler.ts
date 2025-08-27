import { Handler, param, PRIV, query, Types } from 'hydrooj';
import { TypingService } from '../services/TypingService';
import { TypingConfig, TypingPracticeResponse } from '../types/typing';
import { DEFAULT_CONFIG } from './config';

export class TypingAdminHandler extends Handler {
    private get typingService(): TypingService {
        return new TypingService(DEFAULT_CONFIG, this.ctx);
    }

    private get config(): TypingConfig {
        return DEFAULT_CONFIG;
    }

    /**
     * GET /typing/admin - 管理员页面
     */
    async get() {
        // 检查管理员权限
        this.checkPriv(PRIV.PRIV_CREATE_DOMAIN);

        try {
            const domainId = this.domain._id;

            // 获取基本系统信息
            const systemInfo = {
                pluginVersion: '1.0.0',
                enabled: this.config.enabled,
                scoreIntegration: this.config.scoreIntegration,
                maxTextLength: this.config.maxTextLength,
                minAccuracy: this.config.minAccuracy,
            };

            this.response.template = 'typing_admin.html';
            this.response.body = {
                systemInfo,
                config: this.config,
                page_name: 'typing_admin',
            };
        } catch (error) {
            console.error('[TypingAdminHandler] Error loading admin page:', error);
            throw new Error('Failed to load typing admin page');
        }
    }

    /**
     * POST /typing/admin/reset-user - 重置用户数据
     */
    @param('uid', Types.Int)
    async postResetUser(domainId: string, uid: number) {
        this.checkPriv(PRIV.PRIV_CREATE_DOMAIN);

        try {
            // 使用TypingService来处理数据重置
            await this.typingService.resetUserData(domainId, uid);

            const response: TypingPracticeResponse = {
                success: true,
                data: {
                    message: `User ${uid} data reset successfully`,
                },
            };

            this.response.body = response;

            console.log(`[TypingAdminHandler] Admin ${this.user._id} reset data for user ${uid}`);
        } catch (error) {
            console.error('[TypingAdminHandler] Error resetting user data:', error);

            const response: TypingPracticeResponse = {
                success: false,
                error: {
                    code: 'RESET_USER_ERROR',
                    message: 'Failed to reset user data',
                },
            };

            this.response.body = response;
        }
    }

    /**
     * POST /typing/admin/cleanup - 清理旧数据
     */
    @query('days', Types.Int, true)
    async postCleanup(domainId: string, days: number = 90) {
        this.checkPriv(PRIV.PRIV_CREATE_DOMAIN);

        try {
            // 使用TypingService来处理数据清理
            const deletedCount = await this.typingService.cleanupOldData(domainId, days);

            const response: TypingPracticeResponse = {
                success: true,
                data: {
                    deletedRecords: deletedCount,
                    message: `Cleaned up ${deletedCount} old records`,
                },
            };

            this.response.body = response;

            console.log(`[TypingAdminHandler] Admin ${this.user._id} cleaned up ${deletedCount} records older than ${days} days`);
        } catch (error) {
            console.error('[TypingAdminHandler] Error cleaning up data:', error);

            const response: TypingPracticeResponse = {
                success: false,
                error: {
                    code: 'CLEANUP_ERROR',
                    message: 'Failed to cleanup old data',
                },
            };

            this.response.body = response;
        }
    }

    /**
     * GET /typing/admin/stats - 获取详细系统统计
     */
    @query('period', Types.String, true)
    async getDetailedStats(domainId: string, period: string = '30d') {
        this.checkPriv(PRIV.PRIV_CREATE_DOMAIN);

        try {
            // 使用TypingService获取统计信息
            const stats = await this.typingService.getSystemStats(domainId, period);

            const response: TypingPracticeResponse = {
                success: true,
                data: stats,
            };

            this.response.body = response;
        } catch (error) {
            console.error('[TypingAdminHandler] Error fetching detailed stats:', error);

            const response: TypingPracticeResponse = {
                success: false,
                error: {
                    code: 'STATS_ERROR',
                    message: 'Failed to fetch system statistics',
                },
            };

            this.response.body = response;
        }
    }

    /**
     * POST /typing/admin/broadcast - 发送系统通知
     */
    @param('message', Types.String)
    @query('type', Types.String, true)
    async postBroadcast(domainId: string, message: string, type: string = 'info') {
        this.checkPriv(PRIV.PRIV_CREATE_DOMAIN);

        try {
            // 这里可以集成系统的消息通知功能
            // 暂时只记录日志
            console.log(`[TypingAdminHandler] Admin ${this.user._id} broadcast message: ${message}`);

            const response: TypingPracticeResponse = {
                success: true,
                data: {
                    message: 'Broadcast sent successfully',
                },
            };

            this.response.body = response;
        } catch (error) {
            console.error('[TypingAdminHandler] Error sending broadcast:', error);

            const response: TypingPracticeResponse = {
                success: false,
                error: {
                    code: 'BROADCAST_ERROR',
                    message: 'Failed to send broadcast',
                },
            };

            this.response.body = response;
        }
    }
}
