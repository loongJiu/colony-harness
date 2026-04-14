import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import { createId, type MemoryAdapter, type MemoryEntry } from 'colony-harness'

interface MemoryRow {
  id: string
  memory_key: string | null
  agent_id: string
  session_id: string
  task_id: string | null
  type: 'episodic' | 'semantic' | 'working'
  content: string
  embedding: string | null
  metadata: string | null
  created_at: string
  expires_at: string | null
}

const cosineSimilarity = (left: number[], right: number[]): number => {
  const length = Math.min(left.length, right.length)
  if (length === 0) return 0

  let dot = 0
  let leftNorm = 0
  let rightNorm = 0

  for (let index = 0; index < length; index += 1) {
    dot += left[index]! * right[index]!
    leftNorm += left[index]! ** 2
    rightNorm += right[index]! ** 2
  }

  if (leftNorm === 0 || rightNorm === 0) return 0
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const mapRow = (row: MemoryRow): MemoryEntry => ({
  id: row.id,
  key: row.memory_key ?? undefined,
  agentId: row.agent_id,
  sessionId: row.session_id,
  taskId: row.task_id ?? undefined,
  type: row.type,
  content: row.content,
  embedding: parseJson<number[] | undefined>(row.embedding, undefined),
  metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  createdAt: new Date(row.created_at),
  expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
})

export class SqliteMemoryAdapter implements MemoryAdapter {
  private readonly dbPromise: ReturnType<SqliteMemoryAdapter['init']>
  private readonly databasePath: string

  constructor(databasePath = './data/colony-memory.sqlite') {
    this.databasePath = databasePath
    this.dbPromise = this.init()
  }

  private async init() {
    const db = await open({
      filename: this.databasePath,
      driver: sqlite3.Database,
    })

    await db.exec(`
      CREATE TABLE IF NOT EXISTS memory_entries (
        id TEXT PRIMARY KEY,
        memory_key TEXT,
        agent_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        task_id TEXT,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_memory_agent_created
      ON memory_entries(agent_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_memory_key
      ON memory_entries(memory_key);
    `)

    return db
  }

  async write(entry: MemoryEntry): Promise<void> {
    const db = await this.dbPromise
    await db.run(
      `
      INSERT INTO memory_entries (
        id, memory_key, agent_id, session_id, task_id, type, content,
        embedding, metadata, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      entry.id || createId('mem'),
      entry.key ?? null,
      entry.agentId,
      entry.sessionId,
      entry.taskId ?? null,
      entry.type,
      entry.content,
      entry.embedding ? JSON.stringify(entry.embedding) : null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.createdAt.toISOString(),
      entry.expiresAt?.toISOString() ?? null,
    )
  }

  async read(key: string): Promise<MemoryEntry | null> {
    const db = await this.dbPromise
    const row = await db.get<MemoryRow>(
      `
      SELECT * FROM memory_entries
      WHERE memory_key = ?
      ORDER BY created_at DESC
      LIMIT 1
      `,
      key,
    )

    return row ? mapRow(row) : null
  }

  async queryRecent(agentId: string, limit: number): Promise<MemoryEntry[]> {
    const db = await this.dbPromise
    const rows = await db.all<MemoryRow[]>(
      `
      SELECT * FROM memory_entries
      WHERE agent_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      agentId,
      limit,
    )

    return rows.map(mapRow)
  }

  async querySimilar(embedding: number[], limit: number): Promise<MemoryEntry[]> {
    const db = await this.dbPromise
    const rows = await db.all<MemoryRow[]>(
      `
      SELECT * FROM memory_entries
      WHERE embedding IS NOT NULL
      `,
    )

    return rows
      .map((row) => {
        const entry = mapRow(row)
        return {
          entry,
          similarity: cosineSimilarity(entry.embedding ?? [], embedding),
        }
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((item) => item.entry)
  }

  async clear(sessionId: string): Promise<void> {
    const db = await this.dbPromise
    await db.run('DELETE FROM memory_entries WHERE session_id = ?', sessionId)
  }
}
