# Architecture (MVP)

## Core goal

Provide a minimal but production-oriented agent runtime loop:

1. controllable ReAct execution
2. validated tool invocation
3. traceable runtime behavior
4. extensible memory and guardrails

## Key modules

1. `HarnessBuilder`
2. `ColonyHarness`
3. `HarnessContext`
4. `AgenticLoop`
5. `ToolRegistry`
6. `MemoryManager`
7. `TraceHub`
8. `Guardrails`

## Package layout

- `colony-harness`
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
- `@colony-harness/controlplane-contract`
- `@colony-harness/controlplane-mock-adapter`
- `@colony-harness/controlplane-runtime`
- `@colony-harness/controlplane-sdk-adapter`
- `@colony-harness/provider-contract-tests`

## OTel / OpenInference semantics

`@colony-harness/trace-otel` exports key semantic fields to keep traces portable across observability backends:

- OpenInference: `openinference.span.kind` (`AGENT` / `CHAIN` / `TOOL`)
- Session identity: `session.id`, `user.id`
- IO payloads: `input.value`, `output.value` (plus `*.mime_type`)
- Runtime metrics: `colony.*` attributes (loop/tool/tokens)

## Evolution direction

- Keep core runtime decoupled from control-plane SDK internals
- Use adapter packages for Queen integration paths
- Enforce release quality via provider contract tests + eval gate
