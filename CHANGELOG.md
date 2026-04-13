# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog,
and this project follows Semantic Versioning.

## [0.1.0] - 2026-04-13

### Added

- 初始化 monorepo 工程（pnpm workspace + turborepo + TS strict）
- 新增 `colony-harness` 核心包：
  - `AgenticLoop`（ReAct 循环 + 工具调用 + 停止条件）
  - `ToolRegistry`（注册、输入输出校验、审批回调、schema 导出）
  - `MemoryManager` + `InMemoryAdapter`
  - `TraceHub` + `TraceSession`
  - `Guardrails` + 内置 Guard（prompt injection / pii / token limit / sensitive words）
  - `HarnessBuilder` + `ColonyHarness` + `HarnessContext`
  - 标准错误体系与基础类型定义
- 新增 `@colony-harness/memory-sqlite` 包（SQLite 持久化适配器）
- 新增 `@colony-harness/trace-console` 包（终端追踪导出器）
- 新增 `@colony-harness/llm-openai` 包（OpenAI 兼容 Provider）
- 新增 `examples/basic-agent` 示例项目
- 新增单元测试（loop + tools）
- 新增开源维护文件：README、CONTRIBUTING、SECURITY、CODE_OF_CONDUCT
- 新增 GitHub 协作基础：CI、Issue 模板、PR 模板
