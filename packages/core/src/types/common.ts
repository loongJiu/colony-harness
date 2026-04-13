export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[]

export interface TokenUsage {
  input: number
  output: number
}

export interface Logger {
  debug(message: string, meta?: unknown): void
  info(message: string, meta?: unknown): void
  warn(message: string, meta?: unknown): void
  error(message: string, meta?: unknown): void
}

export const createConsoleLogger = (): Logger => ({
  debug(message, meta) {
    console.debug(`[debug] ${message}`, meta ?? '')
  },
  info(message, meta) {
    console.info(`[info] ${message}`, meta ?? '')
  },
  warn(message, meta) {
    console.warn(`[warn] ${message}`, meta ?? '')
  },
  error(message, meta) {
    console.error(`[error] ${message}`, meta ?? '')
  },
})
