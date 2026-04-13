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

```ts
createRunCommandTool({
  allowShell: false,
  allowedCommands: ['node', 'pnpm'],
  blockedCommands: ['rm', 'mkfs', 'shutdown'],
  defaultTimeoutMs: 5000,
})
```

## 5. Safer file tools baseline

```ts
createReadFileTool({ baseDir: '/app/sandbox' })
createWriteFileTool({ baseDir: '/app/sandbox' })
```
