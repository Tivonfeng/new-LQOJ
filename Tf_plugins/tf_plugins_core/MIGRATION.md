# 迁移指南：从 exam-hall 迁移到 tf_plugins_core

本指南将帮助你将 exam-hall 插件中的七牛云功能迁移到使用 `tf_plugins_core` 核心插件。

## 📋 迁移步骤

### 步骤 1：安装和配置 tf_plugins_core

1. **确保插件已创建**
   - 插件应位于 `Tf_plugins/tf_plugins_core`
   - 运行 `npm install` 安装依赖

2. **配置插件**
   
   在 HydroOJ 配置文件中添加（确保在其他插件之前加载）：
   
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

   或者使用环境变量：
   
   ```bash
   QINIU_ENABLED=true
   QINIU_ACCESS_KEY=your_access_key
   QINIU_SECRET_KEY=your_secret_key
   QINIU_BUCKET=lq-exam-certificates
   QINIU_DOMAIN=lq-exam-cert.lqcode.fun
   QINIU_ZONE=Zone_z0
   ```

### 步骤 2：修改 exam-hall 插件

#### 2.1 删除 QiniuStorageService.ts

删除文件：
```
Tf_plugins/exam-hall/src/services/QiniuStorageService.ts
```

#### 2.2 更新服务导出

修改 `Tf_plugins/exam-hall/src/services/index.ts`：

```typescript
// 删除这行
// export { default as QiniuStorageService } from './QiniuStorageService';
// export type { DeleteResult, UploadResult } from './QiniuStorageService';

// 如果需要类型，从 core 导入
import type { DeleteResult, UploadResult } from '../../tf_plugins_core/src/types';
export type { DeleteResult, UploadResult };
```

#### 2.3 修改 CertificateService.ts

修改 `Tf_plugins/exam-hall/src/services/CertificateService.ts`：

**之前**：
```typescript
import QiniuStorageService from './QiniuStorageService';

export class CertificateService {
    private qiniuService: QiniuStorageService;
    
    constructor(ctx: Context) {
        this.ctx = ctx;
        this.qiniuService = new QiniuStorageService();
    }
    
    // ...
}
```

**之后**：
```typescript
import type { QiniuStorageService } from '../../tf_plugins_core/src/services';

export class CertificateService {
    private qiniuService: QiniuStorageService | null;
    
    constructor(ctx: Context) {
        this.ctx = ctx;
        // 从 ctx 获取服务
        this.qiniuService = ctx.qiniuStorage || null;
        
        if (!this.qiniuService?.isReady()) {
            console.warn('[ExamHall] 七牛云存储服务未启用或未初始化');
        }
    }
    
    // 在使用前检查服务是否可用
    async uploadCertificate(filePath: string) {
        if (!this.qiniuService?.isReady()) {
            throw new Error('七牛云存储服务不可用');
        }
        
        return await this.qiniuService.uploadFile(filePath, 'certificates');
    }
    
    // ...
}
```

#### 2.4 更新 package.json

修改 `Tf_plugins/exam-hall/package.json`：

**删除依赖**：
```json
{
  "dependencies": {
    // 删除这行
    // "qiniu": "^7.10.0",
    // "uuid": "^9.0.0"
  }
}
```

**注意**：如果 exam-hall 还需要 uuid 用于其他用途，可以保留。

### 步骤 3：更新类型声明

如果 exam-hall 中有类型声明文件，更新导入：

```typescript
// 之前
import type { UploadResult, DeleteResult } from './services/QiniuStorageService';

// 之后
import type { UploadResult, DeleteResult } from '../../tf_plugins_core/src/types';
```

### 步骤 4：测试验证

1. **启动服务**
   ```bash
   # 确保 tf_plugins_core 先加载
   # 检查日志确认服务初始化成功
   ```

2. **功能测试**
   - 测试文件上传
   - 测试文件删除
   - 测试 URL 生成
   - 测试批量操作

3. **错误处理测试**
   - 测试服务未启用的情况
   - 测试配置错误的情况

## 🔍 代码对比

### 服务初始化对比

**之前（硬编码）**：
```typescript
export class QiniuStorageService {
    private readonly QINIU_ACCESS_KEY = 'KLk2UkLXhUIzuoollr8iJmAn_Hc6AeELiAEDfZCZ';
    private readonly QINIU_SECRET_KEY = 'SLeJSaHzxbfkgfwdemojwo9AH8mOxCFonDgZCxP0';
    
    constructor() {
        // 硬编码配置
    }
}
```

**之后（配置化）**：
```typescript
// 在 tf_plugins_core 中
export class QiniuStorageService {
    constructor(qiniuConfig: QiniuConfig) {
        // 从配置读取
    }
}

// 在 exam-hall 中
this.qiniuService = ctx.qiniuStorage; // 从 ctx 获取
```

### 使用方式对比

**之前**：
```typescript
const qiniuService = new QiniuStorageService();
await qiniuService.uploadFile(filePath);
```

**之后**：
```typescript
if (!ctx.qiniuStorage?.isReady()) {
    throw new Error('服务不可用');
}
await ctx.qiniuStorage.uploadFile(filePath, 'certificates');
```

## ⚠️ 注意事项

1. **加载顺序**：确保 `tf_plugins_core` 在其他使用它的插件之前加载

2. **可选依赖**：服务可能未启用，使用前需要检查：
   ```typescript
   if (!ctx.qiniuStorage?.isReady()) {
       // 处理服务不可用的情况
   }
   ```

3. **配置迁移**：将硬编码的凭证移到配置文件或环境变量

4. **类型导入**：如果需要在类型文件中使用，从 core 导入类型

## 🐛 常见问题

### Q: 服务未初始化怎么办？

A: 检查以下几点：
1. 确认 `tf_plugins_core` 插件已启用
2. 检查配置是否正确
3. 查看启动日志确认服务初始化成功

### Q: 如何调试配置问题？

A: 查看日志：
```
[TfPluginsCore] 🚀 Tf 插件核心库正在加载...
[TfPluginsCore] ✅ 七牛云存储服务已初始化并注册
```

如果看到警告，检查配置项。

### Q: 可以同时使用多个存储服务吗？

A: 当前设计为单实例。如果需要多个 bucket，可以：
1. 创建多个配置（未来扩展）
2. 直接导入 QiniuStorageService 创建自定义实例

## ✅ 迁移检查清单

- [ ] 安装并配置 `tf_plugins_core`
- [ ] 删除 exam-hall 中的 `QiniuStorageService.ts`
- [ ] 更新 `CertificateService.ts` 使用 `ctx.qiniuStorage`
- [ ] 更新类型导入
- [ ] 更新 `package.json` 移除 `qiniu` 依赖
- [ ] 测试文件上传功能
- [ ] 测试文件删除功能
- [ ] 测试错误处理
- [ ] 更新文档

## 📚 相关文档

- [README.md](./README.md) - 使用文档
- [DESIGN.md](./DESIGN.md) - 详细设计文档
- [ARCHITECTURE_ANALYSIS.md](./ARCHITECTURE_ANALYSIS.md) - 架构分析

