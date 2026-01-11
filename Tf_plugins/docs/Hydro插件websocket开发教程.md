# Hydro 插件中 WebSocket 使用完整指南

基于 `websocket-test` 插件的详细分析和实践总结。

---

## 📋 目录

1. [架构概述](#架构概述)
2. [后端实现](#后端实现)
3. [前端实现](#前端实现)
4. [完整示例](#完整示例)
5. [核心 API 详解](#核心-api-详解)
6. [最佳实践](#最佳实践)
7. [常见问题](#常见问题)

---

## 🏗️ 架构概述

### 核心组件

Hydro 的 WebSocket 实现基于以下核心组件：

1. **WebSocketServer** (`framework/framework/server.ts`)
   - 基于 `ws` 库
   - 与 HTTP 服务器共享端口
   - 统一管理所有 WebSocket 连接

2. **ConnectionHandler** (`framework/framework/server.ts`)
   - 所有 WebSocket 处理器的基类
   - 继承自 `HandlerCommon`
   - 提供消息发送、连接管理等基础功能

3. **Router** (`framework/framework/router.ts`)
   - 支持路径匹配和参数提取
   - 使用 `path-to-regexp` 进行路由匹配
   - 管理 WebSocket 连接层（WebSocketLayer）

### 工作流程

```
客户端连接请求
    ↓
WebSocketServer 接收连接
    ↓
Router 匹配路径（wsStack）
    ↓
创建 ConnectionHandler 实例
    ↓
执行 prepare() 方法
    ↓
连接建立，等待消息
    ↓
收到消息 → message() 或 onmessage()
    ↓
连接关闭 → cleanup()
```

---

## 🔧 后端实现

### 1. 创建 ConnectionHandler 子类

```typescript
import { ConnectionHandler } from 'hydrooj';

export class MyWebSocketHandler extends ConnectionHandler {
    // 实例变量（每个连接独立）
    private messageCount = 0;
    private startTime = Date.now();

    /**
     * 连接建立前的准备工作
     * - 权限检查
     * - 参数验证
     * - 发送欢迎消息
     */
    async prepare() {
        // 检查用户登录
        if (!this.user?._id) {
            this.send(JSON.stringify({
                type: 'error',
                message: '请先登录',
            }));
            this.close(4001, 'Unauthorized');
            return;
        }

        // 发送欢迎消息
        this.send(JSON.stringify({
            type: 'welcome',
            message: '连接成功',
        }));
    }

    /**
     * 处理客户端消息（推荐方式）
     * payload 已经是解析后的 JSON 对象
     */
    async message(payload: any) {
        const { action, data } = payload;
        
        switch (action) {
            case 'ping':
                this.send(JSON.stringify({ type: 'pong' }));
                break;
            // ... 其他操作
        }
    }

    /**
     * 处理原始消息字符串（可选）
     * 需要手动解析 JSON
     */
    async onmessage(message: string) {
        const payload = JSON.parse(message);
        await this.message(payload);
    }

    /**
     * 连接关闭时的清理工作
     */
    async cleanup() {
        console.log('连接已关闭');
        // 清理资源、取消订阅等
    }
}
```

### 2. 注册 WebSocket 路由

在插件主入口文件 `index.ts` 中：

```typescript
import { Context } from 'hydrooj';
import { MyWebSocketHandler } from './src/handlers/MyWebSocketHandler';

export default async function apply(ctx: Context) {
    // 基本注册
    ctx.Connection(
        'my_websocket',        // 路由名称（唯一标识）
        '/ws/my-handler',      // WebSocket 路径
        MyWebSocketHandler,    // Handler 类
    );

    // 带路径参数的注册
    ctx.Connection(
        'my_websocket_room',
        '/ws/room/:roomId',    // roomId 会作为参数传递
        MyWebSocketHandler,
    );

    // 带权限检查的注册
    ctx.Connection(
        'admin_websocket',
        '/ws/admin',
        AdminWebSocketHandler,
        PERM.PERM_EDIT_DOMAIN,  // 权限检查
        PRIV.PRIV_USER_PROFILE, // 特权检查
    );
}
```

### 3. ConnectionHandler 可用属性和方法

#### 属性

```typescript
class ConnectionHandler {
    conn: WebSocket;              // WebSocket 连接对象
    compression: Shorty;          // 压缩器（自动管理）
    counter: number;              // 消息计数器
    
    // 继承自 HandlerCommon
    user: UserModel;              // 当前用户
    domain: { _id: string };      // 当前域
    args: Record<string, any>;    // 路径参数和查询参数
    request: HydroRequest;        // 请求信息
    response: HydroResponse;      // 响应信息
    ctx: Context;                 // Hydro 上下文
}
```

#### 方法

```typescript
// 发送消息（自动处理压缩）
send(data: any): void

// 关闭连接
close(code: number, reason: string): void

// 重置压缩（框架自动调用）
resetCompression(): void

// 错误处理
onerror(err: HydroError): void
```

---

## 💻 前端实现

### 1. 构建 WebSocket URL

```typescript
// 获取 WebSocket URL
function buildWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsPrefix = UiContext?.ws_prefix || '';
    const path = '/ws/test';  // 后端注册的路径
    
    return `${protocol}//${host}${wsPrefix}${path}`;
}
```

### 2. 创建和管理连接

```typescript
let ws: WebSocket | null = null;

function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('已经连接');
        return;
    }

    const wsUrl = buildWebSocketUrl();
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('连接成功');
        startHeartbeat();
    };

    ws.onmessage = (event: MessageEvent) => {
        // 处理心跳
        if (event.data === 'ping') {
            ws?.send('pong');
            return;
        }
        if (event.data === 'pong') {
            return;
        }

        // 处理业务消息
        try {
            const data = JSON.parse(event.data);
            handleMessage(data);
        } catch (e) {
            console.error('解析消息失败', e);
        }
    };

    ws.onclose = (event) => {
        console.log('连接关闭', event.code, event.reason);
        stopHeartbeat();
        
        // 自动重连（可选）
        if (event.code !== 1000) {
            scheduleReconnect();
        }
    };

    ws.onerror = (error) => {
        console.error('连接错误', error);
    };
}
```

### 3. 发送消息

```typescript
function sendMessage(action: string, data?: any) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket 未连接');
        return;
    }

    const payload = {
        action,
        data,
    };

    ws.send(JSON.stringify(payload));
}
```

### 4. 心跳检测

```typescript
let heartbeatTimer: NodeJS.Timeout | null = null;

function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
        }
    }, 30000); // 每 30 秒
}

