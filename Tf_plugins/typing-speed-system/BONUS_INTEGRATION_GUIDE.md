# 打字奖励系统集成指南

## 概述

本指南说明如何在打字速度系统中集成三个新奖励功能：
1. **打字进步分** (+20分)
2. **打字目标分** (+100-700分)
3. **超越对手奖** (+差值分)

## 系统架构

### 新增服务: TypingBonusService

位置: `src/services/TypingBonusService.ts`

**核心功能**:
- `awardProgressBonus()` - 奖励进步分
- `awardLevelBonus()` - 奖励等级升级分
- `awardSurpassBonus()` - 奖励超越对手分
- `processBonuses()` - 统一处理所有奖励（推荐使用）

### 数据库表结构

#### 1. 进步奖励记录表 (`typing.progress_records`)

```typescript
{
  _id: ObjectId,
  uid: number,                    // 用户ID
  recordId: ObjectId,             // 对应的typing.records ID
  previousMaxWpm: number,         // 之前的最高速度
  newWpm: number,                 // 新的速度
  progressBonus: number,          // 固定20分
  awardedAt: Date,               // 奖励时间
  awardedScoreRecordId?: ObjectId // 对应的score.records ID
}

// 唯一索引
{ uid: 1, recordId: 1 }
```

#### 2. 等级成就记录表 (`typing.level_achievements`)

```typescript
{
  _id: ObjectId,
  uid: number,                     // 用户ID
  level: number,                   // 等级（1-8）
  levelName: string,               // 等级名称
  minWpm: number,                  // 该等级最低WPM
  maxWpm: number,                  // 该等级最高WPM
  targetBonus: number,             // 该等级奖励分数
  achievedAt: Date,               // 首次达成时间
  bonusAwarded: boolean,          // 是否已奖励
  awardedScoreRecordId?: ObjectId, // 对应的score.records ID
  awardedAt?: Date                // 奖励时间
}

// 唯一索引
{ uid: 1, level: 1 }
```

#### 3. 超越对手记录表 (`typing.surpass_records`)

```typescript
{
  _id: ObjectId,
  uid: number,                    // 超越者UID
  surpassedUid: number,           // 被超越者UID
  surpassedUsername: string,      // 被超越者名字
  userWpm: number,                // 超越者的新WPM
  surpassedWpm: number,           // 被超越者当前最高WPM
  bonus: number,                  // 奖励积分（WPM差值）
  surpassBonus: boolean,          // 是否已奖励
  surpassedAt: Date,             // 超越时间
  awardedScoreRecordId?: ObjectId // 对应的score.records ID
}

// 唯一索引
{ uid: 1, surpassedUid: 1 }
```

## 集成步骤

### 1. 初始化索引

在应用启动时调用：

```typescript
const bonusService = new TypingBonusService(ctx);
await bonusService.initializeIndexes();
```

### 2. 在管理员处理器中集成（推荐方式）

更新 `src/handlers/TypingAdminHandlers.ts` 中的 `handleAddRecord` 方法：

```typescript
import {
    TypingRecordService,
    TypingStatsService,
    TypingBonusService,
} from '../services';

private async handleAddRecord() {
    const { username, wpm, note } = this.request.body;

    try {
        // 验证输入
        const wpmNum = Number.parseInt(wpm);
        if (!wpmNum || wpmNum < 0 || wpmNum > 300) {
            this.response.body = { success: false, message: 'WPM必须在0-300之间' };
            return;
        }

        // 查找用户
        const UserModel = global.Hydro.model.user;
        const user = await UserModel.getByUname(this.domain._id, username);

        if (!user) {
            this.response.body = { success: false, message: '用户不存在' };
            return;
        }

        // 获取用户当前统计（用于计算进步）
        const statsService = new TypingStatsService(this.ctx, recordService);
        const currentStats = await statsService.getUserStats(user._id);
        const previousMaxWpm = currentStats?.maxWpm || 0;

        // 添加记录
        const recordService = new TypingRecordService(this.ctx);
        const insertResult = await this.ctx.db.collection('typing.records' as any).insertOne({
            uid: user._id,
            domainId: this.domain._id,
            wpm: wpmNum,
            createdAt: new Date(),
            recordedBy: this.user._id,
            note: note || '',
        });

        const recordId = insertResult.insertedId;

        // 更新统计
        await statsService.updateUserStats(user._id, this.domain._id);
        await statsService.updateWeeklySnapshot(user._id);

        // 处理奖励
        const bonusService = new TypingBonusService(this.ctx);
        const bonusInfo = await bonusService.processBonuses(
            user._id,
            recordId,
            wpmNum,
            previousMaxWpm,
        );

        // 如果有奖励，向积分系统添加记录
        if (bonusInfo.totalBonus > 0) {
            // 需要导入ScoreService
            const ScoreService = require('@score-system/src/services').ScoreService;
            // 假设score.ts有导出配置，这里需要根据实际情况调整
            // const scoreService = new ScoreService({}, this.ctx);

            // 为每个奖励添加积分记录
            for (const bonus of bonusInfo.bonuses) {
                await this.ctx.db.collection('score.records' as any).insertOne({
                    uid: user._id,
                    domainId: this.domain._id,
                    pid: 0,
                    recordId: null,
                    score: bonus.bonus,
                    reason: bonus.reason,
                    createdAt: new Date(),
                });

                // 更新用户积分
                await this.ctx.db.collection('score.users' as any).updateOne(
                    { uid: user._id },
                    {
                        $inc: { totalScore: bonus.bonus },
                        $set: { lastUpdated: new Date() },
                    },
                    { upsert: true },
                );
            }
        }

        console.log(`[TypingAdmin] Admin ${this.user._id} added record for user ${user._id}: ${wpmNum} WPM, bonus: +${bonusInfo.totalBonus}`);

        this.response.body = {
            success: true,
            message: `成功为 ${username} 录入打字速度: ${wpmNum} WPM${bonusInfo.totalBonus > 0 ? `，获得奖励: +${bonusInfo.totalBonus}分` : ''}`,
            bonusInfo,
        };
    } catch (error) {
        console.error('[TypingAdmin] Error adding record:', error);
        this.response.body = { success: false, message: `操作失败：${error.message}` };
    }
}
```

