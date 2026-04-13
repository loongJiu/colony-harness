import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { AgenticLoop } from '../src/loop/AgenticLoop.js'
import { ToolRegistry } from '../src/tools/ToolRegistry.js'
import type { ModelCaller } from '../src/types/model.js'

const mockTracer = {
  startSpan() {
    return {
      spanId: 'span',
      traceId: 'trace',
      name: 'span',
      startTime: Date.now(),
      attributes: {},
      events: [],
      status: 'ok' as const,
      end() {},
      error() {},
      addEvent() {},
    }
  },
}

describe('AgenticLoop', () => {
  it('completes after tool invocation', async () => {
    const registry = new ToolRegistry()
    registry.register({
      id: 'echo',
      description: 'Echo text',
      inputSchema: z.object({ text: z.string() }),
      execute: async ({ text }) => ({ echoed: text }),
    })

    const responses = [
      {
        content: 'calling echo',
        toolCalls: [{ id: 'call_1', name: 'echo', input: { text: 'hello' } }],
        usage: { inputTokens: 10, outputTokens: 5 },
      },
      {
        content: 'done: hello',
        toolCalls: [],
        usage: { inputTokens: 8, outputTokens: 4 },
      },
    ]

    const modelCaller: ModelCaller = async () => responses.shift() ?? { content: 'fallback', toolCalls: [] }

    const loop = new AgenticLoop({ maxIterations: 3 }, registry, mockTracer)

    const result = await loop.run({
      modelCaller,
      initialMessages: [
        { role: 'system', content: 'You are assistant.' },
        { role: 'user', content: 'say hi' },
      ],
      taskId: 'task-1',
      agentId: 'agent-1',
    })

    expect(result.stopReason).toBe('completed')
    expect(result.iterations).toBe(2)
    expect(result.toolsInvoked).toEqual(['echo'])
    expect(result.output).toContain('done')
  })
})
