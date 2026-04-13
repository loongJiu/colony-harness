import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { HarnessBuilder } from '../src/builder/HarnessBuilder.js'

describe('HarnessBuilder toolApproval', () => {
  it('applies approval callback to tool invocation', async () => {
    const provider = {
      async call() {
        return {
          content: 'unused',
          toolCalls: [],
        }
      },
    }

    const harness = await new HarnessBuilder()
      .llm(provider)
      .tool({
        id: 'dangerous_tool',
        description: 'Dangerous tool requiring approval',
        inputSchema: z.object({ payload: z.string() }),
        requiresApproval: true,
        execute: async ({ payload }) => ({ ok: payload }),
      })
      .toolApproval(async () => false)
      .build()

    harness.task('approval-check', async (ctx) => {
      return ctx.invokeTool('dangerous_tool', { payload: 'x' })
    })

    await expect(harness.runTask('approval-check', null)).rejects.toThrow('execution denied by approval policy')
  })
})
