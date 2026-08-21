import { Context } from 'hydrooj';

/**
 * Training Category Plugin - 训练分类插件
 *
 * 分类依据 tdoc.tag 子串匹配（与模板渲染逻辑保持一致）：
 * - 真题训练：tag 包含 "真题训练"   -> ?cat=zhenti
 * - 常规课：  tag 包含 "常规训练"   -> ?cat=regular（展示名为「常规课」）
 * - 其他：    无 tag 或不含上述两者 -> ?cat=other
 *
 * 通过 training/list bus 钩子（TrainingMainHandler.get 在 getMulti 之前
 * 以可变 query 调用）注入查询条件，使分类筛选与搜索、分页正确联动。
 */

export async function apply(ctx: Context) {
    ctx.on('training/list' as any, (query: any, handler: any) => {
        const cat = String(handler?.request?.query?.cat ?? '');
        if (cat === 'zhenti') query.tag = { $regex: '真题训练' };
        else if (cat === 'regular') query.tag = { $regex: '常规训练' };
        else if (cat === 'other') {
            query.$or = [
                { tag: null },
                { tag: { $not: { $regex: '真题训练|常规训练' } } },
            ];
        }
    });
}
