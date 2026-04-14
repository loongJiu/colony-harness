# ADR-0003: Eval 门禁与发布质量策略

- 状态：Accepted
- 日期：2026-04-14
- Owner：colony-harness maintainers

## 背景

随着 harness 能力的扩展（多模型、多工具、内存系统、控制面适配），需要一套自动化的质量门禁确保：

- 核心组件（ToolRegistry、Guardrails、MemoryManager）行为不因重构而退化
- 安全拦截能力不因新增 guard 而被绕过
- 发布前有可量化的质量指标作为阻断依据

纯手工测试无法覆盖每次变更，需要将质量验证嵌入 CI 流程。

## 决策

1. **Eval 门禁机制**：CI 流程中 `pnpm eval:gate` 作为发布阻断步骤。门禁失败时 CI 以非零退出码终止。
2. **三级 Scorer 组合**：每个 eval case 由三个 scorer 加权评分：
   - **Quality**（权重 60%）：`llmJudgeScorer` + 可插拔 judge 函数，验证输出正确性。
   - **Safety**（权重 25%）：`safetyScorer`，检测输出中的凭证泄露模式。
   - **Latency**（权重 15%）：`latencyScorer`，验证执行耗时在合理范围内。
3. **默认阈值**（可通过环境变量覆盖）：
   - `minPassRate` ≥ 0.95（至少 95% case 通过）
   - `minWeightedScore` ≥ 0.85（加权平均分不低于 0.85）
   - `maxLatencyMs` ≤ 5000（总耗时不超过 5 秒）
4. **Baseline 回归数据集**：`evals/baseline-regression.dataset.json` 覆盖工具执行、安全拦截、内存一致性、基本变换四类场景。用例使用 harness 真实组件（非空壳模拟）。
5. **门禁失败报告**：每次执行输出 JSON 报告到 `reports/eval-gate-report.json`，包含每个 case 的详细评分和失败原因。

## 后果

正向收益：

- 核心组件回归由 CI 自动捕获，无需人工回归
- 评分可量化，发布决策有据可依
- 新增 scorer 或调整权重不影响已有 case

成本：

- 新增 harness 功能时需同步更新 baseline 数据集
- 评分权重和阈值需要根据实际场景调优
- 门禁 runner 使用真实组件但不含 LLM 调用，无法覆盖模型行为漂移（由 provider contract tests 覆盖）

## 变更流程

- 阈值调整需记录原因（如：因新增复杂 case 导致默认延迟上调）。
- 新增 scorer 需说明与现有组合的权重分配。
- 数据集 case 新增/删除需在 PR 中说明覆盖的场景。
