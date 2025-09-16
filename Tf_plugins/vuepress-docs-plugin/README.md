# VuePress Hope主题文档集成插件

这是一个用于在Hydro OJ中集成VuePress Hope主题文档的插件。

## 功能特性

- 🚀 **完整集成**: 将VuePress Hope主题构建的静态文档完美集成到Hydro中
- 🎨 **主题适配**: 自动适配Hydro主题色彩和样式
- 🔒 **权限集成**: 支持Hydro用户权限和登录状态
- 📱 **响应式设计**: 支持桌面端和移动端访问
- 🖼️ **双模式显示**: 支持直接显示和框架模式两种展示方式
- 🔄 **SPA路由**: 完整支持VuePress的单页面应用路由
- ⚡ **性能优化**: 静态资源缓存和加载优化

## 安装和使用

### 1. 准备VuePress项目

首先确保您的VuePress Hope主题项目已经构建完成：

```bash
# 在您的VuePress项目目录
npm run build
# 或
yarn build
```

构建后会生成 `docs/.vuepress/dist` 目录。

### 2. 安装插件

将插件放置到Hydro的插件目录：

```bash
cp -r vuepress-docs-plugin /path/to/hydro/Tf_plugins/
```

### 3. 复制VuePress构建文件

将VuePress构建的dist目录复制到插件中：

```bash
cp -r /path/to/your/vuepress/docs/.vuepress/dist /path/to/hydro/Tf_plugins/vuepress-docs-plugin/
```

### 4. 安装依赖

```bash
cd /path/to/hydro/Tf_plugins/vuepress-docs-plugin
npm install
```

### 5. 配置VuePress项目

在您的VuePress配置文件中，确保base路径设置正确：

```typescript
// vuepress.config.ts
export default defineUserConfig({
  base: "/docs/",  // 重要：与插件路径保持一致
  // 其他配置...
});
```

### 6. 重启Hydro

重启Hydro服务，插件会自动加载。

## 配置选项

插件支持以下配置选项：

```typescript
{
  enabled: true,           // 是否启用插件
  basePath: '/docs',       // 文档访问路径
  title: 'Documentation',  // 文档标题
  showInNav: true,         // 是否在导航栏显示
  frameMode: false         // 是否使用框架模式
}
```

## 访问文档

### 直接模式（默认）
- 访问路径：`http://your-hydro-domain/docs`
- VuePress文档将直接在页面中显示

### 框架模式
- 设置 `frameMode: true`
- 访问路径：`http://your-hydro-domain/docs`
- 文档将在Hydro框架内显示，带有额外的控制功能

## 目录结构

```
vuepress-docs-plugin/
├── package.json                    # 插件配置
├── index.ts                       # 插件主入口
├── dist/                          # VuePress构建输出（需要您手动复制）
│   ├── index.html
│   ├── assets/
│   └── ...
├── src/
│   └── handlers/
│       └── VuePressHandler.ts     # 处理器实现
├── templates/
│   └── docs_frame.html           # 框架模式模板
└── README.md                     # 说明文档
```

## 特殊功能

### 1. Hydro上下文注入

插件会自动将Hydro的用户信息和域信息注入到VuePress页面中：

```javascript
// 在VuePress页面中可以访问
window.__HYDRO_CONTEXT__ = {
  user: {
    _id: "user_id",
    uname: "username",
    displayName: "显示名称",
    priv: 权限值
  },
  domain: {
    _id: "domain_id", 
    name: "域名"
  },
  basePath: "/docs",
  isHydroEmbedded: true
}
```

### 2. 主题样式适配

插件会自动注入Hydro主题变量，确保文档样式与Hydro保持一致：

```css
:root {
    --hydro-primary: #6366f1;
    --hydro-success: #10b981;
    --hydro-warning: #f59e0b;
    --hydro-error: #ef4444;
}
```

### 3. 路由处理

插件正确处理VuePress的SPA路由，确保所有文档页面都能正常访问。

## 故障排除

### 1. 文档无法显示

- 检查dist目录是否正确复制到插件中
- 确认VuePress项目的base路径配置为 `/docs/`
- 查看Hydro日志中的错误信息

### 2. 资源加载失败

- 确保assets目录存在且包含CSS/JS文件
- 检查VuePress构建是否成功完成
- 验证文件权限是否正确

### 3. 样式显示异常

- 确认VuePress项目使用的是Hope主题
- 检查CSS文件是否正确加载
- 查看浏览器控制台的错误信息

## 开发说明

### 自定义样式

如果需要自定义样式，可以修改 `VuePressHandler.ts` 中的 `injectHydroContext` 方法。

### 添加API接口

可以在插件中添加新的路由处理器来提供API接口：

```typescript
ctx.Route('docs_api', '/docs/api/:action', YourApiHandler);
```

### 权限控制

可以在处理器中添加权限检查：

```typescript
async prepare() {
    this.checkPerm(PERM.PERM_VIEW);
}
```

## 更新日志

### v1.0.0
- 初始版本发布
- 支持VuePress Hope主题完整集成
- 提供直接模式和框架模式
- 实现Hydro上下文注入和主题适配

## 许可证

本插件采用 AGPL-3.0 许可证。