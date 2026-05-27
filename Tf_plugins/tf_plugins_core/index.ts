import { Context, Logger, Schema } from 'hydrooj';
import { QiniuCoreService } from './src/services/QiniuCoreService';
import { ScoreCoreService } from './src/services/ScoreCoreService';
import './src/types';

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

    // 初始化积分核心服务
    const scoreCore = new ScoreCoreService(ctx);

    // 初始化七牛云存储核心服务
    const qiniuCore = new QiniuCoreService(ctx);

    try {
        if (typeof ctx.provide === 'function') {
            ctx.provide('scoreCore', scoreCore);
            logger.info('✅ scoreCore provided via ctx.provide');

            ctx.provide('qiniuCore', qiniuCore);
            logger.info('✅ qiniuCore provided via ctx.provide');
        } else {
            logger.warn('❌ ctx.provide not available');
        }
    } catch (err: any) {
        logger.error('❌ provide services failed: %s', err?.message || err);
    }

    logger.info('🎉 tf_plugins_core plugin loaded successfully');
}

export { Config };
