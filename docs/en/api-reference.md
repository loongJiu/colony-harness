# API Reference

Complete API documentation for all 18 colony-harness packages. Each package includes install commands, quick examples, and parameter tables.

---

## Core Runtime

<div class="pkg-header">
<span class="badge badge-core">Core</span>
<div class="pkg-header-info">

### `colony-harness`

Core runtime package. Contains HarnessBuilder, ColonyHarness, AgenticLoop, ToolRegistry, MemoryManager, TraceHub, Guardrails, and 5 built-in guards.

<span class="pkg-install">pnpm add colony-harness</span>

</div>
</div>

### HarnessBuilder

Declarative builder API — the single entry point. Chains LLM, tools, memory, tracing, and guards into a runtime.

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
<thead><tr><th>Method</th><th>Parameter</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>llm(provider)</code></td><td><code>LLMProvider</code></td><td>Inject model caller (required)</td></tr>
<tr><td><code>tool(...tools)</code></td><td><code>ToolDefinition[]</code></td><td>Register tools</td></tr>
<tr><td><code>toolApproval(cb)</code></td><td><code>(name, input) => Promise&lt;boolean&gt;</code></td><td>High-risk tool approval callback</td></tr>
<tr><td><code>memory(adapter)</code></td><td><code>MemoryAdapter</code></td><td>Specify memory backend</td></tr>
<tr><td><code>memoryConfig(cfg)</code></td><td>See below</td><td>Configure memory strategy</td></tr>
<tr><td><code>trace(...exporters)</code></td><td><code>TraceExporter[]</code></td><td>Configure trace exporters</td></tr>
<tr><td><code>guard(...guards)</code></td><td><code>Guard[]</code></td><td>Configure guards</td></tr>
<tr><td><code>loopConfig(cfg)</code></td><td>See below</td><td>Configure Agentic Loop behavior</td></tr>
<tr><td><code>systemPrompt(text)</code></td><td><code>string</code></td><td>Override default system prompt</td></tr>
<tr><td><code>build()</code></td><td>—</td><td>Build and return <code>ColonyHarness</code> instance</td></tr>
</tbody>
</table>

**loopConfig parameters:**

| Field | Default | Description |
|-------|---------|-------------|
| `maxIterations` | `20` | Maximum loop iterations |
| `callTimeout` | `30000` | Single model call timeout (ms) |
| `modelFailStrategy` | `abort` | Model fail strategy: `abort` / `retry` |
| `modelRetryMax` | `2` | Max model retries (when strategy is `retry`) |
| `modelRetryBaseDelayMs` | `300` | Base backoff delay for model retries (ms) |
| `modelRetryMaxDelayMs` | `5000` | Max backoff delay for model retries (ms) |
| `modelRetryJitterRatio` | `0.2` | Retry jitter ratio for model calls (0~1) |
| `modelRetryMaxTotalDelayMs` | `15000` | Max aggregate delay budget for model retries (ms) |
| `modelCircuitBreakerEnabled` | `true` | Enable model circuit breaker |
| `modelCircuitBreakerFailureThreshold` | `5` | Consecutive transient failures before opening circuit |
| `modelCircuitBreakerCooldownMs` | `30000` | Circuit breaker cooldown duration (ms) |
| `maxTokens` | none | Total token limit |
| `toolConcurrency` | `1` | Tool concurrency level |
| `toolFailStrategy` | `abort` | Fail strategy: `abort` / `continue` / `retry` |
| `toolRetryMax` | `2` | Max retries (when strategy is `retry`) |

**memoryConfig parameters:**

| Field | Default | Description |
|-------|---------|-------------|
| `workingMemoryTokenLimit` | `6000` | Working memory compression threshold |
| `episodicRetentionDays` | `30` | Episodic retention period in days |
| `semanticTopK` | `5` | Default semantic search result count |
| `autoCompress` | `true` | Enable automatic context compression |
| `embedder` | none | Semantic embedding function `(text) => number[]` |

### ColonyHarness

Runtime container. Registers task handlers, builds context, executes guards and tracing.

```typescript
const harness = builder.build()

harness.task('chat', async (ctx) => {
  const result = await ctx.runLoop('User question')
  return result
})

const result = await harness.runTask('chat', { question: 'Hello' })
```

<table class="api-table">
<thead><tr><th>Method</th><th>Parameter</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>task(capability, handler)</code></td><td><code>string, (ctx) => Promise</code></td><td>Register task handler</td></tr>
<tr><td><code>runTask(capability, input, opts?)</code></td><td>See below</td><td>Execute task</td></tr>
</tbody>
</table>

