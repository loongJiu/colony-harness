# Advanced Guide

This guide focuses on production composition patterns: guardrails, memory, observability, and tool governance.

## 1. Layered guardrails

```ts
new HarnessBuilder()
  .guard(PromptInjectionGuard)
  .guard(TokenLimitGuard({ maxTokens: 2000 }))
  .guard(RateLimitGuard({ maxRequests: 60, windowMs: 60_000 }))
```

## 2. Memory backend strategy

- local dev: SQLite
- multi-instance deployment: Redis
- long context: enable auto compression via `memoryConfig`

## 3. Observability export strategy

- dev: `trace-console` + `trace-file`
- prod: OTEL/Langfuse

## 4. Tool access governance

- set command allowlists
- enforce file `baseDir`
- require approval for high-risk actions

## 5. Evaluation as quality gate

Use `@colony-harness/evals` reports to gate release decisions.
