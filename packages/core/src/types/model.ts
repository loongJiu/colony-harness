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

export type ModelCaller = (request: ModelRequest) => Promise<ModelResponse>

export interface LLMProvider {
  call(request: ModelRequest): Promise<ModelResponse>
}

export const normalizeUsage = (usage?: ModelResponse['usage']): TokenUsage => ({
  input: usage?.inputTokens ?? 0,
  output: usage?.outputTokens ?? 0,
})
