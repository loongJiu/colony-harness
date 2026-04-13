import type { CompletedTrace, TraceExporter } from 'colony-harness'

export interface LangfuseTraceExporterOptions {
  publicKey: string
  secretKey: string
  baseUrl?: string
  fetchImpl?: typeof fetch
  tags?: string[]
}

const firstUserInput = (trace: CompletedTrace): string | undefined => {
  const message = trace.messages.find((item) => item.role === 'user')
  return message?.content
}

const toIso = (timestamp: number): string => new Date(timestamp).toISOString()

export class LangfuseTraceExporter implements TraceExporter {
  private readonly fetchImpl: typeof fetch

  constructor(private readonly options: LangfuseTraceExporterOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async export(trace: CompletedTrace): Promise<void> {
    const baseUrl = this.options.baseUrl ?? 'https://cloud.langfuse.com'
    const endpoint = `${baseUrl.replace(/\/$/, '')}/api/public/ingestion`

    const auth = Buffer.from(`${this.options.publicKey}:${this.options.secretKey}`).toString('base64')

    const observations = trace.spans.map((span) => ({
      id: span.spanId,
      type: 'observation-create',
      timestamp: toIso(span.startTime),
      body: {
        traceId: trace.traceId,
        id: span.spanId,
        name: span.name,
        level: span.status === 'error' ? 'ERROR' : 'DEFAULT',
        input: '',
        output: span.errorMessage ?? '',
        startTime: toIso(span.startTime),
        endTime: toIso(span.endTime ?? span.startTime),
        metadata: span.attributes,
      },
    }))

    const payload = {
      batch: [
        {
          id: trace.traceId,
          type: 'trace-create',
          timestamp: toIso(trace.startTime),
          body: {
            id: trace.traceId,
            name: trace.capability,
            userId: trace.agentId,
            sessionId: trace.taskId,
            input: firstUserInput(trace),
            output: typeof trace.output === 'string' ? trace.output : JSON.stringify(trace.output),
            metadata: {
              metrics: trace.metrics,
              tags: this.options.tags ?? [],
            },
            release: 'phase-3',
          },
        },
        ...observations,
      ],
    }

    const response = await this.fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Langfuse export failed (${response.status}): ${body}`)
    }
  }
}