**runTask options:**

| Field | Description |
|-------|-------------|
| `taskId` | External task ID (aligns with control plane) |
| `agentId` | Agent identifier |
| `sessionId` | Session identifier |
| `signal` | `AbortSignal` for cancellation |

### HarnessContext

Context object available within task handlers.

```typescript
harness.task('research', async (ctx) => {
  // Run Agent Loop
  const reply = await ctx.runLoop('Search for latest papers')

  // Invoke tool directly
  const calc = await ctx.invokeTool('calculator', { expression: '2+2' })

  // Memory operations
  await ctx.memory.save('key', { data: 'value' })
  const recent = await ctx.memory.recent(10)

  // Tracing
  const span = ctx.trace.startSpan('step')
  span.end()
})
```

<table class="api-table">
<thead><tr><th>Property/Method</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>runLoop(prompt)</code></td><td><code>string => Promise&lt;string&gt;</code></td><td>Start Agentic Loop</td></tr>
<tr><td><code>invokeTool(name, input)</code></td><td><code>(string, any) => Promise&lt;any&gt;</code></td><td>Directly invoke a registered tool</td></tr>
<tr><td><code>callModel(messages)</code></td><td><code>Message[] => Promise&lt;ModelResponse&gt;</code></td><td>Directly call the LLM</td></tr>
<tr><td><code>callModelWithTools(msgs, tools)</code></td><td>LLM call with tool definitions</td><td>Call LLM with tool list</td></tr>
<tr><td><code>memory</code></td><td><code>MemoryHandle</code></td><td>Memory operation interface</td></tr>
<tr><td><code>trace</code></td><td><code>TraceHandle</code></td><td>Trace operation interface</td></tr>
<tr><td><code>input</code></td><td><code>any</code></td><td>Task input data</td></tr>
</tbody>
</table>

### Built-in Guards

All guards are exported from the `colony-harness` package.

| Guard | Description | Configuration |
|-------|-------------|---------------|
| `PromptInjectionGuard` | Regex-based injection detection | None |
| `PIIGuard` | Redact Chinese ID/phone/email | None |
| `TokenLimitGuard` | Reject inputs exceeding token threshold | `{ maxTokens: number }` |
| `SensitiveWordGuard` | Reject inputs with sensitive words | `{ words: string[] }` |
| `RateLimitGuard` | Sliding window rate limiting | `{ windowMs, maxRequests }` |

### Error Classes

| Error Class | Scenario |
|-------------|----------|
| `HarnessError` | Base error |
| `ToolNotFoundError` | Tool not registered |
| `ToolInputValidationError` | Tool input validation failed |
| `ToolOutputValidationError` | Tool output validation failed |
| `ToolApprovalDeniedError` | Tool approval denied |
| `LoopMaxIterationsError` | Max iterations reached |
| `LoopMaxTokensError` | Max tokens reached |
| `GuardBlockedError` | Blocked by guard |
| `MemoryAdapterError` | Memory adapter exception |

---

## LLM Providers

<div class="pkg-header">
<span class="badge badge-llm">LLM</span>
<div class="pkg-header-info">

### `@colony-harness/llm-openai`

OpenAI Chat Completions API adapter. Handles tool calling, token usage tracking, and timeout with AbortController.

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
<thead><tr><th>Parameter</th><th>Required</th><th>Default</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>apiKey</code></td><td>Yes</td><td>—</td><td>OpenAI API Key</td></tr>
<tr><td><code>model</code></td><td>Yes</td><td>—</td><td>Model name</td></tr>
<tr><td><code>baseUrl</code></td><td>No</td><td><code>https://api.openai.com/v1</code></td><td>Custom endpoint</td></tr>
<tr><td><code>temperature</code></td><td>No</td><td>—</td><td>Sampling temperature</td></tr>
<tr><td><code>timeoutMs</code></td><td>No</td><td>—</td><td>Request timeout (ms)</td></tr>
<tr><td><code>headers</code></td><td>No</td><td>—</td><td>Additional request headers</td></tr>
</tbody>
</table>

<div class="pkg-header">
<span class="badge badge-llm">LLM</span>
<div class="pkg-header-info">

### `@colony-harness/llm-anthropic`

