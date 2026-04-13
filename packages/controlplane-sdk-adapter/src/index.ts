import { createConsoleLogger, type Logger } from 'colony-harness'
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

export interface BeeTaskContextLike {
  taskId?: string
  task_id?: string
  capability?: string
  input: unknown
  signal?: AbortSignal
  reportProgress?: (event: { percent: number; message?: string }) => Promise<void> | void
}

export type BeeTaskHandlerLike = (ctx: BeeTaskContextLike) => Promise<unknown>

export interface BeeAgentLike {
  onTask(capability: string, handler: BeeTaskHandlerLike): void
  join(queenUrl: string, colonyToken: string): Promise<{ agentId: string; sessionToken: string }>
  leave(): Promise<void>
}

export interface BeeSDKControlPlaneAdapterOptions {
  queenUrl: string
  colonyToken: string
  capabilities: string[]
  beeAgent?: BeeAgentLike
  createBeeAgent?: () => BeeAgentLike | Promise<BeeAgentLike>
  logger?: Logger
}

const nowIso = (): string => new Date().toISOString()

const abortError = (reason: string): Error => {
  const err = new Error(reason)
  err.name = 'AbortError'
  return err
}

export class BeeSDKControlPlaneAdapter implements ControlPlanePort {
  private readonly logger: Logger
  private readonly reportProgressMap = new Map<string, BeeTaskContextLike['reportProgress']>()
  private beeAgent: BeeAgentLike | null = null
  private started = false
  private handlersBound = false
  private taskAssignHandler: TaskAssignHandler | null = null
  private taskCancelHandler: TaskCancelHandler | null = null

  constructor(private readonly options: BeeSDKControlPlaneAdapterOptions) {
    this.logger = options.logger ?? createConsoleLogger()
  }

  async start(): Promise<void> {
    if (this.started) return

    this.beeAgent = this.options.beeAgent ?? (await this.options.createBeeAgent?.() ?? null)
    if (!this.beeAgent) {
      throw new Error('BeeSDKControlPlaneAdapter requires beeAgent or createBeeAgent option')
    }

    if (!this.handlersBound) {
      for (const capability of this.options.capabilities) {
        this.beeAgent.onTask(capability, (ctx) => this.handleBeeTask(capability, ctx))
      }
      this.handlersBound = true
    }

    await this.beeAgent.join(this.options.queenUrl, this.options.colonyToken)
    this.started = true
  }

  async stop(): Promise<void> {
    if (!this.started) return
    await this.beeAgent?.leave()
    this.reportProgressMap.clear()
    this.started = false
  }

  onTaskAssign(handler: TaskAssignHandler): void {
    this.taskAssignHandler = handler
  }

  onTaskCancel(handler: TaskCancelHandler): void {
    this.taskCancelHandler = handler
  }

  async reportProgress(event: TaskProgressEvent): Promise<void> {
    const reporter = this.reportProgressMap.get(event.taskId)
    if (!reporter) return
    await reporter({ percent: event.percent, message: event.message })
  }

  async reportResult(_result: TaskResultEnvelope): Promise<void> {
    // Result is returned from task handler directly to colony-bee-sdk.
  }

  async reportHealth(_status: HealthStatusEvent): Promise<void> {
    // Health is handled by colony-bee-sdk heartbeat/health endpoint.
  }

  private async handleBeeTask(boundCapability: string, ctx: BeeTaskContextLike): Promise<unknown> {
    const taskId = ctx.taskId ?? ctx.task_id ?? `${boundCapability}-${Date.now()}`
    const capability = ctx.capability ?? boundCapability

    this.reportProgressMap.set(taskId, ctx.reportProgress)

    const cancellationPromise = ctx.signal
      ? new Promise<never>((_, reject) => {
        if (ctx.signal?.aborted) {
          reject(abortError(typeof ctx.signal.reason === 'string' ? ctx.signal.reason : 'Task cancelled'))
          return
        }
        ctx.signal?.addEventListener(
          'abort',
          () => {
            reject(abortError(typeof ctx.signal?.reason === 'string' ? ctx.signal.reason : 'Task cancelled'))
          },
          { once: true },
        )
      })
      : null
    void cancellationPromise?.catch(() => undefined)

    if (ctx.signal) {
      ctx.signal.addEventListener(
        'abort',
        () => {
          void this.taskCancelHandler?.({
            taskId,
            reason: typeof ctx.signal?.reason === 'string' ? ctx.signal.reason : 'cancelled',
            metadata: {
              source: 'bee-sdk-signal',
              timestamp: nowIso(),
            },
          })
        },
        { once: true },
      )
    }

    if (!this.taskAssignHandler) {
      throw new Error('No task assign handler registered on adapter')
    }

    try {
      const taskRun = this.taskAssignHandler({
        taskId,
        capability,
        input: ctx.input,
        metadata: {
          source: 'bee-sdk',
        },
      })
      const result = cancellationPromise
        ? await Promise.race([taskRun, cancellationPromise])
        : await taskRun

      if (!result) return null
      if (result.status === 'failure') {
        if (result.error?.code === 'TASK_CANCELLED') {
          throw abortError(result.error.message || 'Task cancelled')
        }
        throw new Error(result.error?.message || `Task failed: ${taskId}`)
      }
      return result.output ?? null
    } finally {
      this.reportProgressMap.delete(taskId)
    }
  }
}

export interface BeeSDKDynamicLoaderOptions {
  modulePath?: string
  factory?: (sdkModule: Record<string, unknown>) => BeeAgentLike | Promise<BeeAgentLike>
}

export const loadBeeAgentFromModule = async (options: BeeSDKDynamicLoaderOptions = {}): Promise<BeeAgentLike> => {
  const modulePath = options.modulePath ?? process.env.COLONY_BEE_SDK_MODULE ?? 'colony-bee-sdk'
  const sdkModule = await import(modulePath)
  const factory = options.factory ?? ((module) => module.default as BeeAgentLike)
  const beeAgent = await factory(sdkModule as Record<string, unknown>)
  if (!beeAgent) {
    throw new Error(`Failed to create BeeAgent from module "${modulePath}"`)
  }
  return beeAgent
}

export class InMemoryBeeAgentStub implements BeeAgentLike {
  private readonly handlers = new Map<string, BeeTaskHandlerLike>()
  private joined = false

  onTask(capability: string, handler: BeeTaskHandlerLike): void {
    this.handlers.set(capability, handler)
  }

  async join(): Promise<{ agentId: string; sessionToken: string }> {
    this.joined = true
    return { agentId: 'stub-agent', sessionToken: 'stub-session' }
  }

  async leave(): Promise<void> {
    this.joined = false
  }

  async dispatchTask(task: TaskEnvelope, options: { signal?: AbortSignal } = {}): Promise<unknown> {
    if (!this.joined) throw new Error('Bee agent stub is not joined')
    const handler = this.handlers.get(task.capability)
    if (!handler) throw new Error(`No handler for capability: ${task.capability}`)
    return handler({
      taskId: task.taskId,
      capability: task.capability,
      input: task.input,
      signal: options.signal,
    })
  }

  async dispatchCancel(signal: TaskCancelSignal): Promise<void> {
    this.logger('dispatchCancel', signal)
  }

  private logger(_event: string, _payload: unknown): void {
    // Keep stub deterministic for tests.
  }
}
