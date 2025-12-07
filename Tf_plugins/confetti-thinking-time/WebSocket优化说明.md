# AI 对话流式传输 WebSocket 优化说明

## 优化概述

基于 WebSocket 测试插件的学习，对 `confetti-thinking-time` 插件的 AI 对话功能进行了全面优化，从 HTTP 请求改为 WebSocket 流式传输，实现了真正的实时流式响应。

## 主要改进

### 1. 后端优化

#### 1.1 注册 WebSocket 路由

在 `index.ts` 中注册了 WebSocket 路由：

```typescript
// AI 辅助 WebSocket 流式接口
ctx.Connection(
    'confetti_ai_helper_stream',
    '/ws/ai-helper/stream',
    AiHelperStreamHandler,
);
```

#### 1.2 实现真正的流式 API

**之前的问题**：
- 使用 HTTP POST 请求，等待完整响应
- 前端"伪流式"显示，先获取全部内容再逐步显示

**优化后**：
- 使用 DeepSeek 的流式 API（`stream: true`）
- 通过 `ReadableStream` 逐块读取响应
- 实时将每个数据块通过 WebSocket 发送给前端

**关键实现**：

```typescript
async function* callDeepSeekStream(prompt: string): AsyncGenerator<string, void, unknown> {
    const resp = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        // ...
        body: JSON.stringify({
            // ...
            stream: true, // 启用流式响应
        }),
    });

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解析 SSE 格式的数据
        // 提取 content 并 yield
        yield content;
    }
}
```

#### 1.3 消息处理优化

使用 `message()` 方法而不是 `onmessage()`，因为框架会自动解析 JSON：

```typescript
async message(payload: any) {
    // payload 已经是解析后的对象
    const { problemId, code, mode, ... } = payload;
    
    // 实时转发流式数据
    for await (const chunk of callDeepSeekStream(promptText)) {
        this.send(JSON.stringify({
            type: 'delta',
            content: chunk,
            accumulated: fullContent,
        }));
    }
}
```

#### 1.4 消息类型设计

定义了清晰的消息类型：

- `ready`: 连接就绪
- `start`: 开始处理
- `delta`: 流式数据块（实时追加）
- `structured`: 结构化数据（JSON 解析成功时）
- `done`: 流式传输完成
- `final`: 最终结果（包含完整解析的数据）
- `error`: 错误信息

### 2. 前端优化

#### 2.1 WebSocket 连接管理

```typescript
const [ws, setWs] = useState<WebSocket | null>(null);
const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
```

#### 2.2 实时流式显示

```typescript
websocket.onmessage = (event: MessageEvent) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'delta':
            // 实时追加内容
            setAnalysisText((prev) => prev + (data.content || ''));
            break;
        case 'final':
            // 最终结果
            setResult(data.data);
            break;
        // ...
    }
};
```

#### 2.3 连接状态管理

- 连接中：显示"正在连接 AI 服务..."
- 已连接：显示"AI 正在回答..."
- 实时更新：内容逐字显示，无需等待

## 技术要点

### WebSocket 在 Hydro 插件中的使用流程

1. **注册路由**：使用 `ctx.Connection()` 注册 WebSocket 路由
2. **创建 Handler**：继承 `ConnectionHandler` 类
3. **实现方法**：
   - `prepare()`: 连接建立前的准备工作（权限检查等）
   - `message(payload)`: 处理客户端消息（payload 已解析）
   - `cleanup()`: 连接关闭时的清理工作
4. **发送消息**：使用 `this.send()` 发送数据
5. **关闭连接**：使用 `this.close(code, reason)` 关闭连接

### 流式 API 处理

1. **启用流式**：在 API 请求中设置 `stream: true`
2. **读取流**：使用 `ReadableStream.getReader()` 读取
3. **解析 SSE**：处理 `data: {...}` 格式的数据
4. **实时转发**：通过 WebSocket 实时发送给前端

### 前端 WebSocket 连接

1. **构建 URL**：
   ```typescript
   const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
   const wsUrl = `${protocol}//${host}${wsPrefix}/ws/ai-helper/stream`;
   ```

2. **处理心跳**：
   ```typescript
   if (event.data === 'ping') {
       websocket.send('pong');
   }
   ```

3. **错误处理**：监听 `onerror` 和 `onclose` 事件

## 性能优势

1. **实时响应**：用户无需等待完整响应，可以立即看到 AI 的回答
2. **更好的体验**：逐字显示，类似 ChatGPT 的体验
3. **资源优化**：不需要等待完整响应，可以更早释放资源
4. **错误恢复**：如果中途出错，用户已经看到部分内容

## 兼容性

- 保留了原有的 HTTP 接口（`AiHelperHandler`），确保向后兼容
- 前端优先使用 WebSocket，失败时可以选择降级到 HTTP

## 使用示例

### 后端 Handler

```typescript
export class AiHelperStreamHandler extends ConnectionHandler {
    async prepare() {
        // 权限检查
        if (!this.user?._id) {
            this.close(4001, 'Unauthorized');
            return;
        }
    }

    async message(payload: any) {
        // 处理请求
        for await (const chunk of callDeepSeekStream(promptText)) {
            this.send(JSON.stringify({ type: 'delta', content: chunk }));
        }
    }
}
```

### 前端连接

```typescript
const ws = new WebSocket(wsUrl);
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'delta') {
        setText(prev => prev + data.content);
    }
};
```

## 总结

通过这次优化，AI 对话功能从"伪流式"升级为真正的流式传输，用户体验大幅提升。同时，代码结构更加清晰，易于维护和扩展。

