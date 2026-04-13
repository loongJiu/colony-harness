import type { ZodSchema } from 'zod'
import type { AgenticLoopConfig } from '../loop/types.js'
import type { HarnessContext } from './types.js'
import type { Logger } from '../types/common.js'
import type { LLMProvider } from '../types/model.js'
import type { ToolRegistry } from '../tools/ToolRegistry.js'
import type { MemoryManager } from '../memory/MemoryManager.js'
import type { TraceSession } from '../trace/TraceHub.js'

interface CreateContextOptions {
  capability: string
  input: unknown
  taskId: string
  agentId: string
  sessionId: string
  signal?: AbortSignal
  logger: Logger
  llmProvider: LLMProvider
  toolRegistry: ToolRegistry
  memoryManager: MemoryManager
  traceSession: TraceSession
  defaultLoopConfig: AgenticLoopConfig
  defaultSystemPrompt: string
  createLoop: (config?: Partial<AgenticLoopConfig>) => {
    run: (options: {
      modelCaller: LLMProvider['call']
      initialMessages: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; toolCallId?: string; toolName?: string }[]
      taskId: string
      agentId: string
      signal?: AbortSignal
      hooks?: {
        onToolStart?: (toolName: string, input: unknown) => void
        onToolResult?: (toolName: string, output: unknown) => void
        onToolError?: (toolName: string, error: unknown) => void
      }
    }) => Promise<{
      output: string
      messages: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; toolCallId?: string; toolName?: string }[]
      iterations: number
      toolsInvoked: string[]
      tokenUsage: { input: number; output: number }
      stopReason: 'completed' | 'max_iterations' | 'max_tokens' | 'error' | 'custom'
      durationMs: number
    }>
  }
  emitEvent: (eventName: string, ...args: unknown[]) => void
}

const toMemoryMessage = (entry: { createdAt: Date; content: string }) =>
  `[${entry.createdAt.toISOString()}] ${entry.content}`

export const createHarnessContext = (options: CreateContextOptions): HarnessContext => {
  const {
    capability,
    input,
    taskId,
    agentId,
    sessionId,
    signal,
    logger,
    llmProvider,
    toolRegistry,
    memoryManager,
    traceSession,
    defaultLoopConfig,
    defaultSystemPrompt,
    createLoop,
    emitEvent,
  } = options

  const context: HarnessContext = {
    taskId,
    capability,
    input,
    signal,
    logger,
    async callModel(request) {
      return llmProvider.call({ ...request, signal })
    },
    async callModelWithTools(request) {
      return llmProvider.call({ ...request, signal })
    },
    async runLoop(prompt: string) {
      const loaded = await memoryManager.loadContext({
        taskId,
        agentId,
        semanticQuery: prompt,
      })

      const memorySection = [...loaded.recent, ...loaded.semantic]
      const memoryText = memorySection.length
        ? memorySection.map((entry) => toMemoryMessage(entry)).join('\n')
        : 'No memory available.'

      const initialMessages = [
        {
          role: 'system' as const,
          content: `${defaultSystemPrompt}\n\n[Memory]\n${memoryText}`,
        },
        {
          role: 'user' as const,
          content: prompt,
        },
      ]

      const loop = createLoop(defaultLoopConfig)

      emitEvent('loop:start', { taskId, capability })
      const result = await loop.run({
        modelCaller: llmProvider.call.bind(llmProvider),
        initialMessages,
        taskId,
        agentId,
        signal,
        hooks: {
          onToolStart: (name, toolInput) => emitEvent('tool:invoked', name, toolInput),
          onToolResult: (name, output) => emitEvent('tool:result', name, output),
          onToolError: (name, error) => emitEvent('tool:error', name, error),
        },
      })

      memoryManager.setWorkingMessages(taskId, result.messages)
      await memoryManager.save({
        key: `task:${taskId}:loop_result`,
        value: result,
        agentId,
        sessionId,
        taskId,
      })
      emitEvent('loop:end', result)
      traceSession.addTraceAttribute('inputTokens', result.tokenUsage.input)
      traceSession.addTraceAttribute('outputTokens', result.tokenUsage.output)
      traceSession.addTraceAttribute('loopIterations', result.iterations)
      traceSession.addTraceAttribute('toolCallCount', result.toolsInvoked.length)

      return result
    },
    async invokeTool(name, toolInput) {
      emitEvent('tool:invoked', name, toolInput)
      const output = await toolRegistry.invoke(name, toolInput, {
        taskId,
        agentId,
        signal,
        messages: memoryManager.getWorkingMessages(taskId),
        logger,
      })
      emitEvent('tool:result', name, output)
      return output
    },
    memory: {
      async save(key, value) {
        await memoryManager.save({
          key,
          value,
          agentId,
          sessionId,
          taskId,
        })
      },
      async load(key) {
        return memoryManager.load(key)
      },
      async search(query, topK) {
        return memoryManager.search(query, topK)
      },
      async recent(limit) {
        return memoryManager.recent(agentId, limit)
      },
      get workingMessages() {
        return memoryManager.getWorkingMessages(taskId)
      },
    },
    async parseOutput<T>(schema: ZodSchema<T>, raw: string): Promise<T> {
      const json = JSON.parse(raw)
      return schema.parse(json)
    },
    trace: {
      startSpan(name, attributes) {
        return traceSession.startSpan(name, attributes)
      },
      addEvent(name, attributes) {
        const span = traceSession.startSpan(`event:${name}`)
        span.addEvent(name, attributes)
        span.end()
      },
      setAttribute(key, value) {
        traceSession.addTraceAttribute(key, value)
      },
    },
  }

  return context
}
