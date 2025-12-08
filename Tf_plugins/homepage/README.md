# Homepage Plugin

一个为Hydro OJ系统设计的首页轮播图和公告插件。

## 功能特性

- 🖼️ 支持不同域（domain）显示不同的轮播图片
- 📢 滚动公告栏显示
- 🏆 实时显示最近的AC记录
- 🎨 美观的卡片式导航（针对system域）
- 🎯 自定义 Logo 和 Favicon（通过 public/ 目录中的文件）

## 支持的域

- `system`: 显示欢迎图片和Python/CSP训练体系导航卡片
- `python`: 显示Python专题图片
- `CSPJ`: 显示CSP专题图片
- 其他域: 显示默认欢迎图片

## 安装方法

1. 将插件文件放置在`plugins/`目录下
2. 重启Hydro服务
3. 插件会自动加载并注册路由

## 使用方法

插件会自动在首页显示轮播图和公告。数据通过`/homepage/data`接口获取。

## 技术实现

### 主要文件

- `index.ts`: 插件主文件，定义了Handler和路由
- `templates/partials/homepage/swiderpic.html`: 模板文件
- `public/`: 静态文件目录（Logo 和 Favicon）
- `package.json`: 插件配置文件

### 核心功能

1. **HomepageHandler类**: 处理首页数据请求
   - 获取域信息
   - 查询最近的AC记录
   - 格式化数据供模板使用

2. **数据结构**:
   ```typescript
   payload: [domainId, announcement, transformedRdocs]
   ```

3. **模板特性**:
   - 响应式轮播图
   - 滚动公告
   - 实时更新的AC记录显示
   - 域特定的样式和内容

## 自定义配置

可以通过修改以下内容来自定义插件：

1. **图片URL**: 在模板文件中修改图片链接
2. **公告内容**: 通过域的`bulletin`字段设置
3. **样式**: 修改模板中的CSS样式
4. **卡片导航**: 添加或修改system域的导航卡片
5. **Logo 和 Favicon**: 
   - 将自定义的 logo 文件放置在 `public/` 目录中
   - 将 favicon 文件放置在 `public/` 目录中
   - 插件会自动将这些文件复制到 `~/.hydro/static/` 目录
   - 支持的文件包括：导航栏 logo、各种尺寸的 favicon、移动端图标等

## 开发说明

这是一个标准的Hydro插件，遵循以下开发模式：

1. 导入必要的Hydro模块
2. 定义Handler类处理请求
3. 使用`apply`函数注册插件
4. 通过`ctx.Route`注册路由

## 贡献

欢迎提交Issue和Pull Request来改进这个插件！
