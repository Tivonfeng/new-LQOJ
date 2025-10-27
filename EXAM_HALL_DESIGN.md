# 赛考大厅（Exam Hall）插件设计文档

## 📋 项目概述

**赛考大厅**是一个用于管理线下赛考证书、追踪学生获证情况、统计成绩的教学管理插件。

学生参加**线下赛考**（如全国计算机等级考试、英语等级考试等）获得证书后，教师通过此系统录入学生的证书信息。

### 核心功能
- 📜 证书录入与管理（教师端）
- 🏆 学生证书展厅与排行榜
- 📊 证书统计与分析
- 🔍 证书验证与查询
- 👥 班级/学年统计
- 📈 学生获证进度追踪

---

## 🏗️ 系统架构

### 1. 数据模型

#### 1.1 证书记录 (exam.certificates)
```typescript
interface ExamRecord {
  _id: ObjectId;
  domainId: number;           // 所属域
  uid: number;                 // 用户ID
  examId: string;              // 赛考ID
  examName: string;            // 赛考名称
  category: string;            // 赛考分类 (初级/中级/高级)
  score: number;               // 分数 (0-100)
  maxScore: number;            // 满分
  duration: number;            // 考试时长(分钟)
  status: 'passed' | 'failed' | 'pending'; // 状态
  certificateId?: string;      // 证书ID (通过后)
  certificateCode?: string;    // 证书编码
  createdAt: Date;             // 创建时间
  updatedAt: Date;             // 更新时间
  details?: {                  // 详细信息
    questions: number;         // 题目数
    correctCount: number;      // 正确数
    passScore: number;         // 及格分
  };
}
```

#### 1.2 赛考配置 (exam.configs)
```typescript
interface ExamConfig {
  _id: ObjectId;
  domainId: number;
  examId: string;
  examName: string;
  category: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  passScore: number;           // 及格分(%)
  maxScore: number;            // 满分
  totalQuestions: number;      // 总题数
  timeLimit: number;           // 时间限制(分钟)
  isActive: boolean;           // 是否开放
  certificateTemplate: string; // 证书模板ID
  createdAt: Date;
  updatedAt: Date;
}
```

#### 1.3 证书 (exam.certificates)
```typescript
interface Certificate {
  _id: ObjectId;
  domainId: number;
  uid: number;
  recordId: ObjectId;          // 关联考试记录
  certificateId: string;       // 证书唯一ID
  certificateCode: string;     // 证书编码 (如: CERT-2024-001-001)
  examName: string;
  category: string;
  score: number;
  issueDate: Date;             // 颁发日期
  expiryDate?: Date;           // 过期日期 (可选)
  status: 'active' | 'expired' | 'revoked'; // 状态
  imageUrl?: string;           // 证书图片URL
  qrCode?: string;             // 二维码 (验证链接)
  createdAt: Date;
}
```

#### 1.4 学生赛考统计 (exam.user_stats)
```typescript
interface ExamUserStats {
  _id: ObjectId;
  uid: number;
  totalExams: number;          // 总赛考数
  passedExams: number;         // 通过数
  failedExams: number;         // 失败数
  avgScore: number;            // 平均分
  maxScore: number;            // 最高分
  minScore: number;            // 最低分
  certificates: number;        // 证书数
  categoryStats: {             // 分类统计
    [category: string]: {
      attempted: number;
      passed: number;
      avgScore: number;
    };
  };
  lastExamDate: Date;          // 最后考试日期
  updatedAt: Date;
}
```

#### 1.5 目标追踪 (exam.goals)
```typescript
interface ExamGoal {
  _id: ObjectId;
  domainId: number;
  uid: number;
  goalId: string;
  description: string;         // 目标描述
  category: string;            // 赛考分类
  targetScore: number;         // 目标分数
  deadline: Date;              // 截止日期
  progress: number;            // 进度 (%)
  status: 'active' | 'completed' | 'failed'; // 状态
  bestScore: number;           // 最佳成绩
  attempts: number;            // 尝试次数
  createdAt: Date;
  updatedAt: Date;
}
```

