# 七牛云存储集成指南 - 第一部分：配置与工具类

## 📋 目录
1. [配置文件](#配置文件)
2. [环境变量](#环境变量)
3. [七牛云工具类](#七牛云工具类)

---

## 配置文件

### 1. package.json 依赖

在 `Tf_plugins/exam-hall/package.json` 中添加：

```json
{
  "dependencies": {
    "qiniu": "^7.10.0",
    "uuid": "^9.0.0"
  }
}
```

### 2. 配置Schema (index.ts)

```typescript
import { Context, PRIV, Schema } from 'hydrooj';

const Config = Schema.object({
  enabled: Schema.boolean().default(true).description('是否启用赛考大厅'),

  // 七牛云配置
  qiniu: Schema.object({
    enabled: Schema.boolean().default(false).description('是否启用七牛云存储'),
    accessKey: Schema.string().description('七牛云 Access Key'),
    secretKey: Schema.string().description('七牛云 Secret Key'),
    bucket: Schema.string().description('存储桶名称'),
    domain: Schema.string().description('七牛云域名 (如: https://cdn.example.com)'),
    zone: Schema.string()
      .default('Zone_CN_East')
      .description('存储区域 (Zone_CN_East/Zone_CN_South等)'),
  }).description('七牛云存储配置'),
}).description('赛考大厅配置');

export { Config };
```

---

## 环境变量

### .env 配置文件模板

在项目根目录创建 `.env.example`:

```bash
# 七牛云配置
QINIU_ACCESS_KEY=your_access_key_here
QINIU_SECRET_KEY=your_secret_key_here
QINIU_BUCKET=exam-certificates
QINIU_DOMAIN=https://cdn.yourdomain.com
QINIU_ZONE=Zone_CN_East

# 证书配置
CERTIFICATE_MAX_SIZE=10485760  # 10MB
CERTIFICATE_EXPIRY_DAYS=3600   # 3600天 (10年)
```

### .env.local (本地开发)

```bash
QINIU_ACCESS_KEY=your_test_access_key
QINIU_SECRET_KEY=your_test_secret_key
QINIU_BUCKET=test-exam-certificates
QINIU_DOMAIN=http://localhost:9000
```

---

## 七牛云工具类

### src/services/QiniuStorageService.ts

```typescript
import * as qiniu from 'qiniu';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

interface QiniuConfig {
  accessKey: string;
  secretKey: string;
  bucket: string;
  domain: string;
  zone: string;
}

interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

interface DeleteResult {
  success: boolean;
  error?: string;
}

export class QiniuStorageService {
  private mac: qiniu.auth.digest.Mac;
  private config: qiniu.conf.ConfigOptions;
  private bucket: string;
  private domain: string;
  private bucketManager: qiniu.rs.BucketManager;

  constructor(qiniuConfig: QiniuConfig) {
    this.bucket = qiniuConfig.bucket;
    this.domain = qiniuConfig.domain;

    // 初始化鉴权对象
    this.mac = new qiniu.auth.digest.Mac(
      qiniuConfig.accessKey,
      qiniuConfig.secretKey
    );

    // 配置七牛云区域
    this.config = new qiniu.conf.ConfigOptions();
    this.setZone(qiniuConfig.zone);

    // 初始化 BucketManager
    this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);
  }

  /**
   * 设置存储区域
   */
  private setZone(zone: string) {
    switch (zone) {
      case 'Zone_CN_East':
        this.config.zone = qiniu.zone.Zone_CN_East;
        break;
      case 'Zone_CN_South':
        this.config.zone = qiniu.zone.Zone_CN_South;
        break;
      case 'Zone_CN_North':
        this.config.zone = qiniu.zone.Zone_CN_North;
        break;
      case 'Zone_CN_Northeast':
        this.config.zone = qiniu.zone.Zone_CN_Northeast;
        break;
      case 'Zone_HK':
        this.config.zone = qiniu.zone.Zone_HK;
        break;
      case 'Zone_US_Virginia':
        this.config.zone = qiniu.zone.Zone_US_Virginia;
        break;
      case 'Zone_US_California':
        this.config.zone = qiniu.zone.Zone_US_California;
        break;
      default:
        this.config.zone = qiniu.zone.Zone_CN_East;
    }
  }

  /**
   * 上传文件到七牛云（通过文件路径）
   * @param filePath 本地文件路径
   * @param prefix 存储路径前缀 (如: certificates/2024/)
   * @returns 上传结果
   */
  async uploadFile(filePath: string, prefix = 'certificates'): Promise<UploadResult> {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `文件不存在: ${filePath}`,
        };
      }

      // 生成唯一的文件名
      const filename = this.generateFileName(filePath);
      const key = `${prefix}/${filename}`;

      // 生成上传凭证
      const options = {
        scope: this.bucket,
        expires: 3600,
      };
      const uploadToken = this.mac.getUploadToken(options);

      // 创建上传对象
      const formUploader = new qiniu.form_up.FormUploader(this.config);
      const putExtra = new qiniu.form_up.PutExtra();

      // 执行上传
      return new Promise((resolve) => {
        formUploader.putFile(uploadToken, key, filePath, putExtra, (err, body, info) => {
          if (err) {
            resolve({
              success: false,
              error: `上传失败: ${err.message}`,
            });
          } else if (info.statusCode === 200) {
            // 生成访问URL
            const url = this.getFileUrl(key);
            resolve({
              success: true,
              url,
              key,
            });
          } else {
            resolve({
              success: false,
              error: `上传失败: HTTP ${info.statusCode}`,
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: `上传异常: ${error.message}`,
      };
    }
  }

  /**
   * 上传文件到七牛云（通过Buffer）
   * @param buffer 文件内容
   * @param filename 文件名
   * @param prefix 存储路径前缀
   * @returns 上传结果
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    prefix = 'certificates'
  ): Promise<UploadResult> {
    try {
      const key = `${prefix}/${filename}`;

      // 生成上传凭证
      const options = {
        scope: this.bucket,
        expires: 3600,
      };
      const uploadToken = this.mac.getUploadToken(options);

      // 创建上传对象
      const formUploader = new qiniu.form_up.FormUploader(this.config);
      const putExtra = new qiniu.form_up.PutExtra();

      // 执行上传
      return new Promise((resolve) => {
        formUploader.put(uploadToken, key, buffer, putExtra, (err, body, info) => {
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
            });
          } else {
            resolve({
              success: false,
              error: `上传失败: HTTP ${info.statusCode}`,
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: `上传异常: ${error.message}`,
      };
    }
  }

  /**
   * 删除文件
   * @param key 文件key
   * @returns 删除结果
   */
  async deleteFile(key: string): Promise<DeleteResult> {
    try {
      return new Promise((resolve) => {
        this.bucketManager.delete(this.bucket, key, (err, respBody, respInfo) => {
          if (err) {
            resolve({
              success: false,
              error: `删除失败: ${err.message}`,
            });
          } else if (respInfo.statusCode === 200) {
            resolve({
              success: true,
            });
          } else {
            resolve({
              success: false,
              error: `删除失败: HTTP ${respInfo.statusCode}`,
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: `删除异常: ${error.message}`,
      };
    }
  }

  /**
   * 批量删除文件
   * @param keys 文件key数组
   * @returns 删除结果
   */
  async deleteMultiple(keys: string[]): Promise<DeleteResult> {
    try {
      const deleteOps = keys.map((key) =>
        qiniu.rs.deleteOp(this.bucket, key)
      );

      return new Promise((resolve) => {
        this.bucketManager.batch(deleteOps, (err, respBody, respInfo) => {
          if (err) {
            resolve({
              success: false,
              error: `批量删除失败: ${err.message}`,
            });
          } else if (respInfo.statusCode === 200) {
            resolve({
              success: true,
            });
          } else {
            resolve({
              success: false,
              error: `批量删除失败: HTTP ${respInfo.statusCode}`,
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: `批量删除异常: ${error.message}`,
      };
    }
  }

  /**
   * 获取文件的访问URL
   * @param key 文件key
   * @param expirySeconds 过期时间(秒) 默认7天
   * @returns 访问URL
   */
  getFileUrl(key: string, expirySeconds = 7 * 24 * 3600): string {
    return `${this.domain}/${key}`;
  }

  /**
   * 获取文件的私有访问URL (需要签名)
   * @param key 文件key
   * @param expirySeconds 过期时间(秒)
   * @returns 签名后的URL
   */
  getPrivateFileUrl(key: string, expirySeconds = 3600): string {
    const publicUrl = `${this.domain}/${key}`;
    return this.mac.privateDownloadUrl(publicUrl, expirySeconds);
  }

  /**
   * 生成唯一的文件名
   * @param filePath 原始文件路径
   * @returns 唯一文件名
   */
  private generateFileName(filePath: string): string {
    const ext = path.extname(filePath);
    const timestamp = Date.now();
    const uuid = uuidv4();
    return `${timestamp}-${uuid}${ext}`;
  }

  /**
   * 生成证书文件的标准存储路径
   * @param uid 用户ID
   * @param certificateId 证书ID
   * @param filetype 文件类型 (image/pdf)
   * @returns 存储key
   */
  generateCertificateKey(uid: number, certificateId: string, filetype = 'image'): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const ext = filetype === 'pdf' ? '.pdf' : '.jpg';
    const filename = `${certificateId}${ext}`;

    return `certificates/${year}/${month}/user${uid}/${filename}`;
  }
}

export default QiniuStorageService;
```

这是第一部分，包含：
- ✅ 配置文件和环境变量
- ✅ 七牛云服务工具类（上传、删除、URL生成等）

接下来我会输出第二部分 - 数据模型集成和服务层。需要继续吗？