### 3. 批量导入CSV时的奖励处理

更新 `handleImportCSV` 方法：

```typescript
private async handleImportCSV() {
    const { csvData } = this.request.body;

    try {
        if (!csvData || !csvData.trim()) {
            this.response.body = { success: false, message: 'CSV数据为空' };
            return;
        }

        const recordService = new TypingRecordService(this.ctx);
        const statsService = new TypingStatsService(this.ctx, recordService);
        const bonusService = new TypingBonusService(this.ctx);

        let totalBonus = 0;
        const bonusDetails = [];

        // 导入记录
        const result = await recordService.importRecordsFromCSV(
            csvData,
            this.user._id,
            this.domain._id,
        );

        // 处理每条记录的奖励
        const lines = csvData.trim().split('\n');
        const hasHeader = lines[0].trim().toLowerCase().includes('username') &&
                         (lines[0].trim().toLowerCase().includes('wpm') ||
                          lines[0].trim().toLowerCase().includes('speed'));
        const startLine = hasHeader ? 1 : 0;

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(',');
            const username = parts[0].trim();
            const wpm = Number.parseInt(parts[1].trim());

            try {
                const UserModel = global.Hydro.model.user;
                const user = await UserModel.getByUname(this.domain._id, username);
                if (!user) continue;

                // 获取该用户的前一条最高速度
                const currentStats = await statsService.getUserStats(user._id);
                const previousMaxWpm = currentStats?.maxWpm || 0;

                // 获取该用户最新的记录ID（用于匹配奖励）
                const latestRecord = await this.ctx.db.collection('typing.records' as any)
                    .findOne({ uid: user._id }, { sort: { createdAt: -1 } });

                if (latestRecord && latestRecord.wpm === wpm) {
                    // 处理奖励
                    const bonusInfo = await bonusService.processBonuses(
                        user._id,
                        latestRecord._id,
                        wpm,
                        previousMaxWpm,
                    );

                    if (bonusInfo.totalBonus > 0) {
                        // 添加积分记录
                        for (const bonus of bonusInfo.bonuses) {
                            await this.ctx.db.collection('score.records' as any).insertOne({
                                uid: user._id,
                                domainId: this.domain._id,
                                pid: 0,
                                recordId: null,
                                score: bonus.bonus,
                                reason: bonus.reason,
                                createdAt: new Date(),
                            });

                            await this.ctx.db.collection('score.users' as any).updateOne(
                                { uid: user._id },
                                {
                                    $inc: { totalScore: bonus.bonus },
                                    $set: { lastUpdated: new Date() },
                                },
                                { upsert: true },
                            );
                        }

                        totalBonus += bonusInfo.totalBonus;
                        bonusDetails.push({
                            username,
                            wpm,
                            bonus: bonusInfo.totalBonus,
                        });
                    }
                }

                // 更新统计
                await statsService.updateUserStats(user._id, this.domain._id);
                await statsService.updateWeeklySnapshot(user._id);
            } catch (error) {
                console.error(`[TypingAdmin] Error processing bonus for ${username}:`, error);
            }
        }

        console.log(`[TypingAdmin] Admin ${this.user._id} imported ${result.success} records, total bonus: +${totalBonus}`);

        this.response.body = {
            success: true,
            message: `成功导入 ${result.success} 条记录，失败 ${result.failed} 条，总奖励: +${totalBonus}分`,
            data: result,
            bonusDetails,
        };
    } catch (error) {
        console.error('[TypingAdmin] Error importing CSV:', error);
        this.response.body = { success: false, message: `导入失败：${error.message}` };
    }
}
```

