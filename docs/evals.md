# Evals Guide

`@colony-harness/evals` 提供了可组合的评测执行器与 scorer，适合做回归检查、版本对比和质量闸门。

## 能力概览

- `runEvalSuite()`：执行数据集、收集每条 case 的结果与整体汇总
- 内置 scorer：
  - `exactMatchScorer()`
  - `containsScorer()`
  - `regexScorer()`
  - `numericRangeScorer()`
  - `llmJudgeScorer()`
  - `safetyScorer()`
  - `latencyScorer()`
- 门禁能力：
  - `evaluateGate()`：基于阈值判定发布通过/阻断

## 快速示例

```ts
import { runEvalSuite, exactMatchScorer } from '@colony-harness/evals'

const report = await runEvalSuite({
  cases: [
    { id: 'case-1', input: 'hello', expected: 'HELLO' },
    { id: 'case-2', input: 'world', expected: 'WORLD' },
  ],
  runner: async ({ input }) => input.toUpperCase(),
  scorer: exactMatchScorer(),
})

console.log(report.summary)
```

## 输出说明

- `results[]`：逐 case 结果（含耗时、score、pass、error、weight、tags）
- `summary`：
  - `passRate`：通过率
  - `averageScore`：简单平均分
  - `weightedAverageScore`：按权重平均分

## 建议实践

- 对关键业务 case 设置更高 `weight`
- 使用 `failFast` 在高风险场景尽快终止
- 将 eval 报告接入 CI，作为发布前回归门禁

## 发布门禁脚本

仓库内置：

```bash
pnpm eval:gate
```

默认读取 `evals/baseline-regression.dataset.json`，并输出 `reports/eval-gate-report.json`。  
你可以通过环境变量覆盖阈值：

- `EVAL_GATE_MIN_PASS_RATE`
- `EVAL_GATE_MIN_WEIGHTED_SCORE`
- `EVAL_GATE_MAX_DURATION_MS`