Anthropic Messages API adapter. Auto-separates system messages, maps tool_use format, normalizes stop_reason.

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
<thead><tr><th>Parameter</th><th>Required</th><th>Default</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>apiKey</code></td><td>Yes</td><td>—</td><td>Anthropic API Key</td></tr>
<tr><td><code>model</code></td><td>Yes</td><td>—</td><td>Claude model name</td></tr>
<tr><td><code>baseUrl</code></td><td>No</td><td><code>https://api.anthropic.com</code></td><td>Custom endpoint</td></tr>
<tr><td><code>maxTokens</code></td><td>No</td><td>—</td><td>Output token limit</td></tr>
<tr><td><code>temperature</code></td><td>No</td><td>—</td><td>Sampling temperature</td></tr>
<tr><td><code>timeoutMs</code></td><td>No</td><td>—</td><td>Timeout (ms)</td></tr>
<tr><td><code>anthropicVersion</code></td><td>No</td><td><code>2023-06-01</code></td><td>API version</td></tr>
<tr><td><code>headers</code></td><td>No</td><td>—</td><td>Additional headers</td></tr>
</tbody>
</table>

<div class="pkg-header">
<span class="badge badge-llm">LLM</span>
<div class="pkg-header-info">

### `@colony-harness/llm-gemini`

Google Gemini generateContent API adapter. Maps message roles and functionDeclarations, normalizes finishReason.

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
<thead><tr><th>Parameter</th><th>Required</th><th>Default</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>apiKey</code></td><td>Yes</td><td>—</td><td>Gemini API Key</td></tr>
<tr><td><code>model</code></td><td>Yes</td><td>—</td><td>Model name</td></tr>
<tr><td><code>baseUrl</code></td><td>No</td><td>Gemini API URL</td><td>Custom endpoint</td></tr>
<tr><td><code>temperature</code></td><td>No</td><td>—</td><td>Sampling temperature</td></tr>
<tr><td><code>timeoutMs</code></td><td>No</td><td>—</td><td>Timeout (ms)</td></tr>
<tr><td><code>headers</code></td><td>No</td><td>—</td><td>Additional headers</td></tr>
</tbody>
</table>

<div class="pkg-header">
<span class="badge badge-llm">LLM</span>
<div class="pkg-header-info">

### `@colony-harness/llm-openai-compatible`

Universal adapter for any OpenAI Chat Completions-compatible endpoint. Extends `OpenAIProvider`. Ideal for domestic LLMs or self-hosted endpoints.

<span class="pkg-install">pnpm add @colony-harness/llm-openai-compatible</span>

</div>
</div>

```typescript
import { OpenAICompatibleProvider, createOpenAICompatibleProviderFromEnv } from '@colony-harness/llm-openai-compatible'

// Manual creation
const provider = new OpenAICompatibleProvider({
  apiKey: 'your-key',
  model: 'your-model',
  baseUrl: 'https://your-endpoint.com/v1',
})

// Create from environment variables
const provider2 = createOpenAICompatibleProviderFromEnv()
```

<table class="api-table">
<thead><tr><th>Parameter</th><th>Required</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>apiKey</code></td><td>Yes</td><td>API Key</td></tr>
<tr><td><code>model</code></td><td>Yes</td><td>Model name</td></tr>
<tr><td><code>baseUrl</code></td><td>Yes</td><td>Compatible endpoint URL (required)</td></tr>
<tr><td>...others</td><td>—</td><td>Same as <code>OpenAIProvider</code></td></tr>
</tbody>
</table>

> All providers return a unified `ModelResponse` containing `content`, `toolCalls`, `stopReason` (`completed | tool_calls | max_tokens | unknown`), and `usage`.

---

## Memory Adapters

<div class="pkg-header">
<span class="badge badge-memory">Memory</span>
<div class="pkg-header-info">

### `@colony-harness/memory-sqlite`

SQLite persistent memory adapter. Supports indexed agent+created_at queries, cosine similarity semantic search, session-based cleanup, and auto table creation.

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
<thead><tr><th>Parameter</th><th>Default</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>path</code></td><td><code>./memory.db</code></td><td>SQLite database file path</td></tr>
</tbody>
</table>

<div class="pkg-header">
<span class="badge badge-memory">Memory</span>
<div class="pkg-header-info">

### `@colony-harness/memory-redis`

Redis memory adapter. Hash entries, sorted sets for time ordering, pipeline-optimized writes, JS-side cosine similarity search.

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
<thead><tr><th>Parameter</th><th>Default</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>url</code></td><td><code>REDIS_URL</code> env var</td><td>Redis connection URL</td></tr>
<tr><td><code>namespace</code></td><td><code>colony:memory</code></td><td>Key prefix</td></tr>
<tr><td><code>redis</code></td><td>—</td><td>Pass an existing ioredis instance</td></tr>
</tbody>
</table>

---

## Trace Exporters

<div class="pkg-header">
<span class="badge badge-trace">Trace</span>
<div class="pkg-header-info">

