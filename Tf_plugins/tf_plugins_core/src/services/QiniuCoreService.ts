/* eslint-disable ts/naming-convention */
import * as fs from 'fs';
import * as path from 'path';
import * as qiniu from 'qiniu';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'hydrooj';

const logger = new Logger('tf_plugins_core-qiniu');

export interface UploadResult {
    success: boolean;
    url?: string;
    key?: string;
    size?: number;
    error?: string;
}

export interface DeleteResult {
    success: boolean;
    error?: string;
}

/**
 * 七牛云存储核心服务类
 * 处理文件的上传、删除和URL生成
 * 作为独立的云存储服务，提供给各个业务插件使用
 */
export class QiniuCoreService {
    private mac: qiniu.auth.digest.Mac;
    private config: any;
    private bucket: string;
    private domain: string;
    private bucketManager: qiniu.rs.BucketManager;
    private isInitialized: boolean = false;

    // 七牛云配置 - 硬编码凭证
    private readonly QINIU_ACCESS_KEY = 'KLk2UkLXhUIzuoollr8iJmAn_Hc6AeELiAEDfZCZ';
    private readonly QINIU_SECRET_KEY = 'SLeJSaHzxbfkgfwdemojwo9AH8mOxCFonDgZCxP0';
    private readonly QINIU_BUCKET = 'lq-exam-certificates';
    private readonly QINIU_DOMAIN = 'lq-exam-cert.lqcode.fun';
    private readonly QINIU_ZONE = 'Zone_z0';

