# Guardrails 与工具安全

这页的目标是把“安全控制点”说清楚，避免上线后才补救。

## 1. Guardrails 执行顺序

- 输入阶段：按注册顺序执行每个 guard 的 `checkInput`
- 输出阶段：按注册顺序执行每个 guard 的 `checkOutput`
- 任一 guard 拒绝会中断流程

建议：

- 输入阶段先放拦截型规则（注入、敏感词、限流）
- 输出阶段先放脱敏型规则（PII）

## 2. 内置 Guard 说明

| Guard | 作用 | 推荐场景 |
| --- | --- | --- |
| `PromptInjectionGuard` | 检测常见注入模式 | 所有对外输入 |
| `SensitiveWordGuard(words)` | 检测敏感词 | 合规要求高的业务 |
| `TokenLimitGuard(max)` | 限制超长输入 | 防御超大上下文攻击 |
| `RateLimitGuard({ maxRequests, windowMs })` | 限流 | 公网入口 |
| `PIIGuard` | 输出脱敏（身份证、手机号、邮箱） | 客服、助手类应用 |

## 3. 工具风险分级建议

| 风险级别 | 典型工具 | 建议 |
| --- | --- | --- |
| 高 | `run_command`, `write_file`, 外部 HTTP | 白名单 + 审批 + 审计 |
| 中 | `read_file`, `json_query` | 目录隔离 + 参数校验 |
| 低 | `calculator`, `template_render` | 保持 schema 校验 |

## 4. `run_command` 最小安全配置

当前内置 `run_command` 默认采用 allowlist-first（未允许命令默认拒绝），建议继续显式收敛到业务所需命令集。

```ts
import { createRunCommandTool } from '@colony-harness/tools-builtin'

const runCommand = createRunCommandTool({
  allowShell: false,
  allowedCommands: ['node', 'pnpm'],
  blockedCommands: ['rm', 'mkfs', 'shutdown'],
  approvalByRisk: {
    requiredFrom: 'medium',
    callback: async ({ command, riskLevel }) => {
      // 接入你的审批中心（工单/人工确认）
      return command === 'node' && riskLevel !== 'high'
    },
  },
  defaultTimeoutMs: 5000,
})
```

执行成功返回包含 `audit` 字段（command/args/riskLevel/duration/cwd/timestamp），用于审计留痕。

## 5. 文件工具最小安全配置

```ts
import { createReadFileTool, createWriteFileTool } from '@colony-harness/tools-builtin'

const readFileTool = createReadFileTool({ baseDir: '/app/sandbox' })
const writeFileTool = createWriteFileTool({ baseDir: '/app/sandbox' })
```

## 6. 生产建议清单

1. 所有高风险工具启用审批回调
2. 对工具输入做 schema 强校验
3. 记录工具调用 trace（含输入摘要与耗时）
4. 对外部 HTTP 请求设置超时和响应体长度上限
5. 默认拒绝策略：未显式允许即拒绝
