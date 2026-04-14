import { setTimeout as delay } from 'node:timers/promises'
import { describe, expect, it } from 'vitest'
import type { ControlPlanePort, TaskEnvelope, TaskResultEnvelope } from '../src/index.js'

export interface ContractAdapterDriver {
  port: ControlPlanePort
  dispatchTask(task: TaskEnvelope): Promise<TaskResultEnvelope | unknown>
  cancelTask(taskId: string, reason?: string): Promise<void>
}

const toTaskResult = (task: TaskEnvelope, raw: TaskResultEnvelope | unknown): TaskResultEnvelope => {
  if (
    raw &&
    typeof raw === 'object' &&
    'status' in raw &&
    ((raw as { status?: unknown }).status === 'success' || (raw as { status?: unknown }).status === 'failure')
  ) {
    return raw as TaskResultEnvelope
  }

  return {
    taskId: task.taskId,
    capability: task.capability,
    status: 'success',
    output: raw,
  }
}

export const runControlPlanePortContractSuite = (
  suiteName: string,
  createDriver: () => Promise<ContractAdapterDriver> | ContractAdapterDriver,
): void => {
  describe(suiteName, () => {
    it('dispatches task and returns success result', async () => {
      const driver = await createDriver()
      await driver.port.start()
      driver.port.onTaskAssign(async (task) => ({
        taskId: task.taskId,
        capability: task.capability,
        status: 'success',
        output: { echoed: task.input },
      }))

      const task: TaskEnvelope = {
        taskId: 'contract-task-success',
        capability: 'echo',
        input: { text: 'hello' },
      }

      const raw = await driver.dispatchTask(task)
      const result = toTaskResult(task, raw)
      await driver.port.stop()

      expect(result.status).toBe('success')
      expect(result.output).toEqual({ echoed: { text: 'hello' } })
    })

    it('maps cancel signal to task cancellation semantics', async () => {
      const driver = await createDriver()
      await driver.port.start()

      let cancelled = false
      driver.port.onTaskAssign(async (task) => {
        for (let i = 0; i < 200; i += 1) {
          if (cancelled) {
            throw new Error(`Task cancelled: ${task.taskId}`)
          }
          await delay(5)
        }
        return {
          taskId: task.taskId,
          capability: task.capability,
          status: 'success',
          output: 'unexpected',
        }
      })

      let cancelledTaskId = ''
      driver.port.onTaskCancel(async (signal) => {
        cancelled = true
        cancelledTaskId = signal.taskId
      })

      const task: TaskEnvelope = {
        taskId: 'contract-task-cancel',
        capability: 'long',
        input: null,
      }

      const running = driver.dispatchTask(task)
      const runningHandled = running.catch((error) => error)
      await delay(20)
      await driver.cancelTask(task.taskId, 'user-request')
      await delay(50)
      await driver.port.stop()

      expect(cancelledTaskId).toBe(task.taskId)
      await runningHandled
    })
  })
}
