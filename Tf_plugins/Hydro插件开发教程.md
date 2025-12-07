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




# Hydro WebSocket 在插件中的使用指南

## 目录
1. [架构概述](#架构概述)
2. [核心组件](#核心组件)
3. [创建 WebSocket 处理器](#创建-websocket-处理器)
4. [注册 WebSocket 路由](#注册-websocket-路由)
5. [前端连接](#前端连接)
6. [完整示例](#完整示例)
7. [高级特性](#高级特性)
8. [最佳实践](#最佳实践)

---

## 架构概述

Hydro 的 WebSocket 实现基于 `ws` 库，集成在框架的服务器层中。主要特点：

- **统一管理**：所有 WebSocket 连接由 `WebSocketServer` 统一管理
- **路由系统**：使用与 HTTP 路由类似的路径匹配机制
- **Handler 模式**：通过继承 `ConnectionHandler` 创建处理器
- **自动压缩**：支持 Shorty 压缩算法，减少传输数据量
- **心跳机制**：内置 ping/pong 心跳检测

### 核心文件位置

- **服务器实现**：`framework/framework/server.ts`
- **路由系统**：`framework/framework/router.ts`
- **API 集成**：`framework/framework/api.ts`

---

## 核心组件

### 1. WebSocketServer

在 `server.ts` 中创建：

```typescript
import { WebSocketServer } from 'ws';

export const wsServer = new WebSocketServer({ server: httpServer });
```

### 2. ConnectionHandler 基类

所有 WebSocket 处理器都应继承自 `ConnectionHandler`：

```typescript
export class ConnectionHandler<C> extends HandlerCommon<C> {
    static [kHandler] = 'ConnectionHandler';
    
    conn: WebSocket;              // WebSocket 连接对象
    compression: Shorty;          // 压缩器
    counter = 0;                  // 消息计数器
    
    // 发送数据（支持自动压缩）
    send(data: any): void;
    
    // 关闭连接
    close(code: number, reason: string): void;
    
    // 错误处理
    onerror(err: HydroError): void;
    
    // 重置压缩（当消息过多时）
    resetCompression(): void;
}
```

### 3. 关键方法说明

#### `send(data: any)`
发送数据到客户端，支持：
- 字符串直接发送
- 对象自动 JSON 序列化
- 自动压缩（如果启用）

```typescript
// 发送字符串
this.send('Hello');

// 发送对象（自动序列化）
this.send({ type: 'message', content: 'Hello' });
```

#### `close(code: number, reason: string)`
关闭 WebSocket 连接：
- `code`: 关闭代码（建议使用 4000+ 的自定义代码）
- `reason`: 关闭原因

```typescript
this.close(4000, 'completed');
this.close(4001, 'Unauthorized');
```

#### `message(payload: any)`
处理客户端发送的消息（需要手动实现）：

```typescript
async message(payload: any) {
    // payload 已经是解析后的对象
    // 处理消息逻辑
}
```

---

## 创建 WebSocket 处理器

### 基本结构

```typescript
import { ConnectionHandler } from 'hydrooj';

export class MyWebSocketHandler extends ConnectionHandler {
    // 1. 连接准备阶段（可选）
    async prepare() {
        // 验证权限、初始化等
        if (!this.user?._id) {
            this.send({ type: 'error', message: '请先登录' });
            this.close(4001, 'Unauthorized');
            return;
        }
    }
    
    // 2. 连接建立后（可选）
    async open() {
        this.send({ type: 'ready' });
    }
    
    // 3. 处理客户端消息（必需）
    async message(payload: any) {
        // 处理消息
    }
    
    // 4. 清理资源（可选）
    async cleanup() {
        // 清理定时器、取消订阅等
    }
}
```

### 生命周期钩子

1. **`prepare()`**: 在连接建立前执行，用于验证和初始化
2. **`open()`**: 连接建立后立即执行（注意：框架中没有默认的 `open` 方法，需要在 `prepare` 后手动发送欢迎消息）
3. **`message(payload)`**: 处理客户端发送的消息
4. **`cleanup()`**: 连接关闭时执行清理

### 实际示例：AI 辅助流式处理

参考 `confetti-thinking-time` 插件的实现：

```typescript
export class AiHelperStreamHandler extends ConnectionHandler {
    async prepare() {
        // 权限检查
        if (!this.user?._id) {
            this.send(JSON.stringify({ 
                type: 'error', 
                message: '请先登录后再使用 AI 辅助功能。' 
            }));
            this.close(4001, 'Unauthorized');
        }
    }
    
    // 注意：这里使用 onmessage 而不是 message
    // 因为框架会将原始消息字符串传递给 onmessage
    async onmessage(message: string) {
        try {
            const data = JSON.parse(message || '{}');
            const { problemId, code, mode = 'hint' } = data;
            
            if (!problemId) {
                this.send(JSON.stringify({ 
                    type: 'error', 
                    message: '缺少必要参数：problemId。' 
                }));
                this.close(4002, 'bad_request');
                return;
            }
            
            // 处理业务逻辑
            const result = await processAIRequest(data);
            
            // 流式发送结果
            for (const chunk of result) {
                this.send(JSON.stringify({ 
                    type: 'delta', 
                    content: chunk 
                }));
            }
            
            this.send(JSON.stringify({ type: 'done' }));
            this.close(4000, 'completed');
        } catch (e: any) {
            this.send(JSON.stringify({
                type: 'error',
                message: `处理失败: ${e.message}`,
            }));
            this.close(4003, 'error');
        }
    }
}
```

**重要提示**：
- 如果使用 `message(payload)`，`payload` 已经是解析后的对象
- 如果使用 `onmessage(message: string)`，需要手动解析 JSON

---

## 注册 WebSocket 路由

### 使用 `ctx.server.Connection()`

```typescript
export default async function apply(ctx: Context) {
    ctx.server.Connection(
        'my_websocket_handler',  // 路由名称
        '/ws/my-handler',         // 路径
        MyWebSocketHandler,       // Handler 类
        // 权限检查（可选）
        PERM.PERM_VIEW_PROBLEM,   // 权限
        PRIV.PRIV_USER_PROFILE,    // 特权
    );
}
```

### 路径参数

支持路径参数，使用 `:paramName` 语法：

```typescript
ctx.server.Connection(
    'problem_ws',
    '/ws/problem/:pid',  // pid 会作为参数传递
    ProblemWebSocketHandler,
);

// 在 Handler 中访问
async prepare() {
    const pid = this.args.pid;  // 从路径参数获取
}
```

### 权限控制

```typescript
// 需要特定权限
ctx.server.Connection(
    'admin_ws',
    '/ws/admin',
    AdminWebSocketHandler,
    PERM.PERM_EDIT_DOMAIN,  // 需要编辑域权限
);

// 需要特定特权
ctx.server.Connection(
    'user_ws',
    '/ws/user',
    UserWebSocketHandler,
    null,                   // 无权限要求
    PRIV.PRIV_USER_PROFILE, // 需要用户档案特权
);

// 自定义检查函数
ctx.server.Connection(
    'custom_ws',
    '/ws/custom',
    CustomWebSocketHandler,
    () => {
        // 自定义检查逻辑
        if (!this.user) throw new PermissionError();
    },
);
```

---

## 前端连接

### 基本连接

```typescript
// 获取 WebSocket URL
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host;
const wsUrl = `${protocol}//${host}${UiContext.ws_prefix || ''}/ws/my-handler`;

// 创建连接
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
    console.log('WebSocket 连接成功');
};

ws.onmessage = (event) => {
    // 处理心跳
    if (event.data === 'ping') {
        ws.send('pong');
        return;
    }
    if (event.data === 'pong') {
        return;
    }
    
    // 处理业务消息
    const msg = JSON.parse(event.data);
    console.log('收到消息:', msg);
};

ws.onclose = (event) => {
    console.log('连接关闭:', event.code, event.reason);
};

ws.onerror = (error) => {
    console.error('连接错误:', error);
};
```

### 使用 UiContext

Hydro 提供了 `UiContext` 来获取 WebSocket 前缀：

```typescript
// 在模板中
const wsUrl = UiContext.ws_prefix + '/ws/my-handler';

// 或者在前端页面中
const wsUrl = (UiContext.ws_prefix || '') + '/ws/my-handler';
```

### 心跳机制

框架会自动发送 ping/pong，但前端也可以主动发送：

```typescript
class WebSocketManager {
    private ws: WebSocket | null = null;
    private heartbeatTimer: number | null = null;
    private heartbeatInterval = 30000; // 30秒
    
    connect(url: string) {
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
            this.startHeartbeat();
        };
        
        this.ws.onmessage = (event) => {
            if (event.data === 'ping') {
                this.ws?.send('pong');
            } else if (event.data === 'pong') {
                // 心跳正常
            } else {
                // 处理业务消息
                this.handleMessage(event.data);
            }
        };
        
        this.ws.onclose = () => {
            this.stopHeartbeat();
        };
    }
    
    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatTimer = window.setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send('ping');
            }
        }, this.heartbeatInterval);
    }
    
    private stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
}
```

### 重连机制

```typescript
class ReconnectingWebSocket {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private baseReconnectDelay = 1000;
    private maxReconnectDelay = 30000;
    private reconnectTimer: number | null = null;
    
    connect(url: string) {
        try {
            this.ws = new WebSocket(url);
            
            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
            };
            
            this.ws.onclose = (event) => {
                if (this.shouldReconnect(event.code)) {
                    this.scheduleReconnect(url);
                }
            };
            
            this.ws.onerror = () => {
                // 错误处理
            };
        } catch (error) {
            this.scheduleReconnect(url);
        }
    }
    
    private shouldReconnect(closeCode: number): boolean {
        // 某些关闭代码不应该重连
        const noReconnectCodes = [1000, 1001, 1005, 4000, 4001, 4002, 4003];
        return !noReconnectCodes.includes(closeCode);
    }
    
    private scheduleReconnect(url: string) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('达到最大重连次数');
            return;
        }
        
        this.reconnectAttempts++;
        
        // 指数退避
        const delay = Math.min(
            this.baseReconnectDelay * 2 ** (this.reconnectAttempts - 1),
            this.maxReconnectDelay,
        );
        
        this.reconnectTimer = window.setTimeout(() => {
            this.connect(url);
        }, delay);
    }
}
```

---

## 完整示例

### 后端：实时通知处理器

```typescript
// src/handlers/NotificationHandler.ts
import { ConnectionHandler, Context } from 'hydrooj';

