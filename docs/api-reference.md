# API Reference

本页覆盖 colony-harness 全部 18 个包的完整 API 文档。每个包包含安装命令、快速示例和参数表。

---

## Core Runtime

<div class="pkg-header">
<span class="badge badge-core">Core</span>
<div class="pkg-header-info">

### `colony-harness`

核心运行时包。包含 HarnessBuilder、ColonyHarness、AgenticLoop、ToolRegistry、MemoryManager、TraceHub、Guardrails 及 5 个内置护栏。

<span class="pkg-install">pnpm add colony-harness</span>

</div>
</div>

### HarnessBuilder

声明式构建器 API —— 唯一入口。通过链式调用组装 LLM、工具、记忆、追踪和护栏。

```typescript
import { HarnessBuilder } from 'colony-harness'

const harness = new HarnessBuilder()
  .llm(provider)
  .tool(calculatorTool)
  .memory(adapter)
  .trace(exporter)
  .guard(new PromptInjectionGuard())
  .build()
```

<table class="api-table">
<thead><tr><th>方法</th><th>参数</th><th>说明</th></tr></thead>
<tbody>
<tr><td><code>llm(provider)</code></td><td><code>LLMProvider</code></td><td>注入模型调用器（必需）</td></tr>
<tr><td><code>tool(...tools)</code></td><td><code>ToolDefinition[]</code></td><td>注册工具</td></tr>
<tr><td><code>toolApproval(cb)</code></td><td><code>(name, input) => Promise&lt;boolean&gt;</code></td><td>高风险工具审批回调</td></tr>
<tr><td><code>memory(adapter)</code></td><td><code>MemoryAdapter</code></td><td>指定记忆后端</td></tr>
<tr><td><code>memoryConfig(cfg)</code></td><td>见下表</td><td>配置记忆策略</td></tr>
<tr><td><code>trace(...exporters)</code></td><td><code>TraceExporter[]</code></td><td>配置 trace 导出器</td></tr>
<tr><td><code>guard(...guards)</code></td><td><code>Guard[]</code></td><td>配置护栏</td></tr>
<tr><td><code>loopConfig(cfg)</code></td><td>见下表</td><td>配置 Agentic Loop 行为</td></tr>
<tr><td><code>systemPrompt(text)</code></td><td><code>string</code></td><td>覆盖默认系统提示词</td></tr>
<tr><td><code>build()</code></td><td>—</td><td>构建并返回 <code>ColonyHarness</code> 实例</td></tr>
</tbody>
</table>

**loopConfig 参数：**

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `maxIterations` | `20` | 最大迭代轮次 |
| `callTimeout` | `30000` | 单次模型调用超时 (ms) |
| `modelFailStrategy` | `abort` | 模型失败策略：`abort` / `retry` |
| `modelRetryMax` | `2` | 模型重试最大次数（策略为 `retry` 时） |
| `modelRetryBaseDelayMs` | `300` | 模型重试基础退避时间 (ms) |
| `modelRetryMaxDelayMs` | `5000` | 模型重试退避时间上限 (ms) |
| `modelRetryJitterRatio` | `0.2` | 模型重试抖动比例（0~1） |
| `modelRetryMaxTotalDelayMs` | `15000` | 模型重试总等待预算上限 (ms) |
| `modelCircuitBreakerEnabled` | `true` | 是否启用模型熔断器 |
| `modelCircuitBreakerFailureThreshold` | `5` | 熔断触发阈值（连续瞬态失败次数） |
| `modelCircuitBreakerCooldownMs` | `30000` | 熔断冷却时间 (ms) |
| `maxTokens` | 无 | 总 Token 上限 |
| `toolConcurrency` | `1` | 工具并发度 |
| `toolFailStrategy` | `abort` | 失败策略：`abort` / `continue` / `retry` |
| `toolRetryMax` | `2` | 重试最大次数（策略为 `retry` 时） |

**memoryConfig 参数：**

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `workingMemoryTokenLimit` | `6000` | Working memory 压缩阈值 |
| `episodicRetentionDays` | `30` | Episodic 记忆保留天数 |
| `semanticTopK` | `5` | 语义检索默认返回条数 |
| `autoCompress` | `true` | 是否自动压缩上下文 |
| `embedder` | 无 | 语义向量函数 `(text) => number[]` |

