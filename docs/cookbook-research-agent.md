# Cookbook: 研究助手 Agent

本示例组合了 4 个能力：

- Loop 推理
- Built-in tools
- 语义记忆
- Evals 回归

## 1. 目标

实现一个可迭代研究助手：

1. 使用工具检索/读取信息
2. 把结论写入语义记忆
3. 用 evals 评估输出质量

## 2. 代码骨架

```ts
import { z } from 'zod'
import { HarnessBuilder } from 'colony-harness'
import { OpenAIProvider } from '@colony-harness/llm-openai'
import { createBuiltinTools } from '@colony-harness/tools-builtin'
import { runEvalSuite, containsScorer } from '@colony-harness/evals'

const harness = await new HarnessBuilder()
  .llm(new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o-mini' }))
  .memoryConfig({
    embedder: async (text) => [text.length],
    semanticTopK: 3,
  })
  .tool(...createBuiltinTools({
    file: { baseDir: './workspace' },
    runCommand: { allowedCommands: ['node', 'pnpm'] },
  }))
  .build()

harness.task('research', async (ctx) => {
  const query = String(ctx.input)
  const result = await ctx.runLoop(`请研究并总结: ${query}`)
  await ctx.memory.saveSemantic('research:latest', { query, summary: result.output })
  return result.output
})

const output = await harness.runTask('research', 'TypeScript Agent Framework')

const report = await runEvalSuite({
  cases: [{ id: 'quality-1', input: output, expected: ['TypeScript', 'Agent'] }],
  runner: async ({ input }) => String(input),
  scorer: containsScorer({ ignoreCase: true, mode: 'all' }),
})

console.log({ output, eval: report.summary })
```

## 3. 关键设计点

- 工具权限要收敛：`run_command` 白名单
- 记忆只存“可复用结论”，避免噪声
- evals 在 PR 或 release 前自动执行

## 4. 上线前最小检查

1. `pnpm build`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm docs:build`
5. 关键业务 case 的 eval 通过率达标
