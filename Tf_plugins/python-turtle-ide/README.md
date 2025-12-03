# Python Turtle IDE 插件

一个基于 Hydro 的 Python Turtle 在线编程环境插件,支持代码编辑、实时运行、作品保存与分享。

## 功能特性

### 核心功能
- ✅ **在线代码编辑器**: 基于 Monaco Editor,支持 Python 语法高亮和自动补全
- ✅ **实时代码执行**: 使用 Skulpt 在浏览器中运行 Python 代码,无需后端服务器
- ✅ **Turtle 图形渲染**: Canvas 实时展示 Turtle 绘图结果
- ✅ **作品保存与管理**: 支持保存作品到数据库,管理个人作品库
- ✅ **作品分享**: 生成作品链接,支持公开/私密设置
- ✅ **作品展示墙**: 展示所有公开作品,支持点赞和浏览统计
- ✅ **课程任务模式**: 通过任务式教学引导学生完成指定绘图目标

### 辅助功能
- 📚 **示例代码库**: 预置基础、进阶、艺术创作等多种示例
- 🎨 **画布截图**: 支持下载绘制的图形为 PNG 图片
- 🔍 **控制台输出**: 显示 `print()` 输出和错误信息
- 🌐 **国际化支持**: 中英文双语界面
- 👨‍💼 **管理后台**: 管理员可推荐优秀作品、删除违规内容

## 技术架构

### 后端
- **语言**: TypeScript
- **框架**: Hydro Plugin System
- **数据库**: MongoDB

### 前端
- **框架**: React 18
- **编辑器**: Monaco Editor
- **Python 执行**: Skulpt (浏览器端 Python 解释器)
- **图形渲染**: Canvas API

## 目录结构

```
python-turtle-ide/
├── package.json                 # 插件配置
├── index.ts                     # 主入口
├── README.md                    # 说明文档
├── src/
│   ├── handlers/               # 路由处理器
│   │   ├── TurtlePlaygroundHandler.ts   # 编辑器页面
│   │   ├── TurtleGalleryHandler.ts      # 作品展示墙
│   │   ├── TurtleWorkHandler.ts         # 单个作品查看
│   │   └── TurtleAdminHandler.ts        # 管理后台
│   ├── services/               # 业务逻辑
│   │   └── TurtleWorkService.ts         # 作品管理服务
│   └── types/                  # TypeScript 类型
│       └── index.ts
├── frontend/                   # React 组件
│   └── turtle-playground.page.tsx       # 编辑器主页面
├── templates/                  # HTML 模板
│   ├── turtle_playground.html           # 编辑器页面
│   └── turtle_gallery.html              # 作品墙
└── locales/                    # 国际化
    ├── zh.yaml
    └── en.yaml
```

## 数据库设计

### turtle.works (作品集合)
```typescript
{
    _id: ObjectId,
    uid: number,              // 用户 ID
    title: string,            // 作品标题
    description: string,      // 作品描述
    code: string,             // Python 代码
    imageUrl: string,         // 作品截图
    isPublic: boolean,        // 是否公开
    isFeatured: boolean,      // 是否推荐
    likes: number,            // 点赞数
    views: number,            // 浏览次数
    createdAt: Date,
    updatedAt: Date
}

> 说明：Turtle 作品集合为全局共享（不再按域划分），所有域的用户都在同一作品池中创作与浏览。
```

### turtle.examples (示例代码集合)
```typescript
{
    _id: ObjectId,
    name: string,             // 示例名称(英文)
    nameZh: string,           // 中文名称
    category: string,         // 分类(basic/advanced/art)
    code: string,             // 示例代码
    description: string,      // 描述
    difficulty: 1 | 2 | 3,    // 难度等级
    order: number             // 排序
}
```

## 课程任务

- **任务列表**：在作品社区新增“课程任务”标签页，展示管理员发布的所有 Turtle 任务。
- **任务详情**：访问 `/turtle/playground?taskId=<taskId>` 进入任务模式，加载任务描述、提示与初始代码。
- **进度管理**：登录用户可保存任务进度、标记完成，并在完成后将代码保存为常规作品。
- **管理员后台**：访问 `/turtle/course-admin` 使用 React 管理面板创建 / 编辑 / 删除任务，配置 starter code、提示、标签等。

### 数据集合

- `turtle.tasks`：存储任务信息（标题、描述、难度、starterCode、提示、标签、封面、发布状态等）。
- `turtle.task_progress`：存储用户任务进度，记录状态（未开始 / 进行中 / 已完成）、最后一次代码和最佳作品 ID。

### 接入方式

1. 管理员进入 `/turtle/course-admin` 创建任务并发布。
2. 学生在作品社区“课程任务”标签页选择任务，跳转到 Playground 任务模式。
3. 任务模式下可运行代码、保存进度、标记完成，完成后可以一键保存为作品。

## 路由

- `/turtle/playground` - Turtle 编辑器
- `/turtle/gallery` - 作品展示墙
- `/turtle/work/:workId` - 单个作品查看
- `/turtle/admin` - 管理后台(需管理员权限)
- `/turtle/course-admin` - 课程任务管理后台(需管理员权限)

## 配置选项

在 Hydro 配置文件中可配置以下选项:

```yaml
python-turtle-ide:
  enabled: true              # 是否启用插件
  maxCodeLength: 10000       # 最大代码长度
  maxWorksPerUser: 50        # 每用户最大作品数
```

## 安装与使用

1. 将插件目录放置在 `Tf_plugins/python-turtle-ide/`
2. Hydro 会自动加载插件
3. 访问 `/turtle/playground` 开始使用

## 示例代码

插件预置了多个示例代码:
- **基础**: 正方形、五角星、圆形
- **进阶**: 彩色螺旋、花朵
- **艺术**: 彩虹等复杂图案

## 开发说明

### 添加新示例代码

在 `index.ts` 的 `initExamples()` 函数中添加:

```typescript
{
    name: 'YourExample',
    nameZh: '示例名称',
    category: 'basic',  // basic/advanced/art
    code: `import turtle\n\n# Your code here`,
    description: '描述',
    difficulty: 1,  // 1-3
    order: 10
}
```

### 自定义样式

修改 `templates/turtle_playground.html` 中的 `<style>` 部分。

## 依赖

- **hydrooj**: Hydro 核心框架
- **@monaco-editor/react**: Monaco 编辑器 React 组件
- **Skulpt**: Python 浏览器端解释器 (通过 CDN 引入)

## 许可证

AGPL-3.0

## 作者

tivonfeng

## 问题反馈

如遇到问题,请在 GitHub 提交 Issue。
