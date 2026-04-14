import { afterEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ModelCircuitOpenError } from '../src/errors/index.js'
import { AgenticLoop } from '../src/loop/AgenticLoop.js'
import { ToolRegistry } from '../src/tools/ToolRegistry.js'
import { ModelProviderError, type ModelCaller } from '../src/types/model.js'
import { ResilientModelCaller } from '../src/resilience/ResilientModelCaller.js'

const mockTracer = {
  startSpan() {
    return {
      spanId: 'span',
      traceId: 'trace',
      name: 'span',
      startTime: Date.now(),
      attributes: {},
      events: [],
      status: 'ok' as const,
      end() {},
      error() {},
      addEvent() {},
    }
  },
}

describe('AgenticLoop', () => {
  afterEach(() => {
    ResilientModelCaller.resetCircuit()
  })

  const createRunOptions = (modelCaller: ModelCaller) => ({
    modelCaller,
    initialMessages: [
      { role: 'system' as const, content: 'You are assistant.' },
      { role: 'user' as const, content: 'say hi' },
    ],
    taskId: 'task-1',
    agentId: 'agent-1',
  })

  it('completes after tool invocation', async () => {
    const registry = new ToolRegistry()
    registry.register({
      id: 'echo',
      description: 'Echo text',
      inputSchema: z.object({ text: z.string() }),
      execute: async ({ text }) => ({ echoed: text }),
    })

    const responses = [
      {
        content: 'calling echo',
        toolCalls: [{ id: 'call_1', name: 'echo', input: { text: 'hello' } }],
        usage: { inputTokens: 10, outputTokens: 5 },
      },
      {
        content: 'done: hello',
        toolCalls: [],
        usage: { inputTokens: 8, outputTokens: 4 },
      },
    ]

    const modelCaller: ModelCaller = async () => responses.shift() ?? { content: 'fallback', toolCalls: [] }

    const loop = new AgenticLoop({ maxIterations: 3 }, registry, mockTracer)

    const result = await loop.run(createRunOptions(modelCaller))

    expect(result.stopReason).toBe('completed')
    expect(result.iterations).toBe(2)
    expect(result.toolsInvoked).toEqual(['echo'])
    expect(result.output).toContain('done')
  })

  it('retries model call on transient 5xx errors and succeeds', async () => {
    const registry = new ToolRegistry()
    let attempt = 0

    const modelCaller: ModelCaller = async () => {
      attempt += 1
      if (attempt < 3) {
        throw new Error('OpenAI request failed (502): bad gateway')
      }
      return {
        content: 'recovered',
        toolCalls: [],
        usage: { inputTokens: 1, outputTokens: 1 },
      }
    }

    const loop = new AgenticLoop(
      {
        maxIterations: 2,
        modelFailStrategy: 'retry',
        modelRetryMax: 2,
        modelRetryBaseDelayMs: 0,
        modelRetryMaxDelayMs: 0,
        modelRetryJitterRatio: 0,
      },
      registry,
      mockTracer,
    )

    const result = await loop.run(createRunOptions(modelCaller))
    expect(result.output).toBe('recovered')
    expect(attempt).toBe(3)
  })

  it('does not retry on non-retryable 4xx errors', async () => {
    const registry = new ToolRegistry()
    let attempt = 0

    const modelCaller: ModelCaller = async () => {
      attempt += 1
      throw new Error('OpenAI request failed (400): invalid_request_error')
    }

    const loop = new AgenticLoop(
      {
        maxIterations: 2,
        modelFailStrategy: 'retry',
        modelRetryMax: 3,
        modelRetryBaseDelayMs: 0,
        modelRetryMaxDelayMs: 0,
        modelRetryJitterRatio: 0,
      },
      registry,
      mockTracer,
    )

    await expect(loop.run(createRunOptions(modelCaller))).rejects.toThrow('400')
    expect(attempt).toBe(1)
  })

  it('retries on timeout-like model errors', async () => {
    const registry = new ToolRegistry()
    let attempt = 0

    const modelCaller: ModelCaller = async () => {
      attempt += 1
      if (attempt === 1) {
        throw new Error('Model call timed out after 30000ms')
      }
      return {
        content: 'after-timeout',
        toolCalls: [],
        usage: { inputTokens: 1, outputTokens: 1 },
      }
    }

    const loop = new AgenticLoop(
      {
        maxIterations: 2,
        modelFailStrategy: 'retry',
        modelRetryMax: 1,
        modelRetryBaseDelayMs: 0,
        modelRetryMaxDelayMs: 0,
        modelRetryJitterRatio: 0,
      },
      registry,
      mockTracer,
    )

    const result = await loop.run(createRunOptions(modelCaller))
    expect(result.output).toBe('after-timeout')
    expect(attempt).toBe(2)
  })

  it('opens circuit after repeated transient failures on the same route', async () => {
    const registry = new ToolRegistry()
    let attempt = 0

    const modelCaller: ModelCaller = async () => {
      attempt += 1
      throw new ModelProviderError('upstream unavailable', {
        kind: 'server_error',
        retryable: true,
        transient: true,
        statusCode: 503,
      })
    }

    const loopA = new AgenticLoop(
      {
        maxIterations: 1,
        modelFailStrategy: 'abort',
        modelCircuitBreakerEnabled: true,
        modelCircuitBreakerFailureThreshold: 1,
        modelCircuitBreakerCooldownMs: 60_000,
      },
      registry,
      mockTracer,
    )

    await expect(
      loopA.run({
        ...createRunOptions(modelCaller),
        modelRouteKey: 'test-circuit-route',
      }),
    ).rejects.toThrow('upstream unavailable')

    const loopB = new AgenticLoop(
      {
        maxIterations: 1,
        modelFailStrategy: 'abort',
        modelCircuitBreakerEnabled: true,
        modelCircuitBreakerFailureThreshold: 1,
        modelCircuitBreakerCooldownMs: 60_000,
      },
      registry,
      mockTracer,
    )

    await expect(
      loopB.run({
        ...createRunOptions(modelCaller),
        modelRouteKey: 'test-circuit-route',
      }),
    ).rejects.toBeInstanceOf(ModelCircuitOpenError)
    expect(attempt).toBe(1)
  })
})