export class NotificationHandler extends ConnectionHandler {
    private intervalId: NodeJS.Timeout | null = null;
    
    async prepare() {
        // 验证用户登录
        if (!this.user?._id) {
            this.send({ type: 'error', message: '请先登录' });
            this.close(4001, 'Unauthorized');
            return;
        }
    }
    
    async message(payload: any) {
        const { action, data } = payload;
        
        switch (action) {
            case 'subscribe':
                // 订阅通知
                await this.subscribe(data);
                break;
            case 'unsubscribe':
                // 取消订阅
                await this.unsubscribe(data);
                break;
            default:
                this.send({ type: 'error', message: '未知操作' });
        }
    }
    
    private async subscribe(data: any) {
        // 开始推送通知
        this.intervalId = setInterval(async () => {
            const notifications = await this.fetchNotifications();
            if (notifications.length > 0) {
                this.send({
                    type: 'notification',
                    data: notifications,
                });
            }
        }, 5000); // 每5秒检查一次
        
        this.send({ type: 'subscribed' });
    }
    
    private async unsubscribe(data: any) {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.send({ type: 'unsubscribed' });
    }
    
    async cleanup() {
        // 清理资源
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    
    private async fetchNotifications() {
        // 获取通知逻辑
        return [];
    }
}
```

### 注册处理器

```typescript
// index.ts
import { Context } from 'hydrooj';
import { NotificationHandler } from './src/handlers/NotificationHandler';

export default async function apply(ctx: Context) {
    ctx.server.Connection(
        'notification_ws',
        '/ws/notification',
        NotificationHandler,
    );
}
```

### 前端：连接和使用

```typescript
// frontend/notification.page.tsx
class NotificationManager {
    private ws: WebSocket | null = null;
    
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}${UiContext.ws_prefix || ''}/ws/notification`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            // 订阅通知
            this.ws?.send(JSON.stringify({
                action: 'subscribe',
                data: {},
            }));
        };
        
        this.ws.onmessage = (event) => {
            if (event.data === 'ping') {
                this.ws?.send('pong');
                return;
            }
            
            const msg = JSON.parse(event.data);
            if (msg.type === 'notification') {
                this.handleNotifications(msg.data);
            }
        };
        
        this.ws.onclose = () => {
            // 处理重连
        };
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.send(JSON.stringify({
                action: 'unsubscribe',
                data: {},
            }));
            this.ws.close();
        }
    }
    
    private handleNotifications(notifications: any[]) {
        // 显示通知
    }
}
```

---

## 高级特性

### 1. 事件订阅

使用 `__subscribe` 属性订阅框架事件：

```typescript
export class EventSubscriberHandler extends ConnectionHandler {
    __subscribe = [
        {
            name: 'record/judge',
            target: this.onRecordJudge,
        },
    ];
    
    onRecordJudge(rdoc: any) {
        // 当有新的评测记录时触发
        this.send({
            type: 'record',
            data: rdoc,
        });
    }
}
```

### 2. 压缩支持

框架自动处理压缩，当消息过多时会自动重置：

```typescript
// 框架会自动处理，无需手动操作
// 但如果需要，可以手动重置
this.resetCompression();
```

### 3. SSE 支持

如果启用了 `enableSSE` 配置，WebSocket 路由也会支持 Server-Sent Events：

```typescript
// 配置中启用
config: {
    enableSSE: true,
}

// 前端可以使用 EventSource
const eventSource = new EventSource('/ws/my-handler');
eventSource.onmessage = (event) => {
    console.log('收到消息:', event.data);
};
```

### 4. 使用 API 系统的 Subscription

Hydro 的 API 系统支持 Subscription 类型，可以自动处理 WebSocket：

```typescript
import { Subscription } from 'hydrooj';

// 定义 Subscription API
const apis = {
    'my.subscription': Subscription(
        Schema.object({
            topic: Schema.string(),
        }),
        (context, { topic }, send) => {
            // 发送数据
            const interval = setInterval(() => {
                send({ data: 'update' });
            }, 1000);
            
            // 返回清理函数
            return () => {
                clearInterval(interval);
            };
        },
    ),
};

// 注册 API
ctx.inject(['api'], ({ api }) => {
    api.provide(apis);
});
```

前端连接：

```typescript
// 连接到 API WebSocket
