# 赛考大厅插件 (Exam Hall Plugin)

一个为 HydroOJ 设计的完整线下赛考证书管理系统，包含七牛云存储集成、批量导入、排行榜和统计功能。

## 🎯 功能特性

### 📜 证书管理
- ✅ 创建/编辑/删除证书记录
- ✅ 证书图片上传到七牛云存储
- ✅ 批量删除证书
- ✅ 证书详情查询
- ✅ 用户证书列表浏览
- ✅ 证书状态管理（活跃/过期/撤销）

### 📤 批量导入
- ✅ CSV 文件导入
- ✅ Excel 文件导入（.xlsx, .xls）
- ✅ 数据验证和错误报告
- ✅ 导入模板下载
- ✅ 导入历史记录

### 🏆 排行榜和统计
- ✅ 用户证书排行榜
- ✅ 分类证书排行榜
- ✅ 用户排名查询
- ✅ 全域证书统计
- ✅ 增长趋势分析（按日期）
- ✅ 热门分类统计
- ✅ 新增用户统计

### 💾 七牛云集成
- ✅ 完整的上传/删除/批量删除功能
- ✅ 7个区域支持（中国东部/南部/北部/东北部/香港/美国东西部）
- ✅ HTTPS 强制使用
- ✅ 唯一文件名生成（避免覆盖）
- ✅ 文件大小限制（10MB）
- ✅ 自动清理过期文件

## 📦 安装

1. 将插件文件放入 `Tf_plugins/exam-hall` 目录
2. 安装依赖：
```bash
cd Tf_plugins/exam-hall
npm install
```

3. 在 HydroOJ 配置中注册插件：
```typescript
// 在 index.ts 或主配置文件中
import { apply } from './Tf_plugins/exam-hall';
apply(ctx);
```

## 🔧 配置

### 环境变量 (.env)

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

### 插件配置 (HydroOJ config.yaml)

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

## 📡 API 端点

### 证书管理

| 方法 | 端点 | 描述 |
|------|------|------|
| GET/POST | `/exam/admin/upload-certificate` | 上传证书图片 |
| POST | `/exam/admin/certificates` | 创建证书 |
| DELETE | `/exam/admin/certificates` | 批量删除证书 |
| GET | `/exam/admin/certificates/:id` | 获取证书详情 |
| PUT | `/exam/admin/certificates/:id` | 更新证书 |
| DELETE | `/exam/admin/certificates/:id` | 删除证书 |
| GET | `/exam/certificates` | 获取用户证书列表 |
| GET | `/exam/certificates/:id` | 获取证书详情（用户） |
| GET | `/exam/stats/certificates` | 获取用户统计 |

### 批量导入

| 方法 | 端点 | 描述 |
|------|------|------|
| GET/POST | `/exam/admin/batch-import` | 批量导入证书 |
| GET | `/exam/admin/import-history` | 获取导入历史 |

