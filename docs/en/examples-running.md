# Running the Examples

This page focuses only on running repository examples end-to-end, with practical explanations for each step.

If you only need a quick success run, start with the short path below.  
If you also want to understand logs and fix common errors, continue with the detailed sections.

## Short Path (Recommended)

```bash
pnpm install
pnpm build
pnpm --filter @colony-harness/example-basic-agent dev
pnpm --filter @colony-harness/example-memory-agent dev
pnpm --filter @colony-harness/example-queen-agent-via-sdk dev
```

Why this sequence:

- `pnpm install`: installs all workspace dependencies
- `pnpm build`: builds workspace package outputs required by examples
- `--filter ... dev`: runs a specific example package

## Prerequisites

- Node.js `>=18.18.0`
- pnpm `>=10.33.0`

Check versions:

```bash
node -v
pnpm -v
```

## Example 1: basic-agent

Run:

```bash
pnpm --filter @colony-harness/example-basic-agent dev
```

Expected output includes:

- `Colony Trace` logs (loop, tool calls, token metrics)
- `Final output: { output: 'The result is 6.', tools: [ 'calculator' ] }`

This confirms the core runtime path:

1. Runtime assembled by `HarnessBuilder`
2. Agent loop calls the model (mock provider in this demo)
3. `calculator` tool executes
4. Tool result is injected back and returned

## Example 2: memory-agent (in-memory backend)

Run:

```bash
pnpm --filter @colony-harness/example-memory-agent dev
```

Expected output includes:

- `backend=memory`
- `memories: [ 'colony-harness has layered memory architecture' ]`

That means semantic memory save + recall is working.

## Example 3: queen-agent-via-sdk (adapter integration path)

Run:

```bash
pnpm --filter @colony-harness/example-queen-agent-via-sdk dev
```

Expected output includes:

- `Result from queen-agent-via-sdk example:`
- a result object with `echo` and `taskId`

This example shows:

1. Harness runtime bridged through `controlplane-runtime`
2. `controlplane-sdk-adapter` composed with a BeeAgent layer
3. Business task handlers remain unchanged

## memory-agent with SQLite persistence

Create the data directory, then run:

```bash
mkdir -p examples/memory-agent/data
MEMORY_BACKEND=sqlite pnpm --filter @colony-harness/example-memory-agent dev
```

If you see `backend=sqlite`, the switch is successful. The DB file is:

- `examples/memory-agent/data/memory.sqlite`

## Troubleshooting (Example Runtime)

### 1) `Cannot find module 'colony-harness'` or `@colony-harness/trace-console`

Cause: workspace packages are not built yet.

Fix:

```bash
pnpm build
pnpm --filter @colony-harness/example-basic-agent dev
```

### 2) `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`

Common in non-interactive terminals during install.

Fix:

```bash
CI=true pnpm install
```

### 3) `Could not locate the bindings file ... node_sqlite3.node`

Cause: `sqlite3` native binding was not downloaded/compiled.

Try:

```bash
pnpm rebuild sqlite3
```

If it still fails, run sqlite3's install script directly (this triggers download or local build):

```bash
pnpm --dir node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3 run install
```

> If your sqlite3 version is not `5.1.7`, replace the version segment in the path.

### 4) `SQLITE_CANTOPEN: unable to open database file`

Usually means the database directory does not exist.

Fix:

```bash
mkdir -p examples/memory-agent/data
MEMORY_BACKEND=sqlite pnpm --filter @colony-harness/example-memory-agent dev
```

## Fast Iteration Tips

- Edit `examples/basic-agent/src/index.ts` to change tools or input behavior
- Edit `examples/memory-agent/src/index.ts` to change `remember:` and `recall:` flow
- Re-run:

```bash
pnpm --filter @colony-harness/example-basic-agent dev
# or
pnpm --filter @colony-harness/example-memory-agent dev
```

## Next Reads

- Real provider setup: [Environment Variables](./environment-variables.md)
- Runtime internals: [Runtime Lifecycle](./runtime-lifecycle.md)
- More issue patterns: [Troubleshooting](./troubleshooting.md)
