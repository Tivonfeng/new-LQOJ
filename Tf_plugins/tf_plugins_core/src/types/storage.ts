/**
 * 存储服务相关类型定义
 */

/**
 * 文件上传结果
 */
export interface UploadResult {
    /** 是否成功 */
    success: boolean;
    /** 文件访问 URL（成功时） */
    url?: string;
    /** 文件存储 key（成功时） */
    key?: string;
    /** 文件大小（字节） */
    size?: number;
    /** 错误信息（失败时） */
    error?: string;
}

/**
 * 文件删除结果
 */
export interface DeleteResult {
    /** 是否成功 */
    success: boolean;
    /** 错误信息（失败时） */
    error?: string;
}

/**
 * 七牛云存储配置
 */
export interface QiniuConfig {
    /** 是否启用 */
    enabled: boolean;
    /** Access Key */
    accessKey: string;
    /** Secret Key */
    secretKey: string;
    /** 存储桶名称 */
    bucket: string;
    /** CDN 域名 */
    domain: string;
    /** 存储区域 */
    zone: string;
    /** 最大文件大小（字节），默认 10MB */
    maxFileSize?: number;
    /** 默认存储路径前缀 */
    defaultPrefix?: string;
}

