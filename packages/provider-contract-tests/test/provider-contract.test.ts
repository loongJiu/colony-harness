import { afterEach, describe, expect, it } from 'vitest'
import { ModelProviderError, type ModelRequest } from 'colony-harness'
import { OpenAIProvider } from '@colony-harness/llm-openai'
import { AnthropicProvider } from '@colony-harness/llm-anthropic'
import { GeminiProvider } from '@colony-harness/llm-gemini'

const originalFetch = globalThis.fetch

const createResponse = (payload: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(payload)
    },
    async json() {
      return payload
    },
  } as Response)

const requestWithTools: ModelRequest = {
  messages: [
    { role: 'system', content: 'system-message' },
    { role: 'user', content: 'find weather' },
  ],
  tools: [
    {
      name: 'search_weather',
      description: 'search weather by city',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string' },
        },
        required: ['city'],
      },
    },
  ],
}

const requestTextOnly: ModelRequest = {
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Say hello' },
  ],
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('provider contract matrix — tool-calling response', () => {
  it('normalizes OpenAI tool-calling response', async () => {
    let requestBody: Record<string, unknown> = {}
    globalThis.fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body ?? '{}'))
      return createResponse({
        usage: {
          prompt_tokens: 12,
          completion_tokens: 4,
        },
        choices: [
          {
            finish_reason: 'tool_calls',
            message: {
              content: 'calling tool',
              tool_calls: [
                {
                  id: 'tool-1',
                  function: {
                    name: 'search_weather',
                    arguments: JSON.stringify({ city: 'Hangzhou' }),
                  },
                },
              ],
            },
          },
        ],
      })
    }

    const provider = new OpenAIProvider({
      apiKey: 'test',
      model: 'gpt-test',
      baseUrl: 'https://mock.openai.local',
    })

    const response = await provider.call(requestWithTools)
    expect(requestBody.model).toBe('gpt-test')
    expect(response.content).toBe('calling tool')
    expect(response.toolCalls?.[0]?.name).toBe('search_weather')
    expect(response.toolCalls?.[0]?.input).toEqual({ city: 'Hangzhou' })
    expect(response.stopReason).toBe('tool_calls')
    expect(response.usage).toEqual({ inputTokens: 12, outputTokens: 4 })
  })

  it('normalizes Anthropic tool-calling response', async () => {
    let requestBody: Record<string, unknown> = {}
    globalThis.fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body ?? '{}'))
      return createResponse({
        usage: {
          input_tokens: 20,
          output_tokens: 6,
        },
        stop_reason: 'tool_use',
        content: [
          { type: 'text', text: 'running tool' },
          {
            type: 'tool_use',
            id: 'tool-2',
            name: 'search_weather',
            input: { city: 'Shanghai' },
          },
        ],
      })
    }

    const provider = new AnthropicProvider({
      apiKey: 'test',
      model: 'claude-test',
      baseUrl: 'https://mock.anthropic.local',
    })

    const response = await provider.call(requestWithTools)
    expect(requestBody.model).toBe('claude-test')
    expect(response.content).toBe('running tool')
    expect(response.toolCalls?.[0]?.name).toBe('search_weather')
    expect(response.toolCalls?.[0]?.input).toEqual({ city: 'Shanghai' })
    expect(response.stopReason).toBe('tool_calls')
    expect(response.usage).toEqual({ inputTokens: 20, outputTokens: 6 })
  })

  it('normalizes Gemini tool-calling response', async () => {
    let requestBody: Record<string, unknown> = {}
    globalThis.fetch = async (_input, init) => {
      requestBody = JSON.parse(String(init?.body ?? '{}'))
      return createResponse({
        usageMetadata: {
          promptTokenCount: 15,
          candidatesTokenCount: 5,
        },
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                { text: 'tool selected' },
                {
                  functionCall: {
                    name: 'search_weather',
                    args: { city: 'Beijing' },
                  },
                },
              ],
            },
          },
        ],
      })
    }

    const provider = new GeminiProvider({
      apiKey: 'test',
      model: 'gemini-test',
      baseUrl: 'https://mock.gemini.local',
    })

    const response = await provider.call(requestWithTools)
    expect(requestBody.generationConfig).toBeDefined()
    expect(response.content).toBe('tool selected')
    expect(response.toolCalls?.[0]?.name).toBe('search_weather')
    expect(response.toolCalls?.[0]?.input).toEqual({ city: 'Beijing' })
    expect(response.stopReason).toBe('completed')
    expect(response.usage).toEqual({ inputTokens: 15, outputTokens: 5 })
  })
})

