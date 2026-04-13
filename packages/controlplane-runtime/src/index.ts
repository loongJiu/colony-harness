import type {
  ControlPlanePort,
  HealthStatusEvent,
  TaskCancelSignal,
  TaskEnvelope,
  TaskErrorEnvelope,
  TaskResultEnvelope,
} from '@colony-harness/controlplane-contract'
import { createConsoleLogger, type ColonyHarness, type Logger } from 'colony-harness'

export interface HarnessControlPlaneRuntimeOptions {
  harness: ColonyHarness
  controlPlane: ControlPlanePort
  logger?: Logger
  capabilityResolver?: (task: TaskEnvelope) => string
}

const nowIso = (): string => new Date().toISOString()

const toErrorEnvelope = (error: unknown): TaskErrorEnvelope => {
  const err = error instanceof Error ? error : new Error(String(error))
  const isAbort = err.name === 'AbortError'

  return {
    code: isAbort ? 'TASK_CANCELLED' : 'TASK_EXECUTION_ERROR',
    message: err.message,
    retryable: !isAbort,
    metadata: {
      name: err.name,
    },
  }
}

export class HarnessControlPlaneRuntime {
  private started = false
  private handlersBound = false
  private readonly logger: Logger
  private readonly runningTasks = new Map<string, AbortController>()

  constructor(private readonly options: HarnessControlPlaneRuntimeOptions) {
    this.logger = options.logger ?? createConsoleLogger()
  }

  async start(): Promise<void> {
    if (this.started) return

    if (!this.handlersBound) {
      this.options.controlPlane.onTaskAssign((task) => this.handleTaskAssign(task))
      this.options.controlPlane.onTaskCancel((signal) => this.handleTaskCancel(signal))
      this.handlersBound = true
    }

    await this.options.controlPlane.start()
    this.started = true
    await this.reportHealth('healthy', { message: 'controlplane runtime started' })
  }

  async stop(): Promise<void> {
    if (!this.started) return

    for (const controller of this.runningTasks.values()) {
      if (!controller.signal.aborted) {
        controller.abort('runtime stopped')
      }
    }
    this.runningTasks.clear()

    await this.reportHealth('unhealthy', { message: 'controlplane runtime stopped' })
    await this.options.controlPlane.stop()
    this.started = false
  }

  async reportHealth(
    state: HealthStatusEvent['state'] = 'healthy',
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.started) return

    await this.options.controlPlane.reportHealth({
      state,
      activeTasks: this.runningTasks.size,
      queueDepth: 0,
      load: this.runningTasks.size,
      timestamp: nowIso(),
      metadata,
    })
  }

  private async handleTaskAssign(task: TaskEnvelope): Promise<TaskResultEnvelope> {
    const capability = this.options.capabilityResolver?.(task) ?? task.capability
    const controller = new AbortController()
    const startedAt = Date.now()
    this.runningTasks.set(task.taskId, controller)

    await this.safeReportProgress(task.taskId, 0, 'accepted')

    try {
      const output = await this.options.harness.runTask(capability, task.input, {
        taskId: task.taskId,
        agentId: task.agentId,
        sessionId: task.sessionId,
        signal: controller.signal,
      })

      const result: TaskResultEnvelope = {
        taskId: task.taskId,
        capability,
        status: 'success',
        output,
        metrics: {
          durationMs: Date.now() - startedAt,
        },
      }

      await this.safeReportProgress(task.taskId, 100, 'completed')
      await this.safeReportResult(result)
      return result
    } catch (error) {
      const err = toErrorEnvelope(error)
      const result: TaskResultEnvelope = {
        taskId: task.taskId,
        capability,
        status: 'failure',
        error: err,
        metrics: {
          durationMs: Date.now() - startedAt,
        },
      }

      await this.safeReportProgress(task.taskId, 100, err.code === 'TASK_CANCELLED' ? 'cancelled' : 'failed')
      await this.safeReportResult(result)
      return result
    } finally {
      this.runningTasks.delete(task.taskId)
    }
  }

  private async handleTaskCancel(signal: TaskCancelSignal): Promise<void> {
    const controller = this.runningTasks.get(signal.taskId)
    if (!controller || controller.signal.aborted) {
      return
    }

    controller.abort(signal.reason ?? 'cancelled by control plane')
  }

  private async safeReportProgress(taskId: string, percent: number, message: string): Promise<void> {
    try {
      await this.options.controlPlane.reportProgress({
        taskId,
        percent,
        message,
        timestamp: nowIso(),
      })
    } catch (error) {
      this.logger.warn(`Failed to report progress for task ${taskId}: ${String(error)}`)
    }
  }

  private async safeReportResult(result: TaskResultEnvelope): Promise<void> {
    try {
      await this.options.controlPlane.reportResult(result)
    } catch (error) {
      this.logger.warn(`Failed to report result for task ${result.taskId}: ${String(error)}`)
    }
  }
}
