import { z } from 'zod'
import { ConsoleTraceExporter } from '@colony-harness/trace-console'
import { HarnessBuilder, PromptInjectionGuard, type ToolDefinition } from 'colony-harness'

const mockProvider = {
  async call(request: {
    messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>
  }) {
    const lastMessage = request.messages[request.messages.length - 1]

    if (lastMessage?.role === 'user') {
      return {
        content: 'I will use calculator tool',
        toolCalls: [
          {
            id: 'tool_call_1',
            name: 'calculator',
            input: {
              expression: '1+2+3',
            },
          },
        ],
        usage: {
          inputTokens: 12,
          outputTokens: 6,
        },
      }
    }

    return {
      content: 'The result is 6.',
      toolCalls: [],
      usage: {
        inputTokens: 8,
        outputTokens: 5,
      },
    }
  },
}

const main = async () => {
  const calculatorTool: ToolDefinition<{ expression: string }, { value: number }> = {
    id: 'calculator',
    description: 'Calculate simple arithmetic expression',
    inputSchema: z.object({ expression: z.string() }),
    execute: async ({ expression }) => {
      // MVP example only: use Function for compact arithmetic demo.
      const value = Function(`return (${expression})`)() as number
      return { value }
    },
  }

  const harness = await new HarnessBuilder()
    .llm(mockProvider)
    .trace(new ConsoleTraceExporter())
    .guard(PromptInjectionGuard)
    .tool(calculatorTool)
    .build()

  harness.task('research', async (ctx) => {
    const result = await ctx.runLoop(`Compute: ${String(ctx.input)}`)
    await ctx.memory.save('last_result', result.output)
    return {
      output: result.output,
      tools: result.toolsInvoked,
    }
  })

  const output = await harness.runTask('research', '1+2+3')
  console.log('\nFinal output:', output)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
