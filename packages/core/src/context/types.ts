import type { ZodSchema } from 'zod'
import type { LoopMessage, LoopResult } from '../loop/types.js'
import type { MemoryEntry } from '../memory/types.js'
import type { ModelRequest, ModelResponse } from '../types/model.js'
import type { Logger } from '../types/common.js'
import type { TraceSpan } from '../trace/types.js'

export interface HarnessContext {
  taskId: string
  capability: string
  input: unknown
  signal?: AbortSignal
  logger: Logger
  callModel(request: Omit<ModelRequest, 'tools'>): Promise<ModelResponse>
  callModelWithTools(request: ModelRequest): Promise<ModelResponse>
  runLoop(prompt: string): Promise<LoopResult>
  invokeTool(name: string, input: unknown): Promise<unknown>
  memory: {
    save(key: string, value: unknown): Promise<void>
    saveSemantic(key: string, value: unknown): Promise<void>
    load(key: string): Promise<unknown>
    search(query: string, topK?: number): Promise<MemoryEntry[]>
    recent(limit?: number): Promise<MemoryEntry[]>
    clearSession(): Promise<void>
    workingMessages: LoopMessage[]
  }
  parseOutput<T>(schema: ZodSchema<T>, raw: string): Promise<T>
  trace: {
    startSpan(name: string, attributes?: Record<string, unknown>): TraceSpan
    addEvent(name: string, attributes?: Record<string, unknown>): void
    setAttribute(key: string, value: unknown): void
  }
}
