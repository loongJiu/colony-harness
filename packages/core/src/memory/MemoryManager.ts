import { createId } from '../utils/ids.js'
import { estimateTokens } from '../utils/tokens.js'
import type { LoopMessage } from '../loop/types.js'
import type { ModelCaller } from '../types/model.js'
import { InMemoryAdapter } from './InMemoryAdapter.js'
import { ContextCompressor } from './ContextCompressor.js'
import {
  defaultMemoryConfig,
  type LoadedMemoryContext,
  type MemoryAdapter,
  type MemoryEntry,
  type MemoryManagerConfig,
} from './types.js'

export class MemoryManager {
  private readonly config: MemoryManagerConfig
  private readonly workingMemory = new Map<string, LoopMessage[]>()
  private readonly compressor: ContextCompressor

  constructor(
    private readonly adapter: MemoryAdapter = new InMemoryAdapter(),
    config?: Partial<MemoryManagerConfig>,
  ) {
    this.config = {
      ...defaultMemoryConfig(),
      ...(config ?? {}),
    }

    this.compressor = new ContextCompressor()
  }

  getWorkingMessages(taskId: string): LoopMessage[] {
    return [...(this.workingMemory.get(taskId) ?? [])]
  }

  setWorkingMessages(taskId: string, messages: LoopMessage[]): void {
    this.workingMemory.set(taskId, [...messages])
  }

  appendWorkingMessage(taskId: string, message: LoopMessage): void {
    const existing = this.workingMemory.get(taskId) ?? []
    this.workingMemory.set(taskId, [...existing, message])
  }

  clearWorkingMessages(taskId: string): void {
    this.workingMemory.delete(taskId)
  }

  async maybeCompressMessages(messages: LoopMessage[], modelCaller: ModelCaller): Promise<LoopMessage[]> {
    if (!this.config.autoCompress) {
      return messages
    }

    const totalTokens = estimateTokens(messages.map((message) => message.content).join('\n'))
    if (totalTokens <= this.config.workingMemoryTokenLimit) {
      return messages
    }

    return this.compressor.compress(messages, this.config.workingMemoryTokenLimit, modelCaller)
  }

  async save(
    params: {
      key?: string
      value: unknown
      agentId: string
      sessionId: string
      taskId?: string
      type?: MemoryEntry['type']
      metadata?: Record<string, unknown>
    },
  ): Promise<void> {
    const content = typeof params.value === 'string' ? params.value : JSON.stringify(params.value)
    const resolvedType = params.type ?? 'episodic'
    const embedding =
      resolvedType === 'semantic' && this.config.embedder
        ? await this.config.embedder(content)
        : undefined

    await this.adapter.write({
      id: createId('mem'),
      key: params.key,
      agentId: params.agentId,
      sessionId: params.sessionId,
      taskId: params.taskId,
      type: resolvedType,
      content,
      embedding,
      metadata: params.metadata,
      createdAt: new Date(),
      expiresAt: resolvedType === 'working' ? undefined : this.toExpireDate(),
    })
  }

  async saveEpisodic(
    params: {
      key?: string
      value: unknown
      agentId: string
      sessionId: string
      taskId?: string
      metadata?: Record<string, unknown>
    },
  ): Promise<void> {
    await this.save({
      ...params,
      type: 'episodic',
    })
  }

  async saveSemantic(
    params: {
      key?: string
      value: unknown
      agentId: string
      sessionId: string
      taskId?: string
      metadata?: Record<string, unknown>
    },
  ): Promise<void> {
    await this.save({
      ...params,
      type: 'semantic',
    })
  }

  async load(key: string): Promise<unknown | null> {
    const entry = await this.adapter.read(key)
    if (!entry) {
      return null
    }

    try {
      return JSON.parse(entry.content)
    } catch {
      return entry.content
    }
  }

  async recent(agentId: string, limit = 10): Promise<MemoryEntry[]> {
    return this.adapter.queryRecent(agentId, limit)
  }

  async search(query: string, topK = this.config.semanticTopK): Promise<MemoryEntry[]> {
    if (!this.config.embedder) {
      return []
    }

    const embedding = await this.config.embedder(query)
    return this.adapter.querySimilar(embedding, topK)
  }

  async loadContext(params: {
    taskId: string
    agentId: string
    semanticQuery?: string
    recentLimit?: number
  }): Promise<LoadedMemoryContext> {
    const recent = await this.recent(params.agentId, params.recentLimit ?? 5)
    const semantic = params.semanticQuery ? await this.search(params.semanticQuery) : []

    return {
      recent,
      semantic,
      workingMessages: this.getWorkingMessages(params.taskId),
    }
  }

  async clearSession(sessionId: string): Promise<void> {
    await this.adapter.clear(sessionId)
  }

  private toExpireDate(): Date {
    const expiration = new Date()
    expiration.setDate(expiration.getDate() + this.config.episodicRetentionDays)
    return expiration
  }
}
