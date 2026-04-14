# Quickstart

This guide helps you scaffold and run a basic colony-harness agent.

## 1. Requirements

- Node.js `>=18.18.0`
- pnpm `>=10`

```bash
pnpm install
pnpm build
```

## 2. Create a minimal agent

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
```

## 3. Common commands

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm docs:build
```

For step-by-step example runtime guidance and troubleshooting, see [Running the Examples](./examples-running.md).
