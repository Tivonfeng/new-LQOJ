# Tf Plugins Core

Tf 插件核心库 - 提供所有 Tf 插件的通用功能服务。

## 📋 概述

`tf_plugins_core` 是一个核心插件，用于提供所有 Tf 插件的通用功能。它将七牛云存储服务以及其他未来可能需要的通用功能集中管理，避免代码重复，提高可维护性。

## 🎯 功能特性

### 七牛云存储服务

- ✅ 文件上传（支持文件路径和 Buffer）
- ✅ 文件删除（单个和批量）
- ✅ URL 生成（公开和私有）
- ✅ 配置外部化（环境变量 + 配置文件）
- ✅ 多区域支持
- ✅ 文件大小限制
- ✅ 完整的错误处理

## 📦 安装

1. 确保插件在 `Tf_plugins/tf_plugins_core` 目录下

2. 安装依赖：
```bash
cd Tf_plugins/tf_plugins_core
npm install
```

3. 在 HydroOJ 配置中注册插件（确保在其他插件之前加载）

## 🔧 配置

### 方式一：配置文件（推荐）

在 HydroOJ 的配置文件中添加：

```yaml
plugins:
  tf_plugins_core:
    enabled: true
    qiniu:
      enabled: true
      accessKey: ${QINIU_ACCESS_KEY}  # 从环境变量读取
      secretKey: ${QINIU_SECRET_KEY}
      bucket: lq-exam-certificates
      domain: lq-exam-cert.lqcode.fun
      zone: Zone_z0
      maxFileSize: 10485760  # 10MB
      defaultPrefix: files
```

### 方式二：环境变量

```bash
# .env 文件
QINIU_ENABLED=true
QINIU_ACCESS_KEY=your_access_key_here
QINIU_SECRET_KEY=your_secret_key_here
QINIU_BUCKET=lq-exam-certificates
QINIU_DOMAIN=lq-exam-cert.lqcode.fun
QINIU_ZONE=Zone_z0
QINIU_MAX_SIZE=10485760
QINIU_PREFIX=files
```

### 配置优先级

```
插件配置 (config.yaml) > 环境变量 > 默认值
```

### 七牛云区域配置

支持的区域：
- `Zone_z0` - 华东（默认）
- `Zone_z1` - 华北
- `Zone_z2` - 华南
- `Zone_as0` - 东南亚
- `Zone_na0` - 北美
- `Zone_cn_east_2` - 华东-浙江2
- `Zone_cn_south_1` - 华南-广东
- `Zone_cn_north_1` - 华北-北京
- `Zone_cn_northeast_1` - 华北-山东
- `Zone_hk_main` - 香港
- `Zone_us_east_1` - 美国东部
- `Zone_us_west_1` - 美国西部

## 📖 使用方式

### 在其他插件中使用

#### 方式一：通过 ctx 访问（推荐）

```typescript
// 在你的插件服务中
import { Context } from 'hydrooj';

export class YourService {
    private qiniuService: QiniuStorageService | null;
    
    constructor(ctx: Context) {
        // 从 ctx 获取服务
        this.qiniuService = ctx.qiniuStorage || null;
        
        if (!this.qiniuService?.isReady()) {
            console.warn('[YourPlugin] 七牛云存储服务未启用或未初始化');
        }
    }
    
    async uploadFile(filePath: string) {
        if (!this.qiniuService) {
            throw new Error('七牛云存储服务不可用');
        }
        
        const result = await this.qiniuService.uploadFile(filePath, 'your-prefix');
        if (result.success) {
            console.log('上传成功:', result.url);
            return result.url;
        } else {
            throw new Error(result.error);
        }
    }
}
```

#### 方式二：直接导入（需要自定义配置时）

```typescript
import { QiniuStorageService } from '../../tf_plugins_core/src/services';
import type { QiniuConfig } from '../../tf_plugins_core/src/types';

const customConfig: QiniuConfig = {
    enabled: true,
    accessKey: 'xxx',
    secretKey: 'xxx',
    bucket: 'custom-bucket',
    domain: 'https://custom.domain.com',
    zone: 'Zone_z0',
};

const customService = new QiniuStorageService(customConfig);
```

### API 使用示例

#### 上传文件