## 等级定义

系统使用以下8个等级（与前端保持一致）：

| 级别 | 名称 | 速度范围 | 升级奖励 |
|-----|------|---------|---------|
| 1 | 打字萌新 | 0-20 WPM | 0分 |
| 2 | 打字小匠 | 20-50 WPM | 100分 |
| 3 | 键速高手 | 50-80 WPM | 200分 |
| 4 | 打字宗师 | 80-110 WPM | 300分 |
| 5 | 键速侠客 | 110-140 WPM | 400分 |
| 6 | 打字战神 | 140-170 WPM | 500分 |
| 7 | 键速狂魔 | 170-200 WPM | 600分 |
| 8 | 终极之神 | 200+ WPM | 700分 |

## 奖励示例

### 示例1: 进步 + 升级 + 超越

```
用户A当前: 85 WPM (打字宗师), 排名第10
用户B当前: 92 WPM (打字战神), 排名第9
用户A新增: 95 WPM

触发的奖励:
✓ 进步分: 85 < 95 → +20分
✓ 升级分: 升级到键速侠客 (110-140 WPM范围) → +400分
✓ 超越分: 95 > 92 (超越用户B) → +3分

总奖励: +423分
```

### 示例2: 仅进步

```
用户C当前: 50 WPM (键速高手), 排名第20
用户C新增: 51 WPM

触发的奖励:
✓ 进步分: 50 < 51 → +20分
✗ 升级分: 仍在键速高手范围内，无升级
✗ 超越分: 可能没有排在前一位

总奖励: +20分
```

### 示例3: 首次登顶

```
用户D新增: 210 WPM (首次进步到终极之神等级，排名变为第1)

触发的奖励:
✓ 进步分: +20分
✓ 升级分: 升级到终极之神 → +700分
✗ 超越分: 已是排名第一，无对手

总奖励: +720分
```

## 重要特性

### 1. 防重复奖励

- 每条记录只能被奖励一次进步分（通过`recordId`唯一索引）
- 每个用户每个等级只能被奖励一次升级分（通过`uid+level`唯一索引）
- 每个用户对每个对手只能被奖励一次超越分（通过`uid+surpassedUid`唯一索引）

### 2. 原子性

所有操作使用MongoDB的唯一索引约束保证原子性，避免竞态条件。

### 3. 级联操作顺序

```
1. 插入打字记录
2. 更新用户统计 (maxWpm, avgWpm等)
3. 检查进步 → 奖励进步分
4. 检查升级 → 奖励升级分
5. 检查超越 → 奖励超越分
6. 更新积分
```

## 查询API

### 获取用户的奖励统计

```typescript
const bonusService = new TypingBonusService(ctx);
const stats = await bonusService.getUserBonusStats(uid);

// 返回:
{
  totalProgressBonus: 60,      // 3条进步 × 20分
  totalLevelBonus: 1000,       // 升级了2个等级
  totalSurpassBonus: 15,       // 超越了3个对手（各+5、+5、+5）
  totalBonus: 1075,            // 总计
  progressCount: 3,
  levelCount: 2,
  surpassCount: 3
}
```

### 获取用户的进步记录

```typescript
const progressRecords = await bonusService.getUserProgressRecords(uid, 20);
```

### 获取用户的等级成就

```typescript
const achievements = await bonusService.getUserLevelAchievements(uid);
```

### 获取用户的超越记录

```typescript
const surpassRecords = await bonusService.getUserSurpassRecords(uid, 20);
```

### 获取超越该用户的对手

```typescript
const surpassedBy = await bonusService.getWhoSurpassedUser(uid, 20);
```

## 后续可能的扩展

1. **UI展示** - 在用户资料页显示奖励记录
2. **事件通知** - 用户获得奖励时发送通知
3. **排行榜** - 创建"最多超越对手"、"最快升级"等排行榜
4. **成就系统** - 结合积分系统创建成就勋章
5. **排名变化推送** - 当被超越或超越他人时推送通知

## 故障排查

### 奖励没有生效

检查清单：
1. ✓ 是否调用了 `initializeIndexes()`
2. ✓ 新记录的WPM是否大于用户之前的最高速度
3. ✓ 积分系统中score.records是否成功插入
4. ✓ score.users中totalScore是否被正确更新

### 重复奖励

如果发现重复奖励，检查：
1. 唯一索引是否被正确创建
2. MongoDB是否有足够的空间进行索引操作
3. 是否有多个进程同时处理同一用户的记录

## 参考资源

- `TypingBonusService.ts` - 核心奖励逻辑
- `TypingAdminHandlers.ts` - 管理员处理器（集成示例）
- `TypingStatsService.ts` - 统计服务
- 积分系统文档 - score.records 和 score.users 结构