### ColonyHarness

运行时容器。注册任务处理器、构建上下文、执行护栏和追踪。

```typescript
const harness = builder.build()

harness.task('chat', async (ctx) => {
  const result = await ctx.runLoop('用户的问题')
  return result
})

const result = await harness.runTask('chat', { question: 'Hello' })
```

<table class="api-table">
<thead><tr><th>方法</th><th>参数</th><th>说明</th></tr></thead>
<tbody>
<tr><td><code>task(capability, handler)</code></td><td><code>string, (ctx) => Promise</code></td><td>注册任务处理器</td></tr>
<tr><td><code>runTask(capability, input, opts?)</code></td><td>见下表</td><td>执行任务</td></tr>
</tbody>
</table>

**runTask options：**

| 字段 | 说明 |
|------|------|
| `taskId` | 外部任务 ID（对齐控制面） |
| `agentId` | Agent 标识 |
| `sessionId` | 会话标识 |
| `signal` | `AbortSignal`，用于取消 |

### HarnessContext

任务 handler 内可用的上下文对象。

```typescript
harness.task('research', async (ctx) => {
  // 运行 Agent Loop
  const reply = await ctx.runLoop('搜索最新论文')

  // 直接调用工具
  const calc = await ctx.invokeTool('calculator', { expression: '2+2' })

  // 记忆操作
  await ctx.memory.save('key', { data: 'value' })
  const recent = await ctx.memory.recent(10)

  // 追踪
  const span = ctx.trace.startSpan('step')
  span.end()
})
```

<table class="api-table">
<thead><tr><th>属性/方法</th><th>类型</th><th>说明</th></tr></thead>
<tbody>
<tr><td><code>runLoop(prompt)</code></td><td><code>string => Promise&lt;string&gt;</code></td><td>启动 Agentic Loop</td></tr>
<tr><td><code>invokeTool(name, input)</code></td><td><code>(string, any) => Promise&lt;any&gt;</code></td><td>直接调用已注册工具</td></tr>
<tr><td><code>callModel(messages)</code></td><td><code>Message[] => Promise&lt;ModelResponse&gt;</code></td><td>直接调用 LLM</td></tr>
<tr><td><code>callModelWithTools(msgs, tools)</code></td><td>带工具定义的 LLM 调用</td><td>调用 LLM 并传入工具列表</td></tr>
<tr><td><code>memory</code></td><td><code>MemoryHandle</code></td><td>记忆操作接口</td></tr>
<tr><td><code>trace</code></td><td><code>TraceHandle</code></td><td>追踪操作接口</td></tr>
<tr><td><code>input</code></td><td><code>any</code></td><td>任务输入数据</td></tr>
</tbody>
</table>

### 内置护栏

所有护栏均从 `colony-harness` 包导出。

| 护栏 | 说明 | 配置参数 |
|------|------|----------|
| `PromptInjectionGuard` | 正则检测常见注入模式 | 无 |
| `PIIGuard` | 脱敏中文身份证/手机号/邮箱 | 无 |
| `TokenLimitGuard` | 拒绝超 Token 阈值的输入 | `{ maxTokens: number }` |
| `SensitiveWordGuard` | 拒绝包含敏感词的输入 | `{ words: string[] }` |
| `RateLimitGuard` | 滑动窗口限流 | `{ windowMs, maxRequests }` |

### 错误类

| 错误类 | 场景 |
|--------|------|
| `HarnessError` | 基础错误 |
| `ToolNotFoundError` | 工具未注册 |
| `ToolInputValidationError` | 工具输入校验失败 |
| `ToolOutputValidationError` | 工具输出校验失败 |
| `ToolApprovalDeniedError` | 工具审批被拒 |
| `LoopMaxIterationsError` | 达到最大迭代次数 |
| `LoopMaxTokensError` | 达到最大 Token 数 |
| `GuardBlockedError` | 被护栏拦截 |
| `MemoryAdapterError` | 记忆适配器异常 |

---

## LLM Providers

<div class="pkg-header">
<span class="badge badge-llm">LLM</span>
<div class="pkg-header-info">

### `@colony-harness/llm-openai`

