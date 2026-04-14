import { describe, expect, it } from 'vitest'
import { HarnessBuilder } from 'colony-harness'
import { BeeSDKControlPlaneAdapter, InMemoryBeeAgentStub } from '@colony-harness/controlplane-sdk-adapter'
import { HarnessControlPlaneRuntime } from '../src/index.js'

const provider = {
  async call() {
    return {
      content: 'ok',
      toolCalls: [],
      usage: { inputTokens: 1, outputTokens: 1 },
    }
  },
}

describe('HarnessControlPlaneRuntime + BeeSDKControlPlaneAdapter', () => {
  it('runs task through sdk adapter and keeps taskId aligned', async () => {
    const harness = await new HarnessBuilder().llm(provider).build()
    harness.task('research', async (ctx) => ({
      taskId: ctx.taskId,
      payload: ctx.input,
    }))

    const bee = new InMemoryBeeAgentStub()
    const adapter = new BeeSDKControlPlaneAdapter({
      queenUrl: 'http://queen.local',
      colonyToken: 'token',
      capabilities: ['research'],
      beeAgent: bee,
    })

    const runtime = new HarnessControlPlaneRuntime({
      harness,
      controlPlane: adapter,
    })

    await runtime.start()
    const output = await bee.dispatchTask({
      taskId: 'sdk-task-1',
      capability: 'research',
      input: { q: 'hello' },
    })
    await runtime.stop()

    expect(output).toEqual({
      taskId: 'sdk-task-1',
      payload: { q: 'hello' },
    })
  })
})
