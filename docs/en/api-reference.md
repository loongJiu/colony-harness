# API Reference

Parameter-level quick reference for the most used APIs.

## 1. `HarnessBuilder`

Package: `colony-harness`

Common methods:

- `llm(provider)`
- `tool(...tools)`
- `toolApproval(callback)`
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

## 2. Core runtime

Package: `colony-harness`

- `harness.task(capability, handler)`
- `harness.runTask(capability, input, options?)`

`runTask` options:

- `taskId`: optional external task id (useful for control-plane task id alignment)
- `agentId`: agent identity
- `sessionId`: session identity
- `signal`: `AbortSignal` for cancellation

## 3. Providers

- `@colony-harness/llm-openai`
- `@colony-harness/llm-openai-compatible`
- `@colony-harness/llm-anthropic`
- `@colony-harness/llm-gemini`

## 4. Trace exporters

- `@colony-harness/trace-console`
- `@colony-harness/trace-file`
- `@colony-harness/trace-otel`
- `@colony-harness/trace-langfuse`

Note: `trace-otel` exports OpenInference/OTel semantic fields including `openinference.span.kind`, `session.id`, `user.id`, and normalized `input/output.value` attributes.

## 5. Built-in tools

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

Note: `run_command` is allowlist-first by default; unknown commands are denied unless allowed explicitly.
Note: `run_command` supports risk-based approval (`approvalByRisk.requiredFrom + callback`) and returns an `audit` payload.

## 6. Evals

Package: `@colony-harness/evals`

- `runEvalSuite(options)`
- `exactMatchScorer()`
- `containsScorer()`
- `regexScorer()`
- `numericRangeScorer()`
- `llmJudgeScorer()`
- `safetyScorer()`
- `latencyScorer()`
- `evaluateGate()`

Note: OpenAI/Anthropic/Gemini providers normalize `ModelResponse.stopReason` (`completed | tool_calls | max_tokens | unknown`) and token usage fields.

## 7. ControlPlane adapters

- `@colony-harness/controlplane-contract`: control-plane port contract
- `@colony-harness/controlplane-runtime`: runtime bridge
- `@colony-harness/controlplane-mock-adapter`: local mock adapter
- `@colony-harness/controlplane-sdk-adapter`: Queen integration via colony-bee-sdk
