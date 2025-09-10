# 思考时间追踪插件

这个插件用于记录用户在 Hydro 题目页面上的思考时间，采用活跃时间计算方案。

## 功能特性

- ✅ **活跃时间追踪**: 只记录用户真正活跃的思考时间
- ✅ **智能暂停**: 页面隐藏、长时间无交互时自动暂停计时
- ✅ **数据持久化**: 将时间数据存储到独立的 MongoDB 集合
- ✅ **提交拦截**: 自动在代码提交时记录思考时间
- ✅ **统计分析**: 提供用户和题目的时间统计功能

## 安装使用

1. **复制插件到 Hydro 插件目录**：
   ```bash
   cp -r thinking-time-tracker /path/to/hydro/plugins/
   ```

2. **启用插件**：
   在 Hydro 配置中添加插件名称。

3. **重启 Hydro 服务**。

## 工作原理

### 思考时间计算方式

插件采用**活跃时间追踪**方式计算思考时间：

1. **开始计时**: 用户进入题目页面时开始计时
2. **活跃检测**: 监听用户的交互事件（鼠标移动、键盘输入、点击、滚动）
3. **智能暂停**: 在以下情况下暂停计时：
   - 页面失去焦点或隐藏
   - 5分钟内无任何交互
4. **自动恢复**: 用户重新交互时恢复计时
5. **提交记录**: 代码提交时自动记录总的活跃时间

### 数据存储结构

```javascript
{
  _id: ObjectId,           // 记录ID
  uid: number,             // 用户ID
  pid: number,             // 题目ID
  domainId: string,        // 域ID
  thinkingTime: number,    // 活跃思考时间（秒）
  totalTime: number,       // 总在线时间（秒）
  efficiency: number,      // 效率比例 (thinkingTime/totalTime)
  startTime: Date,         // 开始时间
  submitTime: Date,        // 提交时间
  rid: ObjectId,           // 关联的提交记录ID
  status: number           // 提交状态（AC=1）
}
```

## API 接口

### 记录时间数据
```
POST /thinking-time
{
  "pid": 1001,
  "thinkingTime": 1200,  // 秒
  "totalTime": 1800,     // 秒
  "rid": "..."           // 可选，提交记录ID
}
```

### 获取用户统计
```
GET /thinking-time/stats?uid=123
```

### 获取题目统计
```
GET /thinking-time/stats?pid=1001
```

## 调试模式

在浏览器控制台中启用调试模式：

```javascript
// 启用调试模式
localStorage.setItem('thinking-time-debug', 'true');

// 刷新页面后可以使用调试接口
window.thinkingTimeTracker.getActiveTime();  // 获取活跃时间
window.thinkingTimeTracker.getTotalTime();   // 获取总时间
```

## 技术细节

### 前端实现
- 使用 `document.visibilitychange` 监听页面可见性
- 通过事件监听检测用户交互
- 拦截 `request.post` 方法捕获提交请求
- 节流机制避免频繁触发

### 后端实现
- MongoDB 数据持久化
- 数据验证和异常处理
- 索引优化查询性能
- 事件监听更新提交状态

### 性能优化
- 防抖和节流减少计算频率
- 数据库索引提升查询速度
- 内存缓存减少重复计算

## 注意事项

1. **隐私保护**: 只记录时间统计，不记录具体的用户行为
2. **数据准确性**: 排除页面隐藏和长时间无交互的时间
3. **兼容性**: 支持 scratchpad 和普通提交页面
4. **性能影响**: 极小的性能开销，不影响正常使用

## 未来扩展

- [ ] 可视化统计图表
- [ ] 时间分段分析（读题、编码、调试）
- [ ] 多语言支持
- [ ] 导出功能

## 许可证

MIT License