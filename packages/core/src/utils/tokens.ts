export const estimateTokens = (content: string): number => {
  if (!content) return 0
  return Math.ceil(content.length / 4)
}

export const sumTokenLikeContent = (values: string[]): number =>
  values.reduce((acc, value) => acc + estimateTokens(value), 0)
