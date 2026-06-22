import { Context } from 'hydrooj';

/**
 * Training Category Plugin - 训练分类分组插件
 *
 * 功能：
 * 覆盖 training_main.html 模板，将训练计划按 tag 分组显示：
 * - 真题训练（tag 包含 "真题训练"）
 * - 常规训练（tag 包含 "常规训练"）
 * - 其他训练（无 tag 或不匹配的）
 */

export async function apply(ctx: Context) {
    console.log('[training-category] Training category plugin loaded successfully!');
    console.log('[training-category] Template override: training_main.html with category grouping');
}
