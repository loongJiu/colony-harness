# Evals Guide

`@colony-harness/evals` provides a composable dataset runner and built-in scorers for regression checks.

## Capabilities

- `runEvalSuite()`
- `exactMatchScorer()`
- `containsScorer()`
- `regexScorer()`
- `numericRangeScorer()`

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
