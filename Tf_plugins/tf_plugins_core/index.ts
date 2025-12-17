import { Context, Logger, Schema } from 'hydrooj';
import { getQiniuConfig, validateQiniuConfig } from './src/config';
import { Config } from './src/config/schema';
import { QiniuStorageService } from './src/services';

const logger = new Logger('tf-plugins-core');

/**
 * 声明 Context 扩展，添加 qiniuStorage 服务
 */
declare module 'hydrooj' {
    interface Context {
        /** 七牛云存储服务（如果已启用） */
        qiniuStorage?: QiniuStorageService;
    }
}

/**
 * 插件配置类型（从 Schema 推导）
 */
export type PluginConfig = ReturnType<typeof Config>;

/**
 * Tf 插件核心库
 * 提供通用功能服务，包括七牛云存储等
 *
 * @param ctx HydroOJ Context
 * @param config 插件配置（已通过 Schema 验证，包含默认值）
 */
export default async function apply(ctx: Context, config: PluginConfig = {} as PluginConfig) {
    logger.info('🚀 Tf 插件核心库正在加载...');
    try {
        // 如果配置为空，尝试从 ctx.setting 直接读取配置
        let actualConfig = config;
        if (!config || Object.keys(config).length === 0 || !config.qiniu) {
            try {
                // 尝试直接从 setting 读取配置
                const wrappedSchema = Schema.object({
                    tf_plugins_core: Config,
                });
                const resolvedConfig = ctx.setting.requestConfig(wrappedSchema, false);

                if (resolvedConfig?.tf_plugins_core?.qiniu) {
                    const schemaConfig = resolvedConfig.tf_plugins_core;

                    // 如果 Schema 配置的值都是默认值，从原始配置读取
                    const yaml = await import('js-yaml');
                    const rawConfig: any = yaml.load(ctx.setting?.configSource || '{}') || {};
                    const rawQiniuConfig = rawConfig.plugins?.tf_plugins_core?.qiniu;

                    // 如果原始配置有值，但 Schema 配置是默认值，使用原始配置
                    if (rawQiniuConfig && (
                        !schemaConfig.qiniu?.enabled
                        || !schemaConfig.qiniu?.accessKey
                        || !schemaConfig.qiniu?.bucket
                    )) {
                        logger.debug('⚠️ Schema 读取的配置值为默认值，使用原始配置');
                        actualConfig = {
                            qiniu: {
                                enabled: rawQiniuConfig.enabled ?? schemaConfig.qiniu?.enabled ?? false,
                                accessKey: rawQiniuConfig.accessKey || schemaConfig.qiniu?.accessKey || '',
                                secretKey: rawQiniuConfig.secretKey || schemaConfig.qiniu?.secretKey || '',
                                bucket: rawQiniuConfig.bucket || schemaConfig.qiniu?.bucket || '',
                                domain: rawQiniuConfig.domain || schemaConfig.qiniu?.domain || '',
                                zone: rawQiniuConfig.zone || schemaConfig.qiniu?.zone || 'Zone_z0',
                                maxFileSize: rawQiniuConfig.maxFileSize ?? schemaConfig.qiniu?.maxFileSize ?? 10 * 1024 * 1024,
                                defaultPrefix: rawQiniuConfig.defaultPrefix || schemaConfig.qiniu?.defaultPrefix || 'files',
                            },
                        };
                    } else {
                        actualConfig = schemaConfig;
                    }
                }
            } catch (error: any) {
                logger.warn(`⚠️ 无法从 ctx.setting 读取配置: ${error.message}`);
            }
        }

        // 安全地解析并验证七牛云配置
        // 使用 actualConfig（可能从 ctx.setting 读取）
        const qiniuConfig = getQiniuConfig(actualConfig || {});

        // 如果未启用，跳过初始化
        if (!qiniuConfig.enabled) {
            logger.info('ℹ️ 七牛云存储未启用，跳过初始化');
            logger.info('💡 提示：如需启用，请在配置中设置 plugins.tf_plugins_core.qiniu.enabled: true');
            logger.info('✅ Tf 插件核心库加载完成（七牛云未启用）');
            return;
        }

        // 验证配置完整性
        const validation = validateQiniuConfig(qiniuConfig);
        if (!validation.valid) {
            logger.warn(`⚠️ 七牛云配置验证失败: ${validation.error}`);
            logger.warn('⚠️ 七牛云存储服务将不可用');
            logger.info('✅ Tf 插件核心库加载完成（配置验证失败）');
            return;
        }

        // 初始化七牛云存储服务
        const qiniuService = new QiniuStorageService(qiniuConfig);

        if (qiniuService.isReady()) {
            // 提供服务给其他插件使用
            ctx.provide('qiniuStorage', qiniuService);
            logger.info('✅ 七牛云存储服务已初始化并注册');
        } else {
            logger.warn('⚠️ 七牛云存储服务初始化失败');
        }
    } catch (error: any) {
        // 捕获所有可能的错误，确保插件不会因为配置问题而崩溃
        logger.error(`❌ Tf 插件核心库加载异常: ${error.message}`);
        if (error.stack) {
            logger.error(error.stack);
        }
        logger.warn('⚠️ 插件将继续运行，但七牛云存储服务不可用');
    }

    logger.info('✅ Tf 插件核心库加载完成');
}

// 导出配置 Schema，供 HydroOJ 使用
export { Config };
import type { Context } from 'hydrooj';
import { registerTfPerms, TF_PERM } from './src/perm';

// 对外聚合导出各子模块能力
export * from './src/events';
export * from './src/perm';
export * from './src/score';
export * from './src/ui';
export * from './src/user';
export * from './src/utils';

// 保留旧的命名导出，兼容现有插件使用方式
export { registerTfPerms, TF_PERM };

// 核心插件入口：主要负责注册 TF 层权限等一次性初始化
export default async function apply(_ctx: Context) {
    registerTfPerms();
}
