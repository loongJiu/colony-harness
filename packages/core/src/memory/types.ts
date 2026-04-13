import type { LoopMessage } from '../loop/types.js'

export interface MemoryEntry {
  id: string
  key?: string
  agentId: string
  sessionId: string
  taskId?: string
  type: 'episodic' | 'semantic' | 'working'
  content: string
  embedding?: number[]
  metadata?: Record<string, unknown>
  createdAt: Date
  expiresAt?: Date
}

export interface MemoryAdapter {
  write(entry: MemoryEntry): Promise<void>
  read(key: string): Promise<MemoryEntry | null>
  queryRecent(agentId: string, limit: number): Promise<MemoryEntry[]>
  querySimilar(embedding: number[], limit: number): Promise<MemoryEntry[]>
  clear(sessionId: string): Promise<void>
}

export interface MemoryManagerConfig {
  workingMemoryTokenLimit: number
  episodicRetentionDays: number
  semanticTopK: number
  autoCompress: boolean
  embedder?: (text: string) => Promise<number[]>
}

export interface MemorySearchOptions {
  query: string
  topK?: number
}

export interface LoadedMemoryContext {
  recent: MemoryEntry[]
  semantic: MemoryEntry[]
  workingMessages: LoopMessage[]
}

export const defaultMemoryConfig = (): MemoryManagerConfig => ({
  workingMemoryTokenLimit: 6000,
  episodicRetentionDays: 30,
  semanticTopK: 5,
  autoCompress: true,
})
