# ADR-0004: 多模型 Provider 契约

- 状态：Accepted
- 日期：2026-04-14
- Owner：colony-harness maintainers

## 背景

colony-harness 需要同时支持 OpenAI、Anthropic（Claude）、Google Gemini 三家 LLM Provider。三家 API 的请求/响应格式差异显著：

| 维度 | OpenAI | Anthropic | Gemini |
|------|--------|-----------|--------|
| Tool call ID 来源 | API 返回 | API 返回 | **无原生 ID** |
| Tool 参数格式 | JSON 字符串 | 已解析对象 | 已解析对象 |
| System 消息 | 内联 messages | 独立 system 字段 | 独立 systemInstruction |
| 结束原因枚举 | stop/tool_calls/length | end_turn/tool_use/max_tokens | STOP/MAX_TOKENS/SAFETY/... |
| 认证方式 | Bearer token | x-api-key header | URL query parameter |

若无统一抽象，上层代码需为每个 provider 编写分支逻辑，增加维护成本和行为漂移风险。

## 决策

1. **统一 `ModelRequest` / `ModelResponse` 接口**：所有 provider 实现相同的 `LLMProvider.call(request: ModelRequest): Promise<ModelResponse>` 方法，上层代码不感知 provider 差异。
2. **stopReason 归一化规则**：
   - `'completed'`：正常结束（OpenAI `stop`、Anthropic `end_turn`/`stop_sequence`、Gemini `STOP`）
   - `'tool_calls'`：工具调用（OpenAI `tool_calls`、Anthropic `tool_use`）
   - `'max_tokens'`：达到 token 上限（OpenAI `length`、Anthropic `max_tokens`、Gemini `MAX_TOKENS`）
   - `'unknown'`：其他原因（Gemini 安全相关结束 `SAFETY`/`RECITATION`/`BLOCKLIST`）
3. **Gemini tool call ID 合成**：Gemini API 不返回 tool call ID，adapter 按 `gemini_tool_1`、`gemini_tool_2` 序号合成。调用方需注意此 ID 在重试时不稳定。
4. **usage 归一化**：所有 provider 的 usage 输出统一为 `{ inputTokens: number, outputTokens: number }`。
5. **Provider contract tests**：`@colony-harness/provider-contract-tests` 包含跨 provider 的契约测试，验证相同输入经不同 provider 后产生语义一致的 `ModelResponse`。测试纳入 CI 必跑。

## 后果

正向收益：

- 上层代码（AgenticLoop、ToolRegistry）无需处理 provider 差异
- 新增 provider 只需实现 `LLMProvider` 接口
- 契约测试可在 CI 中捕获归一化回归

成本：

- Gemini 合成 ID 不稳定，调用方不能依赖其持久性
- 极端 provider 特有行为（如 Gemini 的安全拒绝）被归为 `unknown`，可能丢失信息
- 新增 stopReason 枚举值需同步更新归一化映射和契约测试

## 变更流程

- 新增 provider 需通过 provider contract tests 全部用例。
- stopReason 归一化规则变更需更新本 ADR。
- Gemini tool call ID 合成规则变更需在兼容矩阵中标注为 breaking change。
