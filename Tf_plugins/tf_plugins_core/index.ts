import { Context, Logger, Schema } from 'hydrooj';
import { ScoreCoreService } from './src/services/ScoreCoreService';

const logger = new Logger('tf_plugins_core');
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用插件 core'),
});

export default async function apply(ctx: Context, config: any = {}) {
    logger.info('🔄 tf_plugins_core plugin starting...');

    const defaultConfig = { enabled: true };
    const finalConfig = { ...defaultConfig, ...config };

    if (!finalConfig.enabled) {
        logger.info('Plugin disabled by config');
        return;
    }

    logger.info('🏗️ Creating ScoreCoreService...');
    const scoreCore = new ScoreCoreService(ctx);
    logger.info('✅ ScoreCoreService created successfully');

    try {
        if (typeof ctx.provide === 'function') {
            ctx.provide('scoreCore', scoreCore);
            logger.info('✅ scoreCore provided via ctx.provide');
        } else {
            logger.warn('❌ ctx.provide not available');
        }
    } catch (err: any) {
        logger.error('❌ provide scoreCore failed: %s', err?.message || err);
    }

    logger.info('🎉 tf_plugins_core plugin loaded successfully');
}

export { Config };
