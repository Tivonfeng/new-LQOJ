# HydroOJ 转账系统插件

积分系统的转账功能插件，提供用户间积分转账功能。

## 功能特性

- ✅ **安全转账**: 用户间安全的积分转账功能
- ✅ **手续费机制**: 可配置的转账手续费率
- ✅ **转账限制**: 单笔和每日转账金额限制
- ✅ **转账记录**: 完整的转账历史记录
- ✅ **余额检查**: 自动检查发送方余额是否足够
- ✅ **原子操作**: 确保转账过程的原子性，失败时自动回滚
- ✅ **管理功能**: 管理员可查看所有转账记录

## 依赖关系

本插件依赖 `@hydrooj/score-core` 核心积分插件：
- 使用积分核心服务进行积分扣除和增加
- 通过服务注册器获取积分服务实例
- 监听积分相关事件进行转账状态跟踪

## 安装配置

### 前置条件

确保已安装并启用 `@hydrooj/score-core` 插件。

### 配置参数

```javascript
{
  enabled: true,              // 是否启用转账系统，默认为true
  minTransferAmount: 1,       // 最小转账金额，默认为1
  maxTransferAmount: 1000,    // 最大转账金额，默认为1000
  transferFeeRate: 0,         // 转账手续费率 (0-1)，默认为0
  dailyTransferLimit: 5000,   // 每日转账限额，默认为5000
  enableTransferFee: false    // 是否启用转账手续费，默认为false
}
```

### 转账规则

- **金额限制**: 单笔转账金额需在 `minTransferAmount` 到 `maxTransferAmount` 范围内
- **手续费计算**: `手续费 = 转账金额 × transferFeeRate` (仅在启用时)
- **总扣除**: `扣除金额 = 转账金额 + 手续费`
- **每日限制**: 每个用户每日转账总额不超过 `dailyTransferLimit`
- **用户验证**: 自动验证接收方用户是否存在
- **自转限制**: 禁止用户给自己转账

## 路由接口

### 转账页面
- **URL**: `/score/transfer`
- **方法**: GET
- **功能**: 显示转账页面，包含转账表单和用户积分信息

### 创建转账
- **URL**: `/score/transfer/create`
- **方法**: POST
- **参数**: 
  ```javascript
  {
    toUsername: string,  // 接收方用户名
    amount: number,      // 转账金额
    reason?: string      // 转账原因（可选）
  }
  ```
- **返回**: 
  ```javascript
  {
    success: boolean,
    message: string,
    transactionId?: string  // 成功时返回交易ID
  }
  ```

### 转账历史
- **URL**: `/score/transfer/history`
- **方法**: GET
- **功能**: 查看用户的转账历史记录

### 转账管理（管理员）
- **URL**: `/score/transfer/admin`
- **方法**: GET
- **功能**: 管理员查看所有转账记录

## 数据库结构

### 转账记录表 (transfer.records)

```typescript
{
  _id: ObjectId,
  fromUid: number,          // 发送方用户ID
  toUid: number,            // 接收方用户ID
  amount: number,           // 转账金额
  fee: number,              // 手续费
  status: 'pending' | 'completed' | 'failed' | 'cancelled',
  reason?: string,          // 转账原因
  createdAt: Date,          // 创建时间
  completedAt?: Date,       // 完成时间
  transactionId: string     // 交易ID
}
```

## API接口

### TransferService

转账核心服务，提供以下方法：

```typescript
class TransferService {
  // 创建转账
  createTransfer(
    fromUid: number,
    toUsername: string,
    amount: number,
    reason?: string
  ): Promise<{success: boolean, message: string}>;
  
  // 获取用户转账记录
  getUserTransfers(
    uid: number,
    limit?: number
  ): Promise<TransferRecord[]>;
  
  // 检查每日转账限制
  checkDailyLimit(uid: number): Promise<boolean>;
  
  // 获取转账统计
  getTransferStats(
    uid: number
  ): Promise<{totalSent: number, totalReceived: number, totalFees: number}>;
}
```

## 事件系统

插件监听以下事件：

```typescript
// 监听积分变更事件
ctx.on('score/change', (data) => {
  if (data.reason.includes('转账')) {
    // 处理转账相关的积分变更
  }
});

// 监听积分不足事件
ctx.on('score/insufficient', (data) => {
  if (data.action.includes('转账')) {
    // 处理转账失败情况
  }
});
```

## 转账流程

1. **参数验证**: 验证转账金额、接收方用户等参数
2. **余额检查**: 检查发送方余额是否足够（含手续费）
3. **限制检查**: 检查是否超出每日转账限制
4. **原子操作**: 执行积分扣除和增加操作
5. **记录创建**: 创建转账记录到数据库
6. **状态更新**: 更新转账状态为已完成
7. **事件通知**: 发布相关事件供其他插件监听

## 安全机制

- **原子性保证**: 使用事务确保扣除和增加操作的原子性
- **自动回滚**: 转账失败时自动回滚已扣除的积分
- **重复验证**: 多层验证确保转账参数的合法性
- **用户验证**: 验证接收方用户的存在性
- **余额保护**: 防止余额不足时的非法转账

## 使用示例

### 在其他插件中获取转账服务

```typescript
import { ServiceRegistry } from '@hydrooj/score-core';

export default async function apply(ctx: Context) {
  const serviceRegistry = ServiceRegistry.getInstance();
  const transferService = serviceRegistry.get('transfer');
  
  if (transferService) {
    // 获取用户转账统计
    const stats = await transferService.getTransferStats(uid);
    console.log('转账统计:', stats);
  }
}
```

### 监听转账事件

```typescript
export default async function apply(ctx: Context) {
  // 监听转账成功事件
  ctx.on('score/change', (data) => {
    if (data.reason.includes('转账')) {
      if (data.change > 0) {
        console.log(`用户 ${data.uid} 收到转账 ${data.change} 积分`);
      } else {
        console.log(`用户 ${data.uid} 转出 ${-data.change} 积分`);
      }
    }
  });
}
```

## 前端界面

转账页面包含以下功能：
- 转账表单（接收方用户名、金额、原因）
- 当前用户积分显示
- 转账手续费计算
- 转账历史记录列表
- 转账状态显示

## 开发说明

本插件作为积分系统的重要组成部分，提供安全可靠的用户间积分转账功能。通过与积分核心服务的紧密集成，确保了转账操作的准确性和一致性。

转账插件的设计遵循以下原则：
- 安全第一，确保所有转账操作的安全性
- 原子性操作，避免数据不一致
- 完整的审计日志，方便问题排查
- 灵活的配置选项，适应不同场景需求