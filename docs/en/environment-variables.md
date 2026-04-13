# Environment Variables

This page distinguishes between variables already supported in code and team-level conventions.

## 1. Variables supported by code

### 1.1 OpenAI-compatible helper

`createOpenAICompatibleProviderFromEnv()` reads:

- `OPENAI_API_KEY` or `OPENAI_COMPAT_API_KEY`
- `OPENAI_MODEL` or `OPENAI_COMPAT_MODEL`
- `OPENAI_BASE_URL` or `OPENAI_COMPAT_BASE_URL`

### 1.2 Redis memory adapter

`@colony-harness/memory-redis` reads:

- `REDIS_URL` (default: `redis://127.0.0.1:6379`)

### 1.3 Example project switch

- `MEMORY_BACKEND` (`memory` or `sqlite`)

## 2. Recommended conventions

Not enforced by framework, but recommended at app level:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`

## 3. Example `.env`

```bash
OPENAI_API_KEY=sk-xxxx
OPENAI_MODEL=gpt-4o-mini
REDIS_URL=redis://127.0.0.1:6379
MEMORY_BACKEND=sqlite
```
