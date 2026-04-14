import { describe, expect, it, vi, afterEach } from 'vitest'
import * as otelApi from '@opentelemetry/api'
import type { CompletedTrace } from 'colony-harness'
import { OpenTelemetryTraceExporter } from '../src/index.js'

const createTrace = (overrides: Partial<CompletedTrace> = {}): CompletedTrace => ({
  traceId: 'trace-1',
  agentId: 'agent-1',
  taskId: 'task-1',
  capability: 'research',
  startTime: 1_700_000_000_000,
  endTime: 1_700_000_000_120,
  durationMs: 120,
  metrics: {
    totalTokens: 30,
    inputTokens: 12,
    outputTokens: 18,
    toolCallCount: 1,
    loopIterations: 2,
    toolErrors: 0,
  },
  messages: [
    { role: 'user', content: 'summarize this' },
    { role: 'assistant', content: 'working' },
  ],
  output: { ok: true },
  spans: [
    {
      spanId: 'span-1',
      traceId: 'trace-1',
      name: 'tool_invoke',
      startTime: 1_700_000_000_010,
      endTime: 1_700_000_000_090,
      status: 'ok',
      errorMessage: undefined,
      attributes: {
        'tool.name': 'search_web',
        'tool.input': { q: 'colony' },
      },
      events: [
        {
          name: 'started',
          timestamp: 1_700_000_000_020,
          attributes: {
            dryRun: false,
          },
        },
      ],
    },
  ],
  ...overrides,
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('OpenTelemetryTraceExporter', () => {
  it('emits normalized OTel/OpenInference attributes', async () => {
    const addEvent = vi.fn()
    const setStatus = vi.fn()
    const recordException = vi.fn()
    const end = vi.fn()

    const fakeSpan = {
      addEvent,
      setStatus,
      recordException,
      end,
    }

    const fakeTracer = {
      startSpan: vi.fn(() => fakeSpan),
    }

    vi.spyOn(otelApi.trace, 'getTracer').mockReturnValue(fakeTracer as never)

    const exporter = new OpenTelemetryTraceExporter()
    await exporter.export(createTrace())

    expect(fakeTracer.startSpan).toHaveBeenCalledTimes(1)
    const [spanName, options] = fakeTracer.startSpan.mock.calls[0] as [string, { attributes: Record<string, unknown> }]
    expect(spanName).toBe('colony.research')
    expect(options.attributes['openinference.span.kind']).toBe('AGENT')
    expect(options.attributes['input.value']).toBe('summarize this')
    expect(options.attributes['output.value']).toBe('{"ok":true}')
    expect(options.attributes['output.mime_type']).toBe('application/json')
    expect(options.attributes['gen_ai.operation.name']).toBe('agent.run')
    expect(options.attributes['session.id']).toBe('task-1')

    expect(addEvent).toHaveBeenCalledWith(
      'tool_invoke',
      expect.objectContaining({
        'openinference.span.kind': 'TOOL',
        'tool.name': 'search_web',
        'tool.input': '{"q":"colony"}',
      }),
      1_700_000_000_010,
    )
    expect(addEvent).toHaveBeenCalledWith(
      'tool_invoke:started',
      expect.objectContaining({
        'openinference.span.kind': 'TOOL',
        dryRun: false,
      }),
      1_700_000_000_020,
    )
    expect(addEvent).toHaveBeenCalledWith(
      'tool_invoke.end',
      expect.objectContaining({
        'openinference.span.kind': 'TOOL',
        'colony.duration_ms': 80,
      }),
      1_700_000_000_090,
    )
    expect(setStatus).toHaveBeenCalledWith({ code: otelApi.SpanStatusCode.OK })
    expect(recordException).not.toHaveBeenCalled()
    expect(end).toHaveBeenCalledWith(1_700_000_000_120)
  })

  it('marks root span as error when completed trace has error', async () => {
    const setStatus = vi.fn()
    const recordException = vi.fn()
    const fakeSpan = {
      addEvent: vi.fn(),
      setStatus,
      recordException,
      end: vi.fn(),
    }

    const fakeTracer = {
      startSpan: vi.fn(() => fakeSpan),
    }
    vi.spyOn(otelApi.trace, 'getTracer').mockReturnValue(fakeTracer as never)

    const exporter = new OpenTelemetryTraceExporter()
    await exporter.export(createTrace({ error: 'boom' }))

    expect(recordException).toHaveBeenCalledTimes(1)
    expect(setStatus).toHaveBeenCalledWith({
      code: otelApi.SpanStatusCode.ERROR,
      message: 'boom',
    })
  })
})
