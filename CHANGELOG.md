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

- 新增 `@colony-harness/controlplane-contract`：
  - 统一控制面端口与事件模型（task/progress/result/health）
- 新增 `@colony-harness/controlplane-mock-adapter`：
  - 用于本地联调与契约测试的 mock 控制面适配器
- 新增 `@colony-harness/controlplane-runtime`：
  - 通过 `ControlPlanePort` 将 task assign/cancel 与 `ColonyHarness` 运行时打通
  - 提供统一结果回报、进度回报与基础健康上报
- 新增 `@colony-harness/controlplane-sdk-adapter`：
  - 通过组合方式对接 colony-bee-sdk，打通 ControlPlane 模式运行链路
  - 支持任务分发、取消映射、progress 回传桥接
- 新增 `@colony-harness/provider-contract-tests`：
  - OpenAI/Anthropic/Gemini tool-calling 契约测试矩阵
- EvalOps 增强：
  - 新增 scorer：`llmJudgeScorer`、`safetyScorer`、`latencyScorer`
  - 新增 `evaluateGate()` 与 baseline 数据集（`evals/baseline-regression.dataset.json`）
  - 新增发布门禁脚本 `pnpm eval:gate` 与 CI 门禁步骤
- 新增架构治理文档：
  - ADR：`docs/adr/0001-harness-controlplane-boundary.md`
  - 双运行模式与兼容矩阵文档（中英文）

### Changed

- `colony-harness` core 移除 `join()` 预留入口，默认保持独立 runtime 形态
- `HarnessBuilder` 新增 `toolApproval(callback)`，可在构建层注入工具审批策略
- `@colony-harness/tools-builtin` 的 `run_command` 默认改为 allowlist-first（未允许命令默认拒绝）
- `ColonyHarness.runTask()` 支持外部传入 `taskId`，便于控制面任务 ID 对齐与链路追踪
- `run_command` 增加风险分级与审批回调（`approvalByRisk`）并返回审计字段 `audit`
- `@colony-harness/trace-otel` 对齐 OTel/OpenInference 关键字段（`openinference.span.kind`、`session.id`、`user.id`、`input/output.value`）
- 新增 `pnpm check:core-boundary` 与 CI 校验，阻断 `core -> sdk/controlplane` 反向耦合

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
