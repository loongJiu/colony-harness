import type { CompletedTrace, TraceExporter } from 'colony-harness'

const color = {
  reset: '\u001b[0m',
  blue: '\u001b[34m',
  cyan: '\u001b[36m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
  dim: '\u001b[2m',
}

const paint = (value: string, tone: keyof typeof color): string => `${color[tone]}${value}${color.reset}`

export class ConsoleTraceExporter implements TraceExporter {
  async export(trace: CompletedTrace): Promise<void> {
    const status = trace.error ? paint('ERROR', 'red') : paint('OK', 'green')
    console.log(paint('\n[Colony Trace]', 'cyan'), status)
    console.log(`${paint('traceId', 'dim')}: ${trace.traceId}`)
    console.log(`${paint('task', 'dim')}: ${trace.taskId} (${trace.capability})`)
    console.log(`${paint('duration', 'dim')}: ${trace.durationMs}ms`)
    console.log(
      `${paint('metrics', 'dim')}: loop=${trace.metrics.loopIterations}, tools=${trace.metrics.toolCallCount}, tokens=${trace.metrics.totalTokens}`,
    )

    for (const span of trace.spans) {
      const spanStatus = span.status === 'error' ? paint('error', 'red') : paint('ok', 'green')
      const duration = span.endTime ? span.endTime - span.startTime : 0
      console.log(`  ${paint('•', 'blue')} ${span.name} ${paint(`(${duration}ms, ${spanStatus})`, 'dim')}`)
    }

    if (trace.error) {
      console.log(`${paint('error', 'yellow')}: ${trace.error}`)
    }
  }
}
