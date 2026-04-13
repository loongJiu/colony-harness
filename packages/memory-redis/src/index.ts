import { Redis } from 'ioredis'
import type { MemoryAdapter, MemoryEntry } from 'colony-harness'

interface RedisMemoryAdapterOptions {
  url?: string
  namespace?: string
  redis?: Redis
}

const cosineSimilarity = (left: number[], right: number[]): number => {
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

const parseNumberArray = (value: string): number[] | undefined => {
  if (!value) return undefined

  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return undefined
    if (!parsed.every((item) => typeof item === 'number')) return undefined
    return parsed
  } catch {
    return undefined
  }
}

const parseObject = (value: string): Record<string, unknown> | undefined => {
  if (!value) return undefined

  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}

const maybeDate = (value: string): Date | undefined => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export class RedisMemoryAdapter implements MemoryAdapter {
  private readonly redis: Redis
  private readonly namespace: string

  constructor(options: RedisMemoryAdapterOptions = {}) {
    this.redis = options.redis ?? new Redis(options.url ?? process.env.REDIS_URL ?? 'redis://127.0.0.1:6379')
    this.namespace = options.namespace ?? 'colony:memory'
  }

  private entryKey(id: string): string {
    return `${this.namespace}:entry:${id}`
  }

  private keyMapKey(key: string): string {
    return `${this.namespace}:key:${key}`
  }

  private recentKey(agentId: string): string {
    return `${this.namespace}:recent:${agentId}`
  }

  private sessionSetKey(sessionId: string): string {
    return `${this.namespace}:session:${sessionId}`
  }

  private allIdsKey(): string {
    return `${this.namespace}:ids`
  }

  async write(entry: MemoryEntry): Promise<void> {
    const entryKey = this.entryKey(entry.id)
    const timestamp = entry.createdAt.getTime()

    const payload: Record<string, string> = {
      id: entry.id,
      key: entry.key ?? '',
      agentId: entry.agentId,
      sessionId: entry.sessionId,
      taskId: entry.taskId ?? '',
      type: entry.type,
      content: entry.content,
      embedding: entry.embedding ? JSON.stringify(entry.embedding) : '',
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : '',
      createdAt: entry.createdAt.toISOString(),
      expiresAt: entry.expiresAt?.toISOString() ?? '',
    }

    const pipeline = this.redis.pipeline()
    pipeline.hset(entryKey, payload)
    pipeline.sadd(this.allIdsKey(), entry.id)
    pipeline.zadd(this.recentKey(entry.agentId), timestamp, entry.id)
    pipeline.sadd(this.sessionSetKey(entry.sessionId), entry.id)

    if (entry.key) {
      pipeline.set(this.keyMapKey(entry.key), entry.id)
    }

    await pipeline.exec()
  }

  async read(key: string): Promise<MemoryEntry | null> {
    const id = await this.redis.get(this.keyMapKey(key))
    if (!id) return null

    return this.readById(id)
  }

  async queryRecent(agentId: string, limit: number): Promise<MemoryEntry[]> {
    const ids = await this.redis.zrevrange(this.recentKey(agentId), 0, Math.max(0, limit - 1)) as string[]
    const entries = await Promise.all(ids.map((id: string) => this.readById(id)))
    return entries.filter((entry): entry is MemoryEntry => Boolean(entry))
  }

  async querySimilar(embedding: number[], limit: number): Promise<MemoryEntry[]> {
    const ids = await this.redis.smembers(this.allIdsKey()) as string[]
    const entries = await Promise.all(ids.map((id: string) => this.readById(id)))

    return entries
      .filter((entry): entry is MemoryEntry => Boolean(entry && entry.embedding?.length))
      .map((entry) => ({
        entry,
        similarity: cosineSimilarity(entry.embedding ?? [], embedding),
      }))
      .sort((left: { similarity: number }, right: { similarity: number }) => right.similarity - left.similarity)
      .slice(0, limit)
      .map((item: { entry: MemoryEntry }) => item.entry)
  }

  async clear(sessionId: string): Promise<void> {
    const sessionKey = this.sessionSetKey(sessionId)
    const ids = await this.redis.smembers(sessionKey) as string[]

    if (!ids.length) {
      await this.redis.del(sessionKey)
      return
    }

    const pipeline = this.redis.pipeline()

    for (const id of ids) {
      const entry = await this.readById(id)
      if (!entry) continue

      pipeline.del(this.entryKey(id))
      pipeline.srem(this.allIdsKey(), id)
      pipeline.zrem(this.recentKey(entry.agentId), id)
      if (entry.key) {
        pipeline.del(this.keyMapKey(entry.key))
      }
    }

    pipeline.del(sessionKey)
    await pipeline.exec()
  }

  private async readById(id: string): Promise<MemoryEntry | null> {
    const raw = await this.redis.hgetall(this.entryKey(id))
    if (!raw || !raw.id) return null

    const agentId = raw.agentId
    const sessionId = raw.sessionId
    const type = raw.type as MemoryEntry['type'] | undefined
    const content = raw.content

    if (!agentId || !sessionId || !type || !content) {
      return null
    }

    const createdAt = maybeDate(raw.createdAt ?? '')
    if (!createdAt) return null

    return {
      id: raw.id,
      key: raw.key || undefined,
      agentId,
      sessionId,
      taskId: raw.taskId || undefined,
      type,
      content,
      embedding: parseNumberArray(raw.embedding ?? ''),
      metadata: parseObject(raw.metadata ?? ''),
      createdAt,
      expiresAt: maybeDate(raw.expiresAt ?? ''),
    }
  }
}
