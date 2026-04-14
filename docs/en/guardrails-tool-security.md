# Guardrails & Tool Security

This page clarifies where safety controls should be applied.

## 1. Guardrails order

- Input stage: run each guard's `checkInput` in registration order
- Output stage: run each guard's `checkOutput` in registration order
- Any rejection interrupts the flow

## 2. Built-in guards

- `PromptInjectionGuard`
- `SensitiveWordGuard(words)`
- `TokenLimitGuard(max)`
- `RateLimitGuard({ maxRequests, windowMs })`
- `PIIGuard`

## 3. Tool risk tiers

- High risk: `run_command`, `write_file`, external HTTP
- Medium risk: `read_file`, `json_query`
- Lower risk: `calculator`, `template_render`

## 4. Safer `run_command` baseline

The built-in `run_command` now defaults to allowlist-first. Unknown commands are denied unless explicitly allowed.

```ts
createRunCommandTool({
  allowShell: false,
  allowedCommands: ['node', 'pnpm'],
  blockedCommands: ['rm', 'mkfs', 'shutdown'],
  approvalByRisk: {
    requiredFrom: 'medium',
    callback: async ({ command, riskLevel }) => {
      return command === 'node' && riskLevel !== 'high'
    },
  },
  defaultTimeoutMs: 5000,
})
```

Successful executions include an `audit` payload (command/args/riskLevel/duration/cwd/timestamp) for governance logging.

## 5. Safer file tools baseline

```ts
createReadFileTool({ baseDir: '/app/sandbox' })
createWriteFileTool({ baseDir: '/app/sandbox' })
```
