import { describe, expect, it } from 'vitest'
import type { CompletedTrace, TraceExporter } from '../src/trace/types.js'
import { HarnessBuilder } from '../src/builder/HarnessBuilder.js'

describe('ColonyHarness runTask taskId option', () => {
  it('uses external taskId when provided', async () => {
    const traces: CompletedTrace[] = []

    const exporter: TraceExporter = {
      async export(trace) {
        traces.push(trace)
      },
    }

    const provider = {
      async call() {
        return {
          content: 'done',
          toolCalls: [],
          usage: { inputTokens: 1, outputTokens: 1 },
        }
      },
    }

    const harness = await new HarnessBuilder()
      .llm(provider)
      .trace(exporter)
      .build()

    harness.task('echo', async (ctx) => ctx.input)

    const output = await harness.runTask('echo', 'hello', {
      taskId: 'external-task-1',
      agentId: 'agent-a',
      sessionId: 'session-a',
    })

    expect(output).toBe('hello')
    expect(traces).toHaveLength(1)
    expect(traces[0]?.taskId).toBe('external-task-1')
  })
})
