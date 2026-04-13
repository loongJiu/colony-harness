import { EventEmitter } from 'node:events'
import { createId } from '../utils/ids.js'
import { AgenticLoop } from '../loop/AgenticLoop.js'
import { createHarnessContext } from '../context/createHarnessContext.js'
import type { HarnessContext } from '../context/types.js'
import type { HarnessConfig } from './types.js'
import type { ToolRegistry } from '../tools/ToolRegistry.js'
import type { MemoryManager } from '../memory/MemoryManager.js'
import type { Guardrails } from '../guard/Guardrails.js'
import type { TraceHub } from '../trace/TraceHub.js'
import type { LLMProvider } from '../types/model.js'
import { createConsoleLogger, type Logger } from '../types/common.js'
import { GuardBlockedError } from '../errors/index.js'

export type TaskHandler = (ctx: HarnessContext) => Promise<unknown>

export interface RunTaskOptions {
  taskId?: string
  agentId?: string
  sessionId?: string
  signal?: AbortSignal
}

interface ColonyHarnessDeps {
  config: HarnessConfig
  llmProvider: LLMProvider
  toolRegistry: ToolRegistry
  memoryManager: MemoryManager
  tracer: TraceHub
  guardrails: Guardrails
  logger?: Logger
}

export class ColonyHarness extends EventEmitter {
  private readonly tasks = new Map<string, TaskHandler>()
  private readonly logger: Logger

  constructor(private readonly deps: ColonyHarnessDeps) {
    super()
    this.logger = deps.logger ?? createConsoleLogger()
  }

  task(capability: string, handler: TaskHandler): this {
    this.tasks.set(capability, handler)
    return this
  }

  async runTask(capability: string, input: unknown, options?: RunTaskOptions): Promise<unknown> {
    const handler = this.tasks.get(capability)
    if (!handler) {
      throw new Error(`Task handler not found for capability: ${capability}`)
    }

    const taskId = options?.taskId ?? createId('task')
    const agentId = options?.agentId ?? 'local-agent'
    const sessionId = options?.sessionId ?? 'default-session'

    const traceSession = this.deps.tracer.startTrace({
      taskId,
      agentId,
      capability,
    })

    try {
      const textInput = typeof input === 'string' ? input : JSON.stringify(input)
      await this.deps.guardrails.checkInput(textInput, { taskId, agentId, capability })

      const context = createHarnessContext({
        capability,
        input,
        taskId,
        agentId,
        sessionId,
        signal: options?.signal,
        logger: this.logger,
        llmProvider: this.deps.llmProvider,
        toolRegistry: this.deps.toolRegistry,
        memoryManager: this.deps.memoryManager,
        traceSession,
        createLoop: (loopConfig) => new AgenticLoop(loopConfig, this.deps.toolRegistry, traceSession),
        defaultLoopConfig: this.deps.config.loop,
        defaultSystemPrompt: this.deps.config.defaultSystemPrompt,
        emitEvent: (eventName, ...args) => this.emit(eventName, ...args),
      })

      const output = await handler(context)
      const normalizedOutput = typeof output === 'string' ? output : JSON.stringify(output)
      const guardedOutput = await this.deps.guardrails.checkOutput(normalizedOutput, {
        taskId,
        agentId,
        capability,
      })

      await this.deps.memoryManager.save({
        key: `task:${taskId}:output`,
        value: guardedOutput,
        agentId,
        sessionId,
        taskId,
      })

      const workingMessages = this.deps.memoryManager.getWorkingMessages(taskId)
      const trace = await traceSession.complete({
        messages: workingMessages,
        output: guardedOutput,
      })

      this.emit('trace:exported', trace)
      return typeof output === 'string' ? guardedOutput : JSON.parse(guardedOutput)
    } catch (error) {
      if (error instanceof GuardBlockedError) {
        this.emit('guard:blocked', error.message)
      }
      await traceSession.complete({
        messages: this.deps.memoryManager.getWorkingMessages(taskId),
        output: null,
        error,
      })
      throw error
    } finally {
      this.deps.memoryManager.clearWorkingMessages(taskId)
    }
  }

}