### `@colony-harness/trace-console`

ANSI-colored terminal trace exporter. Displays TraceID, task info, duration, metrics, and span details.

<span class="pkg-install">pnpm add @colony-harness/trace-console</span>

</div>
</div>

```typescript
import { ConsoleTraceExporter } from '@colony-harness/trace-console'

const exporter = new ConsoleTraceExporter()
```

No configuration needed. Works out of the box.

<div class="pkg-header">
<span class="badge badge-trace">Trace</span>
<div class="pkg-header-info">

### `@colony-harness/trace-file`

JSONL file trace exporter. Appends completed traces to a configurable file path. Supports pretty-print JSON mode.

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
<thead><tr><th>Parameter</th><th>Default</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>path</code></td><td><code>./traces.jsonl</code></td><td>Output file path</td></tr>
<tr><td><code>pretty</code></td><td><code>false</code></td><td>Enable pretty-print JSON</td></tr>
</tbody>
</table>

<div class="pkg-header">
<span class="badge badge-trace">Trace</span>
<div class="pkg-header-info">

### `@colony-harness/trace-otel`

OpenTelemetry bridge exporter. Converts traces to OTel spans, aligned with OpenInference semantics (`openinference.span.kind`, `session.id`, `user.id`, `input/output.value` and `mime_type`).

<span class="pkg-install">pnpm add @colony-harness/trace-otel</span>

</div>
</div>

```typescript
import { OpenTelemetryTraceExporter } from '@colony-harness/trace-otel'

const exporter = new OpenTelemetryTraceExporter()
```

> Requires `@opentelemetry/api` SDK to be initialized first. Maps colony-harness spans as events on a root OTel span.

<div class="pkg-header">
<span class="badge badge-trace">Trace</span>
<div class="pkg-header-info">

### `@colony-harness/trace-langfuse`

Native Langfuse exporter. Sends traces and observations via the batch ingestion API. Supports custom fetch and tags.

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
<thead><tr><th>Parameter</th><th>Required</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>publicKey</code></td><td>Yes</td><td>Langfuse Public Key</td></tr>
<tr><td><code>secretKey</code></td><td>Yes</td><td>Langfuse Secret Key</td></tr>
<tr><td><code>baseUrl</code></td><td>No</td><td>Langfuse instance URL</td></tr>
<tr><td><code>fetch</code></td><td>No</td><td>Custom fetch implementation</td></tr>
<tr><td><code>tags</code></td><td>No</td><td>Additional tags</td></tr>
</tbody>
</table>

---

## Built-in Tools

<div class="pkg-header">
<span class="badge badge-tools">Tools</span>
<div class="pkg-header-info">

### `@colony-harness/tools-builtin`

Eight built-in tools covering math, file ops, HTTP, shell commands, web search, JSON queries, and template rendering.

<span class="pkg-install">pnpm add @colony-harness/tools-builtin</span>

</div>
</div>

**Register all tools at once:**

```typescript
import { createBuiltinTools } from '@colony-harness/tools-builtin'

const allTools = createBuiltinTools({
  file: { baseDir: '/workspace', allowOutsideBaseDir: false },
  runCommand: { mode: 'allowlist', allowed: ['ls', 'cat', 'grep'] },
})
```

### Individual Tool Details

**`calculatorTool`** — Safe math expression evaluation

```typescript
import { calculatorTool } from '@colony-harness/tools-builtin'
// Input: { expression: "1 + 2 * 3" }
// Output: { result: 7 }
```

Strict character filtering — only numbers and basic operators allowed.

**`httpRequestTool`** — HTTP requests

```typescript
// Input: { method: "GET", url: "https://api.example.com/data", headers: {} }
// Output: { status: 200, headers: {...}, body: "..." }
```

Configurable timeout and max body size.

**`createReadFileTool(options)`** — Read files

```typescript
import { createReadFileTool } from '@colony-harness/tools-builtin'

const readFile = createReadFileTool({
  baseDir: '/workspace',
  allowOutsideBaseDir: false,
})
```

Path sandboxing prevents directory traversal attacks.

**`createWriteFileTool(options)`** — Write files

```typescript
const writeFile = createWriteFileTool({
  baseDir: '/workspace',
})
```

Supports append mode and auto-creating directories.

**`createRunCommandTool(options)`** — Execute shell commands

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
<thead><tr><th>Parameter</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>mode</code></td><td><code>'allowlist'</code> or <code>'blocklist'</code></td></tr>
<tr><td><code>allowed / blocked</code></td><td>Command allowlist/blocklist</td></tr>
<tr><td><code>timeout</code></td><td>Execution timeout (ms)</td></tr>
<tr><td><code>approvalByRisk</code></td><td>Risk-based approval configuration</td></tr>
</tbody>
</table>

