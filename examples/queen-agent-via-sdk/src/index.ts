import { HarnessBuilder } from 'colony-harness'
import { BeeSDKControlPlaneAdapter, InMemoryBeeAgentStub } from '@colony-harness/controlplane-sdk-adapter'
import { HarnessControlPlaneRuntime } from '@colony-harness/controlplane-runtime'

const mockProvider = {
  async call(request: {
    messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>
  }) {
    const lastMessage = request.messages[request.messages.length - 1]
    return {
      content: `processed: ${lastMessage?.content ?? ''}`,
      toolCalls: [],
      usage: {
        inputTokens: 4,
        outputTokens: 2,
      },
    }
  },
}

const main = async () => {
  const harness = await new HarnessBuilder().llm(mockProvider).build()
  harness.task('research', async (ctx) => {
    return {
      echo: ctx.input,
      taskId: ctx.taskId,
    }
  })

  // In real deployment, replace stub with a real BeeAgent from colony-bee-sdk.
  const beeAgent = new InMemoryBeeAgentStub()
  const adapter = new BeeSDKControlPlaneAdapter({
    queenUrl: 'http://queen.local',
    colonyToken: 'demo-token',
    capabilities: ['research'],
    beeAgent,
  })

  const runtime = new HarnessControlPlaneRuntime({
    harness,
    controlPlane: adapter,
  })

  await runtime.start()
  const result = await beeAgent.dispatchTask({
    taskId: 'demo-task-1',
    capability: 'research',
    input: {
      query: 'How to decouple harness from controlplane SDK?',
    },
  })

  console.log('Result from queen-agent-via-sdk example:')
  console.log(result)

  await runtime.stop()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
