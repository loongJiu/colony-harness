import type {
  ControlPlanePort,
  HealthStatusEvent,
  TaskAssignHandler,
  TaskCancelHandler,
  TaskCancelSignal,
  TaskEnvelope,
  TaskProgressEvent,
  TaskResultEnvelope,
} from '@colony-harness/controlplane-contract'

const defaultNoHandlerError = (task: TaskEnvelope): TaskResultEnvelope => ({
  taskId: task.taskId,
  capability: task.capability,
  status: 'failure',
  error: {
    code: 'NO_TASK_HANDLER',
    message: `No task handler registered for task "${task.taskId}"`,
    retryable: false,
  },
})

export class MockControlPlaneAdapter implements ControlPlanePort {
  private started = false
  private taskHandlers: TaskAssignHandler[] = []
  private cancelHandlers: TaskCancelHandler[] = []

  readonly progressEvents: TaskProgressEvent[] = []
  readonly results: TaskResultEnvelope[] = []
  readonly healthEvents: HealthStatusEvent[] = []

  async start(): Promise<void> {
    this.started = true
  }

  async stop(): Promise<void> {
    this.started = false
  }

  onTaskAssign(handler: TaskAssignHandler): void {
    this.taskHandlers.push(handler)
  }

  onTaskCancel(handler: TaskCancelHandler): void {
    this.cancelHandlers.push(handler)
  }

  async reportProgress(event: TaskProgressEvent): Promise<void> {
    this.ensureStarted()
    this.progressEvents.push(event)
  }

  async reportResult(result: TaskResultEnvelope): Promise<void> {
    this.ensureStarted()
    this.results.push(result)
  }

  async reportHealth(status: HealthStatusEvent): Promise<void> {
    this.ensureStarted()
    this.healthEvents.push(status)
  }

  async dispatchTask(task: TaskEnvelope): Promise<TaskResultEnvelope> {
    this.ensureStarted()

    for (const handler of this.taskHandlers) {
      const result = await handler(task)
      if (result) {
        return result
      }
    }

    return defaultNoHandlerError(task)
  }

  async cancelTask(signal: TaskCancelSignal): Promise<void> {
    this.ensureStarted()
    for (const handler of this.cancelHandlers) {
      await handler(signal)
    }
  }

  private ensureStarted(): void {
    if (!this.started) {
      throw new Error('MockControlPlaneAdapter is not started. Call start() before invoking operations.')
    }
  }
}
