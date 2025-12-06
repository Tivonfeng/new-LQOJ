import { Schema } from 'hydrooj';

/**
 * 插件配置 Schema
 *
 * 配置路径: plugins.tf_plugins_core.qiniu.*
 *
 * 配置示例（在 /manage/config 中）:
 * ```yaml
 * plugins:
 *   tf_plugins_core:
 *     qiniu:
 *       enabled: true
 *       accessKey: your_access_key
 *       secretKey: your_secret_key
 *       bucket: your-bucket
 *       domain: your-domain.com
 *       zone: Zone_z0
 * ```
 */
export const Config = Schema.object({
    qiniu: Schema.object({
        enabled: Schema.boolean()
            .default(false)
            .description('是否启用七牛云存储'),

        accessKey: Schema.string()
            .default('')
            .role('secret')
            .description('七牛云 Access Key'),

        secretKey: Schema.string()
            .default('')
            .role('secret')
            .description('七牛云 Secret Key'),

        bucket: Schema.string()
            .default('')
            .description('存储桶名称'),

        domain: Schema.string()
            .default('')
            .description('CDN 域名（支持 http:// 或 https://）'),

        zone: Schema.union([
            Schema.const('Zone_z0').description('华东'),
            Schema.const('Zone_z1').description('华北'),
            Schema.const('Zone_z2').description('华南'),
            Schema.const('Zone_as0').description('东南亚'),
            Schema.const('Zone_na0').description('北美'),
            Schema.const('Zone_cn_east_2').description('华东-浙江2'),
            Schema.const('Zone_cn_south_1').description('华南-广东'),
            Schema.const('Zone_cn_north_1').description('华北-北京'),
            Schema.const('Zone_cn_northeast_1').description('华北-山东'),
            Schema.const('Zone_hk_main').description('香港'),
            Schema.const('Zone_us_east_1').description('美国东部'),
            Schema.const('Zone_us_west_1').description('美国西部'),
        ]).default('Zone_z0')
            .description('存储区域'),

        maxFileSize: Schema.number()
            .default(10 * 1024 * 1024)
            .description('最大文件大小（字节），默认 10MB'),

        defaultPrefix: Schema.string()
            .default('files')
            .description('默认存储路径前缀'),
    }).description('七牛云存储配置'),
});
