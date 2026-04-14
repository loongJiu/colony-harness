import { describe, expect, it } from 'vitest'
import { runControlPlanePortContractSuite } from '../../controlplane-contract/test/adapter-contract-suite.js'
import { MockControlPlaneAdapter } from '../src/index.js'

runControlPlanePortContractSuite('MockControlPlaneAdapter contract suite', () => {
  const adapter = new MockControlPlaneAdapter()
  return {
    port: adapter,
    async dispatchTask(task) {
      return adapter.dispatchTask(task)
    },
    async cancelTask(taskId, reason) {
      await adapter.cancelTask({ taskId, reason })
    },
  }
})

describe('MockControlPlaneAdapter', () => {
  it('stores reported events', async () => {
    const adapter = new MockControlPlaneAdapter()
    await adapter.start()

    await adapter.reportProgress({
      taskId: 'task-3',
      percent: 40,
      message: 'running',
    })

    await adapter.reportHealth({
      state: 'healthy',
      activeTasks: 1,
      queueDepth: 0,
      load: 0.25,
      timestamp: new Date().toISOString(),
    })

    await adapter.reportResult({
      taskId: 'task-3',
      capability: 'demo',
      status: 'success',
      output: 'ok',
    })

    expect(adapter.progressEvents).toHaveLength(1)
    expect(adapter.healthEvents).toHaveLength(1)
    expect(adapter.results).toHaveLength(1)
  })
})
