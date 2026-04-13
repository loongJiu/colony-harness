import type { LoopMessage } from '../loop/types.js'

export interface SpanEvent {
  name: string
  timestamp: number
  attributes?: Record<string, unknown>
}

export interface TraceSpan {
  spanId: string
  traceId: string
  name: string
  startTime: number
  endTime?: number
  attributes: Record<string, unknown>
  events: SpanEvent[]
  status: 'ok' | 'error'
  errorMessage?: string
  end(attributes?: Record<string, unknown>): void
  error(err: unknown): void
  addEvent(name: string, attributes?: Record<string, unknown>): void
}

export interface CompletedTrace {
  traceId: string
  agentId: string
  taskId: string
  capability: string
  startTime: number
  endTime: number
  durationMs: number
  spans: Omit<TraceSpan, 'end' | 'error' | 'addEvent'>[]
  metrics: {
    totalTokens: number
    inputTokens: number
    outputTokens: number
    toolCallCount: number
    loopIterations: number
    toolErrors: number
  }
  messages: LoopMessage[]
  output: unknown
  error?: string
}

export interface TraceExporter {
  export(trace: CompletedTrace): Promise<void>
}
