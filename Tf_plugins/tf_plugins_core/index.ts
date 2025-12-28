import { Context, Schema } from 'hydrooj';
import { ScoreCoreService } from './src/services/ScoreCoreService';

const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用插件 core'),
});

export default async function apply(ctx: Context, config: any = {}) {
    const defaultConfig = { enabled: true };
    const finalConfig = { ...defaultConfig, ...config };

    if (!finalConfig.enabled) {
        console.log('[tf_plugins_core] Plugin disabled by config');
        return;
    }

    console.log('[tf_plugins_core] Plugin loading...');

    const scoreCore = new ScoreCoreService(ctx);

    try {
        if (typeof ctx.provide === 'function') {
            ctx.provide('scoreCore', scoreCore);
            console.log('[tf_plugins_core] ✅ scoreCore provided via ctx.provide');
        }
    } catch (err: any) {
        console.warn('[tf_plugins_core] ⚠️ provide scoreCore failed:', err?.message || err);
    }

    console.log('[tf_plugins_core] Plugin loaded');
}

export { Config };