OpenAI Chat Completions API 适配器。处理 tool calling、token 追踪和超时控制。

<span class="pkg-install">pnpm add @colony-harness/llm-openai</span>

</div>
</div>

```typescript
import { OpenAIProvider } from '@colony-harness/llm-openai'

const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
})
```

<table class="api-table">
<thead><tr><th>参数</th><th>必需</th><th>默认值</th><th>说明</th></tr></thead>
<tbody>
<tr><td><code>apiKey</code></td><td>是</td><td>—</td><td>OpenAI API Key</td></tr>
<tr><td><code>model</code></td><td>是</td><td>—</td><td>模型名称</td></tr>
<tr><td><code>baseUrl</code></td><td>否</td><td><code>https://api.openai.com/v1</code></td><td>自定义端点</td></tr>
<tr><td><code>temperature</code></td><td>否</td><td>—</td><td>采样温度</td></tr>
<tr><td><code>timeoutMs</code></td><td>否</td><td>—</td><td>请求超时 (ms)</td></tr>
<tr><td><code>headers</code></td><td>否</td><td>—</td><td>额外请求头</td></tr>
</tbody>
</table>

<div class="pkg-header">
<span class="badge badge-llm">LLM</span>
<div class="pkg-header-info">

### `@colony-harness/llm-anthropic`

Anthropic Messages API 适配器。自动分离 system 消息，映射 tool_use 格式，规范化 stop_reason。

<span class="pkg-install">pnpm add @colony-harness/llm-anthropic</span>

</div>
</div>

```typescript
import { AnthropicProvider } from '@colony-harness/llm-anthropic'

const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-sonnet-4-20250514',
})
```

<table class="api-table">
<thead><tr><th>参数</th><th>必需</th><th>默认值</th><th>说明</th></tr></thead>
<tbody>
<tr><td><code>apiKey</code></td><td>是</td><td>—</td><td>Anthropic API Key</td></tr>
<tr><td><code>model</code></td><td>是</td><td>—</td><td>Claude 模型名</td></tr>
<tr><td><code>baseUrl</code></td><td>否</td><td><code>https://api.anthropic.com</code></td><td>自定义端点</td></tr>
<tr><td><code>maxTokens</code></td><td>否</td><td>—</td><td>输出 Token 上限</td></tr>
<tr><td><code>temperature</code></td><td>否</td><td>—</td><td>采样温度</td></tr>
<tr><td><code>timeoutMs</code></td><td>否</td><td>—</td><td>超时 (ms)</td></tr>
<tr><td><code>anthropicVersion</code></td><td>否</td><td><code>2023-06-01</code></td><td>API 版本</td></tr>
<tr><td><code>headers</code></td><td>否</td><td>—</td><td>额外请求头</td></tr>
</tbody>
</table>

<div class="pkg-header">
<span class="badge badge-llm">LLM</span>
<div class="pkg-header-info">

### `@colony-harness/llm-gemini`

Google Gemini generateContent API 适配器。映射消息角色和 functionDeclarations，规范化 finishReason。

<span class="pkg-install">pnpm add @colony-harness/llm-gemini</span>

</div>
</div>

```typescript
import { GeminiProvider } from '@colony-harness/llm-gemini'

const provider = new GeminiProvider({
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-1.5-pro',
})
```

<table class="api-table">
<thead><tr><th>参数</th><th>必需</th><th>默认值</th><th>说明</th></tr></thead>
<tbody>
<tr><td><code>apiKey</code></td><td>是</td><td>—</td><td>Gemini API Key</td></tr>
<tr><td><code>model</code></td><td>是</td><td>—</td><td>模型名称</td></tr>
<tr><td><code>baseUrl</code></td><td>否</td><td>Gemini API URL</td><td>自定义端点</td></tr>
<tr><td><code>temperature</code></td><td>否</td><td>—</td><td>采样温度</td></tr>
<tr><td><code>timeoutMs</code></td><td>否</td><td>—</td><td>超时 (ms)</td></tr>
<tr><td><code>headers</code></td><td>否</td><td>—</td><td>额外请求头</td></tr>
</tbody>
</table>

<div class="pkg-header">
<span class="badge badge-llm">LLM</span>
<div class="pkg-header-info">

