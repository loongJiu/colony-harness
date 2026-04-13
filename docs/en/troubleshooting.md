# Troubleshooting

## 1. `ERR_PNPM_BAD_PM_VERSION` in GitHub Actions

Cause:

- `pnpm/action-setup` sets a version
- `package.json` also sets `packageManager`

Fix:

- keep only one source (recommended: `packageManager` in `package.json`)

## 2. `docs:build` ESM/require config error

Fix:

- avoid importing ESM-only modules in a way that gets required via CJS in config bundling
- keep VitePress config as plain object export

## 3. Redis connection refused

- make sure Redis is running
- verify `REDIS_URL`
- check network routing in containerized environments

## 4. Missing API key/model/baseUrl in OpenAI-compatible provider

- verify variables in [Environment Variables](./environment-variables.md)

## 5. `Ignored build scripts` during install

- run `pnpm approve-builds` when needed
- approve only trusted packages

## 6. `run_command` tool blocked

- check `blockedCommands` and `allowedCommands`
- keep destructive commands denied by default
