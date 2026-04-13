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
- `memory.save/load/search/recent`
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
- `@colony-harness/trace-console`: console trace 导出
- `@colony-harness/llm-openai`: OpenAI 兼容 provider

## 后续演进方向

- 与 `colony-bee-sdk` 深度运行时集成
- 工作记忆自动压缩器（context compressor）
- 多 trace exporter（OTEL、Langfuse）
- 内置工具集与评测体系
