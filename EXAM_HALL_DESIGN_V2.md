# 赛考大厅（Exam Hall）插件设计文档 - 证书管理版

## 📋 项目概述

**赛考大厅**是一个用于管理线下赛考证书、追踪学生获证情况、统计成绩的教学管理插件。

**工作流程**:
1. 学生参加线下赛考（如全国计算机等级考试、英语等级考试等）
2. 获得纸质证书
3. 教师在系统中录入证书信息
4. 学生在系统中查看自己的证书展厅
5. 教师查看班级获证统计

### 核心功能
- 📜 证书录入与管理（教师端）- 单条/批量导入
- 🏆 学生证书展厅与排行榜
- 📊 证书统计与分析 - 班级/学年维度
- 🔍 证书验证与查询
- 👥 班级/学年统计与对比
- 📈 学生获证进度追踪

---

## 🏗️ 系统架构

### 1. 数据模型

#### 1.1 证书记录 (exam.certificates)
```typescript
interface Certificate {
  _id: ObjectId;
  domainId: number;           // 所属域
  uid: number;                // 用户ID
  certificateCode: string;    // 证书编码 (如: CERT-2024-001-001)
  certificateName: string;    // 证书名称 (如: 全国计算机等级考试一级)
  certifyingBody: string;     // 颁证机构 (如: 教育部)
  category: string;           // 分类 (计算机/语言/其他)
  level?: string;             // 等级 (一级/二级/初级/中级等)
  score?: number;             // 分数 (可选)
  issueDate: Date;            // 颁发日期
  expiryDate?: Date;          // 过期日期 (可选)
  status: 'active' | 'expired' | 'revoked'; // 状态
  certificateImageUrl?: string; // 证书图片URL (上传存储)
  recordedBy: number;         // 录入人ID (教师)
  recordedAt: Date;           // 录入时间
  notes?: string;             // 备注
  createdAt: Date;
  updatedAt: Date;
}
```

#### 1.2 证书类型配置 (exam.certificate_types)
```typescript
interface CertificateType {
  _id: ObjectId;
  domainId: number;
  typeId: string;             // 类型ID
  name: string;               // 名称 (如: 全国计算机等级考试)
  certifyingBody: string;     // 颁证机构
  category: string;           // 分类 (计算机/语言/其他)
  levels: string[];           // 等级列表 (一级/二级...)
  description: string;        // 描述
  color?: string;             // 显示颜色 (#FF6B6B等)
  icon?: string;              // 图标URL
  isActive: boolean;          // 是否启用
  createdAt: Date;
  updatedAt: Date;
}
```

#### 1.3 学生获证统计 (exam.user_stats)
```typescript
interface ExamUserStats {
  _id: ObjectId;
  uid: number;
  totalCertificates: number;     // 总证书数
  certificates: Array<{
    certificateId: ObjectId;
    name: string;
    category: string;
    issueDate: Date;
  }>;
  categoryStats: {               // 分类统计
    [category: string]: number;  // 分类下的证书数
  };
  lastCertificateDate?: Date;    // 最后获证日期
  updatedAt: Date;
}
```

#### 1.4 班级统计 (exam.class_stats)
```typescript
interface ClassStats {
  _id: ObjectId;
  domainId: number;
  classId: string;            // 班级ID (可关联班级系统)
  year: number;               // 学年
  semester: number;           // 学期 (1/2)
  totalStudents: number;      // 总学生数
  certificateHolders: number; // 获证学生数 (至少有1个证书)
  averageCertificates: number; // 平均每生证书数
  categoryBreakdown: {        // 分类统计
    [category: string]: {
      count: number;
      percentage: number;
    };
  };
  topCertificates: Array<{    // 最受欢迎的证书 (TOP 5)
    name: string;
    count: number;
  }>;
  updatedAt: Date;
}
```

#### 1.5 证书验证记录 (exam.verification_logs)
```typescript
interface VerificationLog {
  _id: ObjectId;
  domainId: number;
  certificateId: ObjectId;
  certificateCode: string;
  verifiedAt: Date;          // 验证时间
  verifiedBy?: number;       // 验证人ID
  verifyMethod: 'code' | 'image'; // 验证方式
  result: boolean;           // 验证结果
  ipAddress?: string;        // IP地址 (可选, 用于防作弊)
}
```

---

## 📱 前端页面设计

### 2.1 赛考大厅首页 (exam-hall.page.tsx)
**路由**: `/exam/hall`
**权限**: 任何登录用户

**页面构成**:
- 🎯 Hero Banner
  - 欢迎语
  - 个人证书快速统计 (总数/分类)
- 📜 个人证书展厅 (3列网格)
  - 证书卡片 (包含图片缩略图)
  - 证书名称/等级/颁发日期
  - 证书编码 (可复制)
  - 下载按钮
  - 分享按钮
