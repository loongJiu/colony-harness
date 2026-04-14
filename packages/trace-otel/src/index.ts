import { SpanStatusCode, trace as otelTrace, type Attributes, type Tracer } from '@opentelemetry/api'
import type { CompletedTrace, TraceExporter } from 'colony-harness'

export interface OpenTelemetryTraceExporterOptions {
  scopeName?: string
}

const toNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const isPrimitive = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'

const toAttributeValue = (value: unknown): Attributes[string] | undefined => {
  if (value === undefined) return undefined
  if (value === null) return 'null'
  if (isPrimitive(value)) return value
  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }
  return JSON.stringify(value)
}

const normalizeAttributes = (attributes: Record<string, unknown>): Attributes => {
  const normalized: Attributes = {}
  for (const [key, value] of Object.entries(attributes)) {
    const normalizedValue = toAttributeValue(value)
    if (normalizedValue !== undefined) {
      normalized[key] = normalizedValue
    }
  }
  return normalized
}

const stringifyValue = (value: unknown): string => {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const firstUserInput = (trace: CompletedTrace): string =>
  trace.messages.find((item) => item.role === 'user')?.content ?? ''

const inferMimeType = (value: unknown): string => (typeof value === 'string' ? 'text/plain' : 'application/json')

const inferOpenInferenceSpanKind = (spanName: string): 'TOOL' | 'CHAIN' => {
  const lower = spanName.toLowerCase()
  if (lower.includes('tool')) return 'TOOL'
  return 'CHAIN'
}

export class OpenTelemetryTraceExporter implements TraceExporter {
  private readonly tracer: Tracer

  constructor(options: OpenTelemetryTraceExporterOptions = {}) {
    this.tracer = otelTrace.getTracer(options.scopeName ?? 'colony-harness')
  }

  async export(trace: CompletedTrace): Promise<void> {
    const outputText = stringifyValue(trace.output)
    const rootSpan = this.tracer.startSpan(`colony.${trace.capability}`, {
      attributes: normalizeAttributes({
        'colony.trace_id': trace.traceId,
        'colony.agent_id': trace.agentId,
        'colony.task_id': trace.taskId,
        'colony.capability': trace.capability,
        'colony.loop_iterations': trace.metrics.loopIterations,
        'colony.tool_calls': trace.metrics.toolCallCount,
        'colony.tool_errors': trace.metrics.toolErrors,
        'colony.tokens.input': trace.metrics.inputTokens,
        'colony.tokens.output': trace.metrics.outputTokens,
        'openinference.span.kind': 'AGENT',
        'gen_ai.operation.name': 'agent.run',
        'gen_ai.agent.name': trace.capability,
        'session.id': trace.taskId,
        'user.id': trace.agentId,
        'input.value': firstUserInput(trace),
        'input.mime_type': 'text/plain',
        'output.value': outputText,
        'output.mime_type': inferMimeType(trace.output),
      }),
      startTime: trace.startTime,
    })

    for (const span of trace.spans) {
      rootSpan.addEvent(span.name, normalizeAttributes({
        'colony.span_id': span.spanId,
        'colony.status': span.status,
        'colony.error': span.errorMessage ?? '',
        'openinference.span.kind': inferOpenInferenceSpanKind(span.name),
        ...span.attributes,
      }), toNumber(span.startTime))

      for (const event of span.events) {
        rootSpan.addEvent(
          `${span.name}:${event.name}`,
          normalizeAttributes({
            'colony.span_id': span.spanId,
            'openinference.span.kind': inferOpenInferenceSpanKind(span.name),
            ...event.attributes,
          }),
          toNumber(event.timestamp),
        )
      }

      if (span.endTime) {
        rootSpan.addEvent(`${span.name}.end`, normalizeAttributes({
          'colony.duration_ms': span.endTime - span.startTime,
          'openinference.span.kind': inferOpenInferenceSpanKind(span.name),
        }), toNumber(span.endTime))
      }
    }

    if (trace.error) {
      rootSpan.recordException(new Error(trace.error))
      rootSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: trace.error,
      })
    } else {
      rootSpan.setStatus({ code: SpanStatusCode.OK })
    }

    rootSpan.end(trace.endTime)
  }

  async shutdown(): Promise<void> {
    // no-op: lifecycle is owned by application's OpenTelemetry provider
  }
}
