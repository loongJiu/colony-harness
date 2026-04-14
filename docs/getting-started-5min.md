# 5 分钟跑通

这个指南的目标是：你第一次接触 `colony-harness`，5 分钟内看到一个可验证输出。

## 1. 前置条件

- Node.js `>=18.18.0`
- pnpm `>=10.33.0`

```bash
node -v
pnpm -v
```

## 2. 安装依赖

```bash
pnpm install
```

## 3. 直接运行最小示例

> 这个示例使用 mock provider，不依赖外部模型 API Key。

```bash
pnpm --filter @colony-harness/example-basic-agent dev
```

你会看到类似输出：

- loop 迭代与工具调用日志
- `Final output:`
- 最终计算结果（示例里是 `1+2+3`）

## 4. 验证运行链路

这一步你已经覆盖了 MVP 的关键主链路：

1. HarnessBuilder 组装运行时
2. Agentic Loop 发起模型调用
3. ToolRegistry 调用 `calculator` 工具
4. 结果回注到对话并输出
5. Trace exporter 打印运行过程

## 5. 运行记忆示例

```bash
pnpm --filter @colony-harness/example-memory-agent dev
```

如果你想体验 SQLite 持久化：

```bash
MEMORY_BACKEND=sqlite pnpm --filter @colony-harness/example-memory-agent dev
```

## 6. 下一步建议

- 想看完整示例运行讲解：看 [examples-running.md](./examples-running.md)
- 想接真实模型：看 [environment-variables.md](./environment-variables.md)
- 想理解运行机制：看 [runtime-lifecycle.md](./runtime-lifecycle.md)
- 想看生产安全策略：看 [guardrails-tool-security.md](./guardrails-tool-security.md)
- 遇到报错：看 [troubleshooting.md](./troubleshooting.md)
