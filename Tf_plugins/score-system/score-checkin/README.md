# HydroOJ 签到系统插件

积分系统的签到功能插件，提供每日签到积分奖励功能。

## 功能特性

- ✅ **每日签到**: 用户每天可签到一次获得积分奖励
- ✅ **连续签到奖励**: 连续签到可获得额外积分奖励
- ✅ **签到统计**: 记录用户签到历史和统计数据
- ✅ **签到日历**: 可视化展示签到记录
- ✅ **防重复签到**: 确保每天只能签到一次
- ✅ **连续签到计算**: 自动计算连续签到天数和最大连续纪录

## 依赖关系

本插件依赖 `@hydrooj/score-core` 核心积分插件：
- 使用积分核心服务进行积分增减操作
- 监听积分变更事件进行统计
- 通过服务注册器获取积分服务实例

## 安装配置

### 前置条件

确保已安装并启用 `@hydrooj/score-core` 插件。

### 配置参数

```javascript
{
  enabled: true,             // 是否启用签到系统，默认为true
  dailyReward: 5,            // 每日签到基础积分奖励，默认为5
  consecutiveBonus: true,    // 是否启用连续签到奖励，默认为true
  maxConsecutiveBonus: 10    // 连续签到最大奖励倍数，默认为10
}
```

### 积分奖励规则

- **基础奖励**: 每日签到获得 `dailyReward` 积分
- **连续奖励**: 每连续签到3天，额外获得1积分
- **奖励上限**: 最多额外获得 `maxConsecutiveBonus` 积分
- **计算公式**: `总积分 = 基础积分 + min(连续天数÷3, 最大奖励)`

示例：
- 连续1天: 5积分 (基础)
- 连续3天: 6积分 (基础5 + 奖励1)
- 连续6天: 7积分 (基础5 + 奖励2)
- 连续30天: 15积分 (基础5 + 奖励10，达到上限)

## 路由接口

### 签到页面
- **URL**: `/score/checkin`
- **方法**: GET
- **功能**: 显示签到页面，包含签到按钮、统计信息、签到日历等

### 执行签到
- **URL**: `/score/checkin`  
- **方法**: POST
- **参数**: `{ "action": "checkin" }`
- **返回**: 
  ```javascript
  {
    success: boolean,
    message: string,
    score?: number,        // 获得的积分
    streak?: number,       // 连续签到天数
    isFirstTime?: boolean  // 是否首次签到
  }
  ```

## 数据库结构

### 签到记录表 (checkin.records)

```typescript
{
  _id: ObjectId,
  uid: number,           // 用户ID
  checkInDate: string,   // 签到日期 (YYYY-MM-DD)
  score: number,         // 获得积分
  isConsecutive: boolean,// 是否连续签到
  streak: number,        // 当时连续天数
  createdAt: Date        // 创建时间
}
```

### 用户签到统计表 (checkin.stats)

```typescript
{
  _id: ObjectId,
  uid: number,          // 用户ID
  totalDays: number,    // 总签到天数
  currentStreak: number,// 当前连续天数
  maxStreak: number,    // 最大连续天数
  lastCheckIn: string,  // 最后签到日期 (YYYY-MM-DD)
  lastUpdated: Date     // 最后更新时间
}
```

## API接口

### CheckInService

签到核心服务，提供以下方法：

```typescript
class CheckInService {
  // 执行签到
  checkIn(domainId: string, uid: number): Promise<CheckInResult>;
  
  // 检查今日是否已签到
  hasCheckedInToday(uid: number): Promise<boolean>;
  
  // 获取用户签到统计
  getUserCheckInStats(uid: number): Promise<UserCheckInStats | null>;
  
  // 获取签到历史记录
  getCheckInHistory(uid: number, limit?: number): Promise<DailyCheckInRecord[]>;
  
  // 获取月度签到记录
  getMonthlyCheckIns(uid: number, year?: number, month?: number): Promise<DailyCheckInRecord[]>;
  
  // 计算签到积分
  calculateCheckInScore(streak: number): number;
}
```

## 事件监听

插件监听以下事件：

```typescript
// 监听积分变更事件
ctx.on('score/change', (data) => {
  if (data.reason.includes('签到')) {
    // 处理签到相关的积分变更
  }
});
```

## 前端页面

签到页面包含以下元素：
- 签到按钮和状态显示
- 用户签到统计信息
- 当前积分显示
- 签到历史记录
- 月度签到日历
- 连续签到奖励预览

## 使用示例

### 在其他插件中获取签到服务

```typescript
import { ServiceRegistry } from '@hydrooj/score-core';

export default async function apply(ctx: Context) {
  const serviceRegistry = ServiceRegistry.getInstance();
  const checkinService = serviceRegistry.get('checkin');
  
  if (checkinService) {
    // 检查用户今日是否已签到
    const hasChecked = await checkinService.hasCheckedInToday(uid);
    console.log('今日签到状态:', hasChecked);
  }
}
```

### 监听签到事件

```typescript
export default async function apply(ctx: Context) {
  // 监听签到成功事件
  ctx.on('score/change', (data) => {
    if (data.reason.includes('签到')) {
      console.log(`用户 ${data.uid} 签到获得 ${data.change} 积分`);
    }
  });
}
```

## 开发说明

本插件作为积分系统的功能扩展，专注于签到功能的实现。通过服务注册器与积分核心插件进行解耦通信，确保了良好的模块化架构。

签到插件的设计遵循以下原则：
- 依赖积分核心插件进行积分操作
- 通过事件系统进行插件间通信  
- 保持数据的一致性和准确性
- 提供直观的用户界面和良好的用户体验