#### 1.6 排行榜快照 (exam.leaderboard_snapshots)
```typescript
interface LeaderboardSnapshot {
  _id: ObjectId;
  domainId: number;
  period: string;              // 周期 (week/month)
  periodDate: Date;            // 周期日期
  category?: string;           // 赛考分类 (可选)
  rankings: Array<{
    uid: number;
    score: number;
    passed: number;
    certificates: number;
  }>;
  createdAt: Date;
}
```

---

## 📱 前端页面设计

### 2.1 赛考大厅首页 (exam-hall.page.tsx)
**路由**: `/exam/hall`

**页面构成**:
- 🎯 Hero Banner - 欢迎区域 + 快速统计
- 📊 个人赛考统计卡片
  - 总赛考数 / 通过数 / 证书数
  - 平均分 / 最高分
- 🎯 目标追踪面板
  - 活跃目标列表
  - 进度条显示
  - 目标完成度
- 🏆 分类赛考导航
  - 初级/中级/高级分类
  - 各类别的统计数据
- 📈 最近赛考记录
  - 显示最近5次考试
  - 通过/失败状态
  - 操作按钮(查看证书)

### 2.2 赛考报名/参加 (exam-participate.page.tsx)
**路由**: `/exam/participate/:examId`

**功能**:
- 赛考详情展示
- 准入条件检查
- 报名确认
- 历史尝试记录
- 成绩反馈

### 2.3 证书管理 (certificate-center.page.tsx)
**路由**: `/exam/certificates`

**功能**:
- 📜 证书列表
  - 证书卡片展示 (图片缩略图)
  - 证书编码 / 颁发日期
  - 下载按钮
  - 分享按钮 (QR码)
- 🔍 证书验证
  - 扫码验证
  - 编码查询验证
- 📊 证书统计
  - 按分类统计
  - 按时间统计

### 2.4 排行榜 (exam-ranking.page.tsx)
**路由**: `/exam/ranking`

**功能**:
- 📊 多维度排行
  - 综合排行 (总成绩)
  - 分类排行 (初/中/高)
  - 证书排行
  - 本周/本月排行
- 🏅 排名展示
  - Top 10/100
  - 自己的排名位置
  - 分数/进度详情

### 2.5 个人赛考中心 (exam-profile.page.tsx)
**路由**: `/exam/profile` 或 `/exam/me`

**功能**:
- 👤 个人成绩总览
  - 统计卡片
  - 成绩曲线图
- 📋 赛考历史记录
  - 分类筛选
  - 状态筛选
  - 详细信息查看
- 🎯 目标管理
  - 创建新目标
  - 编辑/删除目标
  - 目标完成度统计

### 2.6 教师后台管理 (exam-admin.page.tsx)
**路由**: `/exam/admin`

**权限**: PRIV_MANAGE_EXAM (新权限)

**功能**:
- 📝 赛考配置管理
  - 新建赛考
  - 编辑赛考信息
  - 设置及格分/时间限制
  - 启用/禁用赛考
- 📊 成绩管理
  - 导入成绩 (CSV/Excel)
  - 编辑单个成绩
  - 批量操作
  - 成绩统计导出
- 📜 证书管理
  - 证书模板管理
  - 批量颁发证书
  - 撤销证书
  - 验证记录查看
- 📈 数据分析
  - 赛考参与率
  - 平均分析
  - 通过率统计
  - 分类对比分析

---

## 🔧 后端处理器设计

### 3.1 赛考大厅处理器 (ExamHallHandler)
**响应路由**: `GET /exam/hall`

**职责**:
- 获取用户赛考统计
- 获取活跃目标
- 获取最近考试记录
- 获取分类赛考列表
- 计算用户排名

**数据流**:
```
ExamHallHandler
  ├─ ExamStatsService.getUserStats()
  ├─ ExamGoalService.getActiveGoals()
  ├─ ExamRecordService.getRecentRecords()
  ├─ ExamConfigService.getCategories()
  └─ ExamRankingService.getUserRank()
```

### 3.2 参加赛考处理器 (ExamParticipateHandler)
**响应路由**:
- `GET /exam/participate/:examId` - 获取赛考信息
- `POST /exam/participate/:examId` - 提交成绩

**职责**:
- 检查赛考配置
- 检查用户权限
- 记录考试成绩
- 判断是否通过
- 自动颁发证书

