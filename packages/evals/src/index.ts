export interface EvalCase<TInput = unknown, TExpected = unknown, TContext = unknown> {
  id: string
  input: TInput
  expected: TExpected
  context?: TContext
  weight?: number
  tags?: string[]
}

export interface EvalScorerInput<
  TInput = unknown,
  TOutput = unknown,
  TExpected = unknown,
  TContext = unknown,
> {
  caseId: string
  input: TInput
  output: TOutput
  expected: TExpected
  context?: TContext
}

export interface EvalScore {
  score: number
  pass: boolean
  reason?: string
  metadata?: Record<string, unknown>
}

export type EvalScorer<TInput = unknown, TOutput = unknown, TExpected = unknown, TContext = unknown> = (
  input: EvalScorerInput<TInput, TOutput, TExpected, TContext>,
) => Promise<EvalScore> | EvalScore

export interface EvalRunnerInput<TInput = unknown, TContext = unknown> {
  input: TInput
  context?: TContext
  signal?: AbortSignal
}

export type EvalRunner<TInput = unknown, TOutput = unknown, TContext = unknown> = (
  input: EvalRunnerInput<TInput, TContext>,
) => Promise<TOutput> | TOutput

export interface EvalResult<TInput = unknown, TOutput = unknown, TExpected = unknown, TContext = unknown> {
  caseId: string
  input: TInput
  expected: TExpected
  output?: TOutput
  context?: TContext
  score: number
  pass: boolean
  reason?: string
  metadata?: Record<string, unknown>
  durationMs: number
  error?: string
  weight: number
  tags: string[]
}

export interface EvalSummary {
  totalCases: number
  passedCases: number
  failedCases: number
  passRate: number
  averageScore: number
  weightedAverageScore: number
  durationMs: number
}

export interface EvalRunReport<
  TInput = unknown,
  TOutput = unknown,
  TExpected = unknown,
  TContext = unknown,
> {
  results: Array<EvalResult<TInput, TOutput, TExpected, TContext>>
  summary: EvalSummary
}

export interface RunEvalSuiteOptions<
  TInput = unknown,
  TOutput = unknown,
  TExpected = unknown,
  TContext = unknown,
> {
  cases: Array<EvalCase<TInput, TExpected, TContext>>
  runner: EvalRunner<TInput, TOutput, TContext>
  scorer: EvalScorer<TInput, TOutput, TExpected, TContext>
  signal?: AbortSignal
  failFast?: boolean
}

const clampScore = (value: number): number => {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

const normalizeWeight = (weight: number | undefined): number => {
  if (weight === undefined) return 1
  if (Number.isNaN(weight) || !Number.isFinite(weight) || weight <= 0) return 1
  return weight
}

const normalizeTags = (tags: string[] | undefined): string[] => tags ?? []

export const runEvalSuite = async <
  TInput = unknown,
  TOutput = unknown,
  TExpected = unknown,
  TContext = unknown,
>(
  options: RunEvalSuiteOptions<TInput, TOutput, TExpected, TContext>,
): Promise<EvalRunReport<TInput, TOutput, TExpected, TContext>> => {
  const suiteStart = Date.now()
  const results: Array<EvalResult<TInput, TOutput, TExpected, TContext>> = []

  for (const evalCase of options.cases) {
    if (options.signal?.aborted) {
      throw new Error('Eval run aborted by signal')
    }

    const weight = normalizeWeight(evalCase.weight)
    const tags = normalizeTags(evalCase.tags)
    const caseStart = Date.now()

    try {
      const output = await options.runner({
        input: evalCase.input,
        context: evalCase.context,
        signal: options.signal,
      })

      const scored = await options.scorer({
        caseId: evalCase.id,
        input: evalCase.input,
        output,
        expected: evalCase.expected,
        context: evalCase.context,
      })

      const normalizedScore = clampScore(scored.score)
      results.push({
        caseId: evalCase.id,
        input: evalCase.input,
        expected: evalCase.expected,
        output,
        context: evalCase.context,
        score: normalizedScore,
        pass: scored.pass,
        reason: scored.reason,
        metadata: scored.metadata,
        durationMs: Date.now() - caseStart,
        weight,
        tags,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push({
        caseId: evalCase.id,
        input: evalCase.input,
        expected: evalCase.expected,
        context: evalCase.context,
        score: 0,
        pass: false,
        reason: 'Runner execution failed',
        durationMs: Date.now() - caseStart,
        error: message,
        weight,
        tags,
      })

      if (options.failFast) {
        break
      }
    }
  }

  const totalCases = results.length
  const passedCases = results.filter((result) => result.pass).length
  const failedCases = totalCases - passedCases
  const totalScore = results.reduce((sum, result) => sum + result.score, 0)
  const totalWeight = results.reduce((sum, result) => sum + result.weight, 0)
  const weightedTotal = results.reduce((sum, result) => sum + result.score * result.weight, 0)

  return {
    results,
    summary: {
      totalCases,
      passedCases,
      failedCases,
      passRate: totalCases === 0 ? 0 : passedCases / totalCases,
      averageScore: totalCases === 0 ? 0 : totalScore / totalCases,
      weightedAverageScore: totalWeight === 0 ? 0 : weightedTotal / totalWeight,
      durationMs: Date.now() - suiteStart,
    },
  }
}

const stableNormalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => stableNormalize(item))
  }

  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>
    return Object.keys(objectValue)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableNormalize(objectValue[key])
        return acc
      }, {})
  }

  return value
}

