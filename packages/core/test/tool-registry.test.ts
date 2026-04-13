import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ToolRegistry } from '../src/tools/ToolRegistry.js'

describe('ToolRegistry', () => {
  it('validates input and invokes tool', async () => {
    const registry = new ToolRegistry()
    registry.register({
      id: 'calculator',
      description: 'Add two numbers',
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.object({ value: z.number() }),
      execute: async ({ a, b }) => ({ value: a + b }),
    })

    const result = await registry.invoke(
      'calculator',
      { a: 1, b: 2 },
      {
        taskId: 'task-1',
        agentId: 'agent-1',
        messages: [],
        logger: {
          debug() {},
          info() {},
          warn() {},
          error() {},
        },
      },
    )

    expect(result).toEqual({ value: 3 })
  })

  it('throws for invalid input', async () => {
    const registry = new ToolRegistry()
    registry.register({
      id: 'strict-tool',
      description: 'Needs name',
      inputSchema: z.object({ name: z.string() }),
      execute: async ({ name }) => name,
    })

    await expect(
      registry.invoke(
        'strict-tool',
        { name: 1 },
        {
          taskId: 'task-2',
          agentId: 'agent-1',
          messages: [],
          logger: {
            debug() {},
            info() {},
            warn() {},
            error() {},
          },
        },
      ),
    ).rejects.toThrow('input validation failed')
  })
})