### 3.3 证书处理器 (CertificateHandler)
**响应路由**:
- `GET /exam/certificates` - 获取用户证书列表
- `GET /exam/certificates/:id` - 获取证书详情
- `GET /exam/verify/:code` - 验证证书

**职责**:
- 管理证书数据
- 生成证书编码
- 生成证书图片/PDF
- 验证证书有效性

### 3.4 排行榜处理器 (ExamRankingHandler)
**响应路由**:
- `GET /exam/ranking` - 获取排行榜数据
- `GET /exam/ranking/:category` - 按分类获取排行

### 3.5 个人资料处理器 (ExamProfileHandler)
**响应路由**:
- `GET /exam/me` - 获取用户详细资料

### 3.6 管理后台处理器 (ExamAdminHandler)
**响应路由**:
- `GET /exam/admin/configs` - 获取赛考配置列表
- `POST /exam/admin/configs` - 创建赛考
- `PUT /exam/admin/configs/:id` - 更新赛考
- `POST /exam/admin/records/import` - 导入成绩
- `POST /exam/admin/certificates/batch` - 批量颁发证书
- `GET /exam/admin/analytics` - 获取数据分析

---

## 🔧 业务服务层设计

### 4.1 ExamRecordService
- `createRecord(uid, examId, score)` - 创建考试记录
- `getRecords(uid, filters)` - 获取用户考试记录
- `importRecords(csv)` - 批量导入成绩
- `updateRecord(recordId, data)` - 更新记录

### 4.2 ExamStatsService
- `getUserStats(uid)` - 获取用户统计
- `getCategoryStats(uid)` - 按分类获取统计
- `updateStats(uid, examRecord)` - 更新统计数据
- `calculateProgress(uid, targetScore)` - 计算进度

### 4.3 CertificateService
- `issueCertificate(recordId, examConfig)` - 颁发证书
- `generateCertificateCode()` - 生成证书编码
- `generateCertificateImage(data)` - 生成证书图片
- `verifyCertificate(code)` - 验证证书
- `revokeCertificate(certificateId)` - 撤销证书
- `batchIssueCertificates(records)` - 批量颁发

### 4.4 ExamGoalService
- `createGoal(uid, goal)` - 创建目标
- `updateGoal(goalId, data)` - 更新目标
- `deleteGoal(goalId)` - 删除目标
- `getActiveGoals(uid)` - 获取活跃目标
- `checkGoalCompletion(uid, examRecord)` - 检查目标完成

### 4.5 ExamRankingService
- `getRanking(category?, period?)` - 获取排行榜
- `getUserRank(uid, category?)` - 获取用户排名
- `generateLeaderboardSnapshot()` - 生成排行榜快照

### 4.6 ExamConfigService
- `getConfig(examId)` - 获取赛考配置
- `createConfig(data)` - 创建赛考
- `updateConfig(examId, data)` - 更新赛考
- `getCategories()` - 获取所有分类

---

## 📊 前端组件化设计

### React 组件结构

```
├── ExamHall/
│   ├── ExamHallPage.tsx       # 主页面
│   ├── HeroSection.tsx         # Hero区域
│   ├── StatsCard.tsx           # 统计卡片
│   ├── GoalTracker.tsx         # 目标追踪
│   ├── CategoryGrid.tsx        # 分类导航
│   └── RecentRecords.tsx       # 最近记录
├── ExamParticipate/
│   ├── ParticipateePage.tsx    # 参加考试页面
│   ├── ExamDetails.tsx         # 考试详情
│   ├── HistoryAttempts.tsx     # 历史尝试
│   └── ScoreFeedback.tsx       # 成绩反馈
├── Certificates/
│   ├── CertificateCenter.tsx   # 证书中心
│   ├── CertificateList.tsx     # 证书列表
│   ├── CertificateCard.tsx     # 证书卡片
│   ├── VerifyModal.tsx         # 验证模态
│   └── ShareModal.tsx          # 分享模态
├── Rankings/
│   ├── RankingPage.tsx         # 排行榜页面
│   ├── RankingTabs.tsx         # 分类标签
│   ├── RankingTable.tsx        # 排行榜表格
│   └── RankChart.tsx           # 排行图表
├── Profile/
│   ├── ProfilePage.tsx         # 个人资料
│   ├── StatsOverview.tsx       # 统计概览
│   ├── ScoreCurve.tsx          # 成绩曲线
│   ├── RecordList.tsx          # 记录列表
│   └── GoalManager.tsx         # 目标管理
└── Admin/
    ├── AdminPanel.tsx          # 管理后台
    ├── ConfigManager.tsx       # 赛考配置
    ├── RecordImporter.tsx      # 成绩导入
    ├── CertificateManager.tsx  # 证书管理
    └── Analytics.tsx           # 数据分析
```

