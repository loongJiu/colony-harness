import type { LLMProvider, ModelRequest, ModelResponse } from 'colony-harness'

export interface OpenAIProviderOptions {
  apiKey: string
  model: string
  baseUrl?: string
  temperature?: number
  timeoutMs?: number
  headers?: Record<string, string>
}

const normalizeContent = (content: unknown): string => {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
          return item.text
        }
        return ''
      })
      .join('\n')
      .trim()
  }
  return ''
}

const normalizeStopReason = (reason: string | null | undefined): ModelResponse['stopReason'] => {
  if (!reason || reason === 'stop') return 'completed'
  if (reason === 'tool_calls') return 'tool_calls'
  if (reason === 'length') return 'max_tokens'
  return 'unknown'
}

export class OpenAIProvider implements LLMProvider {
  private readonly endpoint: string

  constructor(private readonly options: OpenAIProviderOptions) {
    this.endpoint = `${options.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`
  }

  async call(request: ModelRequest): Promise<ModelResponse> {
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(new Error(`OpenAI request timed out after ${this.options.timeoutMs ?? 30_000}ms`)),
      this.options.timeoutMs ?? 30_000,
    )

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.options.apiKey}`,
          ...this.options.headers,
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: request.messages.map((message: ModelRequest['messages'][number]) => ({
            role: message.role,
            content: message.content,
            tool_call_id: message.toolCallId,
            name: message.toolName,
          })),
          tools: request.tools?.map((tool) => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
          })),
          temperature: request.temperature ?? this.options.temperature,
          max_tokens: request.maxTokens,
        }),
        signal: request.signal ?? controller.signal,
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`OpenAI request failed (${response.status}): ${body}`)
      }

      const data = (await response.json()) as {
        usage?: {
          prompt_tokens?: number
          completion_tokens?: number
        }
        choices?: Array<{
          finish_reason?: string | null
          message?: {
            content?: unknown
            tool_calls?: Array<{
              id: string
              function: {
                name: string
                arguments: string
              }
            }>
          }
        }>
      }

      const message = data.choices?.[0]?.message
      const content = normalizeContent(message?.content)
      const toolCalls = (message?.tool_calls ?? []).map((toolCall) => ({
        id: toolCall.id,
        name: toolCall.function.name,
        input: JSON.parse(toolCall.function.arguments || '{}'),
      }))

      return {
        content,
        stopReason: normalizeStopReason(data.choices?.[0]?.finish_reason),
        toolCalls,
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
      }
    } finally {
      clearTimeout(timer)
    }
  }
}
