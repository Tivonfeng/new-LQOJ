# Hydro插件开发完整教程

## 插件基础结构

### 1. 项目结构组织
```
your-plugin/
├── package.json          # 插件配置和依赖
├── index.ts             # 插件主入口文件
├── README.md            # 插件说明文档
├── src/                 # 核心业务逻辑
│   ├── handlers/        # 路由处理器
│   ├── services/        # 业务服务层
│   └── types/          # TypeScript类型定义
├── frontend/           # 前端React组件
├── templates/          # HTML模板文件
├── locales/           # 国际化翻译文件
│   ├── zh.yaml
│   └── en.yaml
└── check_yaml.js      # 翻译文件校验脚本
```

### 2. package.json配置
```json
{
  "name": "@hydrooj/your-plugin",
  "version": "1.0.0",
  "main": "index.ts",
  "author": "your-name",
  "license": "AGPL-3.0",
  "description": "插件功能描述",
  "hydro": {
    "cli": false
  },
  "dependencies": {
    "hydrooj": "workspace:^"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

## 核心开发概念

### 3. 插件主入口文件(index.ts)

```typescript
import { Context, Schema } from 'hydrooj';
import { YourHandler } from './src/handlers';
import { YourService } from './src/services';

// 配置Schema定义
const Config = Schema.object({
    enabled: Schema.boolean().default(true).description('是否启用插件'),
    // 其他配置项...
});

// 数据库集合类型声明
declare module 'hydrooj' {
    interface Collections {
        'your.collection': YourDataType;
    }
}

// 插件主函数
export default function apply(ctx: Context, config: any = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    const yourService = new YourService(finalConfig, ctx);

    // 事件监听
    ctx.on('record/judge', async (rdoc, updated, pdoc) => {
        // 处理判题完成事件
    });

    // 路由注册
    ctx.Route('your_route', '/your/path', YourHandler);

    // 导航栏注入
    ctx.injectUI('Nav', 'your_nav_item', {
        prefix: 'your_prefix',
        before: 'ranking',
    });
}

export { Config };
```

### 4. 处理器开发(Handlers)

```typescript
import { Handler, PERM, PRIV } from 'hydrooj';
import { YourService } from '../services';

export class YourHandler extends Handler {
    // 权限检查
    async prepare() {
        if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
            this.checkPerm(PERM.PERM_EDIT_DOMAIN);
        }
    }

    // GET请求处理
    async get() {
        const yourService = new YourService(config, this.ctx);
        const data = await yourService.getData(this.domain._id);

        this.response.template = 'your_template.html';
        this.response.body = {
            data,
            canManage: this.user?.priv & PRIV.PRIV_EDIT_SYSTEM,
        };
    }

    // POST请求处理
    async post() {
        const { action, param1, param2 } = this.request.body;

        if (action === 'your_action') {
            try {
                const result = await this.processAction(param1, param2);
                this.response.body = { success: true, data: result };
            } catch (error) {
                this.response.body = { success: false, message: error.message };
            }
        }
    }
}
```

### 5. 服务层开发(Services)

```typescript
import { Context } from 'hydrooj';

export interface YourDataType {
    _id?: any;
    uid: number;
    domainId: string;
    // 其他字段...
}

export class YourService {
    private config: YourConfig;
    private ctx: Context;

    constructor(config: YourConfig, ctx: Context) {
        this.config = config;
        this.ctx = ctx;
    }

    async createRecord(data: Omit<YourDataType, '_id'>): Promise<void> {
        await this.ctx.db.collection('your.collection' as any).insertOne({
            ...data,
            createdAt: new Date(),
        });
    }

    async findRecords(query: any, limit: number = 50): Promise<YourDataType[]> {
        return await this.ctx.db.collection('your.collection' as any)
            .find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
    }

    async updateRecord(id: any, update: Partial<YourDataType>): Promise<void> {
        await this.ctx.db.collection('your.collection' as any)
            .updateOne({ _id: id }, { $set: update });
    }
}
```

## 前端开发

### 6. React组件开发

```typescript
import { addPage, NamedPage } from '@hydrooj/ui-default';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const YourComponent: React.FC = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAction = async () => {
        setLoading(true);
        try {
            const response = await fetch(window.location.pathname, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'your_action', data }),
            });
            const result = await response.json();
            // 处理结果
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="your-component">
            {/* 组件内容 */}
        </div>
    );
};

// 注册页面组件
addPage(new NamedPage(['your_route'], async () => {
    const mountPoint = document.getElementById('your-mount-point');
    if (mountPoint) {
        const root = createRoot(mountPoint);
        root.render(<YourComponent />);
    }
}));
```

### 7. HTML模板开发

```html
{% extends "layout/basic.html" %}

