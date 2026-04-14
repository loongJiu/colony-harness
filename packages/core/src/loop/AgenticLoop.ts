import type { ToolRegistry } from '../tools/ToolRegistry.js'
import type { ToolExecutionContext } from '../tools/types.js'
import { createConsoleLogger } from '../types/common.js'
import { normalizeUsage } from '../types/model.js'
import type { TraceSpan } from '../trace/types.js'
import { ResilientModelCaller } from '../resilience/ResilientModelCaller.js'
import {
  defaultLoopConfig,
  type AgenticLoopConfig,
  type AgenticLoopRunOptions,
  type LoopResult,
  type ToolResult,
} from './types.js'

export class AgenticLoop {
  private config: AgenticLoopConfig

  constructor(
    config: Partial<AgenticLoopConfig> | undefined,
    private readonly toolRegistry: ToolRegistry,
    private readonly tracer: { startSpan: (name: string, attributes?: Record<string, unknown>) => TraceSpan },
  ) {
    this.config = { ...defaultLoopConfig(), ...(config ?? {}) }
  }

  async run(options: AgenticLoopRunOptions): Promise<LoopResult> {
    const { initialMessages, modelCaller, taskId, agentId, signal, hooks, modelRouteKey } = options
    let messages = [...initialMessages]
    const toolsInvoked: string[] = []
    let tokenUsage = { input: 0, output: 0 }
    let iterations = 0
    const startedAt = Date.now()
    const resilientModelCaller = new ResilientModelCaller(this.config, modelRouteKey ?? 'default-model-route')

    const loopSpan = this.tracer.startSpan('agentic_loop', {
      taskId,
      agentId,
      maxIterations: this.config.maxIterations,
    })

    try {
      while (iterations < this.config.maxIterations) {
        iterations += 1
        hooks?.onIteration?.(iterations, messages)

        if (hooks?.beforeModelCall) {
          messages = await hooks.beforeModelCall(messages)
        }

        const iterationSpan = this.tracer.startSpan('loop_iteration', { iteration: iterations })

        const response = await resilientModelCaller.call(modelCaller, {
          messages,
          tools: this.toolRegistry.getSchemas(),
          signal,
        })

        const usage = normalizeUsage(response.usage)
        tokenUsage = {
          input: tokenUsage.input + usage.input,
          output: tokenUsage.output + usage.output,
        }

        const toolCalls = response.toolCalls ?? []

        messages.push({
          role: 'assistant',
          content: response.content,
          metadata: {
            toolCalls,
          },
        })

        if (!toolCalls.length) {
          iterationSpan.end({ stopReason: 'no_tool_calls' })
          loopSpan.end({ stopReason: 'completed', iterations })
          return {
            output: response.content,
            messages,
            iterations,
            toolsInvoked,
            tokenUsage,
            stopReason: 'completed',
            durationMs: Date.now() - startedAt,
          }
        }

        const shouldStop = this.config.stopConditions?.some((condition) => condition(messages))
        if (shouldStop) {
          iterationSpan.end({ stopReason: 'custom' })
          loopSpan.end({ stopReason: 'custom', iterations })
          return {
            output: response.content,
            messages,
            iterations,
            toolsInvoked,
            tokenUsage,
            stopReason: 'custom',
            durationMs: Date.now() - startedAt,
          }
        }

        const toolResults = await this.invokeTools(
          toolCalls,
          {
            taskId,
            agentId,
            signal,
            messages,
            logger: createConsoleLogger(),
          },
          hooks,
          toolsInvoked,
        )

        for (const result of toolResults) {
          messages.push({
            role: 'tool',
            content: JSON.stringify(result.output),
            toolCallId: result.callId,
            toolName: result.toolName,
          })
        }

        if (this.config.maxTokens && tokenUsage.input + tokenUsage.output >= this.config.maxTokens) {
          iterationSpan.end({ stopReason: 'max_tokens' })
          loopSpan.end({ stopReason: 'max_tokens', iterations })
          return {
            output: response.content,
            messages,
            iterations,
            toolsInvoked,
            tokenUsage,
            stopReason: 'max_tokens',
            durationMs: Date.now() - startedAt,
          }
        }

        iterationSpan.end({ tools: toolResults.map((result) => result.toolName) })
      }

      loopSpan.end({ stopReason: 'max_iterations', iterations })
      const lastAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant')
      return {
        output: lastAssistantMessage?.content ?? '',
        messages,
        iterations,
        toolsInvoked,
        tokenUsage,
        stopReason: 'max_iterations',
        durationMs: Date.now() - startedAt,
      }
    } catch (error) {
      loopSpan.error(error)
      throw error
    }
  }

  private async invokeTools(
    toolCalls: { id: string; name: string; input: unknown }[],
    ctx: ToolExecutionContext,
    hooks: AgenticLoopRunOptions['hooks'],
    toolsInvoked: string[],
  ): Promise<ToolResult[]> {
    const runSingle = async (call: { id: string; name: string; input: unknown }): Promise<ToolResult> => {
      const toolSpan = this.tracer.startSpan('tool_invoke', { tool: call.name })
      toolsInvoked.push(call.name)
      hooks?.onToolStart?.(call.name, call.input)

      const attempt = async (attemptCount: number): Promise<unknown> => {
        try {
          const output = await this.toolRegistry.invoke(call.name, call.input, ctx)
          hooks?.onToolResult?.(call.name, output)
          return output
        } catch (error) {
          hooks?.onToolError?.(call.name, error)

          if (
            this.config.toolFailStrategy === 'retry' &&
            attemptCount < this.config.toolRetryMax
          ) {
            return attempt(attemptCount + 1)
          }

          if (this.config.toolFailStrategy === 'abort') {
            throw error
          }

          return {
            error: error instanceof Error ? error.message : String(error),
          }
        }
      }

      try {
        const output = await attempt(0)
        toolSpan.end({ success: true })
        return {
          callId: call.id,
          toolName: call.name,
          output,
        }
      } catch (error) {
        toolSpan.error(error)
        throw error
      }
    }

    if (this.config.toolConcurrency <= 1 || toolCalls.length <= 1) {
      const results: ToolResult[] = []
      for (const call of toolCalls) {
        results.push(await runSingle(call))
      }
      return results
    }

    const queue = [...toolCalls]
    const workers = Array.from({ length: Math.min(this.config.toolConcurrency, queue.length) }, async () => {
      const workerResults: ToolResult[] = []
      while (queue.length) {
        const next = queue.shift()
        if (!next) break
        workerResults.push(await runSingle(next))
      }
      return workerResults
    })

    const settled = await Promise.all(workers)
    return settled.flat()
  }
}
