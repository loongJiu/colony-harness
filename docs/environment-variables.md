# 环境变量参考

本文按“实际代码已支持”和“推荐约定”分开说明。

## 1. 实际代码已支持

### 1.1 OpenAI-Compatible 工具函数

`@colony-harness/llm-openai-compatible` 的 `createOpenAICompatibleProviderFromEnv()` 会读取以下变量：

| 变量名 | 必需 | 说明 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 二选一 | 优先级高于 `OPENAI_COMPAT_API_KEY` |
| `OPENAI_COMPAT_API_KEY` | 二选一 | OpenAI 协议兼容网关的 key |
| `OPENAI_MODEL` | 二选一 | 优先级高于 `OPENAI_COMPAT_MODEL` |
| `OPENAI_COMPAT_MODEL` | 二选一 | 兼容网关模型名 |
| `OPENAI_BASE_URL` | 二选一 | 优先级高于 `OPENAI_COMPAT_BASE_URL` |
| `OPENAI_COMPAT_BASE_URL` | 二选一 | 兼容网关 base url |

### 1.2 Redis Memory Adapter

`@colony-harness/memory-redis` 默认读取：

| 变量名 | 必需 | 默认值 |
| --- | --- | --- |
| `REDIS_URL` | 否 | `redis://127.0.0.1:6379` |

### 1.3 示例项目变量

| 变量名 | 作用 |
| --- | --- |
| `MEMORY_BACKEND` | `examples/memory-agent` 中选择后端，支持 `memory`（默认）或 `sqlite` |

## 2. 推荐约定（便于团队统一）

以下变量不是框架强制读取，但推荐在你的应用层统一使用：

| 变量名 | 推荐用途 |
| --- | --- |
| `OPENAI_API_KEY` | `@colony-harness/llm-openai` |
| `ANTHROPIC_API_KEY` | `@colony-harness/llm-anthropic` |
| `GEMINI_API_KEY` | `@colony-harness/llm-gemini` |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | `@colony-harness/trace-langfuse` |

## 3. 最小 `.env` 示例

```bash
# OpenAI
OPENAI_API_KEY=sk-xxxx
OPENAI_MODEL=gpt-4o-mini

# OpenAI-compatible (可选)
OPENAI_COMPAT_API_KEY=xxx
OPENAI_COMPAT_MODEL=deepseek-chat
OPENAI_COMPAT_BASE_URL=https://api.example.com/v1

# Redis (可选)
REDIS_URL=redis://127.0.0.1:6379

# 示例项目
MEMORY_BACKEND=sqlite
```

## 4. 安全建议

- 不要把 `.env` 提交到仓库
- CI 用 secrets 注入敏感变量
- 不同环境（dev/staging/prod）使用不同 key
- 对外部网关配置请求超时和重试策略