function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}
```

### 5. 自动重连

```typescript
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function scheduleReconnect() {
    if (reconnectTimer) return;

    reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** (reconnectAttempts - 1), 10000);
    
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectWebSocket();
    }, delay);
}
```

---

## 📝 完整示例

### 后端 Handler

```typescript
// src/handlers/ChatHandler.ts
import { ConnectionHandler } from 'hydrooj';

export class ChatHandler extends ConnectionHandler {
    private roomId: string;

    async prepare() {
        // 获取路径参数
        this.roomId = this.args.roomId;
        
        if (!this.roomId) {
            this.close(4002, 'Room ID required');
            return;
        }

        // 权限检查
        if (!this.user?._id) {
            this.close(4001, 'Unauthorized');
            return;
        }

        // 加入房间逻辑
        await this.joinRoom(this.roomId);
    }

    async message(payload: any) {
        const { action, data } = payload;

        switch (action) {
            case 'send_message':
                await this.broadcastToRoom({
                    type: 'message',
                    from: this.user._id,
                    content: data.content,
                    timestamp: Date.now(),
                });
                break;

            case 'get_history':
                const history = await this.getRoomHistory();
                this.send(JSON.stringify({
                    type: 'history',
                    messages: history,
                }));
                break;
        }
    }

    async cleanup() {
        await this.leaveRoom(this.roomId);
    }

    private async joinRoom(roomId: string) {
        // 实现加入房间逻辑
    }

    private async leaveRoom(roomId: string) {
        // 实现离开房间逻辑
    }

    private async broadcastToRoom(message: any) {
        // 实现广播逻辑
    }

    private async getRoomHistory() {
        // 实现获取历史消息逻辑
        return [];
    }
}
```

### 前端页面

```typescript
// frontend/chat.page.tsx
import { addPage, NamedPage } from '@hydrooj/ui-default';
import $ from 'jquery';

declare const UiContext: any;

