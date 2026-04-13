# API Reference

Parameter-level quick reference for the most used APIs.

## 1. `HarnessBuilder`

Package: `colony-harness`

Common methods:

- `llm(provider)`
- `tool(...tools)`
- `memory(adapter)`
- `memoryConfig(config)`
- `trace(...exporters)`
- `guard(...guards)`
- `loopConfig(config)`
- `systemPrompt(prompt)`
- `build()`

### 1.1 `loopConfig` fields

- `maxIterations` (default `20`)
- `callTimeout` (default `30000`)
- `maxTokens`
- `toolConcurrency` (default `1`)
- `toolFailStrategy` (`abort | continue | retry`, default `abort`)
- `toolRetryMax` (default `2`)

### 1.2 `memoryConfig` fields

- `workingMemoryTokenLimit` (default `6000`)
- `episodicRetentionDays` (default `30`)
- `semanticTopK` (default `5`)
- `autoCompress` (default `true`)
- `embedder?: (text) => Promise<number[]>`

## 2. Providers

- `@colony-harness/llm-openai`
- `@colony-harness/llm-openai-compatible`
- `@colony-harness/llm-anthropic`
- `@colony-harness/llm-gemini`

## 3. Built-in tools

Package: `@colony-harness/tools-builtin`

- `createBuiltinTools(options?)`
- `httpRequestTool`
- `createReadFileTool()`
- `createWriteFileTool()`
- `createRunCommandTool()`
- `createSearchWebTool()`
- `calculatorTool`
- `jsonQueryTool`
- `templateRenderTool`

## 4. Evals

Package: `@colony-harness/evals`

- `runEvalSuite(options)`
- `exactMatchScorer()`
- `containsScorer()`
- `regexScorer()`
- `numericRangeScorer()`
