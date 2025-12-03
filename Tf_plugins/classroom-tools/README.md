# Classroom Tools - 课堂辅助工具插件

为Hydro OJ系统提供的课堂辅助工具集，帮助教师在课堂上进行互动教学。

## 功能特性

### 已实现功能

#### 1. 随机数字生成器 🎲
- 设置数字范围（最小值-最大值）
- 指定生成数量
- 支持允许/不允许重复模式
- 精美的动画效果展示结果
- 自动保存使用历史

### 计划功能

- **随机点名** 👥：从班级学生中随机选择
- **随机分组** 🔀：自动将学生分组
- **计时器** ⏱️：课堂计时工具

## 权限控制

### 查看权限
- 所有登录用户可以访问工具页面

### 使用权限
- 只有教师角色可以使用工具生成功能
- 默认教师角色包括：`root`, `teacher`, `admin`
- 系统管理员（`PRIV_EDIT_SYSTEM`）自动拥有使用权限
- 域管理员（`PERM_EDIT_DOMAIN`）自动拥有使用权限

### 管理权限
- 系统管理员或域管理员可以查看所有使用记录和统计

## 安装使用

### 1. 安装插件

将插件目录放置在 `Tf_plugins/classroom-tools/` 下，Hydro会自动加载。

### 2. 配置插件

在Hydro配置文件中可以自定义配置：

```yaml
classroom-tools:
  enabled: true                        # 是否启用插件
  requireTeacherRole: true            # 是否要求教师角色
  allowedRoles:                       # 允许使用的角色列表
    - root
    - teacher
    - admin
```

### 3. 访问工具

- **工具页面**：`/tools/classroom`
- **管理页面**：`/tools/classroom/manage`（需要管理员权限）

导航栏会自动添加"课堂工具"入口。

## 技术架构

```
classroom-tools/
├── package.json              # 插件配置
├── index.ts                  # 插件入口
├── README.md                 # 说明文档
├── src/
│   ├── handlers/            # 路由处理器
│   │   └── ToolsHandler.ts
│   ├── services/            # 业务服务层
│   │   └── ToolsService.ts
│   └── types/              # TypeScript类型定义
│       └── index.ts
├── templates/              # HTML模板
│   ├── classroom_tools.html
│   └── classroom_tools_manage.html
└── locales/               # 国际化翻译
    ├── zh.yaml
    └── en.yaml
```

## 数据库设计

### 集合：`classroom.tools.records`

存储工具使用记录：

```typescript
{
    _id: ObjectId,
    domainId: string,           // 域ID
    uid: number,                // 用户ID
    toolType: string,           // 工具类型：'random_number' | 'random_name' | 'group' | 'timer'
    config: {                   // 工具配置
        min: number,
        max: number,
        count: number,
        allowDuplicate: boolean
    },
    result: {                   // 生成结果
        numbers: number[]
    },
    createdAt: Date            // 创建时间
}
```

## API接口

### POST `/tools/classroom`

生成随机数字

**请求体：**
```json
{
    "action": "random_number",
    "min": 1,
    "max": 100,
    "count": 5,
    "allowDuplicate": false
}
```

**响应：**
```json
{
    "success": true,
    "data": {
        "numbers": [23, 45, 67, 12, 89],
        "config": {
            "min": 1,
            "max": 100,
            "count": 5,
            "allowDuplicate": false
        }
    }
}
```

## 开发说明

### 添加新工具

1. 在 `src/types/index.ts` 中添加新工具的配置接口
2. 在 `src/services/ToolsService.ts` 中实现新工具的业务逻辑
3. 在 `src/handlers/ToolsHandler.ts` 中添加新的处理方法
4. 在模板中添加新工具的UI卡片
5. 更新国际化文件 `locales/zh.yaml` 和 `locales/en.yaml`

### 国际化

所有用户可见的文本都需要添加翻译：

```typescript
// 在index.ts中注册翻译
ctx.i18n.load('zh', {
    'Your Text': '您的文本',
});

ctx.i18n.load('en', {
    'Your Text': 'Your Text',
});
```

在模板中使用：
```html
{{ _('Your Text') }}
```

## 使用示例

### 场景1：随机抽学号

1. 教师打开课堂工具页面
2. 选择"随机数字生成器"
3. 设置范围：1-50（假设班级有50名学生）
4. 设置数量：5（需要抽取5个学生）
5. 不允许重复
6. 点击"生成"
7. 系统显示：12, 35, 8, 42, 27
8. 对应学号的学生被抽中

### 场景2：课堂抽奖

1. 设置范围：1-100
2. 设置数量：3（抽取3个幸运数字）
3. 允许重复（增加趣味性）
4. 点击"生成"
5. 系统以动画方式展示中奖号码

## 后续开发计划

### v1.1 - 随机点名功能
- 从当前域的学生列表中随机选择
- 支持排除已点名学生
- 显示学生详细信息

### v1.2 - 随机分组功能
- 设置分组数量或每组人数
- 支持按成绩平衡分组
- 导出分组结果

### v1.3 - 计时器功能
- 课堂倒计时
- 全屏展示模式
- 声音提醒

## 许可证

AGPL-3.0

## 作者

TivonFeng

## 贡献

欢迎提交Issue和Pull Request！