Defaults to blocking dangerous commands like `rm`, `sudo`, `dd`. Returns an `audit` field for audit logging.

**`createSearchWebTool(provider?)`** — Web search

```typescript
import { createSearchWebTool } from '@colony-harness/tools-builtin'

const search = createSearchWebTool() // Default: DuckDuckGo
```

Pluggable `SearchWebProvider` interface for other search engines.

**`jsonQueryTool`** — JSON queries

```typescript
// Input: { data: { a: { b: [1, 2, 3] } }, path: "$.a.b[0]" }
// Output: { result: 1 }
```

JSONPath-like syntax (`$.a.b[0].c`). Read-only, no side effects.

**`templateRenderTool`** — Template rendering

```typescript
// Input: { template: "Hello {{name}}, score is {{score}}", data: { name: "Alice", score: 95 } }
// Output: { result: "Hello Alice, score is 95" }
```

`{{path}}` placeholder rendering. Read-only, no side effects.

---

## Evaluation

<div class="pkg-header">
<span class="badge badge-eval">Eval</span>
<div class="pkg-header-info">

### `@colony-harness/evals`

Complete evaluation toolkit. Contains runEvalSuite runner, seven built-in Scorers, and evaluateGate quality gate.

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
<thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>cases</code></td><td><code>EvalCase[]</code></td><td>Test case dataset</td></tr>
<tr><td><code>runner</code></td><td><code>(input) => Promise&lt;any&gt;</code></td><td>Function being evaluated</td></tr>
<tr><td><code>scorer</code></td><td><code>Scorer</code></td><td>Scoring function</td></tr>
<tr><td><code>signal</code></td><td><code>AbortSignal</code></td><td>Abort signal</td></tr>
<tr><td><code>failFast</code></td><td><code>boolean</code></td><td>Stop on first failure</td></tr>
</tbody>
</table>

### Built-in Scorers

| Scorer | Purpose | Configuration |
|--------|---------|---------------|
| `exactMatchScorer()` | Exact JSON structural match | None |
| `containsScorer(opts)` | Contains expected phrases | `{ ignoreCase?, mode: 'all' \| 'any' }` |
| `regexScorer(opts)` | Regex pattern matching | `{ flags? }` |
| `numericRangeScorer()` | Numeric range validation | `{ min?, max? }` |
| `llmJudgeScorer(opts)` | LLM-based subjective scoring | `{ judge, passThreshold }` |
| `safetyScorer(opts)` | Safety pattern checking | `{ blockedPatterns?, requiredPatterns? }` |
| `latencyScorer(opts)` | Latency scoring | `{ targetMs, maxMs }` |

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

Unified port contract for the control plane. Defines all interface types with no implementation.

<span class="pkg-install">pnpm add @colony-harness/controlplane-contract</span>

</div>
</div>

Core exported types:

| Type | Description |
|------|-------------|
| `ControlPlanePort` | Control plane interface: `start()`, `stop()`, `onTaskAssign()`, `onTaskCancel()`, `reportProgress()`, `reportResult()`, `reportHealth()` |
| `TaskEnvelope` | Task envelope (contains capability, input, etc.) |
| `TaskResultEnvelope` | Task result envelope |
| `TaskErrorEnvelope` | Task error envelope |
| `TaskProgressEvent` | Progress event |
| `HealthStatusEvent` | Health status event |
| `TaskExecutionMetrics` | Execution metrics |

<div class="pkg-header">
<span class="badge badge-cp">Control Plane</span>
<div class="pkg-header-info">

### `@colony-harness/controlplane-runtime`

Runtime bridge. Connects `ColonyHarness` core with `ControlPlanePort`. Manages task lifecycle, registers handlers, tracks running tasks with AbortController for cancellation.

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

In-memory mock adapter. Stores progress events, results, and health events. Supports `dispatchTask()` for direct task injection in tests.

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

Queen SDK adapter. Connects to the Queen control plane via colony-bee-sdk. Uses duck-typed `BeeAgentLike` interface (no hard dependency). Supports dynamic SDK loading.

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

Exported utilities:

| Export | Description |
|--------|-------------|
| `BeeSDKControlPlaneAdapter` | Queen control plane adapter |
| `loadBeeAgentFromModule(path)` | Dynamic SDK module loader |
| `InMemoryBeeAgentStub` | In-memory BeeAgent stub for testing |
