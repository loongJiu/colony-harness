# 双运行模式（Standalone / ControlPlane）

`colony-harness` 设计上支持两种运行模式，并保持核心运行时不依赖控制面 SDK。

## 1. Standalone 模式（默认）

适用场景：

- 本地任务驱动
- 离线调试
- 不接 Queen 的传统 harness 工程

特征：

- 直接调用 `harness.runTask()`
- 不需要 `colony-bee-sdk`
- 适合快速验证 loop/tool/memory/guardrails

## 2. ControlPlane 模式（接 Queen）

适用场景：

- 需要接入 Queen 控制面进行任务编排
- 需要统一 agent 注册、分发、可观测

推荐组合：

1. `@colony-harness/controlplane-sdk-adapter`  
2. `@colony-harness/controlplane-runtime`  
3. `colony-bee-sdk`（由 adapter 接入）

## 3. 最小组合示意

```ts
import { HarnessBuilder } from 'colony-harness'
import { HarnessControlPlaneRuntime } from '@colony-harness/controlplane-runtime'
import { BeeSDKControlPlaneAdapter } from '@colony-harness/controlplane-sdk-adapter'

const harness = await new HarnessBuilder().llm(provider).build()
harness.task('research', async (ctx) => `done: ${String(ctx.input)}`)

const adapter = new BeeSDKControlPlaneAdapter({
  queenUrl: process.env.QUEEN_URL!,
  colonyToken: process.env.COLONY_TOKEN!,
  capabilities: ['research'],
  beeAgent, // 注入真实 BeeAgent 实例
})

const runtime = new HarnessControlPlaneRuntime({
  harness,
  controlPlane: adapter,
})

await runtime.start()
```

## 4. 边界约束（必须遵守）

- `core` 不直接依赖 `colony-bee-sdk`
- 控制面接入能力必须在 adapter 层实现
- 业务任务逻辑仍在 harness task handler 内，不写进 adapter

