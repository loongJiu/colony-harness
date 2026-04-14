import { ModelCircuitOpenError } from '../errors/index.js'
import type { AgenticLoopConfig } from '../loop/types.js'
import {
  ModelProviderError,
  type ModelCaller,
  type ModelRequest,
  type ModelResponse,
  isModelProviderError,
} from '../types/model.js'
import { isAbortError } from '../utils/provider-errors.js'

interface CircuitState {
  state: 'closed' | 'open' | 'half_open'
  failureCount: number
  openUntil?: number
  halfOpenProbeInFlight: boolean
}

interface CircuitLease {
  state: CircuitState
  hasHalfOpenProbe: boolean
}

interface ClassifiedModelError {
  error: Error
  retryable: boolean
  retryAfterMs?: number
  circuitTripEligible: boolean
}

const MAX_CIRCUIT_ENTRIES = 256

const circuitRegistry = new Map<string, CircuitState>()

const evictCircuitEntries = (): void => {
  if (circuitRegistry.size <= MAX_CIRCUIT_ENTRIES) return
  const now = Date.now()
  for (const [key, state] of circuitRegistry) {
    if (state.state === 'closed' && state.failureCount === 0) {
      circuitRegistry.delete(key)
      if (circuitRegistry.size <= MAX_CIRCUIT_ENTRIES) return
    }
    if (state.state === 'open' && (state.openUntil ?? 0) <= now) {
      circuitRegistry.delete(key)
      if (circuitRegistry.size <= MAX_CIRCUIT_ENTRIES) return
    }
  }
}

