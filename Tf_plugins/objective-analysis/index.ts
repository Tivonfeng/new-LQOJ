import { Context } from 'hydrooj';
import { ObjectiveAnalysisByRidHandler, ObjectiveAnalysisHandler } from './src/handlers';
import { ObjectiveAnalysisService } from './src/services/ObjectiveAnalysisService';

declare module 'hydrooj' {
    interface Collections {
        'objective.analysis': any;
    }
    interface Context {
        objectiveAnalysisService?: ObjectiveAnalysisService;
    }
}

/**
 * 客观题答案解析插件
 * 功能：
 * 1. 提交后做题页每题内联展示「我的答案 / 正确答案 / 解析」，记录页表格下方同样展示
 * 2. 作者在原题目编辑页（/p/:pid/edit）内联编辑解析（不离开原页面）
 * 3. 解析存插件自建集合，与核心配置/判分完全解耦（零核心改动、零冲突）
 */
export default async function apply(ctx: Context) {
    // 解析集合索引
    await ctx.db.collection('objective.analysis' as any).createIndex({ domainId: 1, pid: 1 }, { unique: true });

    // 路由
    ctx.Route('objective_analysis', '/objective-analysis/:pid', ObjectiveAnalysisHandler);
    ctx.Route('objective_analysis_record', '/objective-analysis/r/:rid', ObjectiveAnalysisByRidHandler);

    console.log('[objective-analysis] ✅ 客观题答案解析插件加载完成');
}