- 📊 分类统计
  - 各分类证书数量
  - 分类对比柱状图
- 📈 个人获证时间线
  - 按日期展示证书获得历程
- 🏆 排行榜预览
  - TOP 10 学生 (按证书数)
  - 自己的排名位置

### 2.2 证书管理中心 (certificate-center.page.tsx)
**路由**: `/exam/certificates`
**权限**: 任何登录用户

**功能**:
- 📜 证书列表 (可排序/筛选)
  - 搜索证书名称
  - 按分类筛选
  - 按颁证机构筛选
  - 按日期排序
- 📥 下载/导出
  - 单个证书下载
  - 批量导出为PDF
  - 导出为Excel
- 🔍 证书详情
  - 点击查看大图
  - 显示所有信息
  - 编辑选项 (仅教师)
  - 删除选项 (仅教师)

### 2.3 排行榜 (certificate-ranking.page.tsx)
**路由**: `/exam/ranking`
**权限**: 任何登录用户

**功能**:
- 🏅 多维度排行
  - 综合排行 (按证书总数)
  - 分类排行 (按各分类证书数)
  - 按获证日期最新排行
- 📊 排行榜展示
  - TOP 100 学生列表
  - 自己的排名高亮显示
  - 显示证书详情 (悬停)
- 📈 排行趋势
  - 周/月/年度排行对比

### 2.4 个人资料 (exam-profile.page.tsx)
**路由**: `/exam/me` 或 `/exam/profile`
**权限**: 任何登录用户

**功能**:
- 👤 个人获证总览
  - 总证书数、分类分布
  - 最新证书
  - 获证时间线
- 📋 证书详细列表
  - 可编辑备注 (管理员)
  - 可上传证书图片 (管理员)
  - 可删除 (管理员)
- 🔗 分享证书
  - 生成分享链接
  - 二维码分享

### 2.5 教师后台管理 (exam-admin.page.tsx)
**路由**: `/exam/admin`
**权限**: PRIV_MANAGE_EXAM (教师权限)

#### 2.5.1 证书录入页面
**功能**:
- ➕ 单条录入
  - 表单输入 (学生/证书名/等级/日期等)
  - 上传证书图片
  - 保存
- 📥 批量导入
  - 上传CSV/Excel文件
  - 预览导入数据
  - 确认导入
  - 查看导入日志

**CSV格式示例**:
```
学生用户名,证书名称,等级,颁证机构,分类,分数,颁发日期,备注
student001,全国计算机等级考试,一级,教育部,计算机,80,2024-01-15,
student002,全国计算机等级考试,二级,教育部,计算机,75,2024-02-10,
```

#### 2.5.2 证书类型管理页面
**功能**:
- ➕ 新建证书类型
  - 设置名称/机构/分类/等级等
  - 设置颜色和图标
  - 启用/禁用
- ✏️ 编辑证书类型
- 🗑️ 删除证书类型

#### 2.5.3 班级统计分析页面
**功能**:
- 📊 班级选择与筛选
  - 选择班级
  - 选择学年/学期
- 📈 班级获证统计
  - 获证学生数 / 总人数
  - 平均证书数
  - 分类统计柱状图
  - 最受欢迎的TOP 5证书
- 📋 班级学生列表
  - 按证书数排序
  - 显示每生的证书列表
  - 可编辑/删除证书
- 📥 导出报告
  - 导出班级统计Excel
  - 导出学生明细

#### 2.5.4 全域统计分析页面
**功能**:
- 🌍 全校获证统计
  - 总学生数 / 获证学生数
  - 平均证书数
  - 分类统计
- 📊 年度对比
  - 各学年获证人数对比
  - 各学年平均证书数对比
- 🏆 高分名单
  - 证书数最多的TOP 10学生
- 📈 热门证书
  - 最受欢迎的TOP 10证书类型

---

## 🔧 后端处理器设计

### 3.1 赛考大厅处理器 (ExamHallHandler)
**响应路由**: `GET /exam/hall`

**数据返回**:
```typescript
{
  userStats: {
    totalCertificates: number;
    categoryStats: {...};
    recentCertificates: Certificate[];
  };
  ranking: Array<{uid, count}>;
  userRank: {position, count};
}
```

**依赖服务**:
- `ExamCertificateService.getUserCertificates(uid)`
- `ExamStatsService.getUserStats(uid)`
- `ExamRankingService.getUserRank(uid)`

### 3.2 证书管理处理器 (CertificateHandler)
**响应路由**:
- `GET /exam/certificates` - 获取用户证书列表
- `GET /exam/certificates/:id` - 获取证书详情
- `POST /exam/certificates` - 创建证书 (教师)
- `PUT /exam/certificates/:id` - 更新证书 (教师)
- `DELETE /exam/certificates/:id` - 删除证书 (教师)
- `POST /exam/certificates/verify` - 验证证书

