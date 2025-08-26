# Hydro 打字练习插件

一个功能完整的打字练习插件，集成了积分系统、成就系统和详细的统计分析功能。

## 功能特色

### 🎯 核心功能
- **实时打字练习**: 支持多种难度级别和文本类型
- **精确统计**: 实时WPM、准确率、进度追踪
- **自定义文本**: 支持用户自定义练习文本
- **智能推荐**: 基于用户水平的个性化文本推荐

### 📊 统计分析
- **详细统计**: 个人最佳成绩、平均表现、练习历史
- **进步追踪**: 可视化进度图表和热力图
- **错误分析**: 识别常见错误字符，提供改进建议
- **排行榜**: 多维度用户排名系统

### 🏆 成就系统
- **多样成就**: 速度、准确率、坚持度等多种成就类型
- **积分奖励**: 与Hydro积分系统完全集成
- **等级系统**: 基于经验值的用户等级机制
- **连续练习**: 连续打卡奖励机制

### 🎨 用户体验
- **响应式设计**: 完美适配桌面和移动设备
- **音效反馈**: 可选的按键音效系统
- **键盘快捷键**: 高效的键盘操作支持
- **国际化**: 中英文双语支持

## 安装方法

### 1. 下载插件
将插件文件夹复制到Hydro的插件目录：
```bash
cp -r typing-practice /path/to/hydro/plugins/
```

### 2. 安装依赖
```bash
cd /path/to/hydro/plugins/typing-practice
npm install
```

### 3. 配置插件
在Hydro的配置文件中启用插件：
```yaml
plugins:
  - typing-practice
```

### 4. 重启Hydro
重启Hydro服务以加载插件：
```bash
pm2 restart hydro
```

## 配置选项

插件支持以下配置选项：

```javascript
{
  enabled: true,                    // 是否启用插件
  scoreIntegration: true,           // 是否集成积分系统
  defaultDifficulty: 'beginner',    // 默认难度级别
  enableAchievements: true,         // 是否启用成就系统
  enableSoundEffects: true,         // 是否启用音效
  maxTextLength: 500,               // 最大文本长度
  minAccuracy: 60                   // 最低准确率要求
}
```

## 使用方法

### 基础练习
1. 访问 `/typing` 页面开始练习
2. 选择适合的难度和文本类型
3. 点击"开始练习"按钮
4. 在输入框中按照显示的文本进行输入
5. 练习完成后查看详细结果

### 查看统计
- 访问 `/typing/stats` 查看个人详细统计
- 查看进步曲线、练习热力图
- 分析常见错误和改进建议

### 管理功能（管理员）
- 访问 `/typing/admin` 进行系统管理
- 查看全站统计数据
- 管理用户数据和系统清理

## API接口

插件提供以下API接口：

### 练习相关
- `POST /typing` - 提交练习结果
- `POST /typing/text` - 生成新的练习文本
- `GET /typing/recommendations` - 获取个性化推荐

### 统计相关
- `GET /typing/stats/api` - 获取统计API数据
- `GET /typing/history` - 获取练习历史
- `GET /typing/leaderboard` - 获取排行榜

### 数据导出
- `GET /typing/stats/export` - 导出用户数据

## 文件结构

```
typing-practice/
├── index.ts                    # 插件入口
├── package.json               # 包配置
├── README.md                  # 说明文档
├── src/                       # 源代码
│   ├── types/                 # 类型定义
│   ├── services/              # 业务逻辑服务
│   └── handlers/              # 请求处理器
├── frontend/                  # 前端React组件
├── templates/                 # HTML模板
├── locales/                   # 国际化文件
└── public/                    # 静态资源
```

## 技术架构

### 后端架构
- **TypeScript**: 类型安全的开发体验
- **分层架构**: Handler -> Service -> Database
- **模块化设计**: 松耦合的服务组件
- **错误处理**: 完整的异常处理机制

### 前端架构
- **React + TypeScript**: 现代化的前端技术栈
- **实时更新**: 基于WebSocket的实时数据同步
- **响应式设计**: CSS Grid和Flexbox布局
- **性能优化**: 事件防抖、懒加载等优化策略

### 数据存储
- **MongoDB**: 基于Hydro的数据库集成
- **Collection设计**: 合理的数据结构设计
- **索引优化**: 高效的查询性能

## 开发指南

### 开发环境设置
```bash
# 安装开发依赖
npm install --dev

# 启动TypeScript编译监听
npm run dev

# 运行测试
npm test
```

### 添加新文本模板
在 `TextGeneratorService.ts` 中添加新的文本模板：

```typescript
const newTexts = {
  [DifficultyLevel.BEGINNER]: [
    'Your new beginner text here...',
  ],
  // ... 其他难度级别
};
```

### 添加新成就
在 `TypingService.ts` 的 `getAchievementDefinitions()` 方法中添加：

```typescript
{
  id: 'your_achievement_id',
  name: 'Achievement Name',
  description: 'Achievement Description',
  requirements: [
    { type: 'wpm', value: 100, comparison: 'gte' }
  ],
  reward: { score: 500 },
  // ... 其他配置
}
```

## 常见问题

### Q: 插件无法加载？
A: 检查以下几点：
- 确认插件文件夹位置正确
- 检查依赖是否安装完整
- 查看Hydro日志中的错误信息

### Q: 积分系统不工作？
A: 确认：
- score-system插件是否已安装
- scoreIntegration配置是否为true
- 数据库权限是否正确

### Q: 前端页面显示异常？
A: 检查：
- React依赖是否正确安装
- 浏览器控制台是否有JavaScript错误
- 模板文件是否存在

## 贡献指南

欢迎提交PR改进插件功能：

1. Fork本项目
2. 创建功能分支 (`git checkout -b feature/新功能`)
3. 提交更改 (`git commit -am '添加新功能'`)
4. 推送到分支 (`git push origin feature/新功能`)
5. 创建Pull Request

## 许可证

本项目基于MIT许可证开源，详见 [LICENSE](LICENSE) 文件。

## 更新日志

### v1.0.0
- 🎉 初始版本发布
- ✨ 完整的打字练习功能
- 📊 详细统计和分析
- 🏆 成就和积分系统
- 🌐 国际化支持

## 支持

如有问题或建议，请：
- 提交Issue到项目仓库
- 发送邮件到开发团队
- 加入讨论群组

---

**Happy Typing! 🎯⌨️**