# API Reference

本文档提供“可查参数”的 API 参考，优先覆盖最常用入口。

## 1. `HarnessBuilder`

包：`colony-harness`

### 1.1 常用方法

| 方法 | 作用 |
| --- | --- |
| `llm(provider)` | 注入模型调用器（必需） |
| `tool(...tools)` | 注册工具 |
| `memory(adapter)` | 指定记忆后端 |
| `memoryConfig(config)` | 配置记忆策略 |
| `trace(...exporters)` | 配置 trace 导出器 |
| `guard(...guards)` | 配置护栏 |
| `loopConfig(config)` | 配置 loop 行为 |
| `systemPrompt(prompt)` | 覆盖默认系统提示词 |
| `build()` | 构建 `ColonyHarness` |

### 1.2 `loopConfig` 参数

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `maxIterations` | `20` | 最多迭代轮次 |
| `callTimeout` | `30000` | 单次模型调用超时（ms） |
| `maxTokens` | 无 | 总 token 上限 |
| `toolConcurrency` | `1` | 工具并发度 |
| `toolFailStrategy` | `abort` | `abort` / `continue` / `retry` |
| `toolRetryMax` | `2` | 重试最大次数（策略为 `retry` 时） |

### 1.3 `memoryConfig` 参数

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `workingMemoryTokenLimit` | `6000` | working memory 压缩阈值 |
| `episodicRetentionDays` | `30` | episodic 记忆保留天数 |
| `semanticTopK` | `5` | 语义检索默认返回条数 |
| `autoCompress` | `true` | 是否自动压缩上下文 |
| `embedder` | 无 | 语义向量函数 `(text)=>number[]` |

## 2. Core Runtime

### 2.1 `ColonyHarness`

- `task(capability, handler)`：注册任务处理器
- `runTask(capability, input, options?)`：执行任务

`runTask` 的 `options`：

| 字段 | 说明 |
| --- | --- |
| `agentId` | agent 标识 |
| `sessionId` | 会话标识 |
| `signal` | `AbortSignal`，可用于取消 |

### 2.2 `HarnessContext`

任务 handler 内可用能力：

- `runLoop(prompt)`
- `invokeTool(name, input)`
- `memory.save/saveSemantic/load/search/recent/clearSession`
- `trace.startSpan/addEvent/setAttribute`
- `callModel/callModelWithTools`

## 3. LLM Providers

### 3.1 `@colony-harness/llm-openai`

`new OpenAIProvider(options)`

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `apiKey` | 是 | OpenAI key |
| `model` | 是 | 模型名 |
| `baseUrl` | 否 | 默认 `https://api.openai.com/v1` |
| `temperature` | 否 | 采样温度 |
| `timeoutMs` | 否 | 请求超时 |
| `headers` | 否 | 额外请求头 |

### 3.2 `@colony-harness/llm-openai-compatible`

- `new OpenAICompatibleProvider(options)`
- `createOpenAICompatibleProviderFromEnv(defaults?)`

环境变量读取逻辑见 [environment-variables.md](./environment-variables.md)。

### 3.3 `@colony-harness/llm-anthropic`

`new AnthropicProvider(options)`

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `apiKey` | 是 | Anthropic key |
| `model` | 是 | Claude model |
| `baseUrl` | 否 | 默认 `https://api.anthropic.com` |
| `maxTokens` | 否 | 输出 token 上限 |
| `temperature` | 否 | 温度 |
| `timeoutMs` | 否 | 超时 |
| `anthropicVersion` | 否 | 默认 `2023-06-01` |
| `headers` | 否 | 扩展头 |

### 3.4 `@colony-harness/llm-gemini`

`new GeminiProvider(options)`

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `apiKey` | 是 | Gemini key |
| `model` | 是 | 模型名 |
| `baseUrl` | 否 | 默认 `https://generativelanguage.googleapis.com/v1beta` |
| `temperature` | 否 | 温度 |
| `timeoutMs` | 否 | 超时 |
| `headers` | 否 | 扩展头 |

## 4. Memory Adapters

- `@colony-harness/memory-sqlite`
- `@colony-harness/memory-redis`

### 4.1 Redis Adapter

`new RedisMemoryAdapter(options?)`

| 字段 | 说明 |
| --- | --- |
| `url` | Redis URL，默认取 `REDIS_URL` |
| `namespace` | key 前缀，默认 `colony:memory` |
| `redis` | 传入已有 `ioredis` 实例 |

## 5. Trace Exporters

- `@colony-harness/trace-console`
- `@colony-harness/trace-file`
- `@colony-harness/trace-otel`
- `@colony-harness/trace-langfuse`

## 6. Built-in Tools

包：`@colony-harness/tools-builtin`

### 6.1 `createBuiltinTools(options?)`

- 返回一组默认工具：
  - `http_request`
  - `read_file`
  - `write_file`
  - `run_command`
  - `search_web`
  - `calculator`
  - `json_query`
  - `template_render`

`options`：

| 字段 | 说明 |
| --- | --- |
| `file` | 文件工具安全选项（`baseDir`、`allowOutsideBaseDir`） |
| `runCommand` | 命令工具选项（白名单/黑名单/超时） |
| `searchProvider` | 自定义搜索 provider |

## 7. Evals

包：`@colony-harness/evals`

### 7.1 核心执行器

- `runEvalSuite(options)`

`options`：

| 字段 | 说明 |
| --- | --- |
| `cases` | 测试数据集 |
| `runner` | 被评测执行函数 |
| `scorer` | 评分函数 |
| `signal` | 中止信号 |
| `failFast` | 失败后是否立即停止 |

### 7.2 内置 scorer

- `exactMatchScorer()`
- `containsScorer({ ignoreCase, mode })`
- `regexScorer({ flags })`
- `numericRangeScorer()`

更多示例见 [evals.md](./evals.md)。