### 3.3 排行榜处理器 (RankingHandler)
**响应路由**:
- `GET /exam/ranking` - 获取排行榜数据
- `GET /exam/ranking/:category` - 按分类获取排行

### 3.4 个人资料处理器 (ProfileHandler)
**响应路由**:
- `GET /exam/me` - 获取个人详细资料

### 3.5 教师后台处理器 (AdminHandler)
**响应路由**:
- `POST /exam/admin/certificates` - 单条录入证书
- `POST /exam/admin/certificates/import` - 批量导入证书
- `GET /exam/admin/types` - 获取证书类型列表
- `POST /exam/admin/types` - 创建证书类型
- `PUT /exam/admin/types/:id` - 更新证书类型
- `DELETE /exam/admin/types/:id` - 删除证书类型
- `GET /exam/admin/class-stats` - 获取班级统计
- `GET /exam/admin/analytics` - 获取全域分析数据

---

## 🔧 业务服务层设计

### 4.1 CertificateService - 证书管理
```typescript
class ExamCertificateService {
  // 创建证书
  async createCertificate(uid, data): Promise<Certificate>

  // 获取用户证书
  async getUserCertificates(uid): Promise<Certificate[]>

  // 获取证书详情
  async getCertificateById(id): Promise<Certificate>

  // 更新证书
  async updateCertificate(id, data): Promise<Certificate>

  // 删除证书
  async deleteCertificate(id): Promise<boolean>

  // 批量导入证书 (CSV)
  async importCertificates(csvData): Promise<ImportResult>

  // 验证证书有效性
  async verifyCertificate(code): Promise<Certificate | null>
}
```

### 4.2 StatsService - 统计计算
```typescript
class ExamStatsService {
  // 获取用户统计
  async getUserStats(uid): Promise<ExamUserStats>

  // 更新用户统计 (创建/删除证书时调用)
  async updateUserStats(uid): Promise<void>

  // 获取班级统计
  async getClassStats(classId, year, semester): Promise<ClassStats>

  // 重新计算班级统计
  async recalculateClassStats(classId, year, semester): Promise<void>

  // 获取全域统计
  async getGlobalStats(): Promise<GlobalStats>
}
```

### 4.3 RankingService - 排行榜
```typescript
class ExamRankingService {
  // 获取综合排行榜
  async getRanking(limit = 100): Promise<RankingItem[]>

  // 按分类获取排行
  async getRankingByCategory(category, limit = 100): Promise<RankingItem[]>

  // 获取用户排名
  async getUserRank(uid, category?): Promise<{position, count}>

  // 获取排行榜快照 (定期生成)
  async generateSnapshot(): Promise<void>
}
```

### 4.4 CertificateTypeService - 证书类型
```typescript
class CertificateTypeService {
  // 获取所有证书类型
  async getTypes(): Promise<CertificateType[]>

  // 创建证书类型
  async createType(data): Promise<CertificateType>

  // 更新证书类型
  async updateType(id, data): Promise<CertificateType>

  // 删除证书类型
  async deleteType(id): Promise<boolean>
}
```

### 4.5 VerificationService - 证书验证
```typescript
class VerificationService {
  // 验证证书
  async verify(code): Promise<Certificate | null>

  // 记录验证日志
  async logVerification(certificateId, method, result): Promise<void>

  // 获取验证记录
  async getVerificationLogs(certificateId): Promise<VerificationLog[]>
}
```

---

## 📊 前端组件化设计

```
ExamHall/
├── ExamHallPage.tsx          # 首页
├── HeroSection.tsx           # Hero区域
├── StatsCard.tsx             # 统计卡片
├── CertificateGallery.tsx    # 证书展厅
├── CategoryChart.tsx         # 分类统计图
├── TimelineView.tsx          # 时间线

Certificates/
├── CertificateCenterPage.tsx # 证书管理中心
├── CertificateList.tsx       # 证书列表
├── CertificateCard.tsx       # 证书卡片
├── SearchAndFilter.tsx       # 搜索筛选
└── DownloadExport.tsx        # 下载导出

Rankings/
├── RankingPage.tsx           # 排行榜
├── RankingTabs.tsx           # 分类标签
├── RankingTable.tsx          # 排行表格
└── RankingChart.tsx          # 排行图表

Profile/
├── ProfilePage.tsx           # 个人资料
├── StatsOverview.tsx         # 统计概览
├── CertificateTimeline.tsx   # 获证时间线
└── DetailsList.tsx           # 详细列表

Admin/
├── AdminPanel.tsx            # 管理后台
├── CertificateEntry.tsx      # 证书录入
├── BatchImporter.tsx         # 批量导入
├── TypeManager.tsx           # 证书类型管理
├── ClassStatistics.tsx       # 班级统计
└── GlobalAnalytics.tsx       # 全域分析
```

