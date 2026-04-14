import { defaultLoopConfig } from '../loop/types.js'
import { defaultMemoryConfig, type MemoryAdapter, type MemoryManagerConfig } from '../memory/types.js'
import { InMemoryAdapter } from '../memory/InMemoryAdapter.js'
import { ToolRegistry } from '../tools/ToolRegistry.js'
import type { ApprovalCallback, ToolDefinition } from '../tools/types.js'
import { TraceHub } from '../trace/TraceHub.js'
import type { TraceExporter } from '../trace/types.js'
import { Guardrails } from '../guard/Guardrails.js'
import type { Guard } from '../guard/types.js'
import type { AgenticLoopConfig } from '../loop/types.js'
import type { LLMProvider } from '../types/model.js'
import type { HarnessConfig } from '../harness/types.js'
import { MemoryManager } from '../memory/MemoryManager.js'
import { ColonyHarness } from '../harness/ColonyHarness.js'

const defaultConfig = (): HarnessConfig => ({
  loop: defaultLoopConfig(),
  memory: defaultMemoryConfig(),
  defaultSystemPrompt: 'You are a helpful AI agent.',
})

export class HarnessBuilder {
  private config: HarnessConfig = defaultConfig()
  private tools: ToolDefinition<any, any>[] = []
  private toolApprovalCallback?: ApprovalCallback
  private memoryAdapter?: MemoryAdapter
  private traceExporters: TraceExporter[] = []
  private guards: Guard[] = []
  private llmProvider?: LLMProvider

  llm(provider: LLMProvider): this {
    this.llmProvider = provider
    return this
  }

  tool(...tools: ToolDefinition<any, any>[]): this {
    this.tools.push(...tools)
    return this
  }

  toolApproval(callback: ApprovalCallback): this {
    this.toolApprovalCallback = callback
    return this
  }

  memory(adapter: MemoryAdapter): this {
    this.memoryAdapter = adapter
    return this
  }

  memoryConfig(config: Partial<MemoryManagerConfig>): this {
    this.config.memory = {
      ...this.config.memory,
      ...config,
    }
    return this
  }

  trace(...exporters: TraceExporter[]): this {
    this.traceExporters.push(...exporters)
    return this
  }

  guard(...guards: Guard[]): this {
    this.guards.push(...guards)
    return this
  }

  loopConfig(config: Partial<AgenticLoopConfig>): this {
    this.config.loop = {
      ...this.config.loop,
      ...config,
    }
    return this
  }

  systemPrompt(prompt: string): this {
    this.config.defaultSystemPrompt = prompt
    return this
  }

  async build(): Promise<ColonyHarness> {
    if (!this.llmProvider) {
      throw new Error('LLM provider is required. Call llm(provider) before build().')
    }

    const toolRegistry = new ToolRegistry()
    toolRegistry.registerMany(this.tools)
    if (this.toolApprovalCallback) {
      toolRegistry.setApprovalCallback(this.toolApprovalCallback)
    }

    const memoryManager = new MemoryManager(this.memoryAdapter ?? new InMemoryAdapter(), this.config.memory)
    const tracer = new TraceHub(this.traceExporters)
    const guardrails = new Guardrails(this.guards)

    return new ColonyHarness({
      config: this.config,
      llmProvider: this.llmProvider,
      toolRegistry,
      memoryManager,
      tracer,
      guardrails,
    })
  }
}
