import type { TokenUsage } from '../types/common.js'
import type { ModelCaller, ModelToolCall } from '../types/model.js'

export interface LoopMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  toolName?: string
  metadata?: Record<string, unknown>
}

export type StopCondition = (messages: LoopMessage[]) => boolean

export interface AgenticLoopConfig {
  maxIterations: number
  maxTokens?: number
  callTimeout: number
  stopConditions?: StopCondition[]
  toolConcurrency: number
  toolFailStrategy: 'abort' | 'continue' | 'retry'
  toolRetryMax: number
}

export interface AgenticLoopHooks {
  onIteration?: (iteration: number, messages: LoopMessage[]) => void
  beforeModelCall?: (messages: LoopMessage[]) => Promise<LoopMessage[]>
  onMessagesCompressed?: (beforeTokens: number, afterTokens: number) => void
  onToolStart?: (toolName: string, input: unknown) => void
  onToolResult?: (toolName: string, output: unknown) => void
  onToolError?: (toolName: string, error: unknown) => void
}

export interface AgenticLoopRunOptions {
  modelCaller: ModelCaller
  initialMessages: LoopMessage[]
  taskId: string
  agentId: string
  signal?: AbortSignal
  hooks?: AgenticLoopHooks
}

export interface ToolResult {
  callId: string
  toolName: string
  output: unknown
}

export interface LoopResult {
  output: string
  messages: LoopMessage[]
  iterations: number
  toolsInvoked: string[]
  tokenUsage: TokenUsage
  stopReason: 'completed' | 'max_iterations' | 'max_tokens' | 'error' | 'custom'
  durationMs: number
}

export const defaultLoopConfig = (): AgenticLoopConfig => ({
  maxIterations: 20,
  callTimeout: 30_000,
  toolConcurrency: 1,
  toolFailStrategy: 'abort',
  toolRetryMax: 2,
})

export interface ModelStepResult {
  content: string
  toolCalls: ModelToolCall[]
  usage: TokenUsage
}
