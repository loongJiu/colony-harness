import { describe, expect, it } from 'vitest'
import { HarnessBuilder } from '../src/builder/HarnessBuilder.js'

type MemoryTaskInput =
  | { action: 'remember'; key: string; value: string }
  | { action: 'recall'; query: string }
  | { action: 'clear' }

const embedder = async (text: string): Promise<number[]> => {
  const lower = text.toLowerCase()
  return [
    Number(lower.includes('colony')),
    Number(lower.includes('memory')),
    Number(lower.includes('architecture')),
  ]
}

describe('Memory integration', () => {
  it('persists semantic memory across tasks and supports session clear', async () => {
    const provider = {
      async call(request: {
        messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>
      }) {
        const latest = request.messages[request.messages.length - 1]?.content ?? ''
        return {
          content: latest,
          toolCalls: [],
          usage: { inputTokens: 1, outputTokens: 1 },
        }
      },
    }

    const harness = await new HarnessBuilder()
      .llm(provider)
      .memoryConfig({
        embedder,
        semanticTopK: 5,
      })
      .build()

    harness.task('memory', async (ctx) => {
      const input = ctx.input as MemoryTaskInput

      if (input.action === 'remember') {
        await ctx.memory.saveSemantic(input.key, input.value)
        return { ok: true }
      }

      if (input.action === 'recall') {
        const found = await ctx.memory.search(input.query, 3)
        return found.map((entry) => entry.content)
      }

      await ctx.memory.clearSession()
      return { cleared: true }
    })

    const runOptions = {
      agentId: 'agent-1',
      sessionId: 'session-1',
    }

    await harness.runTask(
      'memory',
      {
        action: 'remember',
        key: 'fact:1',
        value: 'colony-harness has layered memory architecture',
      },
      runOptions,
    )

    const recalled = (await harness.runTask(
      'memory',
      {
        action: 'recall',
        query: 'architecture',
      },
      runOptions,
    )) as string[]

    expect(recalled.some((item) => item.includes('layered memory architecture'))).toBe(true)

    await harness.runTask('memory', { action: 'clear' }, runOptions)

    const recalledAfterClear = (await harness.runTask(
      'memory',
      {
        action: 'recall',
        query: 'architecture',
      },
      runOptions,
    )) as string[]

    expect(recalledAfterClear.length).toBe(0)
  })
})