### `@colony-harness/llm-openai-compatible`

兼容 OpenAI Chat Completions 协议的通用适配器。适用于国内大模型或自部署端点。继承自 `OpenAIProvider`。

<span class="pkg-install">pnpm add @colony-harness/llm-openai-compatible</span>

</div>
</div>

```typescript
import { OpenAICompatibleProvider, createOpenAICompatibleProviderFromEnv } from '@colony-harness/llm-openai-compatible'

// 手动创建
const provider = new OpenAICompatibleProvider({
  apiKey: 'your-key',
  model: 'your-model',
  baseUrl: 'https://your-endpoint.com/v1',
})

// 从环境变量创建
const provider2 = createOpenAICompatibleProviderFromEnv()
```

<table class="api-table">
<thead><tr><th>参数</th><th>必需</th><th>说明</th></tr></thead>
<tbody>
<tr><td><code>apiKey</code></td><td>是</td><td>API Key</td></tr>
<tr><td><code>model</code></td><td>是</td><td>模型名称</td></tr>
<tr><td><code>baseUrl</code></td><td>是</td><td>兼容端点 URL（必需）</td></tr>
<tr><td>...其他</td><td>—</td><td>同 <code>OpenAIProvider</code></td></tr>
</tbody>
</table>

> 所有 Provider 统一返回 `ModelResponse`，包含 `content`、`toolCalls`、`stopReason`（`completed | tool_calls | max_tokens | unknown`）和 `usage`。

---

## Memory Adapters

<div class="pkg-header">
<span class="badge badge-memory">Memory</span>
<div class="pkg-header-info">

### `@colony-harness/memory-sqlite`

SQLite 持久化记忆适配器。支持索引加速的 agent+created_at 查询、余弦相似度语义搜索、按会话清理，自动建表。

<span class="pkg-install">pnpm add @colony-harness/memory-sqlite</span>

</div>
</div>

```typescript
import { SqliteMemoryAdapter } from '@colony-harness/memory-sqlite'

const memory = new SqliteMemoryAdapter({
  path: './data/agent-memory.db',
})
```

<table class="api-table">
<thead><tr><th>参数</th><th>默认值</th><th>说明</th></tr></thead>
<tbody>
<tr><td><code>path</code></td><td><code>./memory.db</code></td><td>SQLite 数据库文件路径</td></tr>
</tbody>
</table>

<div class="pkg-header">
<span class="badge badge-memory">Memory</span>
<div class="pkg-header-info">

### `@colony-harness/memory-redis`

Redis 记忆适配器。Hash 存储条目、Sorted Set 时间排序、Pipeline 优化写入，JS 端余弦相似度搜索。

<span class="pkg-install">pnpm add @colony-harness/memory-redis</span>

</div>
</div>

```typescript
import { RedisMemoryAdapter } from '@colony-harness/memory-redis'

const memory = new RedisMemoryAdapter({
  url: process.env.REDIS_URL,
  namespace: 'my-agent',
})
```

<table class="api-table">
<thead><tr><th>参数</th><th>默认值</th><th>说明</th></tr></thead>
<tbody>
<tr><td><code>url</code></td><td><code>REDIS_URL</code> 环境变量</td><td>Redis 连接 URL</td></tr>
<tr><td><code>namespace</code></td><td><code>colony:memory</code></td><td>Key 前缀</td></tr>
<tr><td><code>redis</code></td><td>—</td><td>传入已有 ioredis 实例</td></tr>
</tbody>
</table>

---

## Trace Exporters

<div class="pkg-header">
<span class="badge badge-trace">Trace</span>
<div class="pkg-header-info">

### `@colony-harness/trace-console`

终端彩色追踪器。ANSI 色彩展示 TraceID、任务信息、耗时、Metrics 和 Span 细节。

<span class="pkg-install">pnpm add @colony-harness/trace-console</span>

</div>
</div>

```typescript
import { ConsoleTraceExporter } from '@colony-harness/trace-console'

const exporter = new ConsoleTraceExporter()
```

无配置参数。开箱即用。

<div class="pkg-header">
<span class="badge badge-trace">Trace</span>
<div class="pkg-header-info">

### `@colony-harness/trace-file`

