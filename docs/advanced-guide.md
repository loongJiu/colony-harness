# Advanced Guide

本指南聚焦生产场景中的常见组合能力：护栏、记忆、追踪和工具治理。

## 1. 护栏策略叠加

```ts
import {
  HarnessBuilder,
  PromptInjectionGuard,
  TokenLimitGuard,
  RateLimitGuard,
} from 'colony-harness'

const harness = await new HarnessBuilder()
  .guard(PromptInjectionGuard)
  .guard(TokenLimitGuard({ maxTokens: 2000 }))
  .guard(RateLimitGuard({ maxRequests: 60, windowMs: 60_000 }))
  .build()
```

建议：

- 输入侧优先拦截 prompt injection 与敏感词
- 输出侧执行 PII 脱敏与长度限制
- 关键任务开启限流，防止滥用

## 2. 记忆后端切换

```ts
import { HarnessBuilder } from 'colony-harness'
import { SqliteMemoryAdapter } from '@colony-harness/memory-sqlite'

const harness = await new HarnessBuilder()
  .memory(new SqliteMemoryAdapter({ dbPath: './data/memory.db' }))
  .build()
```

建议：

- 本地开发优先 SQLite
- 多实例部署优先 Redis
- 对话较长时启用 `ContextCompressor`

## 3. 可观测性导出

```ts
import { HarnessBuilder } from 'colony-harness'
import { ConsoleTraceExporter } from '@colony-harness/trace-console'
import { FileTraceExporter } from '@colony-harness/trace-file'

const harness = await new HarnessBuilder()
  .trace(new ConsoleTraceExporter())
  .trace(new FileTraceExporter({ filePath: './logs/trace.jsonl' }))
  .build()
```

建议：

- 开发环境使用 console + file
- 生产环境接入 OTEL/Langfuse
- 将 trace metrics 对接监控告警

## 4. 工具访问控制

`@colony-harness/tools-builtin` 提供 `run_command`、`read_file` 等强能力工具，建议：

- 对 `run_command` 设置 `allowedCommands` 白名单
- 对文件工具设置 `baseDir`，避免越界访问
- 对高风险工具启用审批回调

## 5. 回归评测

```ts
import { runEvalSuite, exactMatchScorer } from '@colony-harness/evals'

const report = await runEvalSuite({
  cases: [{ id: '1', input: 'hello', expected: 'HELLO' }],
  runner: async ({ input }) => input.toUpperCase(),
  scorer: exactMatchScorer(),
})
```

建议将评测报告作为发布前质量门禁的一部分。