    constructor() {
        try {
            this.bucket = this.QINIU_BUCKET;
            this.domain = this.normalizeDomain(this.QINIU_DOMAIN);

            // 初始化鉴权对象
            this.mac = new qiniu.auth.digest.Mac(
                this.QINIU_ACCESS_KEY,
                this.QINIU_SECRET_KEY,
            );

            // 配置七牛云区域 - 正确使用 Config 而不是 ConfigOptions
            this.config = new qiniu.conf.Config();
            this.setZone(this.QINIU_ZONE);

            // 初始化 BucketManager
            this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);

            this.isInitialized = true;
            logger.info('[QiniuCore] 七牛云存储服务初始化成功');
        } catch (error: any) {
            logger.error(`[QiniuCore] 七牛云初始化失败: ${error.message}`);
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
     * 官方支持的区域常量：
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
     */
    async uploadFile(filePath: string, prefix = 'certificates'): Promise<UploadResult> {
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

            // 检查文件大小 (限制10MB)
            if (fileSize > 10 * 1024 * 1024) {
                return {
                    success: false,
                    error: '文件大小超过10MB限制',
                };
            }

            // 生成唯一的文件名
            const filename = this.generateFileName(filePath);
            const key = `${prefix}/${filename}`;

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
                logger.info(`[QiniuCore] 开始上传文件: key=${key}, filePath=${filePath}, fileSize=${fileSize}B`);
                logger.debug(`[QiniuCore] 上传token: ${uploadToken.substring(0, 20)}...`);
                logger.debug(`[QiniuCore] 存储桶: ${this.bucket}, 域名: ${this.domain}`);

                formUploader.putFile(
                    uploadToken,
                    key,
                    filePath,
                    putExtra,
                    (err: any, _body: any, info: any) => {
                        if (err) {
                            logger.error(`[QiniuCore] 七牛云上传失败: ${err.message}, 错误代码: ${err.code}, 请求ID: ${err.reqId}`);
                            logger.error(`[QiniuCore] 错误堆栈: ${err.stack}`);
                            resolve({
                                success: false,
                                error: `上传失败: ${err.message}`,
                            });
                        } else if (info && info.statusCode === 200) {
                            const url = this.getFileUrl(key);
                            logger.info(
                                `[QiniuCore] 文件上传成功: key=${key}, size=${fileSize}, url=${url}`,
                            );
                            resolve({
                                success: true,
                                url,
                                key,
                                size: fileSize,
                            });
                        } else {
                            logger.error(`[QiniuCore] 七牛云返回错误: statusCode=${info?.statusCode}, 响应: ${JSON.stringify(info)}`);
                            resolve({
                                success: false,
                                error: `上传失败: HTTP ${info?.statusCode || 'Unknown'}, 响应: ${JSON.stringify(info)}`,
                            });
                        }
                    },
                );
            });
        } catch (error: any) {
            logger.error(`[QiniuCore] 上传异常: ${error.message}`);
            return {
                success: false,
                error: `上传异常: ${error.message}`,
            };
        }
    }

    /**
     * 上传Buffer到七牛云
     */
    async uploadBuffer(
        buffer: Buffer,
        filename: string,
        prefix = 'certificates',
    ): Promise<UploadResult> {
        if (!this.isInitialized) {
            return {
                success: false,
                error: '七牛云服务未初始化',
            };
        }

        try {
            // 检查大小
            if (buffer.length > 10 * 1024 * 1024) {
                return {
                    success: false,
                    error: '文件大小超过10MB限制',
                };
            }

            const key = `${prefix}/${filename}`;

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
                            resolve({
                                success: false,
                                error: `上传失败: ${err.message}`,
                            });
                        } else if (info.statusCode === 200) {
                            const url = this.getFileUrl(key);
                            resolve({
                                success: true,
                                url,
                                key,
                                size: buffer.length,
                            });
                        } else {
                            resolve({
                                success: false,
                                error: `上传失败: HTTP ${info.statusCode}`,
                            });
                        }
                    },
                );
            });
        } catch (error: any) {
            return {
                success: false,
                error: `上传异常: ${error.message}`,
            };
        }
    }

    /**
     * 删除文件
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
                        logger.warn(`[QiniuCore] 删除失败: ${err.message}`);
                        resolve({
                            success: false,
                            error: `删除失败: ${err.message}`,
                        });
                    } else if (respInfo && respInfo.statusCode === 200) {
                        logger.info(`[QiniuCore] 文件删除成功: key=${key}`);
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
            return {
                success: false,
                error: `删除异常: ${error.message}`,
            };
        }
    }

    /**
     * 批量删除文件
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
                        resolve({
                            success: false,
                            error: `批量删除失败: ${err.message}`,
                        });
                    } else if (respInfo && respInfo.statusCode === 200) {
                        logger.info(`[QiniuCore] 批量删除成功: 删除${keys.length}个文件`);
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
            return {
                success: false,
                error: `批量删除异常: ${error.message}`,
            };
        }
    }

    /**
     * 获取文件的访问URL
     */
    getFileUrl(key: string, _expirySeconds = 7 * 24 * 3600): string {
        return `${this.domain}/${key}`;
    }

    /**
     * 获取文件的私有访问URL (需要签名)
     * 注：七牛云官方 SDK 的 privateDownloadUrl 需要在 rs 模块中
     */
    getPrivateFileUrl(key: string, _expirySeconds = 3600): string {
        const publicUrl = `${this.domain}/${key}`;
        // 使用七牛云官方 API 生成私有下载URL
        const deadline = Math.floor(Date.now() / 1000) + _expirySeconds;
        return (qiniu.util as any).getPrivateDownloadUrl(this.mac, publicUrl, deadline);
    }

    /**
     * 生成唯一的文件名
     */
    private generateFileName(filePath: string): string {
        const ext = path.extname(filePath);
        const timestamp = Date.now();
        const uuid = uuidv4();
        const random = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${uuid.substring(0, 8)}-${random}${ext}`;
    }

    /**
     * 生成证书文件的标准存储路径
     */
    generateCertificateKey(
        uid: number,
        certificateId: string,
        filetype = 'image',
    ): string {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        const ext = filetype === 'pdf' ? '.pdf' : '.jpg';
        const filename = `${certificateId}${ext}`;

        return `certificates/${year}/${month}/user${uid}/${filename}`;
    }
}

export default QiniuCoreService;
