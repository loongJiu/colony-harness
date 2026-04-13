import type { ZodSchema } from 'zod'
import type { Logger } from '../types/common.js'
import type { LoopMessage } from '../loop/types.js'

export interface ToolExecutionContext {
  taskId: string
  agentId: string
  messages: LoopMessage[]
  signal?: AbortSignal
  logger: Logger
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  id: string
  description: string
  inputSchema: ZodSchema<TInput>
  outputSchema?: ZodSchema<TOutput>
  execute: (input: TInput, ctx: ToolExecutionContext) => Promise<TOutput>
  timeout?: number
  requiresApproval?: boolean
  accessLevel?: 'public' | 'internal' | 'admin'
  tags?: string[]
}

export interface ToolSchema {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}

export type ApprovalCallback = (toolName: string, input: unknown) => Promise<boolean>