```typescript
// 通过文件路径上传
const result = await ctx.qiniuStorage!.uploadFile('/path/to/file.jpg', 'certificates');

// 通过 Buffer 上传
const buffer = fs.readFileSync('/path/to/file.jpg');
const result = await ctx.qiniuStorage!.uploadBuffer(buffer, 'filename.jpg', 'certificates');

if (result.success) {
    console.log('文件 URL:', result.url);
    console.log('存储 Key:', result.key);
    console.log('文件大小:', result.size);
} else {
    console.error('上传失败:', result.error);
}
```

#### 删除文件

```typescript
// 删除单个文件
const result = await ctx.qiniuStorage!.deleteFile('certificates/2024/01/user1001/file.jpg');

// 批量删除
const keys = ['key1', 'key2', 'key3'];
const result = await ctx.qiniuStorage!.deleteMultiple(keys);
```

#### 获取文件 URL

```typescript
// 公开访问 URL
const publicUrl = ctx.qiniuStorage!.getFileUrl('certificates/file.jpg');

// 私有访问 URL（带签名，1小时后过期）
const privateUrl = ctx.qiniuStorage!.getPrivateFileUrl('certificates/file.jpg', 3600);
```

#### 生成存储路径

```typescript
// 生成标准化的存储路径
const key = ctx.qiniuStorage!.generateKey(1001, 'cert-123', 'image', 'certificates');
// 结果: certificates/2024/01/user1001/cert-123.jpg
```

## 🔒 安全性

1. **凭证管理**：
   - ✅ 不在代码中硬编码凭证
   - ✅ 支持环境变量（推荐生产环境）
   - ✅ 配置文件权限控制

2. **文件上传安全**：
   - ✅ 文件大小限制（默认 10MB）
   - ✅ 文件名防注入（UUID + 时间戳）
   - ✅ 路径规范化

3. **访问控制**：
   - ✅ 私有文件 URL 签名
   - ✅ 过期时间控制

## 🏗️ 项目结构

```
tf_plugins_core/
├── index.ts                    # 插件主入口
├── package.json                # 依赖配置
├── README.md                   # 使用文档（本文件）
├── DESIGN.md                   # 详细设计文档
├── ARCHITECTURE_ANALYSIS.md    # 架构分析
├── DESIGN_SUMMARY.md           # 设计思路总结
├── src/
│   ├── services/              # 核心服务层
│   │   ├── index.ts           # 服务导出
│   │   └── QiniuStorageService.ts    # 七牛云存储服务
│   ├── types/                 # 类型定义
│   │   ├── index.ts
│   │   └── storage.ts          # 存储相关类型
│   └── config/                # 配置管理
│       ├── index.ts
│       └── schema.ts           # 配置 Schema
└── locales/                    # 国际化（可选）
    ├── zh.yaml
    └── en.yaml
```

## 🔮 未来扩展

计划添加的通用功能：

1. **存储服务抽象层**
   - 支持多种存储后端（七牛、阿里云 OSS、AWS S3、本地存储）
   - 统一的存储接口

2. **缓存服务**
   - Redis 缓存封装
   - 内存缓存

3. **通知服务**
   - 邮件通知
   - 短信通知
   - 站内消息

4. **工具函数库**
   - 日期格式化
   - 数据验证
   - 加密解密

## 🐛 故障排查

### 七牛云连接问题

1. 检查 accessKey 和 secretKey 是否正确
2. 验证 bucket 名称和区域设置
3. 确保域名 DNS 配置正确
4. 查看日志了解详细错误

### 文件上传失败

1. 检查文件大小是否超过限制
2. 验证文件格式
3. 查看服务器日志了解详细错误

### 服务未初始化

1. 检查配置是否正确
2. 确认插件已正确加载
3. 查看启动日志

## 📝 日志

所有操作都会记录到系统日志，前缀为 `[TfPluginsCore]`:

```
[TfPluginsCore] 🚀 Tf 插件核心库正在加载...
[TfPluginsCore] ✅ 七牛云存储服务已初始化并注册
[TfPluginsCore] 开始上传文件: key=certificates/xxx.jpg, filePath=/tmp/file.jpg
[TfPluginsCore] 文件上传成功: key=certificates/xxx.jpg, size=102400, url=https://...
```

## 📄 许可证

AGPL-3.0

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📞 支持

如有问题，请查看：
- `DESIGN.md` - 详细设计文档
- `ARCHITECTURE_ANALYSIS.md` - 架构分析
- `DESIGN_SUMMARY.md` - 设计思路总结

或提交 Issue 联系开发者。

