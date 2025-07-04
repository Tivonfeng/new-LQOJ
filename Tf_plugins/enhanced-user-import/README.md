# Enhanced User Import Plugin

## 功能特性

这个插件为 HydroOJ 提供了一个现代化的用户导入界面，相比原版用户导入页面，具有以下增强功能：

### 🚀 核心功能

1. **多种导入方式**
   - 文件上传（支持 CSV、TSV 格式）
   - 文本粘贴（支持制表符和逗号分隔）
   - 拖拽上传

2. **实时数据验证**
   - 邮箱格式验证
   - 用户名长度验证
   - 密码强度验证
   - 重复数据检测
   - JSON 格式验证

3. **数据预览**
   - 导入前数据预览
   - 错误和警告标识
   - 统计信息展示

4. **批量处理**
   - 可配置批次大小
   - 进度条显示
   - 超时保护

5. **模板下载**
   - CSV 模板下载
   - TSV 模板下载
   - 示例数据下载

### 🎨 用户界面

- 现代化的响应式设计
- 直观的标签页切换
- 实时验证反馈
- 详细的帮助信息
- 美观的统计面板

### 📊 数据格式

支持的用户数据格式：

```csv
email,username,password,displayName,extra
user1@example.com,user1,password123,John Doe,{"group":"students","school":"MIT"}
user2@example.com,user2,password456,Jane Smith,{"group":"teachers","school":"Harvard"}
```

#### 字段说明

- `email`: 用户邮箱（必填）
- `username`: 用户名（必填，3-20个字符）
- `password`: 密码（必填，至少6个字符）
- `displayName`: 显示名称（可选）
- `extra`: 额外信息（可选，JSON格式）

#### 额外信息格式

```json
{
  "group": "students",
  "school": "MIT",
  "studentId": "20230001"
}
```

## 安装和使用

### 安装

1. 将此插件复制到 `Tf_plugins/enhanced-user-import/` 目录
2. 重启 HydroOJ 服务
3. 访问 `/manage/userimport/enhanced` 使用增强版用户导入

### 使用步骤

1. **选择导入方式**：
   - 点击"文件上传"标签页上传 CSV/TSV 文件
   - 点击"粘贴文本"标签页直接粘贴用户数据

2. **数据验证**：
   - 系统会自动验证数据格式
   - 查看统计信息和验证结果

3. **预览数据**：
   - 点击"预览结果"查看前10行数据
   - 确认数据格式正确

4. **导入用户**：
   - 设置合适的批次大小
   - 点击"立即导入"开始导入
   - 观察进度条和结果

### 配置选项

- **批次大小**: 控制每次导入的用户数量（默认50）
- **文件大小限制**: 最大5MB文件大小
- **支持格式**: CSV、TSV、TXT

## 技术实现

### 前端技术

- HTML5 + CSS3 现代化界面
- JavaScript ES6+ 异步处理
- Papa Parse CSV 解析库
- 响应式设计支持移动端

### 后端集成

- 复用 HydroOJ 原有用户导入逻辑
- 添加批量处理功能
- 进度反馈机制
- 错误处理和日志记录

## 兼容性

- 兼容 HydroOJ 最新版本
- 支持现代浏览器（Chrome、Firefox、Safari、Edge）
- 响应式设计，支持移动端访问

## 开发者信息

- 插件名称: Enhanced User Import
- 版本: 1.0.0
- 作者: LQOJ Enhancement Team
- 许可证: MIT

## 常见问题

### Q: 如何处理大量用户数据？
A: 建议使用批量处理功能，设置合适的批次大小（如50-100），避免超时。

### Q: 支持哪些文件格式？
A: 支持 CSV、TSV 和 TXT 格式，推荐使用 CSV 格式。

### Q: 如何解决导入失败的问题？
A: 检查数据格式是否正确，确保邮箱和用户名不重复，密码符合要求。

### Q: 可以自定义用户组吗？
A: 可以，在 extra 字段中添加 JSON 格式的组信息。

## 更新日志

### v1.0.0
- 初始版本发布
- 支持文件上传和文本粘贴
- 实时数据验证
- 批量处理功能
- 现代化界面设计

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个插件！

## 许可证

MIT License - 详见 LICENSE 文件 