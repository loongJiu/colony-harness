# Dual Runtime Modes (Standalone / ControlPlane)

`colony-harness` supports two runtime modes while keeping the core runtime independent from control-plane SDK internals.

## 1. Standalone mode (default)

Use when:

- You run tasks locally
- You need offline debugging
- You want a classic harness runtime without Queen

Characteristics:

- Direct `harness.runTask()` execution
- No `colony-bee-sdk` required
- Fast loop/tool/memory/guardrails validation

## 2. ControlPlane mode (Queen integration)

Use when:

- You need Queen task orchestration
- You need unified registration, dispatch, and observability

Recommended composition:

1. `@colony-harness/controlplane-sdk-adapter`
2. `@colony-harness/controlplane-runtime`
3. `colony-bee-sdk` (plugged in through the adapter)

## 3. Minimal composition example

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
  beeAgent,
})

const runtime = new HarnessControlPlaneRuntime({
  harness,
  controlPlane: adapter,
})

await runtime.start()
```

## 4. Boundary constraints

- `core` must not directly depend on `colony-bee-sdk`
- Control-plane integration belongs to adapter packages
- Business task logic remains in harness task handlers, not in adapters