const stableStringify = (value: unknown): string => JSON.stringify(stableNormalize(value))

export const exactMatchScorer =
  <TInput = unknown, TOutput = unknown, TExpected = unknown, TContext = unknown>(
    options: { normalize?: (value: unknown) => unknown } = {},
  ): EvalScorer<TInput, TOutput, TExpected, TContext> =>
  ({ output, expected }) => {
    const normalize = options.normalize ?? ((value: unknown) => value)
    const normalizedOutput = normalize(output)
    const normalizedExpected = normalize(expected)
    const pass = stableStringify(normalizedOutput) === stableStringify(normalizedExpected)

    return {
      score: pass ? 1 : 0,
      pass,
      reason: pass ? 'Exact match' : 'Output differs from expected',
    }
  }

export const containsScorer =
  <TInput = unknown, TExpected = string | string[], TContext = unknown>(
    options: {
      ignoreCase?: boolean
      mode?: 'all' | 'any'
    } = {},
  ): EvalScorer<TInput, string, TExpected, TContext> =>
  ({ output, expected }) => {
    const phrases = Array.isArray(expected) ? expected : [expected]
    const mode = options.mode ?? 'all'

    const target = options.ignoreCase ? output.toLowerCase() : output
    const normalizedPhrases = options.ignoreCase
      ? phrases.map((phrase) => phrase.toLowerCase())
      : phrases

    const hitCount = normalizedPhrases.filter((phrase) => target.includes(phrase)).length
    const pass =
      mode === 'all' ? hitCount === normalizedPhrases.length : hitCount > 0
    const score = normalizedPhrases.length === 0 ? 0 : hitCount / normalizedPhrases.length

    return {
      score,
      pass,
      reason: `${hitCount}/${normalizedPhrases.length} phrases matched`,
      metadata: {
        matched: hitCount,
        total: normalizedPhrases.length,
        mode,
      },
    }
  }

export const regexScorer =
  <TInput = unknown, TExpected extends string | RegExp = string | RegExp, TContext = unknown>(
    options: { flags?: string } = {},
  ): EvalScorer<TInput, string, TExpected, TContext> =>
  ({ output, expected }) => {
    const pattern =
      expected instanceof RegExp
        ? expected
        : new RegExp(expected, options.flags)

    const pass = pattern.test(output)
    return {
      score: pass ? 1 : 0,
      pass,
      reason: pass ? 'Regex matched output' : 'Regex did not match output',
      metadata: {
        pattern: pattern.toString(),
      },
    }
  }

export const numericRangeScorer =
  <TInput = unknown, TExpected extends { min?: number; max?: number } = { min?: number; max?: number }, TContext = unknown>(): EvalScorer<
    TInput,
    number,
    TExpected,
    TContext
  > =>
  ({ output, expected }) => {
    const min = expected.min ?? Number.NEGATIVE_INFINITY
    const max = expected.max ?? Number.POSITIVE_INFINITY
    const pass = output >= min && output <= max

    return {
      score: pass ? 1 : 0,
      pass,
      reason: `Expected value in range [${min}, ${max}], got ${output}`,
      metadata: {
        min,
        max,
        value: output,
      },
    }
  }
