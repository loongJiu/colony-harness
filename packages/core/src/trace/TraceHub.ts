import { createId } from '../utils/ids.js'
import type { LoopMessage } from '../loop/types.js'
import type { CompletedTrace, TraceExporter, TraceSpan } from './types.js'

class MutableTraceSpan implements TraceSpan {
  public readonly spanId = createId('span')
  public readonly events: { name: string; timestamp: number; attributes?: Record<string, unknown> }[] = []
  public readonly startTime = Date.now()
  public endTime?: number
  public status: 'ok' | 'error' = 'ok'
  public errorMessage?: string

  constructor(
    public readonly traceId: string,
    public readonly name: string,
    public readonly attributes: Record<string, unknown> = {},
  ) {}

  end(attributes?: Record<string, unknown>): void {
    this.endTime = Date.now()
    if (attributes) {
      Object.assign(this.attributes, attributes)
    }
  }

  error(err: unknown): void {
    this.status = 'error'
    this.errorMessage = err instanceof Error ? err.message : String(err)
    this.end()
  }

  addEvent(name: string, attributes?: Record<string, unknown>): void {
    this.events.push({
      name,
      attributes,
      timestamp: Date.now(),
    })
  }
}

export class TraceSession {
  private readonly traceId = createId('trace')
  private readonly startTime = Date.now()
  private readonly spans: MutableTraceSpan[] = []
  private readonly traceAttributes: Record<string, unknown> = {}
  private readonly metrics: CompletedTrace['metrics'] = {
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    toolCallCount: 0,
    loopIterations: 0,
    toolErrors: 0,
  }

  constructor(
    private readonly exporters: TraceExporter[],
    private readonly context: {
      agentId: string
      taskId: string
      capability: string
    },
  ) {}

  startSpan(name: string, attributes?: Record<string, unknown>): TraceSpan {
    const span = new MutableTraceSpan(this.traceId, name, attributes)
    this.spans.push(span)
    return span
  }

  addTraceAttribute(key: string, value: unknown): void {
    this.traceAttributes[key] = value
  }

  setMetric(name: keyof CompletedTrace['metrics'], value: number): void {
    this.metrics[name] = value
  }

  incrementMetric(name: keyof CompletedTrace['metrics'], by = 1): void {
    this.metrics[name] += by
  }

  async complete(params: {
    messages: LoopMessage[]
    output: unknown
    metrics?: Partial<CompletedTrace['metrics']>
    error?: unknown
  }): Promise<CompletedTrace> {
    const endTime = Date.now()

    const inputTokens = params.metrics?.inputTokens ?? this.metrics.inputTokens
    const outputTokens = params.metrics?.outputTokens ?? this.metrics.outputTokens
    const loopIterations = params.metrics?.loopIterations ?? this.metrics.loopIterations
    const toolCallCount = params.metrics?.toolCallCount ?? this.metrics.toolCallCount
    const toolErrors = params.metrics?.toolErrors ?? this.metrics.toolErrors

    const trace: CompletedTrace = {
      traceId: this.traceId,
      agentId: this.context.agentId,
      taskId: this.context.taskId,
      capability: this.context.capability,
      startTime: this.startTime,
      endTime,
      durationMs: endTime - this.startTime,
      spans: this.spans.map((span) => ({
        spanId: span.spanId,
        traceId: span.traceId,
        name: span.name,
        startTime: span.startTime,
        endTime: span.endTime,
        attributes: {
          ...span.attributes,
          ...this.traceAttributes,
        },
        events: span.events,
        status: span.status,
        errorMessage: span.errorMessage,
      })),
      metrics: {
        totalTokens: inputTokens + outputTokens,
        inputTokens,
        outputTokens,
        toolCallCount,
        loopIterations,
        toolErrors,
      },
      messages: params.messages,
      output: params.output,
      error: params.error ? (params.error instanceof Error ? params.error.message : String(params.error)) : undefined,
    }

    await Promise.all(this.exporters.map((exporter) => exporter.export(trace)))
    return trace
  }
}

export class TraceHub {
  constructor(private readonly exporters: TraceExporter[] = []) {}

  startTrace(context: { agentId: string; taskId: string; capability: string }): TraceSession {
    return new TraceSession(this.exporters, context)
  }
}
