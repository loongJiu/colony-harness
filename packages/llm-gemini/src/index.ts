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

export interface GeminiProviderOptions {
  apiKey: string
  model: string
  baseUrl?: string
  temperature?: number
  timeoutMs?: number
  headers?: Record<string, string>
}

const toGeminiMessages = (messages: ModelRequest['messages']) => {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
  const systemParts: string[] = []

  for (const message of messages) {
    if (message.role === 'system') {
      systemParts.push(message.content)
      continue
    }

    const role: 'user' | 'model' = message.role === 'user' ? 'user' : 'model'
    contents.push({
      role,
      parts: [{ text: message.content }],
    })
  }

  return {
    systemInstruction: systemParts.length
      ? {
          parts: [{ text: systemParts.join('\n\n') }],
        }
      : undefined,
    contents,
  }
}

const normalizeStopReason = (reason: string | null | undefined): ModelResponse['stopReason'] => {
  if (!reason || reason === 'STOP') return 'completed'
  if (reason === 'MAX_TOKENS') return 'max_tokens'
  if (reason === 'SAFETY' || reason === 'RECITATION' || reason === 'BLOCKLIST') return 'unknown'
  return 'unknown'
}

export class GeminiProvider implements LLMProvider {
  private readonly endpoint: string
  private readonly safeEndpoint: string

  constructor(private readonly options: GeminiProviderOptions) {
    const baseUrl = options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'
    this.endpoint = `${baseUrl}/models/${options.model}:generateContent?key=${options.apiKey}`
    this.safeEndpoint = `${baseUrl}/models/${options.model}:generateContent`
  }

  getInfo(): LLMProviderInfo {
    return {
      provider: 'gemini',
      model: this.options.model,
      endpoint: this.safeEndpoint,
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
      () => controller.abort(new Error(`Gemini request timed out after ${this.options.timeoutMs ?? 30_000}ms`)),
      this.options.timeoutMs ?? 30_000,
    )

    try {
      const mapped = toGeminiMessages(request.messages)

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
        },
        body: JSON.stringify({
          ...mapped,
          generationConfig: {
            temperature: request.temperature ?? this.options.temperature,
            maxOutputTokens: request.maxTokens,
          },
          tools: request.tools?.length
            ? [
                {
                  functionDeclarations: request.tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                  })),
                },
              ]
            : undefined,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const body = await response.text()
        const shape = mapStatusToErrorShape(response.status)
        const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'))
        let requestId =
          response.headers.get('x-request-id') ??
          response.headers.get('request-id') ??
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
          `Gemini request failed with status ${response.status}`,
          {
            provider: 'gemini',
            model: this.options.model,
            endpoint: this.safeEndpoint,
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
        candidates?: Array<{
          finishReason?: string
          content?: {
            parts?: Array<{
              text?: string
              functionCall?: {
                name: string
                args?: unknown
              }
            }>
          }
        }>
        usageMetadata?: {
          promptTokenCount?: number
          candidatesTokenCount?: number
        }
      }

      const parts = data.candidates?.[0]?.content?.parts ?? []

      const text = parts
        .filter((part): part is { text: string } => typeof part.text === 'string')
        .map((part) => part.text)
        .join('\n')

      const toolCalls = parts
        .filter(
          (part): part is { functionCall: { name: string; args?: unknown } } =>
            Boolean(part.functionCall?.name),
        )
        .map((part, index) => ({
          id: `gemini_tool_${index + 1}`,
          name: part.functionCall.name,
          input: part.functionCall.args ?? {},
        }))

      return {
        content: text,
        stopReason: normalizeStopReason(data.candidates?.[0]?.finishReason),
        toolCalls,
        usage: {
          inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
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
          throw new ModelProviderError('Gemini request aborted', {
            provider: 'gemini',
            model: this.options.model,
            endpoint: this.safeEndpoint,
            retryable: false,
            transient: false,
            kind: 'aborted',
          })
        }

        throw new ModelProviderError('Gemini request timed out', {
          provider: 'gemini',
          model: this.options.model,
          endpoint: this.safeEndpoint,
          retryable: true,
          transient: true,
          kind: 'timeout',
          statusCode: 408,
        })
      }

      throw new ModelProviderError(
        `Gemini network error: ${error instanceof Error ? error.message : String(error)}`,
        {
          provider: 'gemini',
          model: this.options.model,
          endpoint: this.safeEndpoint,
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