describe('provider contract matrix — text-only response', () => {
  it('normalizes OpenAI text-only response', async () => {
    globalThis.fetch = async () =>
      createResponse({
        usage: { prompt_tokens: 8, completion_tokens: 3 },
        choices: [
          {
            finish_reason: 'stop',
            message: { content: 'Hello! How can I help you?' },
          },
        ],
      })

    const provider = new OpenAIProvider({
      apiKey: 'test',
      model: 'gpt-test',
      baseUrl: 'https://mock.openai.local',
    })

    const response = await provider.call(requestTextOnly)
    expect(response.content).toBe('Hello! How can I help you?')
    expect(response.toolCalls ?? []).toHaveLength(0)
    expect(response.stopReason).toBe('completed')
    expect(response.usage).toEqual({ inputTokens: 8, outputTokens: 3 })
  })

  it('normalizes Anthropic text-only response', async () => {
    globalThis.fetch = async () =>
      createResponse({
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hello! Nice to meet you.' }],
      })

    const provider = new AnthropicProvider({
      apiKey: 'test',
      model: 'claude-test',
      baseUrl: 'https://mock.anthropic.local',
    })

    const response = await provider.call(requestTextOnly)
    expect(response.content).toBe('Hello! Nice to meet you.')
    expect(response.toolCalls ?? []).toHaveLength(0)
    expect(response.stopReason).toBe('completed')
    expect(response.usage).toEqual({ inputTokens: 10, outputTokens: 5 })
  })

  it('normalizes Gemini text-only response', async () => {
    globalThis.fetch = async () =>
      createResponse({
        usageMetadata: { promptTokenCount: 6, candidatesTokenCount: 4 },
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [{ text: 'Hello! What can I do for you?' }],
            },
          },
        ],
      })

    const provider = new GeminiProvider({
      apiKey: 'test',
      model: 'gemini-test',
      baseUrl: 'https://mock.gemini.local',
    })

    const response = await provider.call(requestTextOnly)
    expect(response.content).toBe('Hello! What can I do for you?')
    expect(response.toolCalls ?? []).toHaveLength(0)
    expect(response.stopReason).toBe('completed')
    expect(response.usage).toEqual({ inputTokens: 6, outputTokens: 4 })
  })
})

describe('provider contract matrix — stop reason mapping', () => {
  it('maps OpenAI length to max_tokens', async () => {
    globalThis.fetch = async () =>
      createResponse({
        usage: { prompt_tokens: 5, completion_tokens: 2 },
        choices: [
          {
            finish_reason: 'length',
            message: { content: 'The answer is...' },
          },
        ],
      })

    const provider = new OpenAIProvider({
      apiKey: 'test',
      model: 'gpt-test',
      baseUrl: 'https://mock.openai.local',
    })

    const response = await provider.call(requestTextOnly)
    expect(response.stopReason).toBe('max_tokens')
  })

  it('maps Anthropic max_tokens to max_tokens', async () => {
    globalThis.fetch = async () =>
      createResponse({
        usage: { input_tokens: 5, output_tokens: 2 },
        stop_reason: 'max_tokens',
        content: [{ type: 'text', text: 'The answer is...' }],
      })

    const provider = new AnthropicProvider({
      apiKey: 'test',
      model: 'claude-test',
      baseUrl: 'https://mock.anthropic.local',
    })

    const response = await provider.call(requestTextOnly)
    expect(response.stopReason).toBe('max_tokens')
  })

  it('maps Gemini MAX_TOKENS to max_tokens', async () => {
    globalThis.fetch = async () =>
      createResponse({
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 },
        candidates: [
          {
            finishReason: 'MAX_TOKENS',
            content: { parts: [{ text: 'The answer is...' }] },
          },
        ],
      })

    const provider = new GeminiProvider({
      apiKey: 'test',
      model: 'gemini-test',
      baseUrl: 'https://mock.gemini.local',
    })

    const response = await provider.call(requestTextOnly)
    expect(response.stopReason).toBe('max_tokens')
  })

  it('maps Gemini SAFETY to unknown', async () => {
    globalThis.fetch = async () =>
      createResponse({
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 },
        candidates: [
          {
            finishReason: 'SAFETY',
            content: { parts: [{ text: '' }] },
          },
        ],
      })

    const provider = new GeminiProvider({
      apiKey: 'test',
      model: 'gemini-test',
      baseUrl: 'https://mock.gemini.local',
    })

    const response = await provider.call(requestTextOnly)
    expect(response.stopReason).toBe('unknown')
  })
})

