import {
  OpenAIProvider,
  type OpenAIProviderOptions,
} from '@colony-harness/llm-openai'

export interface OpenAICompatibleProviderOptions
  extends Omit<OpenAIProviderOptions, 'baseUrl'> {
  baseUrl: string
}

export class OpenAICompatibleProvider extends OpenAIProvider {
  constructor(options: OpenAICompatibleProviderOptions) {
    super({
      ...options,
      baseUrl: options.baseUrl,
    })
  }
}

export const createOpenAICompatibleProviderFromEnv = (
  defaults: Partial<OpenAICompatibleProviderOptions> = {},
): OpenAICompatibleProvider => {
  const apiKey = defaults.apiKey ?? process.env.OPENAI_API_KEY ?? process.env.OPENAI_COMPAT_API_KEY
  const model = defaults.model ?? process.env.OPENAI_MODEL ?? process.env.OPENAI_COMPAT_MODEL
  const baseUrl =
    defaults.baseUrl ?? process.env.OPENAI_BASE_URL ?? process.env.OPENAI_COMPAT_BASE_URL

  if (!apiKey) {
    throw new Error('Missing API key. Set OPENAI_API_KEY or OPENAI_COMPAT_API_KEY.')
  }

  if (!model) {
    throw new Error('Missing model. Set OPENAI_MODEL or OPENAI_COMPAT_MODEL.')
  }

  if (!baseUrl) {
    throw new Error('Missing baseUrl. Set OPENAI_BASE_URL or OPENAI_COMPAT_BASE_URL.')
  }

  return new OpenAICompatibleProvider({
    apiKey,
    model,
    baseUrl,
    headers: defaults.headers,
    timeoutMs: defaults.timeoutMs,
    temperature: defaults.temperature,
  })
}
