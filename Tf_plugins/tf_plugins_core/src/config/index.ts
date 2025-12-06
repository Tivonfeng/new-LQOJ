import type { QiniuConfig } from '../types';

/**
 * 从插件配置和环境变量中获取七牛云配置
 * 优先级：插件配置 > 环境变量 > 默认值
 *
 * @param pluginConfig 插件配置对象（可能为空或未定义）
 * @returns 解析后的七牛云配置
 */
export function getQiniuConfig(pluginConfig: any): QiniuConfig {
    // 安全地获取配置，处理 null、undefined 等情况
    const qiniuConfig = (pluginConfig && typeof pluginConfig === 'object' && pluginConfig.qiniu)
        ? pluginConfig.qiniu
        : {};

    // 更清晰的 enabled 逻辑：优先使用插件配置，否则检查环境变量
    const enabled = qiniuConfig.enabled !== undefined
        ? Boolean(qiniuConfig.enabled)
        : process.env.QINIU_ENABLED === 'true';

    // 安全地解析 maxFileSize
    let maxFileSize = 10 * 1024 * 1024; // 默认 10MB
    if (qiniuConfig.maxFileSize !== undefined) {
        const parsed = Number(qiniuConfig.maxFileSize);
        if (!Number.isNaN(parsed) && parsed > 0) {
            maxFileSize = parsed;
        }
    } else if (process.env.QINIU_MAX_SIZE) {
        const parsed = Number.parseInt(process.env.QINIU_MAX_SIZE, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
            maxFileSize = parsed;
        }
    }

    return {
        enabled: enabled || false,
        accessKey: String(qiniuConfig.accessKey || process.env.QINIU_ACCESS_KEY || '').trim(),
        secretKey: String(qiniuConfig.secretKey || process.env.QINIU_SECRET_KEY || '').trim(),
        bucket: String(qiniuConfig.bucket || process.env.QINIU_BUCKET || '').trim(),
        domain: String(qiniuConfig.domain || process.env.QINIU_DOMAIN || '').trim(),
        zone: String(qiniuConfig.zone || process.env.QINIU_ZONE || 'Zone_z0').trim(),
        maxFileSize,
        defaultPrefix: String(qiniuConfig.defaultPrefix || process.env.QINIU_PREFIX || 'files').trim(),
    };
}

/**
 * 验证七牛云配置是否完整
 */
export function validateQiniuConfig(config: QiniuConfig): { valid: boolean, error?: string } {
    if (!config.enabled) {
        return { valid: false, error: '七牛云存储未启用' };
    }

    if (!config.accessKey) {
        return { valid: false, error: '缺少 QINIU_ACCESS_KEY' };
    }

    if (!config.secretKey) {
        return { valid: false, error: '缺少 QINIU_SECRET_KEY' };
    }

    if (!config.bucket) {
        return { valid: false, error: '缺少 QINIU_BUCKET' };
    }

    if (!config.domain) {
        return { valid: false, error: '缺少 QINIU_DOMAIN' };
    }

    return { valid: true };
}