addPage(new NamedPage('chat', () => {
    let ws: WebSocket | null = null;
    const roomId = $('#room-id').data('room-id');

    function connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}${UiContext?.ws_prefix || ''}/ws/chat/${roomId}`;
        
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('已连接到聊天室');
        };

        ws.onmessage = (event) => {
            if (event.data === 'ping') {
                ws?.send('pong');
                return;
            }

            const data = JSON.parse(event.data);
            if (data.type === 'message') {
                appendMessage(data);
            }
        };
    }

    function sendMessage(content: string) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: 'send_message',
                data: { content },
            }));
        }
    }

    function appendMessage(message: any) {
        // 显示消息到界面
    }

    connect();
}));
```

---

## 🔍 核心 API 详解

### ConnectionHandler 生命周期

```
1. 连接建立
   ↓
2. prepare() - 准备工作
   ↓
3. 连接激活（active = true）
   ↓
4. 等待消息
   ↓
5. message() / onmessage() - 处理消息
   ↓
6. 连接关闭
   ↓
7. cleanup() - 清理工作
```

### 消息处理方式对比

| 方式 | 方法 | payload 类型 | 使用场景 |
|------|------|-------------|---------|
| **推荐** | `message(payload)` | 已解析的对象 | JSON 消息 |
| **备选** | `onmessage(message)` | 原始字符串 | 非 JSON 或需要自定义解析 |

### 路径参数访问

```typescript
// 注册时
ctx.Connection('handler', '/ws/room/:roomId/user/:userId', MyHandler);

// Handler 中访问
async prepare() {
    const roomId = this.args.roomId;    // 从路径获取
    const userId = this.args.userId;   // 从路径获取
    const query = this.args.queryParam; // 从查询字符串获取
}
```

### 自动压缩机制

Hydro 使用 Shorty 压缩算法自动压缩消息：

- 前 1000 条消息自动压缩
- 超过 1000 条后自动重置压缩器
- 客户端收到 `'shorty'` 消息时需要使用 Shorty 解压

```typescript
// 框架自动处理，无需手动操作
// 但可以手动重置
this.resetCompression();
```

### 心跳机制

框架内置心跳检测：

- 服务器每 30 秒发送 `ping`
- 客户端应回复 `pong`
- 80 秒无响应自动断开连接

```typescript
// 服务器端（框架自动处理）
// 客户端需要手动实现
ws.onmessage = (event) => {
    if (event.data === 'ping') {
        ws.send('pong');
    }
};
```

---

## ✅ 最佳实践

### 1. 错误处理

```typescript
async message(payload: any) {
    try {
        // 业务逻辑
    } catch (error: any) {
        this.send(JSON.stringify({
            type: 'error',
            message: error.message,
        }));
    }
}
```

### 2. 消息格式规范

```typescript
// 推荐的消息格式
interface Message {
    type: 'request' | 'response' | 'error' | 'notification';
    action?: string;      // 操作类型
    data?: any;          // 数据
    id?: string;         // 请求 ID（用于匹配请求/响应）
    timestamp?: number;  // 时间戳
}
```

### 3. 连接状态管理

```typescript
// 前端：维护连接状态
enum ConnectionState {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    ERROR = 'error',
}

let state: ConnectionState = ConnectionState.DISCONNECTED;
```

### 4. 资源清理

```typescript
async cleanup() {
    // 取消事件订阅
    this.ctx.off('some-event', this.handler);
    
    // 清理定时器
    if (this.interval) {
        clearInterval(this.interval);
    }
    
    // 释放资源
    await this.releaseResources();
}
```

### 5. 权限检查

```typescript
async prepare() {
    // 方式 1: 在注册时指定权限
    // ctx.Connection('name', '/path', Handler, PERM.PERM_VIEW_PROBLEM);
    
    // 方式 2: 在 prepare 中检查
    if (!this.user?._id) {
        this.close(4001, 'Unauthorized');
        return;
    }
    
    // 方式 3: 使用 checkPerm
    this.checkPerm(PERM.PERM_VIEW_PROBLEM);
}
```

### 6. 流式数据传输

```typescript
async message(payload: any) {
    if (payload.action === 'stream') {
        const count = payload.data?.count || 10;
        
        for (let i = 1; i <= count; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            this.send(JSON.stringify({
                type: 'stream',
                index: i,
                total: count,
                data: `数据块 ${i}`,
            }));
        }
        
        this.send(JSON.stringify({
            type: 'stream',
            done: true,
        }));
    }
}
```

---

## ❓ 常见问题

### Q1: 如何实现房间/频道功能？

```typescript
// 使用路径参数区分房间
ctx.Connection('chat', '/ws/chat/:roomId', ChatHandler);

// 在 Handler 中管理房间
private static rooms = new Map<string, Set<ConnectionHandler>>();

async prepare() {
    const roomId = this.args.roomId;
    if (!ChatHandler.rooms.has(roomId)) {
        ChatHandler.rooms.set(roomId, new Set());
    }
    ChatHandler.rooms.get(roomId)!.add(this);
}

async cleanup() {
    const roomId = this.args.roomId;
    ChatHandler.rooms.get(roomId)?.delete(this);
}

private broadcastToRoom(roomId: string, message: any) {
    const room = ChatHandler.rooms.get(roomId);
    if (room) {
        room.forEach(handler => {
            handler.send(JSON.stringify(message));
        });
    }
}
```

### Q2: 如何处理大量并发连接？

- 使用连接池管理
- 实现连接限制
- 使用 Redis 等外部存储管理状态

### Q3: 如何实现消息队列？

```typescript
private messageQueue: any[] = [];
private processing = false;

async message(payload: any) {
    this.messageQueue.push(payload);
    if (!this.processing) {
        this.processQueue();
    }
}

private async processQueue() {
    this.processing = true;
    while (this.messageQueue.length > 0) {
        const payload = this.messageQueue.shift();
        await this.handleMessage(payload);
    }
    this.processing = false;
}
```

### Q4: 如何调试 WebSocket？

```typescript
// 后端：添加日志
async message(payload: any) {
    console.log('[WebSocket] 收到消息:', payload);
    // 处理逻辑
    console.log('[WebSocket] 发送响应:', response);
}

// 前端：使用浏览器开发者工具
// Network → WS → 查看 WebSocket 连接和消息
```

### Q5: 如何实现断线重连？

参考前端实现部分的"自动重连"代码，使用指数退避算法。

---

## 📚 参考资源

- **框架源码**:
  - `framework/framework/server.ts` - ConnectionHandler 实现
  - `framework/framework/router.ts` - WebSocket 路由
  - `framework/framework/api.ts` - API 集成示例

- **示例插件**:
  - `Tf_plugins/websocket-test`