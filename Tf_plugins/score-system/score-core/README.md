# HydroOJ 积分系统核心插件

这是积分系统的核心插件，提供AC题目积分奖励和基础积分管理功能。

## 功能特性

- ✅ **AC积分奖励**: 用户首次AC题目自动获得积分
- ✅ **防重复奖励**: 基于唯一索引确保首次AC检测的准确性
- ✅ **积分管理**: 完整的积分增减、查询功能
- ✅ **排行榜**: 全局积分排行榜
- ✅ **积分记录**: 详细的积分变更记录
- ✅ **服务接口**: 为其他插件提供积分操作接口
- ✅ **事件系统**: 积分变更事件通知机制

## 安装配置

### 配置参数

```javascript
{
  enabled: true,    // 是否启用积分系统，默认为true
  acReward: 10      // AC题目奖励积分，默认为10分（范围：1-100）
}
```

### 路由列表

- `/score/hall` - 积分大厅
- `/score/manage` - 积分管理（管理员）
- `/score/ranking` - 积分排行榜
- `/score/records` - 积分记录
- `/score/me` - 个人积分页面

## API接口

### ScoreService

核心积分服务，实现了`IScoreService`接口：

```typescript
interface IScoreService {
  // 积分操作
  addUserScore(domainId: string, uid: number, score: number, reason: string): Promise<ScoreOperationResult>;
  deductUserScore(domainId: string, uid: number, score: number, reason: string): Promise<ScoreOperationResult>;
  
  // 查询功能
  getUserScore(domainId: string, uid: number): Promise<UserScore | null>;
  getUserRank(domainId: string, uid: number): Promise<number | null>;
  getScoreRanking(domainId: string, limit?: number): Promise<UserScore[]>;
  
  // 记录管理
  addScoreRecord(record: Omit<ScoreRecord, '_id' | 'createdAt'>): Promise<void>;
  getUserScoreRecords(domainId: string, uid: number, limit?: number): Promise<ScoreRecord[]>;
  
  // 工具方法
  checkSufficientScore(domainId: string, uid: number, requiredScore: number): Promise<boolean>;
  getTodayStats(domainId: string): Promise<DailyStats>;
}
```

### 事件系统

插件会发布以下事件：

```typescript
import { SCORE_EVENTS } from '@hydrooj/score-core';

// AC奖励事件
ctx.emit(SCORE_EVENTS.AC_REWARDED, {
  uid: number,
  pid: number,
  domainId: string,
  score: number,
  isFirstAC: true,
  problemTitle?: string,
  recordId: any
});

// 积分变更事件
ctx.emit(SCORE_EVENTS.SCORE_CHANGE, {
  uid: number,
  domainId: string,
  change: number,
  reason: string
});

// 积分不足事件
ctx.emit(SCORE_EVENTS.SCORE_INSUFFICIENT, {
  uid: number,
  domainId: string,
  required: number,
  current: number,
  action: string
});
```

## 在其他插件中使用

### 1. 依赖声明

在package.json中添加依赖：

```json
{
  "dependencies": {
    "@hydrooj/score-core": "^1.0.0"
  }
}
```

### 2. 获取积分服务

```typescript
import { getScoreService } from '@hydrooj/score-core';

// 在插件中使用
export default async function apply(ctx: Context) {
  const scoreService = getScoreService();
  
  if (scoreService) {
    // 检查用户积分
    const userScore = await scoreService.getUserScore('system', uid);
    
    // 扣除积分
    const result = await scoreService.deductUserScore('system', uid, 10, '购买道具');
    
    if (result.success) {
      console.log('积分扣除成功');
    }
  }
}
```

### 3. 监听积分事件

```typescript
import { SCORE_EVENTS } from '@hydrooj/score-core';

export default async function apply(ctx: Context) {
  // 监听积分变更
  ctx.on(SCORE_EVENTS.SCORE_CHANGE, (data) => {
    console.log(`用户 ${data.uid} 积分变更: ${data.change}, 原因: ${data.reason}`);
  });
  
  // 监听积分不足事件
  ctx.on(SCORE_EVENTS.SCORE_INSUFFICIENT, (data) => {
    console.log(`用户 ${data.uid} 积分不足: 需要${data.required}, 当前${data.current}`);
  });
}
```

## 数据库结构

### 积分记录表 (score.records)

```typescript
{
  _id: ObjectId,
  uid: number,           // 用户ID
  domainId: string,      // 域ID
  pid: number,           // 题目ID
  recordId: any,         // 记录ID
  score: number,         // 积分变化
  reason: string,        // 变化原因
  createdAt: Date,       // 创建时间
  problemTitle?: string  // 题目标题
}
```

### 用户积分表 (score.users)

```typescript
{
  _id: ObjectId,
  uid: number,            // 用户ID
  totalScore: number,     // 总积分
  acCount: number,        // AC题目数
  lastUpdated: Date,      // 最后更新时间
  migratedFrom?: string[], // 迁移来源
  migratedAt?: Date       // 迁移时间
}
```

## 开发说明

本插件作为积分系统的基础核心，为其他功能插件提供积分操作的统一接口。其他插件（如抽奖、转账、游戏等）应当依赖此插件来进行积分相关操作。