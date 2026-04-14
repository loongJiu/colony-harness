# Quickstart

本指南帮助你在 10 分钟内跑起一个可工作的 colony-harness Agent。

## 1. 环境准备

- Node.js `>=18.18.0`
- pnpm `>=10`

```bash
pnpm install
pnpm build
```

## 2. 创建最小 Agent

```ts
import { z } from 'zod'
import { HarnessBuilder } from 'colony-harness'
import { OpenAIProvider } from '@colony-harness/llm-openai'

const harness = await new HarnessBuilder()
  .llm(
    new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4o-mini',
    }),
  )
  .tool({
    id: 'echo',
    description: 'Echo input',
    inputSchema: z.object({ text: z.string() }),
    execute: async ({ text }) => ({ text }),
  })
  .build()

harness.task('chat', async (ctx) => {
  const result = await ctx.runLoop(`回答用户问题: ${String(ctx.input)}`)
  return result.output
})
```

## 3. 运行示例项目

```bash
pnpm --filter @colony-harness/example-basic-agent dev
pnpm --filter @colony-harness/example-memory-agent dev
```

需要完整步骤、输出讲解和报错排查，请看 [examples-running.md](./examples-running.md)。

## 4. 开发时常用命令

```bash
pnpm build
pnpm typecheck
pnpm test
```

## 5. 下一步

- 增加记忆：`@colony-harness/memory-sqlite` / `@colony-harness/memory-redis`
- 增加可观测性：`@colony-harness/trace-*`
- 增加工具能力：`@colony-harness/tools-builtin`
- 增加评测：`@colony-harness/evals`
