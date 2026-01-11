### Hydro 插件间服务对外提供（provide）与获取（inject）使用说明

本文档总结了在 Hydro 插件生态中使用 `ctx.provide` / `ctx.inject` 与事件机制的最佳实践、常见问题与迁移建议，方便今后统一改造与维护。

> 目标：在插件间共享服务（例如 `scoreService`）时，保证安全、可维护、类型友好且不依赖加载顺序。

---

## 一、核心概念回顾
- `ctx.provide(name, value)`：由“提供者”在 `apply(ctx)` 中调用，把运行时服务注册到框架上下文，供其它插件获取或注入。
- `ctx.inject(names, callback)`：由“消费者”调用，框架在依赖可用时调用 `callback`，通过参数安全获得所需服务。
- 事件系统：`ctx.emit(event, payload)` 与 `ctx.on(event, handler)` 用于跨插件解耦通信（推荐首选）。

## 二、为什么不要随意读/写 `ctx` 上的属性
- 框架可能对 `ctx` 做 Proxy 或多协程保护：
  - 在不同 fiber/执行上下文中写同一 `ctx` 属性会报错（例如 `cannot set property "scoreService" in multiple fibers`）。
  - 在插件未注入完成前直接读 `ctx.scoreService` 可能抛出 `cannot get property "scoreService" without inject`。
- 因此避免把注入得到的实例写回 `ctx`（不要做 `(ctx as any).scoreService = scoreService`），也不要在模块顶层直接访问 `ctx` 的可选属性。

## 三、优先级策略（实践指南）
1. 事件优先（最稳健）
   - 生产者只 `ctx.emit('typing/bonus-awarded', payload)`。
   - 消费者（如 `score-system`）`ctx.on('typing/bonus-awarded', handler)` 处理写库逻辑。
   - 优点：完全解耦、无加载顺序依赖、易扩展。

2. provide + inject（在确需调用 API 的场景使用）
   - 提供者：
     ```ts
     ctx.provide('scoreService', scoreService);
     ```
   - 消费者：
     ```ts
     ctx.inject(['scoreService'], ({ scoreService }) => {
       // 在回调中使用 scoreService，避免写回 ctx
     });
     ```
   - 注意：不要在 inject 回调里把实例赋回 `ctx`，也不要在模块顶层访问 `ctx.scoreService`。

3. 回退策略（兼容老代码）
   - 在请求/handler 运行时读取时使用安全读取（包裹 try/catch）：
     ```ts
     let scoreSvc;
     try {
       // 访问可能抛出的 getter
       scoreSvc = (ctx as any).scoreService;
     } catch (e) {
       scoreSvc = undefined;
     }
     if (scoreSvc) { await scoreSvc.getUserScore(...); }
     else { await ctx.db.collection('score.users').findOne({ uid }); }
     ```
   - 推荐：把这种回退仅限于 handler 的运行时路径，不要在模块加载阶段使用。

## 四、典型示例（参考实现）
- ScoreSystem（提供者）：
```ts
const scoreService = new ScoreService(finalConfig, ctx);
if (typeof ctx.provide === 'function') {
  ctx.provide('scoreService', scoreService);
}
ctx.on('typing/bonus-awarded', async (data) => {
  if (!finalConfig.enabled || data.bonus <= 0) return;
  await scoreService.updateUserScore(data.domainId, data.uid, data.bonus);
  await scoreService.addScoreRecord({ uid: data.uid, domainId: data.domainId, pid: ..., score: data.bonus, reason: data.reason });
});
```

- Homepage（消费者，优先 inject，回退 DB）：
```ts
// apply(ctx)
ctx.inject(['scoreService'], ({ scoreService }) => {
  // 可用于初始化或缓存，不把实例写回 ctx
});

// handler 中运行时安全读取
let scoreSvc;
try { scoreSvc = (ctx as any).scoreService; } catch (e) { scoreSvc = undefined; }
if (scoreSvc) { await scoreSvc.getUserScore(domainId, uid); }
else { await ctx.db.collection('score.users').findOne({ uid }); }
```

## 五、Fiber / 并发注意事项
- 不要在不同插件或多个 fiber 中写相同 `ctx` 属性；这会引起框架内部保护抛错。
- 如果需要模块范围共享注入的实例：在 inject 回调中把实例保存到本插件的私有顶层变量（而非 `ctx`），并确保该赋值只在该插件上下文内发生一次。

## 六、TypeScript 类型建议（长期改进）
- 使用 module augmentation 扩展 `hydrooj` 的 `Context` 与 `EventMap`，在类型层面声明插件间契约：
```ts
declare module 'hydrooj' {
  interface Context { scoreService?: import('../score-system/src/services/ScoreService').ScoreService }
  interface EventMap { 'typing/bonus-awarded': (data: { uid:number; domainId:string; bonus:number; reason:string }) => void }
}
```
- 或建立共享 typings 包，插件统一依赖，减少 `any` 与断言。

## 七、迁移/重构清单（可执行步骤）
1. 确保 `score-system` 已实现并监听所有需要的事件（如 `typing/bonus-awarded`）。
2. 在消费插件中，把直接写 `score.*` 的代码替换为事件发布或使用 `ctx.inject` 获取 `scoreService`。
3. 移除把 inject 写回 `ctx` 的代码，改为模块私有缓存或在回调内直接使用。
4. 添加集成测试：发事件 → 断言 `score.records` 与 `score.users` 已更新。
5. 引入 typings 并逐步替换 `any`，提高类型安全。

## 八、常见问题与排查
- “cannot get property 'scoreService' without inject” —— 在未注入时直接读取，改为使用 `ctx.inject` 或在运行时做安全读取。
- “cannot set property 'scoreService' in multiple fibers” —— 不要在多个地方写回 `ctx`，改用 inject 回调或模块私有变量。
- 若某插件需要强依赖 `score-system`，考虑把功能拆分为“事件 + 可选提供 service”，不要强绑定加载顺序。

---

如需，我可以：
- 把此文档同步到仓库根 README 或 CI 检查（强制代码审核项）；或
- 生成一份迁移 PR 模板，自动列出需要替换的文件和替换示例。