JSONL 文件追踪器。追加写入完成后的 Trace，支持 pretty-print JSON 模式。

<span class="pkg-install">pnpm add @colony-harness/trace-file</span>

</div>
</div>

```typescript
import { FileTraceExporter } from '@colony-harness/trace-file'

const exporter = new FileTraceExporter({
  path: './logs/traces.jsonl',
  pretty: true,
})
```

<table class="api-table">
<thead><tr><th>参数</th><th>默认值</th><th>说明</th></tr></thead>
<tbody>
<tr><td><code>path</code></td><td><code>./traces.jsonl</code></td><td>输出文件路径</td></tr>
<tr><td><code>pretty</code></td><td><code>false</code></td><td>是否 pretty-print JSON</td></tr>
</tbody>
</table>

<div class="pkg-header">
<span class="badge badge-trace">Trace</span>
<div class="pkg-header-info">

### `@colony-harness/trace-otel`

OpenTelemetry 桥接器。将 Trace 转换为 OTel Span，对齐 OpenInference 语义字段（`openinference.span.kind`、`session.id`、`user.id`、`input/output.value` 与 `mime_type`）。

<span class="pkg-install">pnpm add @colony-harness/trace-otel</span>

</div>
</div>

```typescript
import { OpenTelemetryTraceExporter } from '@colony-harness/trace-otel'

const exporter = new OpenTelemetryTraceExporter()
```

> 需要先初始化 `@opentelemetry/api` SDK。Exporter 将 colony-harness 的 Span 映射为 OTel Span 上的 Event。

<div class="pkg-header">
<span class="badge badge-trace">Trace</span>
<div class="pkg-header-info">

### `@colony-harness/trace-langfuse`

Langfuse 原生导出器。使用 Batch API 发送 Trace 和 Observation，支持自定义 fetch 和 tags。

<span class="pkg-install">pnpm add @colony-harness/trace-langfuse</span>

</div>
</div>

```typescript
import { LangfuseTraceExporter } from '@colony-harness/trace-langfuse'

const exporter = new LangfuseTraceExporter({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: 'https://cloud.langfuse.com',
})
```

<table class="api-table">
<thead><tr><th>参数</th><th>必需</th><th>说明</th></tr></thead>
<tbody>
<tr><td><code>publicKey</code></td><td>是</td><td>Langfuse Public Key</td></tr>
<tr><td><code>secretKey</code></td><td>是</td><td>Langfuse Secret Key</td></tr>
<tr><td><code>baseUrl</code></td><td>否</td><td>Langfuse 实例 URL</td></tr>
<tr><td><code>fetch</code></td><td>否</td><td>自定义 fetch 实现</td></tr>
<tr><td><code>tags</code></td><td>否</td><td>附加 tags</td></tr>
</tbody>
</table>

---

## Built-in Tools

<div class="pkg-header">
<span class="badge badge-tools">Tools</span>
<div class="pkg-header-info">

### `@colony-harness/tools-builtin`

8 个内置工具，覆盖数学计算、文件操作、HTTP 请求、命令执行、网页搜索、JSON 查询和模板渲染。

<span class="pkg-install">pnpm add @colony-harness/tools-builtin</span>

</div>
</div>

**一次性注册全部工具：**

```typescript
import { createBuiltinTools } from '@colony-harness/tools-builtin'

const allTools = createBuiltinTools({
  file: { baseDir: '/workspace', allowOutsideBaseDir: false },
  runCommand: { mode: 'allowlist', allowed: ['ls', 'cat', 'grep'] },
})
```

### 单个工具详情

**`calculatorTool`** — 安全数学表达式计算

```typescript
import { calculatorTool } from '@colony-harness/tools-builtin'
// 输入: { expression: "1 + 2 * 3" }
// 输出: { result: 7 }
```

严格字符过滤，仅允许数字和基本运算符。

**`httpRequestTool`** — HTTP 请求

```typescript
// 输入: { method: "GET", url: "https://api.example.com/data", headers: {} }
// 输出: { status: 200, headers: {...}, body: "..." }
```

可配置超时和最大 body 大小。

**`createReadFileTool(options)`** — 读取文件

