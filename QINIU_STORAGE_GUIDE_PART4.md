# 七牛云存储集成指南 - 第四部分：配置与故障排查

## 📋 目录
1. [七牛云账户配置](#七牛云账户配置)
2. [系统集成配置](#系统集成配置)
3. [安全配置](#安全配置)
4. [常见问题排查](#常见问题排查)
5. [性能优化](#性能优化)

---

## 七牛云账户配置

### 1. 注册七牛云账户

访问 https://www.qiniu.com/ 并注册账户：
- 实名认证
- 创建存储桶 (Bucket)
- 获取 Access Key 和 Secret Key

### 2. 创建存储桶

**步骤**:
1. 登录七牛云控制面板
2. 进入「对象存储」→「存储桶」
3. 点击「新建存储桶」
4. 配置信息：
   - 存储桶名称：`exam-certificates`
   - 所属地区：根据业务选择（推荐选择离用户最近的地区）
   - 存储桶类型：选择「公开」（让学生可以访问证书）
   - 确认创建

### 3. 配置域名

**添加自定义域名**:
1. 进入存储桶设置
2. 点击「域名管理」
3. 选择「新增域名」
4. 输入自定义域名（如：`certificates.yourdomain.com`）
5. 选择 CDN 加速（推荐）
6. 完成 CNAME 配置到您的域名提供商

**CNAME 配置示例**:
```
certificates.yourdomain.com  CNAME  certificates.yourdomain.com.qiniu.com
```

### 4. 获取 Access Key 和 Secret Key

1. 进入「个人中心」→「密钥管理」
2. 查看 Access Key 和 Secret Key
3. **重要**：妥善保管这两个密钥，不要泄露

---

## 系统集成配置

### 1. 环境变量配置（.env）

```bash
# 七牛云配置
QINIU_ENABLED=true
QINIU_ACCESS_KEY=your_access_key_here
QINIU_SECRET_KEY=your_secret_key_here
QINIU_BUCKET=exam-certificates
QINIU_DOMAIN=https://certificates.yourdomain.com
QINIU_ZONE=Zone_CN_East

# 证书配置
CERTIFICATE_MAX_SIZE=10485760  # 10MB
CERTIFICATE_UPLOAD_TIMEOUT=30000  # 30秒
```

### 2. 插件配置（config.yaml）

在 Hydro OJ 的 `config.yaml` 中添加：

```yaml
plugins:
  exam-hall:
    enabled: true
    qiniu:
      enabled: true
      accessKey: ${QINIU_ACCESS_KEY}
      secretKey: ${QINIU_SECRET_KEY}
      bucket: exam-certificates
      domain: https://certificates.yourdomain.com
      zone: Zone_CN_East
```

### 3. 存储区域代码

根据业务位置选择合适的区域：

| 区域代码 | 地区 | 建议 |
|---------|------|------|
| `Zone_CN_East` | 华东（浙江） | 默认，覆盖华东地区 |
| `Zone_CN_South` | 华南（广东） | 覆盖华南地区 |
| `Zone_CN_North` | 华北（北京） | 覆盖华北地区 |
| `Zone_CN_Northeast` | 东北（吉林） | 覆盖东北地区 |
| `Zone_HK` | 香港 | 国际访问 |
| `Zone_US_Virginia` | 美国东部 | 北美用户 |
| `Zone_US_California` | 美国西部 | 美国西部用户 |

---

## 安全配置

### 1. 访问控制 (ACL)

**七牛云后台配置**:
1. 进入存储桶设置
2. 点击「访问控制」
3. 配置：
   - 存储桶权限：公开
   - Referer 防盗链：启用
   - 添加白名单域名：`yourdomain.com`
   - 启用 HTTPS

### 2. HTTPS 配置

```typescript
// 在 QiniuStorageService 中强制使用 HTTPS
getFileUrl(key: string): string {
  // 确保使用 HTTPS
  const domain = this.domain.startsWith('https://')
    ? this.domain
    : `https://${this.domain}`;
  return `${domain}/${key}`;
}
```

### 3. 密钥安全

**最佳实践**:
1. 使用环境变量存储 Access Key 和 Secret Key
2. 生产环境使用单独的密钥管理服务
3. 定期轮换密钥（建议3个月一次）
4. 如果泄露立即更换
5. 不要在代码中硬编码密钥

```typescript
// ✅ 正确做法
const accessKey = process.env.QINIU_ACCESS_KEY;
const secretKey = process.env.QINIU_SECRET_KEY;

// ❌ 错误做法
const accessKey = 'your_actual_key_here';
```

### 4. 防止文件覆盖

```typescript
// 生成唯一文件名防止覆盖
private generateFileName(filePath: string): string {
  const ext = path.extname(filePath);
  const timestamp = Date.now();
  const uuid = uuidv4();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${uuid}-${random}${ext}`;
}
```

---

## 常见问题排查

### 问题 1: 401 Unauthorized

**症状**: 上传时返回 401 错误

**原因**: Access Key 或 Secret Key 错误

**解决方案**:
1. 检查环境变量是否正确设置
2. 确认密钥没有过期或被禁用
3. 重新生成新的密钥对

```bash
# 验证密钥
echo "Access Key: $QINIU_ACCESS_KEY"
echo "Secret Key: $QINIU_SECRET_KEY"
```

### 问题 2: 403 Forbidden

**症状**: 上传时返回 403 错误

**原因**: 无权限访问指定的存储桶

**解决方案**:
1. 确认 Access Key 对应的账户有该存储桶的权限
2. 检查存储桶是否存在
3. 检查七牛云后台的权限配置

### 问题 3: 404 Not Found

**症状**: 上传失败，返回 404 错误

**原因**: 存储桶不存在或访问域名错误

**解决方案**:
1. 确认存储桶名称拼写正确
2. 验证存储桶是否已创建
3. 检查是否在正确的七牛云区域

```typescript
// 验证配置
console.log('Bucket:', this.bucket);
console.log('Domain:', this.domain);
console.log('Zone:', this.config.zone);
```

### 问题 4: 上传超时

**症状**: 上传大文件时超时

**原因**: 网络速度慢或文件过大

**解决方案**:
1. 增加超时时间
2. 压缩文件大小
3. 检查网络连接

```typescript
// 增加超时时间
const options = {
  scope: this.bucket,
  expires: 7200, // 增加到 2 小时
};
```

### 问题 5: 上传成功但获取 URL 失败

**症状**: 上传成功返回 200，但访问 URL 显示 404

**原因**: 域名未配置或 DNS 未生效

**解决方案**:
1. 确认自定义域名已配置
2. 等待 DNS 生效（可能需要几分钟到几小时）
3. 使用七牛云默认域名临时测试

```typescript
// 使用默认域名测试
const defaultDomain = `https://${this.bucket}.qiniucdn.com`;
```

### 问题 6: CORS 跨域错误

**症状**: 浏览器控制台显示 CORS 错误

**原因**: 七牛云未配置 CORS

**解决方案**:
1. 进入七牛云后台
2. 点击存储桶「跨域设置」
3. 添加 CORS 规则

```
源（Origin）: https://yourdomain.com
允许的方法: GET, HEAD, PUT, POST, DELETE
允许的头: Authorization, Content-Type, *
```

---

## 性能优化

### 1. 缓存策略

```typescript
// 设置文件缓存头
const uploadToken = this.mac.getUploadToken({
  scope: this.bucket,
  expires: 3600,
  returnBody: JSON.stringify({
    key: '$(key)',
    hash: '$(etag)',
    size: '$(fsize)',
    mimeType: '$(mimeType)',
    cacheControl: 'public, max-age=31536000', // 1年缓存
  }),
});
```

### 2. 图片处理和缩略图

```typescript
// 获取图片缩略图 URL
getThumbnailUrl(key: string, width = 200, height = 200): string {
  const imageUrl = this.getFileUrl(key);
  return `${imageUrl}?imageView2/2/w/${width}/h/${height}/q/75`;
}

// 获取图片预览 URL
getPreviewUrl(key: string): string {
  const imageUrl = this.getFileUrl(key);
  return `${imageUrl}?imageView2/1/w/800/h/600`;
}
```

### 3. CDN 加速

确保已在七牛云后台启用 CDN 加速：
1. 进入存储桶设置
2. 点击「域名管理」
3. 启用「CDN 加速」

### 4. 并发上传限制

```typescript
// 限制同时上传数量
const MAX_CONCURRENT_UPLOADS = 3;
let activeUploads = 0;
const uploadQueue: Array<() => void> = [];

async function uploadWithLimit(file: File) {
  if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
    return new Promise((resolve) => {
      uploadQueue.push(async () => {
        resolve(await upload(file));
      });
    });
  }

  activeUploads++;
  try {
    return await upload(file);
  } finally {
    activeUploads--;
    const nextTask = uploadQueue.shift();
    nextTask?.();
  }
}
```

### 5. 文件压缩

```typescript
// 上传前压缩图片
import imageCompression from 'browser-image-compression';

async function compressAndUpload(file: File) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return await uploadFile(compressedFile);
  } catch (error) {
    console.error('压缩失败:', error);
    return await uploadFile(file); // 压缩失败则上传原文件
  }
}
```

---

## 监控和维护

### 1. 七牛云监控

在七牛云后台查看：
- 存储量统计
- 访问量统计
- 带宽使用情况
- 错误日志

### 2. 应用级别日志

```typescript
// 记录所有上传操作
logger.info(`[ExamHall] 证书上传成功: uid=${uid}, key=${key}, size=${size}`);
logger.error(`[ExamHall] 证书上传失败: uid=${uid}, error=${error}`);
```

### 3. 定期清理

```typescript
// 删除过期的临时文件
async function cleanupOldFiles(days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await db.collection('exam.certificates')
    .find({
      certificateImageUploadedAt: { $lt: cutoffDate },
      status: 'revoked',
    })
    .toArray();

  for (const cert of result) {
    await qiniuService.deleteFile(cert.certificateImageKey);
  }
}
```

---

## 成本估算

### 七牛云价格（仅供参考）

| 项目 | 价格 |
|------|------|
| 存储空间 | ¥0.0145/GB/月 |
| 下载流量 | ¥0.5/GB（国内）|
| CDN 带宽 | ¥0.25/GB（国内）|
| API 调用 | 前100万次/月免费 |

### 成本优化建议

1. **选择合适的存储区域**
   - 数据存储在离用户最近的地区可以减少带宽成本

2. **启用 CDN 加速**
   - 虽然有额外费用，但能提升用户体验

3. **压缩文件**
   - 减少存储空间和带宽消耗

4. **设置合理的缓存策略**
   - 减少重复下载

5. **定期清理**
   - 删除不需要的文件节省成本

---

## 快速参考

### 常用命令

```bash
# 测试七牛云连接
curl -I https://certificates.yourdomain.com/test.jpg

# 验证 DNS 配置
nslookup certificates.yourdomain.com

# 查看环境变量
env | grep QINIU
```

### 七牛云控制台链接

- https://portal.qiniu.com/bucket - 存储桶管理
- https://portal.qiniu.com/user/key - 密钥管理
- https://portal.qiniu.com/analysis - 数据统计

### 文档链接

- [七牛云官方文档](https://developer.qiniu.com/)
- [Node.js SDK](https://github.com/qiniu/nodejs-sdk)
- [上传接口](https://developer.qiniu.com/kodo/manual/1239/simple-upload)

这是第四部分，包含：
- ✅ 七牛云账户配置步骤
- ✅ 系统集成配置
- ✅ 安全配置最佳实践
- ✅ 常见问题排查
- ✅ 性能优化建议
- ✅ 成本估算

**四部分全部完成！** 现在你有了完整的七牛云存储集成指南。