{% block content %}
<div class="your-plugin-container">
    <div class="header-section">
        <h1>{{ _('Your Plugin Title') }}</h1>
        <div class="actions">
            {% if canManage %}
            <a href="{{ url('your_manage') }}" class="btn">{{ _('Manage') }}</a>
            {% endif %}
        </div>
    </div>

    <div class="content-section">
        {% if data and data|length > 0 %}
        <div class="data-list">
            {% for item in data %}
            <div class="data-item">
                <div class="item-info">
                    <div class="item-title">{{ item.title }}</div>
                    <div class="item-details">{{ item.details }}</div>
                </div>
                <div class="item-actions">
                    <button class="action-btn" data-id="{{ item._id }}">
                        {{ _('Action') }}
                    </button>
                </div>
            </div>
            {% endfor %}
        </div>
        {% else %}
        <div class="empty-state">
            <span class="empty-icon">📋</span>
            <p>{{ _('No data found') }}</p>
        </div>
        {% endif %}
    </div>

    <!-- React组件挂载点 -->
    <div id="your-mount-point"></div>
</div>

<style>
/* 样式定义 */
.your-plugin-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}
</style>

<script>
// 页面脚本
document.addEventListener('DOMContentLoaded', function() {
    // 初始化逻辑
});
</script>
{% endblock %}
```

## 国际化支持

### 8. 翻译文件配置

**locales/zh.yaml:**
```yaml
Your Plugin Title: 您的插件标题
Manage: 管理
Action: 操作
No data found: 未找到数据
Success message: 操作成功
Error message: 操作失败
```

**locales/en.yaml:**
```yaml
Your Plugin Title: Your Plugin Title
Manage: Manage
Action: Action
No data found: No data found
Success message: Operation successful
Error message: Operation failed
```

### 9. 翻译校验脚本

**check_yaml.js:**
```javascript
const fs = require('fs');
const yaml = require('js-yaml');

function checkTranslations() {
    const zhFile = 'locales/zh.yaml';
    const enFile = 'locales/en.yaml';

    const zhContent = yaml.load(fs.readFileSync(zhFile, 'utf8'));
    const enContent = yaml.load(fs.readFileSync(enFile, 'utf8'));

    const zhKeys = Object.keys(zhContent);
    const enKeys = Object.keys(enContent);

    const missingInEn = zhKeys.filter(key => !enKeys.includes(key));
    const missingInZh = enKeys.filter(key => !zhKeys.includes(key));

    if (missingInEn.length > 0) {
        console.log('Missing in English:', missingInEn);
    }
    if (missingInZh.length > 0) {
        console.log('Missing in Chinese:', missingInZh);
    }

    return missingInEn.length === 0 && missingInZh.length === 0;
}

if (require.main === module) {
    const isValid = checkTranslations();
    process.exit(isValid ? 0 : 1);
}
```

## 数据库操作

### 10. 数据库集合操作

```typescript
// 创建记录
await this.ctx.db.collection('your.collection' as any).insertOne(data);

