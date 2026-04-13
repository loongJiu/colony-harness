import type { LoopMessage } from '../loop/types.js'
import type { ModelCaller } from '../types/model.js'
import { estimateTokens } from '../utils/tokens.js'

const defaultSummaryPrompt = (raw: string): string =>
  [
    '请将以下对话压缩为结构化摘要，保留事实、决策、约束、工具调用结果与未完成事项。',
    '输出要求：',
    '1) 使用简洁中文；2) 不要编造；3) 最后给出“当前状态”一行。',
    '',
    raw,
  ].join('\n')

const formatMessages = (messages: LoopMessage[]): string =>
  messages
    .map((message, index) => {
      const meta = message.toolName ? ` (${message.toolName})` : ''
      return `${index + 1}. [${message.role}${meta}] ${message.content}`
    })
    .join('\n')

export class ContextCompressor {
  constructor(
    private readonly options: {
      keepRecentRatio?: number
      summaryPromptBuilder?: (raw: string) => string
    } = {},
  ) {}

  async compress(
    messages: LoopMessage[],
    tokenLimit: number,
    modelCaller: ModelCaller,
  ): Promise<LoopMessage[]> {
    const totalTokens = estimateTokens(messages.map((message) => message.content).join('\n'))
    if (totalTokens <= tokenLimit) {
      return messages
    }

    if (messages.length <= 3) {
      return messages
    }

    const systemMessages = messages.filter((message) => message.role === 'system')
    const nonSystemMessages = messages.filter((message) => message.role !== 'system')

    const keepRatio = this.options.keepRecentRatio ?? 0.35
    const keepCount = Math.max(2, Math.floor(nonSystemMessages.length * keepRatio))
    const head = nonSystemMessages.slice(0, Math.max(0, nonSystemMessages.length - keepCount))
    const tail = nonSystemMessages.slice(-keepCount)

    const summary = await this.generateSummary(head, modelCaller)

    const baselineSystem = systemMessages[0] ?? {
      role: 'system' as const,
      content: 'You are a helpful AI agent.',
    }

    const compactMessages: LoopMessage[] = [
      baselineSystem,
      {
        role: 'system',
        content: `[Compressed Context]\n${summary}`,
      },
      ...tail,
    ]

    return compactMessages
  }

  private async generateSummary(messages: LoopMessage[], modelCaller: ModelCaller): Promise<string> {
    const raw = formatMessages(messages)
    const prompt = (this.options.summaryPromptBuilder ?? defaultSummaryPrompt)(raw)

    try {
      const response = await modelCaller({
        messages: [
          {
            role: 'system',
            content: 'You are a precise context summarizer.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      if (response.content?.trim()) {
        return response.content.trim()
      }
    } catch {
      // Ignore compressor model failure and fallback to deterministic summary.
    }

    const lines = messages
      .slice(-8)
      .map((message) => `[${message.role}] ${message.content.slice(0, 240)}`)
      .join('\n')

    return `摘要生成失败，回退到最近对话片段：\n${lines}`
  }
}