---

## 🔐 权限体系

### 权限定义
```typescript
PRIV_EXAM_VIEW = 1 << 12      // 查看赛考大厅
PRIV_MANAGE_EXAM = 1 << 13    // 管理证书 (教师/管理员)
```

### 访问控制
- **查看自己的证书**: 所有登录用户
- **查看他人的证书**: 所有登录用户 (公开展厅)
- **查看排行榜**: 所有登录用户
- **录入证书**: `PRIV_MANAGE_EXAM`
- **批量导入**: `PRIV_MANAGE_EXAM`
- **管理证书类型**: 管理员权限
- **查看班级统计**: 班级教师 + 管理员
- **查看全域统计**: 管理员

---

## 📥 CSV导入格式规范

### 标准格式
```
学生用户名,证书名称,等级,颁证机构,分类,分数,颁发日期,备注
student001,全国计算机等级考试,一级,教育部,计算机,80,2024-01-15,
student002,全国计算机等级考试,二级,教育部,计算机,75,2024-02-10,特优秀
```

### 字段说明
| 字段 | 必填 | 说明 | 示例 |
|------|------|------|------|
| 学生用户名 | ✅ | 系统中的用户名 | student001 |
| 证书名称 | ✅ | 证书全名 | 全国计算机等级考试 |
| 等级 | ❌ | 证书等级 | 一级、二级 |
| 颁证机构 | ✅ | 颁证机构 | 教育部 |
| 分类 | ✅ | 证书分类 | 计算机、语言、其他 |
| 分数 | ❌ | 考试分数 | 80 |
| 颁发日期 | ✅ | 证书颁发日期 | 2024-01-15 |
| 备注 | ❌ | 其他备注 | 特优秀 |

### 导入逻辑
1. 验证学生用户是否存在
2. 验证证书类型是否存在 (或自动创建)
3. 检查重复 (同学生+同证书+同日期)
4. 更新用户和班级统计
5. 返回导入结果 (成功/失败/重复)

---

## 📅 实现路线图

### Phase 1 (核心功能)
- [ ] 数据模型设计与迁移
- [ ] 证书CRUD接口
- [ ] 证书展厅页面
- [ ] 个人资料页面

### Phase 2 (证书录入)
- [ ] 教师单条录入页面
- [ ] CSV批量导入功能
- [ ] 证书类型管理
- [ ] 导入日志和错误处理

### Phase 3 (排行与统计)
- [ ] 排行榜系统
- [ ] 班级统计页面
- [ ] 全域分析页面
- [ ] 导出功能

### Phase 4 (高级功能)
- [ ] 证书验证系统
- [ ] 分享和二维码
- [ ] 定期快照生成
- [ ] 数据分析仪表板

### Phase 5 (优化与增强)
- [ ] 性能优化
- [ ] 移动端适配
- [ ] 通知提醒
- [ ] 接口文档完善

---

## 💡 核心特点

### 1. 简洁高效
- 聚焦证书管理,不涉及在线考试
- 数据流简单清晰
- 操作流程直观

### 2. 灵活可扩展
- 支持自定义证书类型
- 支持自定义分类
- 支持灵活的统计维度

### 3. 教学友好
- 教师批量导入功能
- 班级统计分析
- 学生获证进度追踪

### 4. 学生友好
- 证书虚拟展厅
- 排行榜激励机制
- 证书分享功能

---

## 🔗 与现有系统的集成

### 与打字速度系统的关联
- 相同的数据库结构和权限模型
- 相同的UI设计风格
- 可共享排行榜展示方式

### 与Hydro OJ的集成
- 使用相同的权限系统 (PRIV_*)
- 使用相同的用户系统 (uid)
- 使用相同的样式和组件库

### 与班级系统的可能集成
- classId 字段预留给班级系统集成
- 支持班级级别的统计和分析

---

## 📊 数据库索引规划

```typescript
// exam.certificates
{ domainId: 1, uid: 1, issueDate: -1 }  // 用户证书查询
{ domainId: 1, issueDate: -1 }           // 全域证书查询
{ certificateCode: 1 }                   // 证书验证

// exam.user_stats
{ uid: 1 }                               // 用户查询 (唯一索引)

// exam.class_stats
{ domainId: 1, classId: 1, year: 1 }    // 班级统计查询

// exam.verification_logs
{ certificateId: 1, verifiedAt: -1 }     // 验证记录查询
```

---

## 🎯 总结

赛考大厅是一个专门为**教学证书管理**而设计的系统:

- **学生端**: 证书展厅 + 排行榜 + 个人资料
- **教师端**: 证书录入 + 批量导入 + 班级统计
- **管理员端**: 全域分析 + 数据管理

通过简洁高效的设计,实现线下赛考证书的数字化管理,提高教学效率,激励学生学习。
