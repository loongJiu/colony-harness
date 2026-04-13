import { ConsoleTraceExporter } from '@colony-harness/trace-console'
import { HarnessBuilder } from 'colony-harness'

const embedder = async (text: string): Promise<number[]> => {
  const lower = text.toLowerCase()
  const product = Number(lower.includes('colony'))
  const memory = Number(lower.includes('memory'))
  const architecture = Number(lower.includes('architecture'))
  return [product, memory, architecture]
}

const mockProvider = {
  async call(request: {
    messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>
  }) {
    const latest = request.messages[request.messages.length - 1]?.content ?? ''
    return {
      content: `回答：${latest}`,
      toolCalls: [],
      usage: {
        inputTokens: 20,
        outputTokens: 10,
      },
    }
  },
}

const main = async () => {
  const backend = process.env.MEMORY_BACKEND ?? 'memory'
  const builder = new HarnessBuilder()
    .llm(mockProvider)
    .trace(new ConsoleTraceExporter())
    .memoryConfig({
      embedder,
      semanticTopK: 3,
      workingMemoryTokenLimit: 180,
      autoCompress: true,
    })

  if (backend === 'sqlite') {
    const { SqliteMemoryAdapter } = await import('@colony-harness/memory-sqlite')
    builder.memory(new SqliteMemoryAdapter('./examples/memory-agent/data/memory.sqlite'))
  }

  const harness = await builder.build()

  harness.task('memory-demo', async (ctx) => {
    const inputText = String(ctx.input)

    if (inputText.startsWith('remember:')) {
      const fact = inputText.replace('remember:', '').trim()
      await ctx.memory.saveSemantic('project:fact', fact)
      return { saved: fact }
    }

    if (inputText.startsWith('recall:')) {
      const query = inputText.replace('recall:', '').trim()
      const memories = await ctx.memory.search(query, 3)
      return {
        query,
        memories: memories.map((entry) => entry.content),
      }
    }

    const loop = await ctx.runLoop(inputText)
    return {
      output: loop.output,
      iterations: loop.iterations,
    }
  })

  await harness.runTask('memory-demo', 'remember: colony-harness has layered memory architecture')
  const recalled = await harness.runTask('memory-demo', 'recall: architecture')

  console.log('\nRecalled semantic memories:')
  console.log(`backend=${backend}`)
  console.log(recalled)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
