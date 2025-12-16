import { Context, PRIV, Schema } from 'hydrooj';
import { AnalyticsContestHandler } from './src/handlers/contest-handler';
import { AnalyticsDailyHandler } from './src/handlers/daily-handlers';
import { AnalyticsMeHandler } from './src/handlers/me-handler';
import {
    AnalyticsPhaseAdminHandler,
    AnalyticsPhaseDetailHandler,
    AnalyticsPhaseListHandler,
} from './src/handlers/phase-handlers';
import { AnalyticsDashboardService } from './src/services/dashboard-service';
import {
    AnalyticsContestPerf,
    AnalyticsDailySnapshot,
    AnalyticsPhase,
    AnalyticsPhaseProgress,
    AnalyticsTagMastery,
} from './src/types/analytics';

// 声明集合类型
declare module 'hydrooj' {
    interface Collections {
        'analytics.phases': AnalyticsPhase;
        'analytics.phase_progress': AnalyticsPhaseProgress;
        'analytics.contest_perf': AnalyticsContestPerf;
        'analytics.daily_snapshots': AnalyticsDailySnapshot;
        'analytics.tag_mastery': AnalyticsTagMastery;
    }
}

// 插件配置
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用学习数据大厅'),
});

export { Config };

export default async function apply(ctx: Context, config: any = {}) {
    const finalConfig = { enabled: true, ...config };
    if (!finalConfig.enabled) {
        ctx.logger?.info?.('[Analytics] 插件已禁用');
        return;
    }

    const service = new AnalyticsDashboardService(ctx);

    // 初始化索引
    await service.ensureIndexes();

    // 监听核心事件（先埋钩子，后续补充逻辑）
    ctx.on('record/judge', service.handleRecordJudge.bind(service));
    // contest / user 登录事件在类型上未暴露，使用 any 兼容
    (ctx as any).on?.('user/login', service.handleUserLogin.bind(service));
    (ctx as any).on?.('contest/submit', service.handleContestSubmit?.bind(service));
    (ctx as any).on?.('contest/end', service.handleContestEnd?.bind(service));

    // 路由
    ctx.Route('analytics_me', '/analytics/me', AnalyticsMeHandler);
    ctx.Route('analytics_daily', '/analytics/daily', AnalyticsDailyHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('analytics_phases', '/analytics/phases', AnalyticsPhaseListHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('analytics_phase_detail', '/analytics/phases/:phaseId', AnalyticsPhaseDetailHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('analytics_contest', '/analytics/contests/:cid', AnalyticsContestHandler, PRIV.PRIV_USER_PROFILE);
    ctx.Route('analytics_admin_phases', '/analytics/admin/phases', AnalyticsPhaseAdminHandler, PRIV.PRIV_EDIT_SYSTEM);
    ctx.Route('analytics_admin_phase', '/analytics/admin/phases/:phaseId', AnalyticsPhaseAdminHandler, PRIV.PRIV_EDIT_SYSTEM);

    // 导航入口
    ctx.injectUI('Nav', 'analytics', {
        prefix: 'analytics',
        before: 'ranking',
    }, PRIV.PRIV_USER_PROFILE);
}
