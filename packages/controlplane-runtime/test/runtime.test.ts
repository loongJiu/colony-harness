import { setTimeout as delay } from 'node:timers/promises'
import { describe, expect, it } from 'vitest'
import { HarnessBuilder } from 'colony-harness'
import { MockControlPlaneAdapter } from '@colony-harness/controlplane-mock-adapter'
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

describe('HarnessControlPlaneRuntime', () => {
  it('runs assigned task and reports result/progress', async () => {
    const harness = await new HarnessBuilder().llm(provider).build()
    harness.task('echo', async (ctx) => ({ echoed: ctx.input }))

    const adapter = new MockControlPlaneAdapter()
    const runtime = new HarnessControlPlaneRuntime({
      harness,
      controlPlane: adapter,
    })

    await runtime.start()
    const result = await adapter.dispatchTask({
      taskId: 'task-1',
      capability: 'echo',
      input: { text: 'hello' },
      agentId: 'agent-a',
      sessionId: 'session-a',
    })
    await runtime.stop()

    expect(result.status).toBe('success')
    expect(result.output).toEqual({ echoed: { text: 'hello' } })
    expect(adapter.results).toHaveLength(1)
    expect(adapter.results[0]?.taskId).toBe('task-1')
    expect(adapter.progressEvents.map((event) => event.message)).toEqual(
      expect.arrayContaining(['accepted', 'completed']),
    )
  })

  it('maps cancel signal to task abort and returns TASK_CANCELLED', async () => {
    const harness = await new HarnessBuilder().llm(provider).build()
    harness.task('long-task', async (ctx) => {
      await delay(30_000, undefined, { signal: ctx.signal })
      return 'finished'
    })

    const adapter = new MockControlPlaneAdapter()
    const runtime = new HarnessControlPlaneRuntime({
      harness,
      controlPlane: adapter,
    })

    await runtime.start()

    const running = adapter.dispatchTask({
      taskId: 'task-cancel',
      capability: 'long-task',
      input: null,
    })

    await delay(20)
    await adapter.cancelTask({ taskId: 'task-cancel', reason: 'user-request' })

    const result = await running
    await runtime.stop()

    expect(result.status).toBe('failure')
    expect(result.error?.code).toBe('TASK_CANCELLED')
    expect(adapter.results[0]?.error?.code).toBe('TASK_CANCELLED')
  })

  it('supports capability mapping from control plane to harness capability', async () => {
    const harness = await new HarnessBuilder().llm(provider).build()
    harness.task('local-capability', async () => 'ok')

    const adapter = new MockControlPlaneAdapter()
    const runtime = new HarnessControlPlaneRuntime({
      harness,
      controlPlane: adapter,
      capabilityResolver: (task) => (task.capability === 'queen.echo' ? 'local-capability' : task.capability),
    })

    await runtime.start()
    const result = await adapter.dispatchTask({
      taskId: 'task-map',
      capability: 'queen.echo',
      input: null,
    })
    await runtime.stop()

    expect(result.status).toBe('success')
    expect(result.capability).toBe('local-capability')
  })
})
