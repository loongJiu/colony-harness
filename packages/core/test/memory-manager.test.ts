import { describe, expect, it } from 'vitest'
import { MemoryManager } from '../src/memory/MemoryManager.js'
import { InMemoryAdapter } from '../src/memory/InMemoryAdapter.js'
import { estimateTokens } from '../src/utils/tokens.js'

describe('MemoryManager', () => {
  it('supports episodic and semantic retrieval', async () => {
    const embedder = async (text: string): Promise<number[]> => {
      if (text.includes('typescript')) return [1, 0, 0]
      if (text.includes('python')) return [0, 1, 0]
      return [0, 0, 1]
    }

    const manager = new MemoryManager(new InMemoryAdapter(), {
      embedder,
      semanticTopK: 2,
    })

    await manager.saveEpisodic({
      key: 'note:1',
      value: { text: 'learn typescript basics' },
      agentId: 'agent-a',
      sessionId: 'session-a',
      taskId: 'task-1',
    })

    await manager.saveSemantic({
      key: 'semantic:1',
      value: 'typescript generic constraints',
      agentId: 'agent-a',
      sessionId: 'session-a',
      taskId: 'task-2',
    })

    const loaded = await manager.load('note:1')
    expect(loaded).toEqual({ text: 'learn typescript basics' })

    const recent = await manager.recent('agent-a', 10)
    expect(recent.length).toBeGreaterThanOrEqual(2)

    const semantic = await manager.search('how to use typescript', 1)
    expect(semantic.length).toBe(1)
    expect(semantic[0]?.content).toContain('typescript')
  })

  it('compresses over-limit working messages', async () => {
    const manager = new MemoryManager(new InMemoryAdapter(), {
      autoCompress: true,
      workingMemoryTokenLimit: 40,
    })

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant that keeps context compact.',
      },
      {
        role: 'user' as const,
        content:
          'Please remember this large block: '.repeat(20) +
          'A very long detail that should be summarized by compressor.',
      },
      {
        role: 'assistant' as const,
        content:
          'Acknowledged. '.repeat(20) +
          'I will preserve key decisions and trim the rest when needed.',
      },
      {
        role: 'user' as const,
        content: 'Give me final answer with one concise paragraph.',
      },
    ]

    const compressed = await manager.maybeCompressMessages(messages, async () => ({
      content: 'Summary: user asked for concise answer while preserving key decisions.',
      toolCalls: [],
    }))

    const beforeTokens = estimateTokens(messages.map((message) => message.content).join('\n'))
    const afterTokens = estimateTokens(compressed.map((message) => message.content).join('\n'))
    expect(afterTokens).toBeLessThan(beforeTokens)
    expect(compressed[1]?.content).toContain('[Compressed Context]')
  })
})