describe('provider contract matrix — multiple tool calls', () => {
  it('normalizes OpenAI multiple tool calls', async () => {
    globalThis.fetch = async () =>
      createResponse({
        usage: { prompt_tokens: 15, completion_tokens: 8 },
        choices: [
          {
            finish_reason: 'tool_calls',
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call-1',
                  function: {
                    name: 'search_weather',
                    arguments: JSON.stringify({ city: 'Tokyo' }),
                  },
                },
                {
                  id: 'call-2',
                  function: {
                    name: 'search_weather',
                    arguments: JSON.stringify({ city: 'Osaka' }),
                  },
                },
              ],
            },
          },
        ],
      })

    const provider = new OpenAIProvider({
      apiKey: 'test',
      model: 'gpt-test',
      baseUrl: 'https://mock.openai.local',
    })

    const response = await provider.call(requestWithTools)
    expect(response.toolCalls).toHaveLength(2)
    expect(response.toolCalls?.[0]?.name).toBe('search_weather')
    expect(response.toolCalls?.[0]?.input).toEqual({ city: 'Tokyo' })
    expect(response.toolCalls?.[1]?.name).toBe('search_weather')
    expect(response.toolCalls?.[1]?.input).toEqual({ city: 'Osaka' })
    expect(response.stopReason).toBe('tool_calls')
  })

  it('normalizes Anthropic empty content with tool use', async () => {
    globalThis.fetch = async () =>
      createResponse({
        usage: { input_tokens: 12, output_tokens: 5 },
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool-3',
            name: 'search_weather',
            input: { city: 'Seoul' },
          },
        ],
      })

    const provider = new AnthropicProvider({
      apiKey: 'test',
      model: 'claude-test',
      baseUrl: 'https://mock.anthropic.local',
    })

    const response = await provider.call(requestWithTools)
    expect(response.content).toBe('')
    expect(response.toolCalls).toHaveLength(1)
    expect(response.toolCalls?.[0]?.name).toBe('search_weather')
    expect(response.toolCalls?.[0]?.input).toEqual({ city: 'Seoul' })
    expect(response.stopReason).toBe('tool_calls')
  })

  it('normalizes Gemini multiple tool calls with synthetic IDs', async () => {
    globalThis.fetch = async () =>
      createResponse({
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 6 },
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'search_weather',
                    args: { city: 'London' },
                  },
                },
                {
                  functionCall: {
                    name: 'search_weather',
                    args: { city: 'Paris' },
                  },
                },
              ],
            },
          },
        ],
      })

    const provider = new GeminiProvider({
      apiKey: 'test',
      model: 'gemini-test',
      baseUrl: 'https://mock.gemini.local',
    })

    const response = await provider.call(requestWithTools)
    expect(response.toolCalls).toHaveLength(2)
    expect(response.toolCalls?.[0]?.name).toBe('search_weather')
    expect(response.toolCalls?.[0]?.input).toEqual({ city: 'London' })
    // Synthetic IDs should follow the gemini_tool_N pattern
    expect(response.toolCalls?.[0]?.id).toMatch(/^gemini_tool_\d+$/)
    expect(response.toolCalls?.[1]?.name).toBe('search_weather')
    expect(response.toolCalls?.[1]?.input).toEqual({ city: 'Paris' })
    expect(response.toolCalls?.[1]?.id).toMatch(/^gemini_tool_\d+$/)
  })
})

describe('provider contract matrix — structured error model', () => {
  it('maps OpenAI 429 into retryable ModelProviderError with retry-after', async () => {
    globalThis.fetch = async () =>
      ({
        ok: false,
        status: 429,
        headers: {
          get(name: string) {
            if (name.toLowerCase() === 'retry-after') return '2'
            if (name.toLowerCase() === 'x-request-id') return 'req_openai_1'
            return null
          },
        },
        async text() {
          return JSON.stringify({ error: { message: 'rate limited' } })
        },
      } as Response)

    const provider = new OpenAIProvider({
      apiKey: 'test',
      model: 'gpt-test',
      baseUrl: 'https://mock.openai.local',
    })

    await expect(provider.call(requestTextOnly)).rejects.toMatchObject({
      name: 'ModelProviderError',
      details: {
        statusCode: 429,
        kind: 'rate_limit',
        retryable: true,
        transient: true,
        requestId: 'req_openai_1',
        retryAfterMs: 2000,
      },
    } satisfies Partial<ModelProviderError>)
  })

  it('maps Anthropic 401 into non-retryable auth error', async () => {
    globalThis.fetch = async () =>
      ({
        ok: false,
        status: 401,
        headers: {
          get(name: string) {
            if (name.toLowerCase() === 'request-id') return 'req_anthropic_1'
            return null
          },
        },
        async text() {
          return JSON.stringify({ error: { message: 'unauthorized' } })
        },
      } as Response)

    const provider = new AnthropicProvider({
      apiKey: 'test',
      model: 'claude-test',
      baseUrl: 'https://mock.anthropic.local',
    })

    await expect(provider.call(requestTextOnly)).rejects.toMatchObject({
      name: 'ModelProviderError',
      details: {
        statusCode: 401,
        kind: 'auth_error',
        retryable: false,
        transient: false,
        requestId: 'req_anthropic_1',
      },
    } satisfies Partial<ModelProviderError>)
  })

  it('maps Gemini 503 into retryable server error', async () => {
    globalThis.fetch = async () =>
      ({
        ok: false,
        status: 503,
        headers: {
          get() {
            return null
          },
        },
        async text() {
          return JSON.stringify({ error: { message: 'service unavailable' } })
        },
      } as Response)

    const provider = new GeminiProvider({
      apiKey: 'test',
      model: 'gemini-test',
      baseUrl: 'https://mock.gemini.local',
    })

    await expect(provider.call(requestTextOnly)).rejects.toMatchObject({
      name: 'ModelProviderError',
      details: {
        statusCode: 503,
        kind: 'server_error',
        retryable: true,
        transient: true,
      },
    } satisfies Partial<ModelProviderError>)
  })
})