```typescript
import { createReadFileTool } from '@colony-harness/tools-builtin'

const readFile = createReadFileTool({
  baseDir: '/workspace',
  allowOutsideBaseDir: false,
})
```

路径沙箱防止目录穿越攻击。

**`createWriteFileTool(options)`** — 写入文件

```typescript
const writeFile = createWriteFileTool({
  baseDir: '/workspace',
})
```

支持 append 模式和自动创建目录。

**`createRunCommandTool(options)`** — 执行 Shell 命令

```typescript
import { createRunCommandTool } from '@colony-harness/tools-builtin'

const runCmd = createRunCommandTool({
  mode: 'allowlist',
  allowed: ['ls', 'cat', 'grep', 'node'],
  timeout: 30_000,
  approvalByRisk: {
    requiredFrom: 'medium',
    callback: async (cmd) => {
      return confirm(`Allow: ${cmd}?`)
    },
  },
})
```

<table class="api-table">
<thead><tr><th>参数</th><th>说明</th></tr></thead>
<tbody>
<tr><td><code>mode</code></td><td><code>'allowlist'</code> 或 <code>'blocklist'</code></td></tr>
<tr><td><code>allowed / blocked</code></td><td>命令白名单/黑名单</td></tr>
<tr><td><code>timeout</code></td><td>执行超时 (ms)</td></tr>
<tr><td><code>approvalByRisk</code></td><td>风险分级审批配置</td></tr>
</tbody>
</table>

默认阻止 `rm`、`sudo`、`dd` 等危险命令。返回 `audit` 字段用于审计留痕。

**`createSearchWebTool(provider?)`** — 网页搜索

```typescript
import { createSearchWebTool } from '@colony-harness/tools-builtin'

const search = createSearchWebTool() // 默认 DuckDuckGo
```

支持自定义 `SearchWebProvider` 接口接入其他搜索引擎。

**`jsonQueryTool`** — JSON 查询

```typescript
// 输入: { data: { a: { b: [1, 2, 3] } }, path: "$.a.b[0]" }
// 输出: { result: 1 }
```

类 JSONPath 语法（`$.a.b[0].c`），纯查询无副作用。

**`templateRenderTool`** — 模板渲染

```typescript
// 输入: { template: "Hello {{name}}, your score is {{score}}", data: { name: "Alice", score: 95 } }
// 输出: { result: "Hello Alice, your score is 95" }
```

`{{path}}` 占位符渲染，纯渲染无副作用。

---

## Evaluation

<div class="pkg-header">
<span class="badge badge-eval">Eval</span>
<div class="pkg-header-info">

### `@colony-harness/evals`

完整评测工具包。包含 runEvalSuite 执行器、7 种内置 Scorer 和 evaluateGate 质量门禁。

<span class="pkg-install">pnpm add @colony-harness/evals</span>

</div>
</div>

```typescript
import { runEvalSuite, exactMatchScorer, evaluateGate } from '@colony-harness/evals'

const report = await runEvalSuite({
  cases: [
    { id: 'test-1', input: '1+1', expected: '2' },
  ],
  runner: async (input) => myAgent(input),
  scorer: exactMatchScorer(),
})

const gate = evaluateGate({ report, thresholds: { minPassRate: 0.95 } })
```

### runEvalSuite

<table class="api-table">
<thead><tr><th>参数</th><th>类型</th><th>说明</th></tr></thead>
<tbody>
<tr><td><code>cases</code></td><td><code>EvalCase[]</code></td><td>测试用例集</td></tr>
<tr><td><code>runner</code></td><td><code>(input) => Promise&lt;any&gt;</code></td><td>被评测执行函数</td></tr>
<tr><td><code>scorer</code></td><td><code>Scorer</code></td><td>评分函数</td></tr>
<tr><td><code>signal</code></td><td><code>AbortSignal</code></td><td>中止信号</td></tr>
<tr><td><code>failFast</code></td><td><code>boolean</code></td><td>失败后立即停止</td></tr>
</tbody>
</table>

### 内置 Scorer

