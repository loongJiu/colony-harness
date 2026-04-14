import {
  ModelProviderError,
  type LLMProvider,
  type LLMProviderInfo,
  type ModelRequest,
  type ModelResponse,
  isModelProviderError,
  isAbortError,
  mapStatusToErrorShape,
  parseRetryAfterMs,
  sanitizeEndpoint,
} from 'colony-harness'

export interface AnthropicProviderOptions {
  apiKey: string
  model: string
  baseUrl?: string
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
  anthropicVersion?: string
  headers?: Record<string, string>
}

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

const normalizeStopReason = (reason: string | null | undefined): ModelResponse['stopReason'] => {
  if (!reason || reason === 'end_turn' || reason === 'stop_sequence') return 'completed'
  if (reason === 'tool_use') return 'tool_calls'
  if (reason === 'max_tokens') return 'max_tokens'
  return 'unknown'
}

const splitSystem = (messages: ModelRequest['messages']): {
  system: string
  conversation: AnthropicMessage[]
} => {
  const systemParts: string[] = []
  const conversation: AnthropicMessage[] = []

  for (const message of messages) {
    if (message.role === 'system') {
      systemParts.push(message.content)
      continue
    }

    if (message.role === 'tool') {
      conversation.push({
        role: 'assistant',
        content: `[tool:${message.toolName ?? 'tool'}] ${message.content}`,
      })
      continue
    }

    conversation.push({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content,
    })
  }

  return {
    system: systemParts.join('\n\n'),
    conversation,
  }
}

export class AnthropicProvider implements LLMProvider {
  private readonly endpoint: string

  constructor(private readonly options: AnthropicProviderOptions) {
    this.endpoint = `${options.baseUrl ?? 'https://api.anthropic.com'}/v1/messages`
  }

  getInfo(): LLMProviderInfo {
    return {
      provider: 'anthropic',
      model: this.options.model,
      endpoint: this.endpoint,
    }
  }

  async call(request: ModelRequest): Promise<ModelResponse> {
    const controller = new AbortController()
    const onParentAbort = () => {
      if (!controller.signal.aborted) {
        controller.abort(request.signal!.reason)
      }
    }
    if (request.signal?.aborted) {
      controller.abort(request.signal.reason)
    } else if (request.signal) {
      request.signal.addEventListener('abort', onParentAbort, { once: true })
    }

    const timer = setTimeout(
      () => controller.abort(new Error(`Anthropic request timed out after ${this.options.timeoutMs ?? 30_000}ms`)),
      this.options.timeoutMs ?? 30_000,
    )

    try {
      const { system, conversation } = splitSystem(request.messages)

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.options.apiKey,
          'anthropic-version': this.options.anthropicVersion ?? '2023-06-01',
          ...this.options.headers,
        },
        body: JSON.stringify({
          model: this.options.model,
          system,
          messages: conversation,
          max_tokens: request.maxTokens ?? this.options.maxTokens ?? 1024,
          temperature: request.temperature ?? this.options.temperature,
          tools: request.tools?.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters,
          })),
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const body = await response.text()
        const shape = mapStatusToErrorShape(response.status)
        const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'))
        let requestId =
          response.headers.get('request-id') ??
          response.headers.get('anthropic-request-id') ??
          undefined

        if (!requestId) {
          try {
            const parsed = JSON.parse(body) as { request_id?: string; error?: { request_id?: string } }
            requestId = parsed.request_id ?? parsed.error?.request_id
          } catch {
            // Ignore malformed error body.
          }
        }

        throw new ModelProviderError(
          `Anthropic request failed with status ${response.status}`,
          {
            provider: 'anthropic',
            model: this.options.model,
            endpoint: this.endpoint,
            requestId,
            statusCode: response.status,
            retryable: shape.retryable,
            transient: shape.transient,
            retryAfterMs,
            kind: shape.kind,
          },
        )
      }

      const data = (await response.json()) as {
        content?: Array<
          | { type: 'text'; text: string }
          | { type: 'tool_use'; id: string; name: string; input: unknown }
        >
        stop_reason?: string | null
        usage?: {
          input_tokens?: number
          output_tokens?: number
        }
      }

      const text = (data.content ?? [])
        .filter((item): item is { type: 'text'; text: string } => item.type === 'text')
        .map((item) => item.text)
        .join('\n')

      const toolCalls = (data.content ?? [])
        .filter(
          (item): item is { type: 'tool_use'; id: string; name: string; input: unknown } =>
            item.type === 'tool_use',
        )
        .map((item) => ({
          id: item.id,
          name: item.name,
          input: item.input,
        }))

      return {
        content: text,
        stopReason: normalizeStopReason(data.stop_reason),
        toolCalls,
        usage: {
          inputTokens: data.usage?.input_tokens ?? 0,
          outputTokens: data.usage?.output_tokens ?? 0,
        },
      }
    } catch (error) {
      if (isModelProviderError(error)) {
        throw error
      }

      if (isAbortError(error) && request.signal?.aborted && isModelProviderError(request.signal.reason)) {
        throw request.signal.reason
      }

      if (isAbortError(error)) {
        if (request.signal?.aborted) {
          throw new ModelProviderError('Anthropic request aborted', {
            provider: 'anthropic',
            model: this.options.model,
            endpoint: this.endpoint,
            retryable: false,
            transient: false,
            kind: 'aborted',
          })
        }

        throw new ModelProviderError('Anthropic request timed out', {
          provider: 'anthropic',
          model: this.options.model,
          endpoint: this.endpoint,
          retryable: true,
          transient: true,
          kind: 'timeout',
          statusCode: 408,
        })
      }

      throw new ModelProviderError(
        `Anthropic network error: ${error instanceof Error ? error.message : String(error)}`,
        {
          provider: 'anthropic',
          model: this.options.model,
          endpoint: this.endpoint,
          retryable: true,
          transient: true,
          kind: 'network',
        },
        { cause: error },
      )
    } finally {
      clearTimeout(timer)
      request.signal?.removeEventListener('abort', onParentAbort)
    }
  }
}
