import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { HarnessBuilder } from '../src/builder/HarnessBuilder.js'
import type { CompletedTrace, TraceExporter } from '../src/trace/types.js'

describe('Trace integration', () => {
  it('exports aggregated loop and tool metrics', async () => {
    const traces: CompletedTrace[] = []

    const exporter: TraceExporter = {
      async export(trace) {
        traces.push(trace)
      },
    }

    const provider = {
      async call(request: {
        messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>
      }) {
        const hasToolResult = request.messages.some((message) => message.role === 'tool')

        if (!hasToolResult) {
          return {
            content: 'calling echo tool',
            toolCalls: [
              {
                id: 'call_1',
                name: 'echo',
                input: { text: 'hello-trace' },
              },
            ],
            usage: {
              inputTokens: 10,
              outputTokens: 5,
            },
          }
        }

        return {
          content: 'final answer from loop',
          toolCalls: [],
          usage: {
            inputTokens: 8,
            outputTokens: 4,
          },
        }
      },
    }

    const harness = await new HarnessBuilder()
      .llm(provider)
      .trace(exporter)
      .tool({
        id: 'echo',
        description: 'echo input text',
        inputSchema: z.object({ text: z.string() }),
        execute: async ({ text }) => ({ echoed: text }),
      })
      .build()

    harness.task('trace-demo', async (ctx) => {
      const result = await ctx.runLoop('run trace demo')
      return result.output
    })

    const output = await harness.runTask('trace-demo', 'irrelevant input', {
      agentId: 'agent-trace',
      sessionId: 'session-trace',
    })

    expect(output).toContain('final answer')
    expect(traces.length).toBe(1)

    const trace = traces[0]
    expect(trace.metrics.loopIterations).toBe(2)
    expect(trace.metrics.toolCallCount).toBe(1)
    expect(trace.metrics.toolErrors).toBe(0)
    expect(trace.metrics.totalTokens).toBe(27)

    const spanNames = trace.spans.map((span) => span.name)
    expect(spanNames).toContain('agentic_loop')
    expect(spanNames).toContain('tool_invoke')
  })
})
