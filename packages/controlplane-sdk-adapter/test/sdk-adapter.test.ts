import { setTimeout as delay } from 'node:timers/promises'
import { describe, expect, it } from 'vitest'
import type { BeeTaskContextLike } from '../src/index.js'
import { BeeSDKControlPlaneAdapter } from '../src/index.js'
import { runControlPlanePortContractSuite } from '../../controlplane-contract/test/adapter-contract-suite.js'

class MockBeeAgent {
  private joined = false
  private readonly handlers = new Map<string, (ctx: BeeTaskContextLike) => Promise<unknown>>()
  private readonly signals = new Map<string, AbortController>()

  onTask(capability: string, handler: (ctx: BeeTaskContextLike) => Promise<unknown>): void {
    this.handlers.set(capability, handler)
  }

  async join(): Promise<{ agentId: string; sessionToken: string }> {
    this.joined = true
    return { agentId: 'agent', sessionToken: 'session' }
  }

  async leave(): Promise<void> {
    this.joined = false
  }

  async dispatchTask(task: { taskId: string; capability: string; input: unknown }): Promise<unknown> {
    if (!this.joined) {
      throw new Error('Bee agent is not joined')
    }
    const handler = this.handlers.get(task.capability)
    if (!handler) {
      throw new Error(`No handler bound for capability: ${task.capability}`)
    }
    const controller = new AbortController()
    this.signals.set(task.taskId, controller)

    try {
      return await handler({
        taskId: task.taskId,
        capability: task.capability,
        input: task.input,
        signal: controller.signal,
      })
    } finally {
      this.signals.delete(task.taskId)
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    this.signals.get(taskId)?.abort('cancel from mock bee')
  }
}

runControlPlanePortContractSuite('BeeSDKControlPlaneAdapter contract suite', () => {
  const bee = new MockBeeAgent()
  const adapter = new BeeSDKControlPlaneAdapter({
    queenUrl: 'http://queen.local',
    colonyToken: 'token',
    capabilities: ['echo', 'long'],
    beeAgent: bee,
  })

  return {
    port: adapter,
    async dispatchTask(task) {
      const raw = await bee.dispatchTask(task)
      return {
        taskId: task.taskId,
        capability: task.capability,
        status: 'success',
        output: raw,
      }
    },
    async cancelTask(taskId) {
      await bee.cancelTask(taskId)
    },
  }
})

describe('BeeSDKControlPlaneAdapter', () => {
  it('forwards progress events to bee task context reporter', async () => {
    const bee = new MockBeeAgent()
    const adapter = new BeeSDKControlPlaneAdapter({
      queenUrl: 'http://queen.local',
      colonyToken: 'token',
      capabilities: ['progress'],
      beeAgent: bee,
    })

    let progressSeen = 0
    adapter.onTaskAssign(async (task) => {
      await adapter.reportProgress({
        taskId: task.taskId,
        percent: 50,
        message: 'halfway',
      })
      return {
        taskId: task.taskId,
        capability: task.capability,
        status: 'success',
        output: 'ok',
      }
    })

    await adapter.start()
    const handler = (bee as unknown as { handlers: Map<string, (ctx: BeeTaskContextLike) => Promise<unknown>> }).handlers.get(
      'progress',
    )
    if (!handler) throw new Error('progress handler is not registered')

    const output = await handler({
      taskId: 'progress-task',
      capability: 'progress',
      input: null,
      reportProgress: async () => {
        progressSeen += 1
      },
    })
    await adapter.stop()

    expect(output).toBe('ok')
    expect(progressSeen).toBe(1)
  })

  it('returns abort error when task is cancelled', async () => {
    const bee = new MockBeeAgent()
    const adapter = new BeeSDKControlPlaneAdapter({
      queenUrl: 'http://queen.local',
      colonyToken: 'token',
      capabilities: ['cancel-demo'],
      beeAgent: bee,
    })

    adapter.onTaskAssign(async (task) => {
      await delay(30_000)
      return {
        taskId: task.taskId,
        capability: task.capability,
        status: 'success',
        output: 'unexpected',
      }
    })

    await adapter.start()
    const running = bee.dispatchTask({
      taskId: 'cancel-task',
      capability: 'cancel-demo',
      input: null,
    })
    await delay(20)
    await bee.cancelTask('cancel-task')

    await expect(running).rejects.toThrow()
    await adapter.stop()
  })
})
