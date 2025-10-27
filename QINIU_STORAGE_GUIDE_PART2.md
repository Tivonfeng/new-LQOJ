# 七牛云存储集成指南 - 第二部分：数据模型与证书服务

## 📋 目录
1. [数据模型扩展](#数据模型扩展)
2. [证书服务集成](#证书服务集成)
3. [错误处理](#错误处理)

---

## 数据模型扩展

### 1. 更新证书数据模型

在 `src/services/index.ts` 中更新 `Certificate` 接口：

```typescript
export interface Certificate {
  _id: ObjectId;
  domainId: number;
  uid: number;
  certificateCode: string;       // 证书编码
  certificateName: string;       // 证书名称
  certifyingBody: string;        // 颁证机构
  category: string;              // 分类
  level?: string;                // 等级
  score?: number;                // 分数
  issueDate: Date;               // 颁发日期
  expiryDate?: Date;             // 过期日期

  // 七牛云存储字段
  certificateImageUrl?: string;  // 证书图片URL (七牛云)
  certificateImageKey?: string;  // 证书图片Key (七牛云存储key)
  certificateImageSize?: number; // 证书图片大小 (字节)
  certificateImageUploadedAt?: Date; // 图片上传时间

  status: 'active' | 'expired' | 'revoked';
  recordedBy: number;
  recordedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 证书服务集成

### src/services/CertificateService.ts

```typescript
import { Context, db, logger } from 'hydrooj';
import { ObjectId } from 'mongodb';
import * as fs from 'fs';
import QiniuStorageService from './QiniuStorageService';

interface Certificate {
  _id?: ObjectId;
  domainId: number;
  uid: number;
  certificateCode: string;
  certificateName: string;
  certifyingBody: string;
  category: string;
  level?: string;
  score?: number;
  issueDate: Date;
  expiryDate?: Date;
  certificateImageUrl?: string;
  certificateImageKey?: string;
  certificateImageSize?: number;
  certificateImageUploadedAt?: Date;
  status: 'active' | 'expired' | 'revoked';
  recordedBy: number;
  recordedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CertificateService {
  private qiniuService: QiniuStorageService | null;
  private ctx: Context;

  constructor(ctx: Context, qiniuConfig?: any) {
    this.ctx = ctx;
    if (qiniuConfig && qiniuConfig.enabled) {
      this.qiniuService = new QiniuStorageService({
        accessKey: qiniuConfig.accessKey,
        secretKey: qiniuConfig.secretKey,
        bucket: qiniuConfig.bucket,
        domain: qiniuConfig.domain,
        zone: qiniuConfig.zone || 'Zone_CN_East',
      });
    }
  }

  /**
   * 创建证书 (支持图片上传)
   * @param uid 用户ID
   * @param data 证书数据
   * @param imageFile 证书图片文件路径 (可选)
   * @returns 创建的证书
   */
  async createCertificate(
    uid: number,
    data: Partial<Certificate>,
    imageFile?: string
  ): Promise<Certificate> {
    const collection = this.ctx.db.collection('exam.certificates');

    const cert: Certificate = {
      domainId: this.ctx.domain._id,
      uid,
      certificateCode: data.certificateCode || this.generateCertificateCode(),
      certificateName: data.certificateName!,
      certifyingBody: data.certifyingBody!,
      category: data.category!,
      level: data.level,
      score: data.score,
      issueDate: new Date(data.issueDate!),
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      status: 'active',
      recordedBy: this.ctx.user._id,
      recordedAt: new Date(),
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 如果有图片文件，上传到七牛云
    if (imageFile && this.qiniuService) {
      try {
        const uploadResult = await this.uploadCertificateImage(uid, imageFile);
        if (uploadResult.success) {
          cert.certificateImageUrl = uploadResult.url;
          cert.certificateImageKey = uploadResult.key;
          cert.certificateImageSize = uploadResult.size;
          cert.certificateImageUploadedAt = new Date();
        } else {
          logger.warn(`[ExamHall] 证书图片上传失败: ${uploadResult.error}`);
        }
      } catch (err) {
        logger.error(`[ExamHall] 上传证书图片异常: ${err.message}`);
      }
    }

    const result = await collection.insertOne(cert);
    cert._id = result.insertedId;

    // 更新用户统计
    await this.updateUserStats(uid);

    return cert;
  }

  /**
   * 上传证书图片到七牛云
   * @param uid 用户ID
   * @param filePath 文件路径
   * @returns 上传结果
   */
  async uploadCertificateImage(
    uid: number,
    filePath: string
  ): Promise<{
    success: boolean;
    url?: string;
    key?: string;
    size?: number;
    error?: string;
  }> {
    if (!this.qiniuService) {
      return {
        success: false,
        error: '七牛云存储未启用',
      };
    }

    try {
      // 检查文件大小 (限制10MB)
      const stats = fs.statSync(filePath);
      if (stats.size > 10 * 1024 * 1024) {
        return {
          success: false,
          error: '文件大小超过10MB限制',
        };
      }

      // 生成存储key
      const certificateId = new ObjectId().toString();
      const key = this.qiniuService.generateCertificateKey(uid, certificateId, 'image');

      // 上传到七牛云
      const uploadResult = await this.qiniuService.uploadFile(filePath, 'certificates');

      if (uploadResult.success) {
        return {
          success: true,
          url: uploadResult.url,
          key: uploadResult.key,
          size: stats.size,
        };
      } else {
        return {
          success: false,
          error: uploadResult.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `上传异常: ${error.message}`,
      };
    }
  }

  /**
   * 更新证书 (包含图片更新)
   * @param id 证书ID
   * @param data 更新数据
   * @param imageFile 新图片文件路径 (可选)
   * @returns 更新后的证书
   */
  async updateCertificate(
    id: ObjectId,
    data: Partial<Certificate>,
    imageFile?: string
  ): Promise<Certificate> {
    const collection = this.ctx.db.collection('exam.certificates');

    const updateData: Partial<Certificate> = {
      ...data,
      updatedAt: new Date(),
    };

    // 如果有新图片,上传并删除旧图片
    if (imageFile && this.qiniuService) {
      const oldCert = await collection.findOne({ _id: id });

      // 删除旧图片
      if (oldCert?.certificateImageKey) {
        await this.qiniuService.deleteFile(oldCert.certificateImageKey);
      }

      // 上传新图片
      const uploadResult = await this.uploadCertificateImage(oldCert?.uid, imageFile);
      if (uploadResult.success) {
        updateData.certificateImageUrl = uploadResult.url;
        updateData.certificateImageKey = uploadResult.key;
        updateData.certificateImageSize = uploadResult.size;
        updateData.certificateImageUploadedAt = new Date();
      }
    }

    await collection.updateOne(
      { _id: id },
      { $set: updateData }
    );

    const cert = await collection.findOne({ _id: id }) as Certificate;
    return cert;
  }

  /**
   * 删除证书 (包含图片删除)
   * @param id 证书ID
   * @returns 是否成功
   */
  async deleteCertificate(id: ObjectId): Promise<boolean> {
    const collection = this.ctx.db.collection('exam.certificates');

    const cert = await collection.findOne({ _id: id }) as Certificate;
    if (!cert) {
      return false;
    }

    // 删除七牛云中的图片
    if (cert.certificateImageKey && this.qiniuService) {
      try {
        await this.qiniuService.deleteFile(cert.certificateImageKey);
      } catch (err) {
        logger.warn(`[ExamHall] 删除七牛云图片失败: ${err.message}`);
      }
    }

    // 删除数据库记录
    const result = await collection.deleteOne({ _id: id });

    // 更新用户统计
    if (result.deletedCount > 0) {
      await this.updateUserStats(cert.uid);
    }

    return result.deletedCount > 0;
  }

  /**
   * 批量删除证书
   * @param ids 证书ID数组
   * @returns 删除数量
   */
  async deleteCertificates(ids: ObjectId[]): Promise<number> {
    const collection = this.ctx.db.collection('exam.certificates');

    // 获取要删除的所有证书
    const certs = await collection
      .find({ _id: { $in: ids } })
      .toArray() as Certificate[];

    // 删除七牛云图片
    if (this.qiniuService) {
      const imageKeys = certs
        .filter((c) => c.certificateImageKey)
        .map((c) => c.certificateImageKey!);

      if (imageKeys.length > 0) {
        try {
          await this.qiniuService.deleteMultiple(imageKeys);
        } catch (err) {
          logger.warn(`[ExamHall] 批量删除七牛云图片失败: ${err.message}`);
        }
      }
    }

    // 删除数据库记录
    const result = await collection.deleteMany({ _id: { $in: ids } });

    // 更新用户统计
    const uniqueUIDs = new Set(certs.map((c) => c.uid));
    for (const uid of uniqueUIDs) {
      await this.updateUserStats(uid);
    }

    return result.deletedCount;
  }

  /**
   * 获取用户证书列表
   * @param uid 用户ID
   * @param filters 筛选条件
   * @returns 证书列表
   */
  async getUserCertificates(
    uid: number,
    filters?: {
      category?: string;
      status?: string;
      skip?: number;
      limit?: number;
    }
  ): Promise<Certificate[]> {
    const collection = this.ctx.db.collection('exam.certificates');

    const query: any = {
      domainId: this.ctx.domain._id,
      uid,
    };

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    return collection
      .find(query)
      .sort({ issueDate: -1 })
      .skip(filters?.skip || 0)
      .limit(filters?.limit || 100)
      .toArray() as Promise<Certificate[]>;
  }

  /**
   * 获取证书总数
   * @param uid 用户ID
   * @returns 证书总数
   */
  async getUserCertificateCount(uid: number): Promise<number> {
    const collection = this.ctx.db.collection('exam.certificates');

    return collection.countDocuments({
      domainId: this.ctx.domain._id,
      uid,
      status: 'active',
    });
  }

  /**
   * 更新用户证书统计
   * @param uid 用户ID
   */
  async updateUserStats(uid: number): Promise<void> {
    const collection = this.ctx.db.collection('exam.certificates');
    const statsCollection = this.ctx.db.collection('exam.user_stats');

    // 统计证书信息
    const certs = await collection
      .find({
        domainId: this.ctx.domain._id,
        uid,
        status: 'active',
      })
      .toArray() as Certificate[];

    const stats = {
      uid,
      totalCertificates: certs.length,
      certificates: certs.map((c) => ({
        certificateId: c._id,
        name: c.certificateName,
        category: c.category,
        issueDate: c.issueDate,
      })),
      categoryStats: {} as Record<string, number>,
      lastCertificateDate: certs.length > 0 ? certs[0].issueDate : undefined,
      updatedAt: new Date(),
    };

    // 统计各分类证书数
    for (const cert of certs) {
      stats.categoryStats[cert.category] = (stats.categoryStats[cert.category] || 0) + 1;
    }

    // 更新或插入统计
    await statsCollection.updateOne(
      { uid },
      { $set: stats },
      { upsert: true }
    );
  }

  /**
   * 生成证书编码
   * @returns 证书编码
   */
  private generateCertificateCode(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();

    return `CERT-${year}${month}${day}-${random}`;
  }

  /**
   * 获取统计信息
   * @param uid 用户ID
   * @returns 统计信息
   */
  async getUserStats(uid: number): Promise<any> {
    const statsCollection = this.ctx.db.collection('exam.user_stats');
    return statsCollection.findOne({ uid });
  }
}

export default CertificateService;
```

---

## 错误处理

### src/utils/StorageErrorHandler.ts

```typescript
export interface StorageError {
  code: string;
  message: string;
  details?: string;
}

export class StorageErrorHandler {
  static FILE_NOT_FOUND = 'FILE_NOT_FOUND';
  static FILE_TOO_LARGE = 'FILE_TOO_LARGE';
  static UPLOAD_FAILED = 'UPLOAD_FAILED';
  static QINIU_UNAVAILABLE = 'QINIU_UNAVAILABLE';
  static DATABASE_ERROR = 'DATABASE_ERROR';

  static formatError(code: string, details?: string): StorageError {
    const messages: Record<string, string> = {
      [this.FILE_NOT_FOUND]: '文件不存在',
      [this.FILE_TOO_LARGE]: '文件大小超过限制 (最大10MB)',
      [this.UPLOAD_FAILED]: '文件上传失败',
      [this.QINIU_UNAVAILABLE]: '云存储服务暂不可用',
      [this.DATABASE_ERROR]: '数据库操作失败',
    };

    return {
      code,
      message: messages[code] || '未知错误',
      details,
    };
  }

  static handleQiniuError(error: any): StorageError {
    if (error.statusCode === 400) {
      return this.formatError(
        this.UPLOAD_FAILED,
        'Bad Request: 请检查文件格式和内容'
      );
    }

    if (error.statusCode === 401) {
      return this.formatError(
        this.QINIU_UNAVAILABLE,
        '七牛云认证失败: Access Key 或 Secret Key 错误'
      );
    }

    if (error.statusCode === 403) {
      return this.formatError(
        this.QINIU_UNAVAILABLE,
        '无权限访问指定的存储桶'
      );
    }

    if (error.statusCode === 404) {
      return this.formatError(
        this.FILE_NOT_FOUND,
        '文件或存储桶不存在'
      );
    }

    if (error.statusCode === 413) {
      return this.formatError(
        this.FILE_TOO_LARGE,
        '文件过大'
      );
    }

    return this.formatError(
      this.UPLOAD_FAILED,
      `HTTP ${error.statusCode}: ${error.message}`
    );
  }
}
```

这是第二部分，包含：
- ✅ 证书数据模型扩展
- ✅ 证书服务与七牛云集成
- ✅ 错误处理工具类

接下来输出第三部分 - 处理器和API接口。需要继续吗？
