import { estimateTokens } from '../utils/tokens.js'
import type { Guard } from './types.js'

export const PromptInjectionGuard: Guard = {
  name: 'prompt_injection',
  checkInput: async (input) => {
    const patterns = [
      /ignore (all |previous )?instructions/i,
      /forget (everything|all) (you|i) (said|told)/i,
      /system:\s*you are now/i,
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
      .replace(/1[3-9]\d{9}/g, '[PHONE]')
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
      .replace(/\b\d{17}[\dXx]\b/g, '[ID_CARD]'),
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