### 排行榜和统计

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/exam/leaderboard` | 获取排行榜 |
| GET | `/exam/rank/:uid` | 获取用户排名 |
| GET | `/exam/stats/domain` | 获取全域统计 |
| GET | `/exam/stats/trend` | 获取增长趋势 |
| GET | `/exam/stats/popular-categories` | 获取热门分类 |

## 📋 导入文件格式

### CSV 格式

```csv
uid,certificateName,certifyingBody,category,level,score,issueDate,expiryDate,notes
1001,Python编程证书,中国计算机学会,编程,初级,80,2023-01-15,2024-01-15,通过认证
1002,英语等级证书,教育部考试中心,语言,6级,500,2023-06-01,,通过全国英语六级考试
```

### Excel 格式

使用相同的列名，支持 .xlsx 和 .xls 格式

**必填字段**:
- `uid`: 用户ID
- `certificateName`: 证书名称
- `certifyingBody`: 认证机构
- `category`: 分类
- `issueDate`: 颁发日期（YYYY-MM-DD）

**可选字段**:
- `level`: 级别
- `score`: 分数
- `expiryDate`: 过期日期（YYYY-MM-DD）
- `notes`: 备注

## 📊 数据库集合

### exam.certificates
证书记录主表
```javascript
{
  _id: ObjectId,
  domainId: number,
  uid: number,
  certificateCode: string,
  certificateName: string,
  certifyingBody: string,
  category: string,
  level?: string,
  score?: number,
  issueDate: Date,
  expiryDate?: Date,
  certificateImageUrl?: string,
  certificateImageKey?: string,
  certificateImageSize?: number,
  certificateImageUploadedAt?: Date,
  status: 'active' | 'expired' | 'revoked',
  recordedBy: number,
  recordedAt: Date,
  notes?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### exam.user_stats
用户统计表
```javascript
{
  _id: ObjectId,
  uid: number,
  totalCertificates: number,
  certificates: Array<{
    certificateId: string,
    name: string,
    category: string,
    issueDate: Date
  }>,
  categoryStats: Record<string, number>,
  lastCertificateDate?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔐 权限控制

- **创建/编辑/删除证书**: 需要管理员权限或 `PRIV_MANAGE_EXAM`
- **批量导入**: 需要管理员权限或 `PRIV_MANAGE_EXAM`
- **查看排行榜**: 所有用户可访问
- **查看个人证书**: 用户只能查看自己的证书，管理员可查看所有

## 📈 关键统计

### 排行榜字段
```typescript
{
  uid: number,
  username?: string,
  totalCertificates: number,
  categories: Record<string, number>,
  latestCertificateDate?: Date
}
```

### 全域统计
```typescript
{
  totalCertificates: number,
  totalUsers: number,
  categoriesBreakdown: Array<{
    category: string,
    count: number,
    users: number
  }>,
  topUsers: Array<UserLeaderboardEntry>
}
```

## 🚀 性能优化

- MongoDB 索引自动创建
- 批量操作优化
- 七牛云区域选择优化
- CDN 加速支持

## 🔧 开发指南

### 项目结构
```
exam-hall/
├── index.ts                          # 插件主入口
├── package.json                      # 依赖配置
├── src/
│   ├── handlers/
│   │   ├── CertificateHandler.ts    # 证书管理处理器
│   │   ├── BatchImportHandler.ts    # 批量导入处理器
│   │   └── LeaderboardHandler.ts    # 排行榜处理器
│   ├── services/
│   │   ├── CertificateService.ts              # 证书业务逻辑
│   │   ├── QiniuStorageService.ts             # 七牛云存储
│   │   ├── CertificateBatchImportService.ts   # 批量导入逻辑
│   │   └── CertificateLeaderboardService.ts   # 排行榜统计
│   └── components/
│       ├── CertificateUploader.tsx   # React 上传组件
│       └── CertificateUploader.css   # 上传组件样式
└── README.md
```

### 核心类和接口

#### CertificateService
处理证书的所有 CRUD 操作和与七牛云的集成

#### QiniuStorageService
七牛云存储的封装，支持上传、删除、URL 生成

#### CertificateBatchImportService
批量导入 CSV/Excel 文件，包含数据验证

#### CertificateLeaderboardService
排行榜、排名、统计和趋势分析

## 🐛 故障排查

### 七牛云连接问题
1. 检查 accessKey 和 secretKey 是否正确
2. 验证 bucket 名称和区域设置
3. 确保域名 DNS 配置正确

### 文件上传失败
1. 检查文件大小是否超过 10MB
2. 验证文件格式（仅支持 JPG/PNG/PDF）
3. 查看服务器日志了解详细错误

### 导入失败
1. 验证 CSV/Excel 格式
2. 检查必填字段是否齐全
3. 确认日期格式为 YYYY-MM-DD

## 📝 日志

所有操作都会记录到系统日志，前缀为 `[ExamHall]`:
```
[ExamHall] 创建证书成功: uid=1001, code=CERT-20231015-ABC12
[ExamHall] 批量导入完成: 成功=100, 失败=2
[ExamHall] 文件上传成功: key=certificates/2023/10/user1001/xxx.jpg, size=102400
```

## 📄 许可证

AGPL-3.0

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📞 支持

如有问题，请提交 Issue 或联系开发者。
