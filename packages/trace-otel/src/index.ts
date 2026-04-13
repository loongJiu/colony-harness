import { SpanStatusCode, trace as otelTrace, type Tracer } from '@opentelemetry/api'
import type { CompletedTrace, TraceExporter } from 'colony-harness'

export interface OpenTelemetryTraceExporterOptions {
  scopeName?: string
}

const toNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

export class OpenTelemetryTraceExporter implements TraceExporter {
  private readonly tracer: Tracer

  constructor(options: OpenTelemetryTraceExporterOptions = {}) {
    this.tracer = otelTrace.getTracer(options.scopeName ?? 'colony-harness')
  }

  async export(trace: CompletedTrace): Promise<void> {
    const rootSpan = this.tracer.startSpan(`colony.${trace.capability}`, {
      attributes: {
        'colony.trace_id': trace.traceId,
        'colony.agent_id': trace.agentId,
        'colony.task_id': trace.taskId,
        'colony.loop_iterations': trace.metrics.loopIterations,
        'colony.tool_calls': trace.metrics.toolCallCount,
        'colony.tool_errors': trace.metrics.toolErrors,
        'colony.tokens.input': trace.metrics.inputTokens,
        'colony.tokens.output': trace.metrics.outputTokens,
      },
      startTime: trace.startTime,
    })

    for (const span of trace.spans) {
      rootSpan.addEvent(span.name, {
        'colony.span_id': span.spanId,
        'colony.status': span.status,
        'colony.error': span.errorMessage ?? '',
        ...span.attributes,
      }, toNumber(span.startTime))

      if (span.endTime) {
        rootSpan.addEvent(`${span.name}.end`, {
          'colony.duration_ms': span.endTime - span.startTime,
        }, toNumber(span.endTime))
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
