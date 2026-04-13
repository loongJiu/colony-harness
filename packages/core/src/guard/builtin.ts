import { estimateTokens } from '../utils/tokens.js'
import type { Guard, GuardContext } from './types.js'

export const PromptInjectionGuard: Guard = {
  name: 'prompt_injection',
  checkInput: async (input) => {
    const patterns = [
      /ignore (all |previous )?instructions/i,
      /forget (everything|all) (you|i) (said|told)/i,
      /system:\s*you are now/i,
      /developer\s+mode|jailbreak/i,
      /override\s+(policy|guard|rule)/i,
      /\[INST\].*\[\/INST\]/i,
    ]

    const matched = patterns.some((pattern) => pattern.test(input))
    return matched ? 'Potential prompt injection detected' : null
  },
}

export const PIIGuard: Guard = {
  name: 'pii_detector',
  checkOutput: async (output) =>
    output
      .replace(/\b\d{17}[\dXx]\b/g, '[ID_CARD]')
      .replace(/1[3-9]\d{9}/g, '[PHONE]')
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]'),
}

export const TokenLimitGuard = (maxTokens = 50_000): Guard => ({
  name: 'token_limit',
  checkInput: async (input) => {
    const tokens = estimateTokens(input)
    return tokens > maxTokens ? `Input too long: ${tokens} tokens (limit: ${maxTokens})` : null
  },
})

export const SensitiveWordGuard = (wordList: string[]): Guard => ({
  name: 'sensitive_words',
  checkInput: async (input) => {
    const found = wordList.find((word) => input.toLowerCase().includes(word.toLowerCase()))
    return found ? `Sensitive word detected: ${found}` : null
  },
})

export interface RateLimitGuardOptions {
  maxRequests: number
  windowMs: number
  keyResolver?: (ctx: GuardContext) => string
  now?: () => number
}

export const RateLimitGuard = (options: RateLimitGuardOptions): Guard => {
  const buckets = new Map<string, number[]>()
  const getNow = options.now ?? Date.now
  const keyResolver = options.keyResolver ?? ((ctx: GuardContext) => `${ctx.agentId}:${ctx.capability}`)

  return {
    name: 'rate_limit',
    checkInput: async (_input, ctx) => {
      const now = getNow()
      const key = keyResolver(ctx)
      const windowStart = now - options.windowMs
      const existing = buckets.get(key) ?? []
      const recent = existing.filter((timestamp) => timestamp >= windowStart)

      if (recent.length >= options.maxRequests) {
        return `Rate limit exceeded: ${options.maxRequests} requests / ${options.windowMs}ms`
      }

      recent.push(now)
      buckets.set(key, recent)

      return null
    },
  }
}
