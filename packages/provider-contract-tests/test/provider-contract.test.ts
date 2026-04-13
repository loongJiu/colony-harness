import { afterEach, describe, expect, it } from 'vitest'
import type { ModelRequest } from 'colony-harness'
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

const request: ModelRequest = {
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

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('provider contract matrix', () => {
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

    const response = await provider.call(request)
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

    const response = await provider.call(request)
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

    const response = await provider.call(request)
    expect(requestBody.generationConfig).toBeDefined()
    expect(response.content).toBe('tool selected')
    expect(response.toolCalls?.[0]?.name).toBe('search_weather')
    expect(response.toolCalls?.[0]?.input).toEqual({ city: 'Beijing' })
    expect(response.stopReason).toBe('completed')
    expect(response.usage).toEqual({ inputTokens: 15, outputTokens: 5 })
  })
})
