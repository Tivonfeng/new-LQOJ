# 学情分析大厅插件 (Student Learning Analysis Plugin)

基于 Hydro OJ 学生训练数据的智能学情分析系统，提供个性化学习洞察和智能推荐。

## 功能特性

### 📊 个人学情概览
- **学习进度仪表盘**：解题数量、正确率趋势分析
- **知识点掌握地图**：雷达图展示各知识点熟练度
- **学习时长统计**：日/周/月学习时间分布
- **成长轨迹**：能力值变化曲线

### 🧠 智能学习分析
- **错误模式识别**：常见错误类型和改进建议
- **解题效率分析**：平均解题时间vs难度关系
- **学习习惯洞察**：活跃时段、学习节奏分析
- **代码质量评估**：复杂度、可读性、最佳实践

### 🎯 个性化推荐
- **智能题目推荐**：基于知识图谱的下一题推荐
- **学习路径规划**：从当前水平到目标的最优路径
- **薄弱知识点强化**：针对性练习推荐
- **同水平对比**：与相似学习者的对比分析

## 页面路由

- `/learning/analysis` - **学情分析大厅**（主要入口）
- `/learning/progress` - 个人学习进度页面
- `/learning/knowledge` - 知识点掌握详情
- `/learning/recommendations` - 智能推荐页面

## 数据库集合

插件创建以下 MongoDB 集合：

- `learning.records` - 学习记录
- `learning.knowledge_points` - 知识点掌握度
- `learning.analysis_cache` - 分析结果缓存
- `learning.recommendations` - 推荐记录

## 安装方法

1. 将插件文件放置到 `Tf_plugins/student-learning-analysis/` 目录
2. 重启 Hydro 服务
3. 插件会自动加载并开始分析学习数据

## 许可证

本插件采用 AGPL-3.0 许可证。
