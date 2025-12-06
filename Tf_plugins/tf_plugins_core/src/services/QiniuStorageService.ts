/* eslint-disable ts/naming-convention */
import * as fs from 'fs';
import * as path from 'path';
import * as qiniu from 'qiniu';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'hydrooj';
import type { DeleteResult, QiniuConfig, UploadResult } from '../types';

const logger = new Logger('tf-plugins-core-qiniu');

/**
 * 七牛云存储服务类
 * 处理文件的上传、删除和URL生成
 */
export class QiniuStorageService {
    private mac: qiniu.auth.digest.Mac;
    private config: any;
    private bucket: string;
    private domain: string;
    private bucketManager: qiniu.rs.BucketManager;
    private isInitialized: boolean = false;
    private qiniuConfig: QiniuConfig;
    private maxFileSize: number;

    constructor(qiniuConfig: QiniuConfig) {
        this.qiniuConfig = qiniuConfig;
        this.maxFileSize = qiniuConfig.maxFileSize || 10 * 1024 * 1024;

        try {
            this.bucket = qiniuConfig.bucket;
            this.domain = this.normalizeDomain(qiniuConfig.domain);

            // 初始化鉴权对象
            this.mac = new qiniu.auth.digest.Mac(
                qiniuConfig.accessKey,
                qiniuConfig.secretKey,
            );

            // 配置七牛云区域
            this.config = new qiniu.conf.Config();
            this.setZone(qiniuConfig.zone);

            // 初始化 BucketManager
            this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);

            this.isInitialized = true;
            logger.info('[TfPluginsCore] 七牛云存储服务初始化成功');
        } catch (error: any) {
            logger.error(`[TfPluginsCore] 七牛云初始化失败: ${error.message}`);
            this.isInitialized = false;
        }
    }

    /**
     * 规范化域名 (确保使用 HTTPS)
     */
    private normalizeDomain(domain: string): string {
        if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
            return `https://${domain}`;
        }
        return domain.replace('http://', 'https://');
    }

    /**
     * 设置存储区域
     * 支持的区域常量
     */
    private setZone(zone: string) {
        const zoneConfig = {
            Zone_z0: (qiniu.zone as any).Zone_z0,
            Zone_z1: (qiniu.zone as any).Zone_z1,
            Zone_z2: (qiniu.zone as any).Zone_z2,
            Zone_as0: (qiniu.zone as any).Zone_as0,
            Zone_na0: (qiniu.zone as any).Zone_na0,
            Zone_cn_east_2: (qiniu.zone as any).Zone_cn_east_2,
            Zone_cn_south_1: (qiniu.zone as any).Zone_cn_south_1,
            Zone_cn_north_1: (qiniu.zone as any).Zone_cn_north_1,
            Zone_cn_northeast_1: (qiniu.zone as any).Zone_cn_northeast_1,
            Zone_hk_main: (qiniu.zone as any).Zone_hk_main,
            Zone_us_east_1: (qiniu.zone as any).Zone_us_east_1,
            Zone_us_west_1: (qiniu.zone as any).Zone_us_west_1,
        } as Record<string, any>;

        this.config.zone = zoneConfig[zone] || (qiniu.zone as any).Zone_z0;
    }

    /**
     * 检查服务是否已初始化
     */
    isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * 上传文件到七牛云 (通过文件路径)
     * @param filePath 文件路径
     * @param prefix 存储路径前缀，默认使用配置中的 defaultPrefix
     */
    async uploadFile(filePath: string, prefix?: string): Promise<UploadResult> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: '七牛云服务未初始化',
            };
        }

        try {
            // 检查文件是否存在
            if (!fs.existsSync(filePath)) {
                return {
                    success: false,
                    error: `文件不存在: ${filePath}`,
                };
            }

            // 获取文件大小
            const stats = fs.statSync(filePath);
            const fileSize = stats.size;

            // 检查文件大小
            if (fileSize > this.maxFileSize) {
                return {
                    success: false,
                    error: `文件大小超过限制 ${Math.round(this.maxFileSize / 1024 / 1024)}MB`,
                };
            }

            // 生成唯一的文件名
            const filename = this.generateFileName(filePath);
            const storagePrefix = prefix || this.qiniuConfig.defaultPrefix || 'files';
            const key = `${storagePrefix}/${filename}`;

            // 生成上传凭证
            const putPolicy = new (qiniu.rs as any).PutPolicy({
                scope: this.bucket,
                expires: 3600,
            });
            const uploadToken = putPolicy.uploadToken(this.mac);

            // 创建上传对象
            const formUploader = new qiniu.form_up.FormUploader(this.config);
            const putExtra = new qiniu.form_up.PutExtra();

            // 执行上传
            return new Promise((resolve) => {
                logger.info(`[TfPluginsCore] 开始上传文件: key=${key}, filePath=${filePath}, fileSize=${fileSize}B`);
                logger.debug(`[TfPluginsCore] 存储桶: ${this.bucket}, 域名: ${this.domain}`);

                formUploader.putFile(
                    uploadToken,
                    key,
                    filePath,
                    putExtra,
                    (err: any, _body: any, info: any) => {
                        if (err) {
                            logger.error(`[TfPluginsCore] 七牛云上传失败: ${err.message}, 错误代码: ${err.code}, 请求ID: ${err.reqId}`);
                            logger.error(`[TfPluginsCore] 错误堆栈: ${err.stack}`);
                            resolve({
                                success: false,
                                error: `上传失败: ${err.message}`,
                            });
                        } else if (info && info.statusCode === 200) {
                            const url = this.getFileUrl(key);
                            logger.info(
                                `[TfPluginsCore] 文件上传成功: key=${key}, size=${fileSize}, url=${url}`,
                            );
                            resolve({
                                success: true,
                                url,
                                key,
                                size: fileSize,
                            });
                        } else {
                            logger.error(`[TfPluginsCore] 七牛云返回错误: statusCode=${info?.statusCode}, 响应: ${JSON.stringify(info)}`);
                            resolve({
                                success: false,
                                error: `上传失败: HTTP ${info?.statusCode || 'Unknown'}, 响应: ${JSON.stringify(info)}`,
                            });
                        }
                    },
                );
            });
        } catch (error: any) {
            logger.error(`[TfPluginsCore] 上传异常: ${error.message}`);
            return {
                success: false,
                error: `上传异常: ${error.message}`,
            };
        }
    }

    /**
     * 上传Buffer到七牛云
     * @param buffer 文件内容 Buffer
     * @param filename 文件名
     * @param prefix 存储路径前缀，默认使用配置中的 defaultPrefix
     */
    async uploadBuffer(
        buffer: Buffer,
        filename: string,
        prefix?: string,
    ): Promise<UploadResult> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: '七牛云服务未初始化',
            };
        }

        try {
            // 检查大小
            if (buffer.length > this.maxFileSize) {
                return {
                    success: false,
                    error: `文件大小超过限制 ${Math.round(this.maxFileSize / 1024 / 1024)}MB`,
                };
            }

            const storagePrefix = prefix || this.qiniuConfig.defaultPrefix || 'files';
            const key = `${storagePrefix}/${filename}`;

            // 生成上传凭证
            const putPolicy = new (qiniu.rs as any).PutPolicy({
                scope: this.bucket,
                expires: 3600,
            });
            const uploadToken = putPolicy.uploadToken(this.mac);

            // 创建上传对象
            const formUploader = new qiniu.form_up.FormUploader(this.config);
            const putExtra = new qiniu.form_up.PutExtra();

            // 执行上传
            return new Promise((resolve) => {
                formUploader.put(
                    uploadToken,
                    key,
                    buffer,
                    putExtra,
                    (err: any, _body: any, info: any) => {
                        if (err) {
                            logger.error(`[TfPluginsCore] 上传失败: ${err.message}`);
                            resolve({
                                success: false,
                                error: `上传失败: ${err.message}`,
                            });
                        } else if (info && info.statusCode === 200) {
                            const url = this.getFileUrl(key);
                            logger.info(`[TfPluginsCore] 文件上传成功: key=${key}, size=${buffer.length}`);
                            resolve({
                                success: true,
                                url,
                                key,
                                size: buffer.length,
                            });
                        } else {
                            logger.error(`[TfPluginsCore] 上传失败: HTTP ${info?.statusCode}`);
                            resolve({
                                success: false,
                                error: `上传失败: HTTP ${info?.statusCode}`,
                            });
                        }
                    },
                );
            });
        } catch (error: any) {
            logger.error(`[TfPluginsCore] 上传异常: ${error.message}`);
            return {
                success: false,
                error: `上传异常: ${error.message}`,
            };
        }
    }

    /**
     * 删除文件
     * @param key 文件存储 key
     */
    async deleteFile(key: string): Promise<DeleteResult> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: '七牛云服务未初始化',
            };
        }

        try {
            return new Promise((resolve) => {
                this.bucketManager.delete(this.bucket, key, (err: any, _respBody: any, respInfo: any) => {
                    if (err) {
                        logger.warn(`[TfPluginsCore] 删除失败: ${err.message}`);
                        resolve({
                            success: false,
                            error: `删除失败: ${err.message}`,
                        });
                    } else if (respInfo && respInfo.statusCode === 200) {
                        logger.info(`[TfPluginsCore] 文件删除成功: key=${key}`);
                        resolve({
                            success: true,
                        });
                    } else {
                        resolve({
                            success: false,
                            error: `删除失败: HTTP ${respInfo?.statusCode || 'Unknown'}`,
                        });
                    }
                });
            });
        } catch (error: any) {
            logger.error(`[TfPluginsCore] 删除异常: ${error.message}`);
            return {
                success: false,
                error: `删除异常: ${error.message}`,
            };
        }
    }

    /**
     * 批量删除文件
     * @param keys 文件存储 key 数组
     */
    async deleteMultiple(keys: string[]): Promise<DeleteResult> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: '七牛云服务未初始化',
            };
        }

        if (keys.length === 0) {
            return { success: true };
        }

        try {
            const deleteOps = keys.map((key) => qiniu.rs.deleteOp(this.bucket, key));

            return new Promise((resolve) => {
                this.bucketManager.batch(deleteOps, (err: any, _respBody: any, respInfo: any) => {
                    if (err) {
                        logger.error(`[TfPluginsCore] 批量删除失败: ${err.message}`);
                        resolve({
                            success: false,
                            error: `批量删除失败: ${err.message}`,
                        });
                    } else if (respInfo && respInfo.statusCode === 200) {
                        logger.info(`[TfPluginsCore] 批量删除成功: 删除${keys.length}个文件`);
                        resolve({
                            success: true,
                        });
                    } else {
                        resolve({
                            success: false,
                            error: `批量删除失败: HTTP ${respInfo?.statusCode || 'Unknown'}`,
                        });
                    }
                });
            });
        } catch (error: any) {
            logger.error(`[TfPluginsCore] 批量删除异常: ${error.message}`);
            return {
                success: false,
                error: `批量删除异常: ${error.message}`,
            };
        }
    }

    /**
     * 获取文件的访问URL
     * @param key 文件存储 key
     * @param _expirySeconds 过期时间（秒），当前实现为公开访问，此参数暂未使用
     */
    getFileUrl(key: string, _expirySeconds = 7 * 24 * 3600): string {
        return `${this.domain}/${key}`;
    }

    /**
     * 获取文件的私有访问URL (需要签名)
     * @param key 文件存储 key
     * @param expirySeconds 过期时间（秒），默认 3600 秒（1小时）
     */
    getPrivateFileUrl(key: string, expirySeconds = 3600): string {
        const publicUrl = `${this.domain}/${key}`;
        // 使用七牛云官方 API 生成私有下载URL
        const deadline = Math.floor(Date.now() / 1000) + expirySeconds;
        return (qiniu.util as any).getPrivateDownloadUrl(this.mac, publicUrl, deadline);
    }

    /**
     * 生成唯一的文件名
     * @param filePath 原始文件路径
     */
    private generateFileName(filePath: string): string {
        const ext = path.extname(filePath);
        const timestamp = Date.now();
        const uuid = uuidv4();
        const random = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${uuid.substring(0, 8)}-${random}${ext}`;
    }

    /**
     * 生成标准化的存储路径
     * @param uid 用户ID
     * @param resourceId 资源ID
     * @param filetype 文件类型，默认为 'image'
     * @param prefix 路径前缀，默认使用配置中的 defaultPrefix
     */
    generateKey(
        uid: number,
        resourceId: string,
        filetype: string = 'image',
        prefix?: string,
    ): string {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        const ext = filetype === 'pdf' ? '.pdf' : '.jpg';
        const filename = `${resourceId}${ext}`;
        const storagePrefix = prefix || this.qiniuConfig.defaultPrefix || 'files';

        return `${storagePrefix}/${year}/${month}/user${uid}/${filename}`;
    }
}

export default QiniuStorageService;
