import type { LLMProvider, ModelRequest, ModelResponse } from 'colony-harness'

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

export class GeminiProvider implements LLMProvider {
  private readonly endpoint: string

  constructor(private readonly options: GeminiProviderOptions) {
    const baseUrl = options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'
    this.endpoint = `${baseUrl}/models/${options.model}:generateContent?key=${options.apiKey}`
  }

  async call(request: ModelRequest): Promise<ModelResponse> {
    const controller = new AbortController()
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
        signal: request.signal ?? controller.signal,
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Gemini request failed (${response.status}): ${body}`)
      }

      const data = (await response.json()) as {
        candidates?: Array<{
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
        toolCalls,
        usage: {
          inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        },
      }
    } finally {
      clearTimeout(timer)
    }
  }
}
