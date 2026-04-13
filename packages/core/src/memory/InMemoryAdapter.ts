import { createId } from '../utils/ids.js'
import type { MemoryAdapter, MemoryEntry } from './types.js'

export class InMemoryAdapter implements MemoryAdapter {
  private entries: MemoryEntry[] = []

  async write(entry: MemoryEntry): Promise<void> {
    this.entries.push({
      ...entry,
      id: entry.id || createId('mem'),
    })
  }

  async read(key: string): Promise<MemoryEntry | null> {
    const found = [...this.entries]
      .reverse()
      .find((entry) => entry.key === key)

    return found ?? null
  }

  async queryRecent(agentId: string, limit: number): Promise<MemoryEntry[]> {
    return this.entries
      .filter((entry) => entry.agentId === agentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  async querySimilar(embedding: number[], limit: number): Promise<MemoryEntry[]> {
    const score = (left: number[], right: number[]): number => {
      const length = Math.min(left.length, right.length)
      if (!length) return 0
      let dot = 0
      let leftNorm = 0
      let rightNorm = 0

      for (let index = 0; index < length; index += 1) {
        dot += left[index]! * right[index]!
        leftNorm += left[index]! * left[index]!
        rightNorm += right[index]! * right[index]!
      }

      if (!leftNorm || !rightNorm) return 0
      return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
    }

    return this.entries
      .filter((entry) => Array.isArray(entry.embedding) && entry.embedding.length)
      .map((entry) => ({
        entry,
        similarity: score(entry.embedding ?? [], embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((item) => item.entry)
  }

  async clear(sessionId: string): Promise<void> {
    this.entries = this.entries.filter((entry) => entry.sessionId !== sessionId)
  }
}
