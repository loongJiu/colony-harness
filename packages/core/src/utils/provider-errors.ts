import type { ProviderErrorKind } from '../types/model.js'

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException
    ? error.name === 'AbortError'
    : Boolean(error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError')

export const parseRetryAfterMs = (value: string | null): number | undefined => {
  if (!value) return undefined
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric >= 0) {
    return Math.round(numeric * 1000)
  }
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return undefined
  const delta = parsed - Date.now()
  return delta > 0 ? delta : undefined
}

export const mapStatusToErrorShape = (statusCode: number): {
  kind: ProviderErrorKind
  retryable: boolean
  transient: boolean
} => {
  if (statusCode === 400) return { kind: 'invalid_request', retryable: false, transient: false }
  if (statusCode === 401 || statusCode === 403) return { kind: 'auth_error', retryable: false, transient: false }
  if (statusCode === 408) return { kind: 'timeout', retryable: true, transient: true }
  if (statusCode === 409 || statusCode === 425 || statusCode === 429) {
    return { kind: statusCode === 429 ? 'rate_limit' : 'client_error', retryable: true, transient: true }
  }
  if (statusCode >= 500) return { kind: 'server_error', retryable: true, transient: true }
  return { kind: 'client_error', retryable: false, transient: false }
}

export const sanitizeEndpoint = (endpoint: string): string => {
  try {
    const url = new URL(endpoint)
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return endpoint.replace(/[?#].*$/, '')
  }
}
