import type { ToolSchema } from '../tools/types.js'
import type { TokenUsage } from './common.js'

export interface ModelToolCall {
  id: string
  name: string
  input: unknown
}

export interface ModelRequest {
  messages: {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string
    toolCallId?: string
    toolName?: string
  }[]
  tools?: ToolSchema[]
  signal?: AbortSignal
  temperature?: number
  maxTokens?: number
}

export interface ModelResponse {
  content: string
  toolCalls?: ModelToolCall[]
  stopReason?: 'completed' | 'tool_calls' | 'max_tokens' | 'unknown'
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
}

export type ProviderErrorKind =
  | 'network'
  | 'timeout'
  | 'rate_limit'
  | 'server_error'
  | 'client_error'
  | 'auth_error'
  | 'invalid_request'
  | 'aborted'
  | 'unknown'

export interface ProviderErrorDetails {
  provider?: string
  model?: string
  endpoint?: string
  requestId?: string
  statusCode?: number
  retryable: boolean
  transient: boolean
  retryAfterMs?: number
  kind: ProviderErrorKind
}

export class ModelProviderError extends Error {
  readonly details: ProviderErrorDetails

  constructor(message: string, details: ProviderErrorDetails, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ModelProviderError'
    this.details = details
  }
}

export const isModelProviderError = (error: unknown): error is ModelProviderError =>
  error instanceof ModelProviderError

export interface LLMProviderInfo {
  provider: string
  model?: string
  endpoint?: string
}

export type ModelCaller = (request: ModelRequest) => Promise<ModelResponse>

export interface LLMProvider {
  call(request: ModelRequest): Promise<ModelResponse>
  getInfo?(): LLMProviderInfo
}

export const normalizeUsage = (usage?: ModelResponse['usage']): TokenUsage => ({
  input: usage?.inputTokens ?? 0,
  output: usage?.outputTokens ?? 0,
})
