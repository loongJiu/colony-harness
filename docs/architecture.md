# colony-harness Architecture (MVP)

## 核心目标

围绕 Agent 生产运行时提供最小可行闭环：

1. 可控的 ReAct 执行循环
2. 可验证的工具调用
3. 可追踪的执行过程
4. 可扩展的记忆与护栏能力

## 关键模块

### 1. HarnessBuilder

唯一入口，负责组装：

- LLM Provider
- ToolRegistry
- MemoryManager
- TraceHub
- Guardrails

### 2. ColonyHarness

运行时容器，职责：

- 注册 task handler
- 构建 HarnessContext
- 在 task 执行前后执行 guard / memory / trace
- 派发关键事件（`loop:start`、`tool:invoked` 等）

### 3. HarnessContext

给业务任务处理器的增强上下文，提供：

- `runLoop()`
- `invokeTool()`
- `memory.save/saveSemantic/load/search/recent/clearSession`
- `trace.startSpan()`

### 4. AgenticLoop

- 调用模型
- 解析工具调用
- 调用 ToolRegistry
- 将 tool 结果回注 messages
- 满足 stop 条件后返回 LoopResult

### 5. ToolRegistry

- 注册工具
- 输入输出 schema 校验
- 可选审批回调
- 导出 LLM 可消费的 tools schema

### 6. MemoryManager

- working memory（当前任务消息）
- episodic memory（任务级记录）
- semantic memory（可选 embedder 驱动）
- ContextCompressor（超 token 自动摘要压缩）

### 7. TraceHub

- 记录 trace/span
- 汇总 metrics
- 导出到 console / 其他 exporter

### 8. Guardrails

- 输入检查与拦截
- 输出校验与脱敏

## 包设计

- `colony-harness`: 核心运行时
- `@colony-harness/memory-sqlite`: SQLite 记忆持久化
- `@colony-harness/memory-redis`: Redis 记忆持久化
- `@colony-harness/trace-console`: console trace 导出
- `@colony-harness/trace-file`: JSONL 文件 trace 导出
- `@colony-harness/trace-otel`: OpenTelemetry 导出桥接
- `@colony-harness/trace-langfuse`: Langfuse 导出器
- `@colony-harness/llm-openai`: OpenAI 兼容 provider
- `@colony-harness/llm-openai-compatible`: OpenAI 协议兼容 provider
- `@colony-harness/llm-anthropic`: Anthropic provider
- `@colony-harness/llm-gemini`: Gemini provider
- `@colony-harness/tools-builtin`: 内置工具集（HTTP/File/Command/Search/JSON/Template）
- `@colony-harness/evals`: 评测执行器与 scorer（回归/对比）
- `@colony-harness/controlplane-contract`: 控制面端口契约（接口与事件模型）
- `@colony-harness/controlplane-mock-adapter`: 控制面 mock 适配器（本地联调/测试）
- `@colony-harness/controlplane-runtime`: 控制面任务流与 harness 运行时桥接
- `@colony-harness/controlplane-sdk-adapter`: 基于 colony-bee-sdk 的控制面接入适配器
- `@colony-harness/provider-contract-tests`: OpenAI/Anthropic/Gemini 契约测试矩阵

## OTel / OpenInference 语义

`@colony-harness/trace-otel` 会在导出时对齐关键字段，便于接入通用可观测平台：

- OpenInference：`openinference.span.kind`（`AGENT` / `CHAIN` / `TOOL`）
- 会话字段：`session.id`、`user.id`
- 输入输出字段：`input.value`、`output.value`（及 `*.mime_type`）
- 运行统计：`colony.*` 指标（loop、tool、tokens）

## 后续演进方向

- 保持 core 与控制面解耦，通过 adapter 接入 `colony-bee-sdk` 或其他控制面
- 发布门禁使用 eval baseline + scorer 阈值阻断（CI 内置 `pnpm eval:gate`）
- 工作记忆自动压缩器（context compressor）
- 多 trace exporter（OTEL、Langfuse）
- 回归工作流与评测报告可视化（datasets + scorers + regression workflow）
