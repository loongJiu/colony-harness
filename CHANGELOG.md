# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog,
and this project follows Semantic Versioning.

## [1.0.0] - 2026-04-13

### Added

- 记忆与持久化增强：
  - `ContextCompressor` 与自动上下文压缩
  - `MemoryManager.saveSemantic()` 与 `clearSession()`
  - `HarnessContext.memory.saveSemantic()` 与 `clearSession()`
  - `HarnessBuilder.memoryConfig()` 配置入口
- 新增 `@colony-harness/memory-redis` 适配器（Redis 持久化后端）
- 新增 `examples/memory-agent` 示例（语义记忆写入/检索）
- 新增可观测性扩展与导出能力：
  - `@colony-harness/trace-file`（JSONL 导出）
  - `@colony-harness/trace-otel`（OpenTelemetry 桥接）
  - `@colony-harness/trace-langfuse`（Langfuse 导出）
- 新增多模型 provider 包：
  - `@colony-harness/llm-openai-compatible`
  - `@colony-harness/llm-anthropic`
  - `@colony-harness/llm-gemini`
- 新增 `@colony-harness/tools-builtin` 内置工具集：
  - `http_request` / `read_file` / `write_file` / `run_command`
  - `search_web` / `calculator` / `json_query` / `template_render`
- 新增 `@colony-harness/evals` 评测工具包：
  - 数据集执行器 `runEvalSuite()`
  - 内置 scorer：`exactMatchScorer`、`containsScorer`、`regexScorer`、`numericRangeScorer`

### Changed

- 安全与护栏增强：
  - 新增 `RateLimitGuard`
  - 强化 `PIIGuard` 脱敏顺序（避免身份证号被手机号规则破坏）
  - 修复 `checkInput` 拦截路径未进入统一 trace/错误处理的问题
- 可观测性统计增强：`TraceSession` metrics 聚合（loop/tools/errors/tokens）
- 文档与工程化完善：
  - 新增 VitePress 文档站与双语（中文默认，可切换英文）
  - 新增文档 CI/CD（PR 构建校验 + GitHub Pages 部署）
  - 新增 `Dockerfile.docs` 与 Nginx 配置，支持容器化部署文档站
  - 扩展快速开始、进阶指南、API 参考、发布流程与维护规范文档
- 新增并完善测试覆盖（memory / trace / guardrails / evals）

## [Unreleased]

### Added

- 暂无

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
