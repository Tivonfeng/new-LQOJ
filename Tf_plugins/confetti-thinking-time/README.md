# 彩带庆祝与思考时间记录合并插件

这是一个将彩带庆祝插件和思考时间记录插件合并的版本，当用户AC时会显示彩带效果并记录思考时间。

## 功能特性

- ✨ AC时显示彩带庆祝效果
- ⏱️ 记录用户从打开题目页面到AC的思考时间
- 🔊 播放庆祝音效
- 💾 自动保存时间状态到localStorage
- 📊 在提交记录页面显示思考时间

## 安装方法

1. 将此插件目录放入 `Tf_plugins/` 目录下
2. 确保插件被正确加载

## 文件结构

```
confetti-thinking-time/
├── frontend/
│   └── confetti-thinking-time.page.tsx  # 前端主文件
├── public/
│   └── ding.mp3                         # 庆祝音效
├── index.ts                             # 后端主文件
├── package.json                         # 依赖配置
└── README.md                           # 说明文档
```

## 原插件说明

此插件合并了以下两个原始插件：
- `Tf_plugins/confetti/` - 彩带庆祝插件
- `Tf_plugins/thinking-time-tracker/` - 思考时间记录插件

合并后的插件包含了两个插件的完整功能，无需再单独安装原始插件。