const sleep = async (ms: number, signal?: AbortSignal): Promise<void> => {
  if (ms <= 0) return
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error('Operation aborted')
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      reject(signal?.reason instanceof Error ? signal.reason : new Error('Operation aborted'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export class ResilientModelCaller {
  constructor(
    private readonly config: AgenticLoopConfig,
    private readonly routeKey: string,
  ) {}

  static resetCircuit(routeKey?: string): void {
    if (routeKey) {
      circuitRegistry.delete(routeKey)
    } else {
      circuitRegistry.clear()
    }
  }

  async call(modelCaller: ModelCaller, request: ModelRequest): Promise<ModelResponse> {
    const strategy = this.config.modelFailStrategy ?? 'abort'
    const retryMax = Math.max(0, this.config.modelRetryMax ?? 0)
    const baseDelayMs = Math.max(0, this.config.modelRetryBaseDelayMs ?? 0)
    const maxDelayMs = Math.max(baseDelayMs, this.config.modelRetryMaxDelayMs ?? 0)
    const jitterRatio = this.clamp(this.config.modelRetryJitterRatio ?? 0, 0, 1)
    const maxTotalDelayMs = Math.max(0, this.config.modelRetryMaxTotalDelayMs ?? 0)

    let attempt = 0
    let totalDelayMs = 0

    while (true) {
      if (request.signal?.aborted) {
        throw this.abortReason(request.signal)
      }

      const lease = this.acquireCircuitLease(this.routeKey)
      const attemptController = this.createAttemptAbortController(request.signal, this.config.callTimeout)

      try {
        const response = await modelCaller({
          ...request,
          signal: attemptController.signal,
        })
        this.onCallSuccess(lease)
        return response
      } catch (rawError) {
        const resolvedError = this.resolveAbortReason(rawError, attemptController.signal)
        const classified = this.classifyError(resolvedError, request.signal)
        this.onCallFailure(lease, classified)

        const canRetry =
          strategy === 'retry' &&
          classified.retryable &&
          attempt < retryMax

        if (!canRetry) {
          throw classified.error
        }

        const delayByBackoff = this.computeRetryDelayMs(attempt, baseDelayMs, maxDelayMs, jitterRatio)
        const delayByServerHint = classified.retryAfterMs ?? 0
        const delayMs = Math.max(delayByBackoff, delayByServerHint)

        if (totalDelayMs + delayMs > maxTotalDelayMs) {
          throw classified.error
        }

        totalDelayMs += delayMs
        attempt += 1
        await sleep(delayMs, request.signal)
      } finally {
        attemptController.cleanup()
        this.releaseHalfOpenProbe(lease)
      }
    }
  }

  private createAttemptAbortController(parentSignal: AbortSignal | undefined, timeoutMs: number): {
    signal: AbortSignal
    cleanup: () => void
  } {
    const controller = new AbortController()
    const onParentAbort = () => controller.abort(this.abortReason(parentSignal))

    if (parentSignal?.aborted) {
      controller.abort(this.abortReason(parentSignal))
    } else if (parentSignal) {
      parentSignal.addEventListener('abort', onParentAbort, { once: true })
    }

    const timer = setTimeout(() => {
      controller.abort(
        new ModelProviderError(`Model call timed out after ${timeoutMs}ms`, {
          kind: 'timeout',
          retryable: true,
          transient: true,
          statusCode: 408,
        }),
      )
    }, timeoutMs)

    return {
      signal: controller.signal,
      cleanup: () => {
        clearTimeout(timer)
        parentSignal?.removeEventListener('abort', onParentAbort)
      },
    }
  }

  private resolveAbortReason(error: unknown, signal: AbortSignal): unknown {
    if (!isAbortError(error)) {
      return error
    }
    if (signal.aborted && signal.reason) {
      return signal.reason
    }
    return error
  }

  private classifyError(error: unknown, signal?: AbortSignal): ClassifiedModelError {
    if (signal?.aborted) {
      return {
        error: this.abortReason(signal),
        retryable: false,
        circuitTripEligible: false,
      }
    }

    if (isModelProviderError(error)) {
      const details = error.details
      return {
        error,
        retryable: details.retryable,
        retryAfterMs: details.retryAfterMs,
        circuitTripEligible: details.transient,
      }
    }

    if (isAbortError(error)) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error('Model call aborted'),
        retryable: false,
        circuitTripEligible: false,
      }
    }

    const message = error instanceof Error ? error.message : String(error ?? '')
    const normalized = message.toLowerCase()

    const retryableByMessage =
      normalized.includes('timed out') ||
      normalized.includes('timeout') ||
      normalized.includes('fetch failed') ||
      normalized.includes('networkerror') ||
      normalized.includes('econnreset') ||
      normalized.includes('econnrefused') ||
      normalized.includes('etimedout') ||
      normalized.includes('eai_again') ||
      normalized.includes('socket hang up')

    const statusCode = this.extractStatusCode(message)
    const retryableByStatus =
      statusCode !== undefined &&
      (statusCode >= 500 || statusCode === 408 || statusCode === 409 || statusCode === 425 || statusCode === 429)

    const retryable = retryableByMessage || retryableByStatus
    return {
      error: error instanceof Error ? error : new Error(message),
      retryable,
      circuitTripEligible: retryable,
    }
  }

  private acquireCircuitLease(routeKey: string): CircuitLease {
    if (!this.config.modelCircuitBreakerEnabled) {
      return {
        state: {
          state: 'closed',
          failureCount: 0,
          halfOpenProbeInFlight: false,
        },
        hasHalfOpenProbe: false,
      }
    }

    const now = Date.now()
    const state = circuitRegistry.get(routeKey) ?? {
      state: 'closed' as const,
      failureCount: 0,
      halfOpenProbeInFlight: false,
    }
    circuitRegistry.set(routeKey, state)
    evictCircuitEntries()

    if (state.state === 'open') {
      if ((state.openUntil ?? 0) > now) {
        throw new ModelCircuitOpenError(routeKey, new Date(state.openUntil ?? now))
      }
      state.state = 'half_open'
      state.halfOpenProbeInFlight = false
      state.failureCount = 0
    }

    if (state.state === 'half_open') {
      if (state.halfOpenProbeInFlight) {
        throw new ModelCircuitOpenError(routeKey, new Date(state.openUntil ?? now))
      }
      state.halfOpenProbeInFlight = true
      return { state, hasHalfOpenProbe: true }
    }

    return { state, hasHalfOpenProbe: false }
  }

  private releaseHalfOpenProbe(lease: CircuitLease): void {
    if (!this.config.modelCircuitBreakerEnabled) return
    if (!lease.hasHalfOpenProbe) return
    lease.state.halfOpenProbeInFlight = false
  }

  private onCallSuccess(lease: CircuitLease): void {
    if (!this.config.modelCircuitBreakerEnabled) return
    lease.state.state = 'closed'
    lease.state.failureCount = 0
    lease.state.openUntil = undefined
  }

  private onCallFailure(lease: CircuitLease, error: ClassifiedModelError): void {
    if (!this.config.modelCircuitBreakerEnabled) return
    if (!error.circuitTripEligible) return

    const threshold = Math.max(1, this.config.modelCircuitBreakerFailureThreshold ?? 1)

    if (lease.state.state === 'half_open') {
      this.openCircuit(lease.state)
      return
    }

    lease.state.failureCount += 1
    if (lease.state.failureCount >= threshold) {
      this.openCircuit(lease.state)
    }
  }

  private openCircuit(state: CircuitState): void {
    const cooldownMs = Math.max(1_000, this.config.modelCircuitBreakerCooldownMs ?? 30_000)
    state.state = 'open'
    state.failureCount = 0
    state.halfOpenProbeInFlight = false
    state.openUntil = Date.now() + cooldownMs
  }

  private computeRetryDelayMs(
    attemptIndex: number,
    baseDelayMs: number,
    maxDelayMs: number,
    jitterRatio: number,
  ): number {
    const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attemptIndex)
    if (delay <= 0 || jitterRatio <= 0) return delay
    const jitterSpan = delay * jitterRatio
    const min = Math.max(0, delay - jitterSpan)
    const max = delay + jitterSpan
    return Math.round(min + Math.random() * (max - min))
  }

  private extractStatusCode(message: string): number | undefined {
    const patterns = [
      /\bstatus\s*[=:]\s*([1-5]\d{2})\b/i,
      /\bHTTP\s+([1-5]\d{2})\b/i,
      /\((\d{3})\)/,
    ]
    for (const pattern of patterns) {
      const match = message.match(pattern)
      if (!match) continue
      const code = Number(match[1])
      if (Number.isInteger(code) && code >= 100 && code <= 599) return code
    }
    return undefined
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
  }

  private abortReason(signal?: AbortSignal): Error {
    return signal?.reason instanceof Error ? signal.reason : new Error('Operation aborted')
  }
}
