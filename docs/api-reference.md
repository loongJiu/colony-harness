# API Reference

本文档提供包级 API 入口索引，便于快速定位能力。

## Core Runtime

包名：`colony-harness`

核心导出：

- `HarnessBuilder`
- `ColonyHarness`
- `AgenticLoop`
- `ToolRegistry`
- `MemoryManager`
- `TraceHub`
- `Guardrails`
- `PromptInjectionGuard` / `PIIGuard` / `TokenLimitGuard` / `SensitiveWordGuard` / `RateLimitGuard`

## Memory Adapters

- `@colony-harness/memory-sqlite`
- `@colony-harness/memory-redis`

## Trace Exporters

- `@colony-harness/trace-console`
- `@colony-harness/trace-file`
- `@colony-harness/trace-otel`
- `@colony-harness/trace-langfuse`

## LLM Providers

- `@colony-harness/llm-openai`
- `@colony-harness/llm-openai-compatible`
- `@colony-harness/llm-anthropic`
- `@colony-harness/llm-gemini`

## Built-in Tools

包名：`@colony-harness/tools-builtin`

主要导出：

- `createBuiltinTools()`
- `httpRequestTool`
- `createReadFileTool()`
- `createWriteFileTool()`
- `createRunCommandTool()`
- `createSearchWebTool()`
- `calculatorTool`
- `jsonQueryTool`
- `templateRenderTool`

## Evals

包名：`@colony-harness/evals`

主要导出：

- `runEvalSuite()`
- `exactMatchScorer()`
- `containsScorer()`
- `regexScorer()`
- `numericRangeScorer()`

以及标准类型：

- `EvalCase`
- `EvalResult`
- `EvalSummary`
- `EvalRunReport`
