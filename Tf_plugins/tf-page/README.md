# TF Page Plugin

TF 个人页面插件，为 Hydro 添加一个独立的个人展示页面。

## 功能特性

- 🎨 精美的个人页面设计
- 📊 系统统计数据展示
- 💼 技能展示区域
- 📞 联系方式展示
- 💬 留言功能（需登录）
- 🌍 完整的国际化支持
- 📱 响应式设计，支持移动端

## 安装和配置

1. 将插件放置在 `Tf_plugins/tf-page/` 目录下
2. Hydro 会自动加载插件
3. 访问 `/tf` 路径即可查看页面

## 页面路由

- `/tf` - TF 个人页面

## 配置选项

```typescript
{
  enabled: boolean // 是否启用插件，默认为 true
}
```

## 技术栈

- **后端**: TypeScript + Hydro Framework
- **前端**: HTML + CSS + JavaScript
- **模板引擎**: Jinja2
- **国际化**: YAML 配置文件

## 目录结构

```
tf-page/
├── package.json           # 插件配置
├── index.ts              # 插件入口文件
├── README.md             # 说明文档
├── src/                  # 源代码目录
│   └── handlers/         # 路由处理器
│       ├── TfPageHandler.ts
│       └── index.ts
├── templates/            # HTML 模板
│   └── tf_page.html
└── locales/             # 国际化文件
    ├── zh.yaml          # 中文翻译
    └── en.yaml          # 英文翻译
```

## 开发说明

该插件遵循 Hydro 插件开发规范：

1. **路由处理**: 使用 Handler 类处理 HTTP 请求
2. **模板渲染**: 使用 Jinja2 模板引擎
3. **国际化**: 支持中英文切换
4. **响应式设计**: 适配各种屏幕尺寸
5. **权限控制**: 合理设置访问权限

## 自定义开发

可以根据需要修改：

1. **个人信息**: 编辑 `templates/tf_page.html` 中的个人介绍
2. **技能列表**: 修改技能展示区域
3. **联系方式**: 更新联系信息
4. **样式设计**: 调整 CSS 样式
5. **功能扩展**: 添加新的功能模块

## 许可证

AGPL-3.0

---

基于 Hydro 插件开发教程创建 🚀