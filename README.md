# colony-harness

> 基于 `colony-bee-sdk` 设计理念构建的生产级 AI Agent Harness（MVP）

`colony-harness` 用来解决“模型很强，但缺少生产运行时”的问题。它提供了可组合的 Agent 执行基础设施：

- ReAct Agentic Loop（推理 -> 行动 -> 观察）
- Tool Registry（工具注册、Schema 校验、调用）
- Memory Manager（working + episodic + semantic 抽象）
- Trace Hub（全链路追踪 + 可插拔导出）
- Guardrails（输入输出护栏）
- 声明式 `HarnessBuilder` API

## MVP 状态

当前版本为 `v0.1.0`（MVP），已实现开发计划中 Phase 1-7 的核心链路，并补充了必要的工程化与开源维护文件。

已包含：

- `colony-harness`（core runtime）
- `@colony-harness/memory-sqlite`
- `@colony-harness/memory-redis`
- `@colony-harness/trace-console`
- `@colony-harness/trace-file`
- `@colony-harness/trace-otel`
- `@colony-harness/trace-langfuse`
- `@colony-harness/llm-openai`
- `@colony-harness/llm-openai-compatible`
- `@colony-harness/llm-anthropic`
- `@colony-harness/llm-gemini`
- `@colony-harness/tools-builtin`
- `@colony-harness/evals`
- `examples/basic-agent` / `examples/memory-agent`
- 单元与集成测试（loop + tools + memory）

## 项目结构

```text
colony-harness/
├── packages/
│   ├── core/                 # 核心运行时 (npm: colony-harness)
│   ├── memory-sqlite/        # SQLite 记忆适配器
│   ├── memory-redis/         # Redis 记忆适配器
│   ├── trace-console/        # 终端 trace 导出器
│   ├── trace-file/           # JSONL 文件导出器
│   ├── trace-otel/           # OpenTelemetry 导出桥接
│   ├── trace-langfuse/       # Langfuse 导出器
│   ├── tools-builtin/        # 内置工具集
│   ├── llm-openai/           # OpenAI 模型调用器
│   ├── llm-openai-compatible/# OpenAI 协议兼容模型调用器
│   ├── llm-anthropic/        # Anthropic Claude 调用器
│   ├── llm-gemini/           # Google Gemini 调用器
│   └── evals/                # 评测执行器与 scorer
├── examples/
│   ├── basic-agent/          # 最小可运行示例
│   └── memory-agent/         # 记忆与语义检索示例
├── docs/
└── .github/
```

## 快速开始

### 1. 环境要求

- Node.js >= 18.18
- pnpm >= 10

### 2. 安装依赖

```bash
pnpm install
```

### 3. 构建与测试

```bash
pnpm build
pnpm typecheck
pnpm test
```

### 4. 运行示例

```bash
pnpm --filter @colony-harness/example-basic-agent dev
pnpm --filter @colony-harness/example-memory-agent dev
# 使用 SQLite 作为 memory backend（可选）
MEMORY_BACKEND=sqlite pnpm --filter @colony-harness/example-memory-agent dev
```

## 文档导航

- 架构设计: [docs/architecture.md](./docs/architecture.md)
- Quickstart: [docs/quickstart.md](./docs/quickstart.md)
- Advanced Guide: [docs/advanced-guide.md](./docs/advanced-guide.md)
- API Reference: [docs/api-reference.md](./docs/api-reference.md)
- Evals 使用说明: [docs/evals.md](./docs/evals.md)
- Changelog 规范: [docs/changelog-guidelines.md](./docs/changelog-guidelines.md)
- Release Workflow: [docs/release-workflow.md](./docs/release-workflow.md)

## 使用示例

```ts
import { z } from 'zod'
import { HarnessBuilder, PromptInjectionGuard } from 'colony-harness'
import { ConsoleTraceExporter } from '@colony-harness/trace-console'
import { OpenAIProvider } from '@colony-harness/llm-openai'

const harness = await new HarnessBuilder()
  .llm(
    new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4o-mini',
    }),
  )
  .trace(new ConsoleTraceExporter())
  .guard(PromptInjectionGuard)
  .tool({
    id: 'calculator',
    description: 'Calculate expression',
    inputSchema: z.object({ expression: z.string() }),
    execute: async ({ expression }) => ({
      value: Function(`return (${expression})`)(),
    }),
  })
  .build()

harness.task('research', async (ctx) => {
  const result = await ctx.runLoop(`研究以下主题: ${String(ctx.input)}`)
  await ctx.memory.save('last_research', result.output)
  return result.output
})

const output = await harness.runTask('research', 'TypeScript Agent Framework')
console.log(output)
```

## 工程化能力

- pnpm workspace + turborepo monorepo
- TypeScript strict mode
- Vitest 单元测试
- GitHub Actions CI（build/typecheck/test）
- ISSUE/PR 模板、贡献指南、安全策略、变更日志

## 内置工具

`@colony-harness/tools-builtin` 当前提供：

- `http_request`
- `read_file`
- `write_file`
- `run_command`
- `search_web`
- `calculator`
- `json_query`
- `template_render`

## 评测工具

`@colony-harness/evals` 提供：

- 评测执行器 `runEvalSuite()`
- 内置 scorer：`exactMatchScorer`、`containsScorer`、`regexScorer`、`numericRangeScorer`
- 标准化结果报告：`results + summary(passRate/averageScore/weightedAverageScore)`

详细说明见 [docs/evals.md](./docs/evals.md)。

## 发布脚本

仓库内置发布脚本：`scripts/release.mjs`。

- 预演发布（不改文件、不发布）：
  - `pnpm release:dry-run -- --bump patch`
- 正式发布（默认先执行 build/typecheck/test）：
  - `pnpm release -- --bump patch`
- 指定版本号与 npm tag：
  - `pnpm release -- --version 0.2.0 --tag next`

常用参数：

- `--no-publish`：只更新版本与 `CHANGELOG`，不执行 `npm publish`
- `--skip-checks`：跳过 `build/typecheck/test`
- `--git-tag`：自动创建 `v<version>` tag
- `--allow-dirty`：允许在 dirty 工作区执行（默认禁止）

完整发布流程见 [docs/release-workflow.md](./docs/release-workflow.md)。

## 开发计划与路线图

- MVP（v0.1.0）: core loop + tool registry + context + builder + in-memory + trace-console + memory-sqlite + llm-openai
- v0.2.0: 完整记忆压缩、更多 trace exporter、增强 guardrails
- v0.3.0: 评测报告体系、自动回归工作流、与 BeeAgent 更深度集成

详细说明见 [docs/architecture.md](./docs/architecture.md)。

## 与 colony-bee-sdk 的关系

当前 MVP 采用与 `colony-bee-sdk` 一致的能力抽象（Task/Loop/Tool/Memory/Trace）来构建 Harness 层。
在后续版本中，`join()` 与 BeeAgent 的深度集成将按 roadmap 持续增强。

## 开源维护

- 贡献指南: [CONTRIBUTING.md](./CONTRIBUTING.md)
- 变更日志: [CHANGELOG.md](./CHANGELOG.md)
- 安全策略: [SECURITY.md](./SECURITY.md)
- 行为准则: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- Changelog 书写规范: [docs/changelog-guidelines.md](./docs/changelog-guidelines.md)
- 发布流程: [docs/release-workflow.md](./docs/release-workflow.md)

## License

MIT
