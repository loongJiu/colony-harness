import { createId } from '../utils/ids.js'
import type { LoopMessage } from '../loop/types.js'
import { InMemoryAdapter } from './InMemoryAdapter.js'
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

  constructor(
    private readonly adapter: MemoryAdapter = new InMemoryAdapter(),
    config?: Partial<MemoryManagerConfig>,
  ) {
    this.config = {
      ...defaultMemoryConfig(),
      ...(config ?? {}),
    }
  }

  getWorkingMessages(taskId: string): LoopMessage[] {
    return [...(this.workingMemory.get(taskId) ?? [])]
  }

  setWorkingMessages(taskId: string, messages: LoopMessage[]): void {
    this.workingMemory.set(taskId, [...messages])
  }

  clearWorkingMessages(taskId: string): void {
    this.workingMemory.delete(taskId)
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
    const embedding =
      params.type === 'semantic' && this.config.embedder
        ? await this.config.embedder(content)
        : undefined

    await this.adapter.write({
      id: createId('mem'),
      key: params.key,
      agentId: params.agentId,
      sessionId: params.sessionId,
      taskId: params.taskId,
      type: params.type ?? 'episodic',
      content,
      embedding,
      metadata: params.metadata,
      createdAt: new Date(),
      expiresAt: this.toExpireDate(),
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

  private toExpireDate(): Date {
    const expiration = new Date()
    expiration.setDate(expiration.getDate() + this.config.episodicRetentionDays)
    return expiration
  }
}
