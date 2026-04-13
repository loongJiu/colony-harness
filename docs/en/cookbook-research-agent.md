# Cookbook: Research Agent

This example combines:

- loop reasoning
- built-in tools
- semantic memory
- eval-based quality checks

## 1. Goal

Build a research assistant that can:

1. use tools for retrieval and processing
2. store distilled findings as semantic memory
3. evaluate output quality before release

## 2. Skeleton

```ts
import { HarnessBuilder } from 'colony-harness'
import { createBuiltinTools } from '@colony-harness/tools-builtin'
import { runEvalSuite, containsScorer } from '@colony-harness/evals'

// Build harness, run task, then evaluate output quality.
```

## 3. Design notes

- restrict tool permissions (`run_command` allowlist)
- store reusable conclusions, not noisy raw logs
- run evals in CI before release

## 4. Minimum pre-release checks

1. `pnpm build`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm docs:build`
5. pass-rate threshold for key eval cases