| Scorer | 用途 | 配置 |
|--------|------|------|
| `exactMatchScorer()` | 精确 JSON 结构匹配 | 无 |
| `containsScorer(opts)` | 包含预期短语 | `{ ignoreCase?, mode: 'all' \| 'any' }` |
| `regexScorer(opts)` | 正则匹配 | `{ flags? }` |
| `numericRangeScorer()` | 数值范围验证 | `{ min?, max? }` |
| `llmJudgeScorer(opts)` | LLM 主观评分 | `{ judge, passThreshold }` |
| `safetyScorer(opts)` | 安全模式检查 | `{ blockedPatterns?, requiredPatterns? }` |
| `latencyScorer(opts)` | 延迟评分 | `{ targetMs, maxMs }` |

### evaluateGate

```typescript
const gate = evaluateGate({
  report,
  thresholds: {
    minPassRate: 0.95,
    minWeightedScore: 0.85,
    maxLatencyMs: 5000,
  },
})
// gate.passed: boolean
// gate.failures: string[]
```

---

## Control Plane

<div class="pkg-header">
<span class="badge badge-cp">Control Plane</span>
<div class="pkg-header-info">

### `@colony-harness/controlplane-contract`

控制面统一端口契约。定义所有接口类型，无具体实现。

<span class="pkg-install">pnpm add @colony-harness/controlplane-contract</span>

</div>
</div>

导出的核心类型：

| 类型 | 说明 |
|------|------|
| `ControlPlanePort` | 控制面接口：`start()`、`stop()`、`onTaskAssign()`、`onTaskCancel()`、`reportProgress()`、`reportResult()`、`reportHealth()` |
| `TaskEnvelope` | 任务信封（包含 capability、input 等） |
| `TaskResultEnvelope` | 任务结果信封 |
| `TaskErrorEnvelope` | 任务错误信封 |
| `TaskProgressEvent` | 进度事件 |
| `HealthStatusEvent` | 健康状态事件 |
| `TaskExecutionMetrics` | 执行指标 |

<div class="pkg-header">
<span class="badge badge-cp">Control Plane</span>
<div class="pkg-header-info">

### `@colony-harness/controlplane-runtime`

运行时桥接器。连接 `ColonyHarness` 核心与 `ControlPlanePort`，管理任务生命周期、注册处理器、追踪运行任务、支持 AbortController 取消。

<span class="pkg-install">pnpm add @colony-harness/controlplane-runtime</span>

</div>
</div>

```typescript
import { HarnessControlPlaneRuntime } from '@colony-harness/controlplane-runtime'

const runtime = new HarnessControlPlaneRuntime(harness, controlPlaneAdapter)
await runtime.start()
```

<div class="pkg-header">
<span class="badge badge-cp">Control Plane</span>
<div class="pkg-header-info">

### `@colony-harness/controlplane-mock-adapter`

内存 Mock 适配器。存储进度事件、结果和健康事件。支持 `dispatchTask()` 直接注入任务，用于测试。

<span class="pkg-install">pnpm add @colony-harness/controlplane-mock-adapter</span>

</div>
</div>

```typescript
import { MockControlPlaneAdapter } from '@colony-harness/controlplane-mock-adapter'

const mock = new MockControlPlaneAdapter()
await mock.dispatchTask({ capability: 'chat', input: { msg: 'hello' } })
```

<div class="pkg-header">
<span class="badge badge-cp">Control Plane</span>
<div class="pkg-header-info">

### `@colony-harness/controlplane-sdk-adapter`

Queen SDK 适配器。通过 colony-bee-sdk 连接 Queen 控制面。使用鸭子类型 `BeeAgentLike` 接口（非硬依赖），支持动态 SDK 加载。

<span class="pkg-install">pnpm add @colony-harness/controlplane-sdk-adapter</span>

</div>
</div>

```typescript
import { BeeSDKControlPlaneAdapter, loadBeeAgentFromModule } from '@colony-harness/controlplane-sdk-adapter'

const adapter = new BeeSDKControlPlaneAdapter({
  colonyId: 'my-colony',
  capabilities: ['analyze', 'summarize'],
})
```

导出的工具函数：

| 导出 | 说明 |
|------|------|
| `BeeSDKControlPlaneAdapter` | Queen 控制面适配器 |
| `loadBeeAgentFromModule(path)` | 动态加载 SDK 模块 |
| `InMemoryBeeAgentStub` | 内存 BeeAgent 桩（测试用） |
