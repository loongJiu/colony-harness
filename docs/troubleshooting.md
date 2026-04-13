# 常见问题排查

## 1. CI 报 `ERR_PNPM_BAD_PM_VERSION` / Multiple versions of pnpm specified

现象：

- GitHub Actions 报 pnpm 版本冲突

原因：

- workflow 里 `pnpm/action-setup` 指定了 version
- 同时 `package.json` 里有 `packageManager: pnpm@x.y.z`

处理：

- 保留一种来源即可，推荐只保留 `packageManager`

## 2. `docs:build` 失败，提示 ESM / require 相关错误

现象：

- `vitepress` 被当作 CJS require 导入失败

处理：

- VitePress 配置不要写 `import { defineConfig } from 'vitepress'`
- 直接导出 plain object 配置

## 3. 运行 Redis 记忆报连接失败

现象：

- `ECONNREFUSED 127.0.0.1:6379`

处理：

1. 确认 Redis 已启动
2. 检查 `REDIS_URL`
3. 容器环境下确认网络可达

## 4. OpenAI-Compatible provider 提示 Missing API key/model/baseUrl

现象：

- `Missing API key. Set OPENAI_API_KEY or OPENAI_COMPAT_API_KEY.`

处理：

- 按 [environment-variables.md](./environment-variables.md) 配置 3 组变量之一
- 建议在应用启动时打印脱敏后的配置摘要

## 5. `pnpm install` 提示 ignored build scripts

现象：

- 安装时出现 `Ignored build scripts: ...`

说明：

- pnpm 的安全机制，默认不执行部分依赖安装脚本

处理：

- 需要时执行 `pnpm approve-builds`
- 只批准可信依赖

## 6. `run_command` 工具执行失败

现象：

- 报 `Command is blocked` 或 `Command is not allowed`

处理：

- 检查 `createRunCommandTool({ blockedCommands, allowedCommands })` 配置
- 高风险命令默认应保持阻断

## 7. 如何快速定位问题

建议最短链路：

1. 先跑 `pnpm build`
2. 再跑 `pnpm typecheck`
3. 再跑 `pnpm test`
4. 文档链路再跑 `pnpm docs:build`

如果是 runtime 问题，优先打开 trace 输出：

- `@colony-harness/trace-console`
- `@colony-harness/trace-file`