---

## 🎨 UI/UX 设计亮点

### 1. 视觉层级
- 使用打字插件相同的设计系统
- 保持一致的色彩方案
- 响应式设计

### 2. 交互设计
- 平滑的过渡动画
- 实时数据更新
- 进度条动画
- 成功/失败反馈

### 3. 信息展示
- 卡片式布局
- 数据可视化 (图表)
- 排行榜热力显示
- 证书虚拟展厅

---

## 🔐 权限与安全

### 权限定义
```typescript
PRIV_EXAM_PARTICIPATE  = 1 << 12  // 参加考试
PRIV_EXAM_VIEW_GRADES  = 1 << 13  // 查看成绩
PRIV_MANAGE_EXAM       = 1 << 14  // 管理赛考 (教师)
```

### 安全措施
- 成绩只有自己和教师能查看
- 证书编码防篡改 (Hash验证)
- 考试时间记录防作弊
- 批量操作需要确认

---

## 📅 实现路线图

### Phase 1 (基础功能)
- [ ] 数据模型设计与迁移
- [ ] 赛考记录 CRUD
- [ ] 用户统计计算
- [ ] 赛考大厅基础页面

### Phase 2 (证书系统)
- [ ] 证书数据模型
- [ ] 证书自动颁发逻辑
- [ ] 证书验证系统
- [ ] 证书中心页面

### Phase 3 (排行与目标)
- [ ] 排行榜系统
- [ ] 目标管理系统
- [ ] 排行榜页面
- [ ] 个人资料页面

### Phase 4 (后台管理)
- [ ] 教师后台框架
- [ ] 赛考配置管理
- [ ] 成绩导入系统
- [ ] 数据分析面板

### Phase 5 (优化与增强)
- [ ] 通知提醒系统
- [ ] 数据导出功能
- [ ] 移动端适配
- [ ] 性能优化

---

## 💡 核心亮点功能

### 1. 智能目标追踪
- 自动计算进度
- 完成时自动更新状态
- 进度可视化

### 2. 证书系统
- 自动颁发
- 二维码验证
- 虚拟证书展厅

### 3. 多维排行
- 按总成绩排行
- 按分类排行
- 按通过数排行
- 按时间段排行

### 4. 数据分析
- 个人成绩走势
- 分类对比
- 通过率统计
- 趋势预测

---

## 📖 用户场景

### 学生视角
1. 登录看到赛考大厅
2. 查看个人统计与目标进度
3. 点击分类选择赛考
4. 参加考试提交成绩
5. 自动获得证书
6. 查看排名与排行榜
7. 下载/分享证书

### 教师视角
1. 管理赛考配置
2. 导入学生成绩
3. 批量颁发证书
4. 查看班级数据分析
5. 查看学生进度
6. 导出成绩报告

---

## 🔗 与现有系统的集成

### 与打字速度系统的关联
- 可以将打字成绩作为赛考的一种
- 共享排行榜展示方式
- 共享用户统计模块

### 与Hydro OJ的集成
- 使用相同的权限系统
- 使用相同的用户系统
- 使用相同的样式系统

---

## 📝 总结

赛考大厅是一个完整的教学管理系统,包含:
- **记录追踪**: 完整的考试成绩管理
- **证书系统**: 自动化证书颁发与验证
- **排行榜**: 多维度的学生评比
- **目标管理**: 学生学习目标追踪
- **数据分析**: 教师教学效果评估
- **后台管理**: 完整的管理工具

通过模块化设计,易于扩展和维护,可以满足不同学校的定制需求。
