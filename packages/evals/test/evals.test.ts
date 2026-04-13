import { describe, expect, it } from 'vitest'
import {
  containsScorer,
  evaluateGate,
  exactMatchScorer,
  latencyScorer,
  llmJudgeScorer,
  numericRangeScorer,
  regexScorer,
  runEvalSuite,
  safetyScorer,
  type EvalCase,
} from '../src/index.js'

describe('eval scorers', () => {
  it('exactMatchScorer matches deep objects with sorted keys', async () => {
    const score = await exactMatchScorer()({
      caseId: 'c1',
      input: {},
      output: { b: 2, a: 1 },
      expected: { a: 1, b: 2 },
    })

    expect(score.pass).toBe(true)
    expect(score.score).toBe(1)
  })

  it('containsScorer supports ignoreCase and all mode', async () => {
    const score = await containsScorer({ ignoreCase: true, mode: 'all' })({
      caseId: 'c2',
      input: 'x',
      output: 'Colony Harness is Production Ready',
      expected: ['colony', 'production'],
    })

    expect(score.pass).toBe(true)
    expect(score.score).toBe(1)
  })

  it('regexScorer validates output by regex', async () => {
    const score = await regexScorer()({
      caseId: 'c3',
      input: 'x',
      output: 'ticket-id:abc-123',
      expected: 'ticket-id:[a-z]+-\\d+',
    })

    expect(score.pass).toBe(true)
    expect(score.score).toBe(1)
  })

  it('numericRangeScorer accepts values in range', async () => {
    const score = await numericRangeScorer()({
      caseId: 'c4',
      input: {},
      output: 0.82,
      expected: {
        min: 0.8,
        max: 1,
      },
    })

    expect(score.pass).toBe(true)
    expect(score.score).toBe(1)
  })

  it('llmJudgeScorer uses pass threshold', async () => {
    const score = await llmJudgeScorer({
      judge: async () => ({ score: 0.82, reason: 'good quality' }),
      passThreshold: 0.8,
    })({
      caseId: 'judge-1',
      input: 'q',
      output: 'a',
      expected: 'a',
    })

    expect(score.pass).toBe(true)
    expect(score.score).toBe(0.82)
    expect(score.reason).toContain('good quality')
  })

  it('safetyScorer fails on blocked pattern', async () => {
    const score = await safetyScorer()({
      caseId: 'safe-1',
      input: 'q',
      output: 'My password is 123456',
      expected: null,
    })

    expect(score.pass).toBe(false)
    expect(score.score).toBeLessThan(1)
  })

  it('latencyScorer scores by durationMs', async () => {
    const score = await latencyScorer({ targetMs: 100, maxMs: 200 })({
      caseId: 'lat-1',
      input: 'q',
      output: 'a',
      expected: 'a',
      durationMs: 150,
    })

    expect(score.pass).toBe(true)
    expect(score.score).toBeCloseTo(0.5, 1)
  })
})

describe('runEvalSuite', () => {
  it('runs dataset and calculates summary', async () => {
    const cases: EvalCase<string, string>[] = [
      { id: '1', input: 'alpha', expected: 'ALPHA', weight: 2 },
      { id: '2', input: 'beta', expected: 'BETA', weight: 1 },
    ]

    const report = await runEvalSuite({
      cases,
      runner: async ({ input }) => input.toUpperCase(),
      scorer: exactMatchScorer(),
    })

    expect(report.summary.totalCases).toBe(2)
    expect(report.summary.passedCases).toBe(2)
    expect(report.summary.failedCases).toBe(0)
    expect(report.summary.averageScore).toBe(1)
    expect(report.summary.weightedAverageScore).toBe(1)
  })

  it('captures runner failures and continues by default', async () => {
    const cases: EvalCase<string, string>[] = [
      { id: '1', input: 'ok', expected: 'OK' },
      { id: '2', input: 'boom', expected: 'BOOM' },
      { id: '3', input: 'next', expected: 'NEXT' },
    ]

    const report = await runEvalSuite({
      cases,
      runner: async ({ input }) => {
        if (input === 'boom') {
          throw new Error('intentional')
        }
        return input.toUpperCase()
      },
      scorer: exactMatchScorer(),
    })

    expect(report.summary.totalCases).toBe(3)
    expect(report.summary.passedCases).toBe(2)
    expect(report.summary.failedCases).toBe(1)
    expect(report.results[1]?.error).toContain('intentional')
  })

  it('passes durationMs to scorer and supports eval gate thresholds', async () => {
    const cases: EvalCase<string, string>[] = [
      { id: '1', input: 'a', expected: 'A' },
      { id: '2', input: 'b', expected: 'B' },
    ]

    const report = await runEvalSuite({
      cases,
      runner: async ({ input }) => input.toUpperCase(),
      scorer: latencyScorer({ targetMs: 10, maxMs: 2_000 }),
    })

    const gate = evaluateGate({
      report,
      thresholds: {
        minPassRate: 0.5,
        minWeightedScore: 0.1,
        maxLatencyMs: 5_000,
      },
    })

    expect(report.results[0]?.metadata?.latencyMs).toBeTypeOf('number')
    expect(gate.pass).toBe(true)
    expect(gate.reasons).toHaveLength(0)
  })
})
