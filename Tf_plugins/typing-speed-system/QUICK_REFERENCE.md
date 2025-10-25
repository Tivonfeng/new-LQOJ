# 打字奖励系统快速参考

## 一句话总结

三个新奖励功能：进步 +20分 | 升级 +100-700分 | 超越 +差值分

## 核心API

### 初始化

```typescript
const bonusService = new TypingBonusService(ctx);
await bonusService.initializeIndexes();
```

### 处理奖励（推荐方式）

```typescript
const bonusInfo = await bonusService.processBonuses(
    userId,      // 用户ID
    recordId,    // 打字记录ID
    newWpm,      // 新速度
    previousMaxWpm // 之前最高速度
);
// bonusInfo.totalBonus       → 总奖励分数
// bonusInfo.bonuses[].type   → 奖励类型: 'progress' | 'level' | 'surpass'
// bonusInfo.bonuses[].bonus  → 奖励分数
// bonusInfo.bonuses[].reason → 奖励原因
```

### 获取统计

```typescript
const stats = await bonusService.getUserBonusStats(userId);
// stats.totalProgressBonus  → 进步分总和
// stats.totalLevelBonus     → 升级分总和
// stats.totalSurpassBonus   → 超越分总和
// stats.totalBonus          → 全部奖励
// stats.progressCount       → 进步次数
// stats.levelCount          → 升级次数
// stats.surpassCount        → 超越次数
```

### 获取记录

```typescript
// 进步记录
const progress = await bonusService.getUserProgressRecords(userId, limit);

// 等级成就
const levels = await bonusService.getUserLevelAchievements(userId);

// 超越记录
const surpass = await bonusService.getUserSurpassRecords(userId, limit);

// 被超越者
const surpassedBy = await bonusService.getWhoSurpassedUser(userId, limit);
```

## 等级表

| 等级 | WPM范围 | 升级奖励 |
|-----|--------|---------|
| 1-打字萌新 | 0-20 | 0 |
| 2-打字小匠 | 20-50 | 100 |
| 3-键速高手 | 50-80 | 200 |
| 4-打字宗师 | 80-110 | 300 |
| 5-键速侠客 | 110-140 | 400 |
| 6-打字战神 | 140-170 | 500 |
| 7-键速狂魔 | 170-200 | 600 |
| 8-终极之神 | 200+ | 700 |

## 奖励规则

### 进步分 (+20)
```
条件: newWpm > 用户历史最高WPM
奖励: 固定20分
防重复: 每条记录仅奖励一次
```

### 升级分 (+100-700)
```
条件: 达到新的等级 (1-8)
奖励: 该等级对应的分数
防重复: 每个等级仅奖励一次
```

### 超越分 (+差值)
```
条件: newWpm > 排名前一名对手的maxWpm
奖励: newWpm - 对手Wpm
防重复: 每个对手仅奖励一次
```

## 数据库表

| 表 | 存储 | 唯一索引 |
|----|------|--------|
| typing.progress_records | 进步记录 | uid, recordId |
| typing.level_achievements | 等级成就 | uid, level |
| typing.surpass_records | 超越记录 | uid, surpassedUid |

## 集成步骤（5分钟快速集成）

### Step 1: 导入
```typescript
import { TypingBonusService } from './src/services';
```

### Step 2: 初始化
```typescript
const bonus = new TypingBonusService(ctx);
await bonus.initializeIndexes(); // 启动时执行
```

### Step 3: 在添加记录后使用
```typescript
const previousMax = currentStats?.maxWpm || 0;
const bonusInfo = await bonus.processBonuses(uid, recordId, wpm, previousMax);

// 如果有奖励
if (bonusInfo.totalBonus > 0) {
    for (const b of bonusInfo.bonuses) {
        await ctx.db.collection('score.records').insertOne({
            uid, domainId, pid: 0, recordId: null,
            score: b.bonus, reason: b.reason, createdAt: new Date()
        });
        await ctx.db.collection('score.users').updateOne(
            { uid },
            { $inc: { totalScore: b.bonus }, $set: { lastUpdated: new Date() } },
            { upsert: true }
        );
    }
}
```

## 常见场景

### 场景1: 用户进步
```
50 → 51 WPM = +20分
```

### 场景2: 用户升级
```
49 → 80 WPM = +20分（进步）+ 200分（升级到键速高手）= 220分
```

### 场景3: 用户超越
```
90 WPM(排11) → 95 WPM(排10，超越92WPM对手) = +20分（进步）+ 3分（超越）= 23分
```

### 场景4: 登顶
```
85 → 210 WPM = +20分（进步）+ 700分（升级到终极之神）= 720分
```

## 故障排查

| 问题 | 检查项 |
|------|-------|
| 没有奖励 | 1.WPM是否真的增加？ 2.previousMaxWpm正确吗？ 3.积分是否添加到score表？ |
| 重复奖励 | 检查唯一索引是否创建成功 |
| 等级没奖励 | 该等级bonus是否 > 0？是否已奖励过？ |
| 超越没奖励 | 是否第一名？是否已超越过？WPM是否真的更高？ |

## 文件位置

```
核心服务:    src/services/TypingBonusService.ts
集成指南:    BONUS_INTEGRATION_GUIDE.md
使用示例:    BONUS_USAGE_EXAMPLE.ts
项目总结:    IMPLEMENTATION_SUMMARY.md
快速参考:    QUICK_REFERENCE.md (本文件)
```

## 关键方法速查

| 方法 | 用途 | 返回值 |
|-----|------|--------|
| `processBonuses()` | 处理所有奖励 | {totalBonus, bonuses[]} |
| `awardProgressBonus()` | 奖励进步分 | {awarded, bonus, reason} |
| `awardLevelBonus()` | 奖励升级分 | {awarded, bonus, reason} |
| `awardSurpassBonus()` | 奖励超越分 | {awarded, bonus, reason, surpassedUser} |
| `getUserBonusStats()` | 获取统计 | {total*, *Count} |
| `getUserProgressRecords()` | 获取进步记录 | ProgressBonusRecord[] |
| `getUserLevelAchievements()` | 获取等级成就 | LevelAchievementRecord[] |
| `getUserSurpassRecords()` | 获取超越记录 | SurpassRecord[] |
| `getWhoSurpassedUser()` | 获取被超越者 | SurpassRecord[] |

## 参考资源

- 📖 完整指南: `BONUS_INTEGRATION_GUIDE.md`
- 💻 代码示例: `BONUS_USAGE_EXAMPLE.ts`
- 📊 项目概览: `IMPLEMENTATION_SUMMARY.md`
- 🔍 本文件: `QUICK_REFERENCE.md`

## 检查清单

- [ ] 导入 TypingBonusService
- [ ] 启动时调用 initializeIndexes()
- [ ] 记录添加时调用 processBonuses()
- [ ] CSV导入时循环处理奖励
- [ ] 奖励写入score.records
- [ ] 奖励更新score.users
- [ ] 测试所有奖励类型
- [ ] 验证防重复机制
- [ ] 监控错误日志

---

**更多帮助**: 查看 BONUS_INTEGRATION_GUIDE.md 或 BONUS_USAGE_EXAMPLE.ts
