# Evals Guide

`@colony-harness/evals` provides a composable dataset runner and built-in scorers for regression checks.

## Capabilities

- `runEvalSuite()`
- `exactMatchScorer()`
- `containsScorer()`
- `regexScorer()`
- `numericRangeScorer()`
- `llmJudgeScorer()`
- `safetyScorer()`
- `latencyScorer()`
- `evaluateGate()`

## Quick example

```ts
import { runEvalSuite, exactMatchScorer } from '@colony-harness/evals'

const report = await runEvalSuite({
  cases: [{ id: '1', input: 'hello', expected: 'HELLO' }],
  runner: async ({ input }) => input.toUpperCase(),
  scorer: exactMatchScorer(),
})
```

## Output

- `results[]` per-case output
- `summary` with pass rate and average scores

## Release gate script

Built-in command:

```bash
pnpm eval:gate
```

Default dataset: `evals/baseline-regression.dataset.json`  
Generated report: `reports/eval-gate-report.json`
