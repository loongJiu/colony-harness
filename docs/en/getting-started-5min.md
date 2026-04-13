# Get Running in 5 Minutes

Goal: get your first successful run quickly and verify the MVP runtime path.

## 1. Prerequisites

- Node.js `>=18.18.0`
- pnpm `>=10.33.0`

```bash
node -v
pnpm -v
```

## 2. Install

```bash
pnpm install
```

## 3. Run the minimal example

> This example uses a mock provider and does not require external API keys.

```bash
pnpm --filter @colony-harness/example-basic-agent dev
```

Expected output includes:

- loop iterations and tool invocation logs
- `Final output:`
- a computed result (`1+2+3` in the sample)

## 4. Verify memory flow

```bash
pnpm --filter @colony-harness/example-memory-agent dev
```

To run the same demo with SQLite persistence:

```bash
MEMORY_BACKEND=sqlite pnpm --filter @colony-harness/example-memory-agent dev
```

## 5. Next

- Provider/env setup: [Environment Variables](./environment-variables.md)
- Runtime internals: [Runtime Lifecycle](./runtime-lifecycle.md)
- Security model: [Guardrails & Tool Security](./guardrails-tool-security.md)
- Error handling: [Troubleshooting](./troubleshooting.md)