// 查询记录
const records = await this.ctx.db.collection('your.collection' as any)
    .find({ domainId: this.domain._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

// 更新记录
await this.ctx.db.collection('your.collection' as any)
    .updateOne(
        { _id: recordId },
        { $set: updateData }
    );

// 删除记录
await this.ctx.db.collection('your.collection' as any)
    .deleteOne({ _id: recordId });

// 聚合查询
const stats = await this.ctx.db.collection('your.collection' as any)
    .aggregate([
        { $match: { domainId: this.domain._id } },
        { $group: { _id: null, total: { $sum: 1 } } }
    ]).toArray();
```

## 事件系统

### 11. 监听和触发事件

```typescript
// 监听系统事件
ctx.on('record/judge', async (rdoc, updated, pdoc) => {
    if (updated && rdoc.status === STATUS.STATUS_ACCEPTED) {
        // 处理AC事件
    }
});

ctx.on('user/login', async (user, loginType) => {
    // 处理用户登录事件
});

// 触发自定义事件
ctx.emit('your-plugin/custom-event', data);

// 监听自定义事件
ctx.on('your-plugin/custom-event', async (data) => {
    // 处理自定义事件
});
```

## 权限管理

### 12. 权限检查和管理

```typescript
import { PERM, PRIV } from 'hydrooj';

// 检查系统权限
if (this.user?.priv & PRIV.PRIV_EDIT_SYSTEM) {
    // 有系统管理权限
}

// 检查域权限
this.checkPerm(PERM.PERM_EDIT_DOMAIN);

// 检查用户权限
if (this.user?.priv & PRIV.PRIV_USER_PROFILE) {
    // 有用户权限
}

// 在Handler中检查权限
async prepare() {
    if (!(this.user?.priv & PRIV.PRIV_EDIT_SYSTEM)) {
        this.checkPerm(PERM.PERM_EDIT_DOMAIN);
    }
}
```

## 部署和调试

### 13. 开发调试

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建
npm run build

# 检查翻译
node check_yaml.js
```

### 14. 插件加载机制

插件放置在 `Tf_plugins/your-plugin/` 目录下，Hydro会自动加载：

1. 读取`package.json`获取插件信息
2. 加载`index.ts`主入口文件
3. 执行插件的`apply`函数
4. 注册路由和事件监听器
5. 注入UI组件

## 最佳实践

### 15. 代码规范

1. **TypeScript类型安全**: 定义完整的接口和类型
2. **错误处理**: 使用try-catch处理异常
3. **权限控制**: 合理设置权限检查
4. **数据验证**: 验证用户输入
5. **性能优化**: 合理使用数据库查询和缓存
6. **国际化**: 所有用户可见文本都要翻译
7. **响应式设计**: 支持移动端和桌面端
8. **代码注释**: 添加清晰的注释说明

### 16. 安全考虑

1. **输入验证**: 验证所有用户输入
2. **权限检查**: 在每个敏感操作前检查权限
3. **SQL注入防护**: 使用参数化查询
4. **XSS防护**: 正确转义输出内容
5. **CSRF防护**: 使用框架提供的CSRF保护

## 实际示例参考

### 17. score-system插件架构分析

基于`score-system`插件的实际实现，这里展示了一个完整的插件架构：

**主要特性**:
- 积分系统：用户AC题目自动获得积分
- 游戏系统：签到、抽奖、掷骰子、剪刀石头布
- 转账系统：用户间积分转账
- 管理系统：管理员积分管理界面

**技术栈**:
- 后端：TypeScript + MongoDB
- 前端：React + TypeScript
- 模板：Jinja2
- 国际化：YAML配置文件

**架构设计**:
```
index.ts (主入口)
├── src/handlers/ (路由处理)
│   ├── ScoreHandlers.ts
│   ├── LotteryHandlers.ts
│   ├── DiceGameHandlers.ts
│   ├── RPSHandlers.ts
│   ├── TransferHandlers.ts
│   └── CheckInHandlers.ts
├── src/services/ (业务逻辑)
│   ├── ScoreService.ts
│   ├── LotteryService.ts
│   ├── DiceGameService.ts
│   ├── RPSGameService.ts
│   ├── TransferService.ts
│   └── CheckInService.ts
├── frontend/ (React组件)
│   ├── score-manage.page.tsx
│   └── migration-manage.component.tsx
├── templates/ (HTML模板)
│   ├── score_hall.html
│   ├── lottery_hall.html
│   └── ...
└── locales/ (国际化)
    ├── zh.yaml
    └── en.yaml
```

### 18. 核心功能实现示例

**事件监听实现**:
```typescript
// 监听判题完成事件
ctx.on('record/judge', async (rdoc: RecordDoc, updated: boolean, pdoc?: ProblemDoc) => {
    if (!finalConfig.enabled || !updated || !pdoc) return;
    if (rdoc.status !== STATUS.STATUS_ACCEPTED) return;

    // 检查是否为首次AC
    const isFirstAC = await scoreService.isFirstAC(rdoc.domainId, rdoc.uid, rdoc.pid);
    if (!isFirstAC) return;

    // 计算积分
    const score = scoreService.calculateACScore(isFirstAC);
    if (score <= 0) return;

    // 记录积分
    await scoreService.addScoreRecord({
        uid: rdoc.uid,
        domainId: rdoc.domainId,
        pid: rdoc.pid,
        recordId: rdoc._id,
        score,
        reason: `AC题目 ${pdoc.title || rdoc.pid} 获得积分`,
        problemTitle: pdoc.title,
    });

    // 更新用户总积分
    await scoreService.updateUserScore(rdoc.domainId, rdoc.uid, score);
});
```

**路由注册**:
```typescript
// 注册各种路由
ctx.Route('score_hall', '/score/hall', ScoreHallHandler);
ctx.Route('lottery_hall', '/score/lottery', LotteryHallHandler);
ctx.Route('dice_game', '/score/dice', DiceGameHandler);
ctx.Route('rock_paper_scissors', '/score/rps', RPSGameHandler);
ctx.Route('transfer_exchange', '/score/transfer', TransferExchangeHandler);
ctx.Route('daily_checkin', '/score/checkin', CheckInHandler);

// 注入导航栏
ctx.injectUI('Nav', 'score_hall', {
    prefix: 'score',
    before: 'ranking',
});
```

这个教程基于真实的插件实现，涵盖了Hydro插件开发的所有关键方面，可以作为您开发插件的完整指南和参考。