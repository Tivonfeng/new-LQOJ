# 七牛云存储集成指南 - 第三部分：处理器与前端集成

## 📋 目录
1. [处理器实现](#处理器实现)
2. [前端上传组件](#前端上传组件)
3. [最佳实践](#最佳实践)

---

## 处理器实现

### src/handlers/CertificateUploadHandler.ts

```typescript
import { Context, Handler, PRIV, BadRequest, Forbidden } from 'hydrooj';
import * as formidable from 'formidable';
import * as path from 'path';
import CertificateService from '../services/CertificateService';
import { StorageErrorHandler } from '../utils/StorageErrorHandler';
import { logger } from 'hydrooj';

interface UploadResponse {
  success: boolean;
  certificateId?: string;
  url?: string;
  error?: string;
  message?: string;
}

export class CertificateUploadHandler extends Handler {
  /**
   * GET /exam/admin/upload-certificate
   * 获取上传页面表单
   */
  async get() {
    if (!(this.user.role === 'admin' || this.user.perm & PRIV.PRIV_MANAGE_EXAM)) {
      throw new Forbidden('无权限上传证书');
    }

    this.response.type = 'application/json';
    this.response.body = {
      message: '请使用 POST 方法上传证书',
      upload_endpoint: '/exam/admin/upload-certificate',
      max_file_size: '10MB',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    };
  }

  /**
   * POST /exam/admin/upload-certificate
   * 上传证书图片
   */
  async post() {
    if (!(this.user.role === 'admin' || this.user.perm & PRIV.PRIV_MANAGE_EXAM)) {
      throw new Forbidden('无权限上传证书');
    }

    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      uploadDir: '/tmp/exam-certificates',
      keepExtensions: true,
    });

    const result = await new Promise<UploadResponse>((resolve) => {
      form.parse(this.request, async (err, fields, files) => {
        try {
          if (err) {
            resolve({
              success: false,
              error: `表单解析失败: ${err.message}`,
            });
            return;
          }

          // 获取上传的文件
          const imageFile = files.image as any;
          if (!imageFile) {
            resolve({
              success: false,
              error: '未找到上传的文件',
            });
            return;
          }

          const filePath = imageFile.filepath || imageFile.path;
          const fileExt = path.extname(filePath).toLowerCase();

          // 验证文件格式
          const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf'];
          if (!allowedExts.includes(fileExt)) {
            resolve({
              success: false,
              error: `不支持的文件格式: ${fileExt}`,
            });
            return;
          }

          // 获取用户ID
          const uid = parseInt(fields.uid as string) || this.user._id;

          // 创建证书服务
          const certService = new CertificateService(this.ctx, this.ctx.config.qiniu);

          // 上传证书图片
          const uploadResult = await certService.uploadCertificateImage(uid, filePath);

          if (uploadResult.success) {
            resolve({
              success: true,
              certificateId: `cert_${Date.now()}`,
              url: uploadResult.url,
              message: '证书上传成功',
            });
          } else {
            const storageError = StorageErrorHandler.formatError(
              StorageErrorHandler.UPLOAD_FAILED,
              uploadResult.error
            );
            resolve({
              success: false,
              error: storageError.message,
            });
          }
        } catch (error: any) {
          logger.error(`[ExamHall] 证书上传异常: ${error.message}`);
          resolve({
            success: false,
            error: `上传异常: ${error.message}`,
          });
        }
      });
    });

    this.response.type = 'application/json';
    this.response.body = result;
  }
}

/**
 * POST /exam/admin/certificates
 * 创建证书 (包含图片)
 */
export class CertificateCreateHandler extends Handler {
  async post() {
    if (!(this.user.role === 'admin' || this.user.perm & PRIV.PRIV_MANAGE_EXAM)) {
      throw new Forbidden('无权限创建证书');
    }

    const {
      uid,
      certificateName,
      certifyingBody,
      category,
      level,
      score,
      issueDate,
      expiryDate,
      notes,
    } = this.request.body;

    // 验证必填字段
    if (!uid || !certificateName || !certifyingBody || !category || !issueDate) {
      throw new BadRequest('缺少必填字段');
    }

    try {
      const certService = new CertificateService(this.ctx, this.ctx.config.qiniu);

      // 创建证书
      const certificate = await certService.createCertificate(
        parseInt(uid),
        {
          certificateName,
          certifyingBody,
          category,
          level,
          score: score ? parseInt(score) : undefined,
          issueDate: new Date(issueDate),
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          notes,
        }
      );

      this.response.type = 'application/json';
      this.response.body = {
        success: true,
        certificate: {
          _id: certificate._id,
          certificateCode: certificate.certificateCode,
          certificateName: certificate.certificateName,
          issueDate: certificate.issueDate,
        },
        message: '证书创建成功',
      };
    } catch (error: any) {
      logger.error(`[ExamHall] 创建证书异常: ${error.message}`);
      this.response.type = 'application/json';
      this.response.status = 500;
      this.response.body = {
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * DELETE /exam/admin/certificates/:id
 * 删除证书 (包括七牛云图片)
 */
export class CertificateDeleteHandler extends Handler {
  async delete() {
    if (!(this.user.role === 'admin' || this.user.perm & PRIV.PRIV_MANAGE_EXAM)) {
      throw new Forbidden('无权限删除证书');
    }

    const { id } = this.params;

    try {
      const certService = new CertificateService(this.ctx, this.ctx.config.qiniu);
      const { ObjectId } = require('mongodb');

      const success = await certService.deleteCertificate(new ObjectId(id));

      this.response.type = 'application/json';
      this.response.body = {
        success,
        message: success ? '证书删除成功' : '证书不存在',
      };
    } catch (error: any) {
      logger.error(`[ExamHall] 删除证书异常: ${error.message}`);
      this.response.type = 'application/json';
      this.response.status = 500;
      this.response.body = {
        success: false,
        error: error.message,
      };
    }
  }
}
```

---

## 前端上传组件

### frontend/CertificateUploader.tsx

```typescript
import React, { useState, useRef } from 'react';
import './CertificateUploader.css';

interface CertificateUploaderProps {
  onUploadSuccess?: (url: string, filename: string) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // 字节
}

const CertificateUploader: React.FC<CertificateUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
  accept = 'image/*,.pdf',
  maxSize = 10 * 1024 * 1024, // 10MB
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // 检查文件大小
    if (file.size > maxSize) {
      const errorMsg = `文件大小超过${maxSize / 1024 / 1024}MB限制`;
      onUploadError?.(errorMsg);
      return;
    }

    // 生成预览
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setPreview('📄 PDF文件');
    }

    // 上传文件
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('image', file);

    try {
      // 创建XMLHttpRequest以监听上传进度
      const xhr = new XMLHttpRequest();

      // 监听上传进度
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      // 监听上传完成
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.url) {
              onUploadSuccess?.(response.url, file.name);
              setIsUploading(false);
              setUploadProgress(100);
              // 3秒后重置
              setTimeout(() => {
                setUploadProgress(0);
                setPreview(null);
              }, 3000);
            } else {
              throw new Error(response.error || '上传失败');
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : '上传失败';
            onUploadError?.(errorMsg);
            setIsUploading(false);
          }
        } else {
          onUploadError?.(`HTTP ${xhr.status}: 上传失败`);
          setIsUploading(false);
        }
      });

      // 监听上传错误
      xhr.addEventListener('error', () => {
        onUploadError?.('网络错误');
        setIsUploading(false);
      });

      // 发起请求
      xhr.open('POST', '/exam/admin/upload-certificate');
      xhr.send(formData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '上传异常';
      onUploadError?.(errorMsg);
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="certificate-uploader">
      <div
        className="upload-area"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileSelect(e.target.files[0]);
            }
          }}
          style={{ display: 'none' }}
        />

        {preview ? (
          <div className="preview">
            {typeof preview === 'string' && preview.startsWith('data:') ? (
              <img src={preview} alt="预览" />
            ) : (
              <div className="pdf-preview">{preview}</div>
            )}
          </div>
        ) : (
          <div className="upload-icon">📤</div>
        )}

        {isUploading ? (
          <div className="uploading">
            <p>上传中...</p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p>{Math.round(uploadProgress)}%</p>
          </div>
        ) : (
          <div className="upload-text">
            <p className="drag-text">拖拽文件到此或点击选择</p>
            <p className="size-text">支持 JPG/PNG/PDF，最大 10MB</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateUploader;
```

### frontend/CertificateUploader.css

```css
.certificate-uploader {
  width: 100%;
  margin: 20px 0;
}

.upload-area {
  border: 2px dashed #3b82f6;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8fafc;
}

.upload-area:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.upload-area.drag-over {
  border-color: #2563eb;
  background: #dbeafe;
  transform: scale(1.02);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.preview {
  margin-bottom: 16px;
}

.preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.pdf-preview {
  font-size: 64px;
  margin-bottom: 12px;
}

.uploading {
  margin-top: 16px;
}

.uploading p {
  margin: 8px 0;
  color: #666;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  margin: 12px 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  transition: width 0.3s ease;
}

.upload-text p {
  margin: 8px 0;
  color: #666;
}

.drag-text {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin-bottom: 8px;
}

.size-text {
  font-size: 14px;
  color: #999;
}

@media (max-width: 768px) {
  .upload-area {
    padding: 24px 16px;
  }

  .upload-icon {
    font-size: 36px;
  }
}
```

---

## 最佳实践

### 1. 上传前验证

```typescript
// 验证文件
const validateFile = (file: File): { valid: boolean; error?: string } => {
  // 检查文件大小
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: '文件大小超过10MB' };
  }

  // 检查文件类型
  const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedMimes.includes(file.type)) {
    return { valid: false, error: '不支持的文件类型' };
  }

  return { valid: true };
};
```

### 2. 错误重试机制

```typescript
// 上传失败重试
const uploadWithRetry = async (
  file: File,
  maxRetries = 3,
  retryDelay = 1000
): Promise<UploadResult> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadFile(file);
      if (result.success) {
        return result;
      }
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError || new Error('上传失败');
};
```

### 3. 并发上传限制

```typescript
// 限制并发上传数
class UploadQueue {
  private queue: Array<() => Promise<any>> = [];
  private activeUploads = 0;
  private maxConcurrent = 2;

  async add(task: () => Promise<any>) {
    return new Promise((resolve) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          resolve(null);
        } finally {
          this.activeUploads--;
          this.process();
        }
      });

      this.process();
    });
  }

  private process() {
    while (this.activeUploads < this.maxConcurrent && this.queue.length > 0) {
      this.activeUploads++;
      const task = this.queue.shift();
      task?.();
    }
  }
}
```

### 4. 七牛云配置最佳实践

```typescript
// 七牛云配置建议
const qiniuConfig = {
  // 使用专用域名，不使用默认CDN域名
  domain: 'https://cdn.yourdomain.com',

  // 定期轮换密钥
  // accessKey 和 secretKey 应该定期更新

  // 启用 HTTPS
  // 所有上传和下载都应该使用 HTTPS

  // 配置防盗链
  // 在七牛云后台配置 Referer 防盗链

  // 设置访问控制
  // 限制特定 IP 或域名的访问
};
```

### 5. 监控和日志

```typescript
// 记录上传日志
const logUpload = async (
  uid: number,
  filename: string,
  size: number,
  success: boolean,
  error?: string
) => {
  const log = {
    uid,
    filename,
    size,
    success,
    error,
    timestamp: new Date(),
    ipAddress: req.ip,
  };

  // 保存到数据库或日志文件
  await db.collection('exam.upload_logs').insertOne(log);
};
```

这是第三部分，包含：
- ✅ 证书上传处理器
- ✅ 前端上传组件
- ✅ 最佳实践和建议

现在三部分都已完成！需要第四部分 - 配置指南和故障排查吗？
