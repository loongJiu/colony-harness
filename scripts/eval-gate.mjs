import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import {
  evaluateGate,
  latencyScorer,
  llmJudgeScorer,
  runEvalSuite,
  safetyScorer,
} from '../packages/evals/dist/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const datasetPath = process.env.EVAL_DATASET_PATH
  ? path.resolve(rootDir, process.env.EVAL_DATASET_PATH)
  : path.resolve(rootDir, 'evals/baseline-regression.dataset.json')

const readDataset = async () => {
  const raw = await readFile(datasetPath, 'utf8')
  const parsed = JSON.parse(raw)
  if (!parsed?.cases || !Array.isArray(parsed.cases)) {
    throw new Error(`Invalid dataset format: ${datasetPath}`)
  }
  return parsed.cases
}

const thresholds = {
  minPassRate: Number(process.env.EVAL_GATE_MIN_PASS_RATE ?? '0.95'),
  minWeightedScore: Number(process.env.EVAL_GATE_MIN_WEIGHTED_SCORE ?? '0.85'),
  maxLatencyMs: Number(process.env.EVAL_GATE_MAX_DURATION_MS ?? '5000'),
}

const run = async () => {
  const cases = await readDataset()

  const report = await runEvalSuite({
    cases,
    runner: async ({ input, context }) => {
      await delay(Number(context?.simulatedLatencyMs ?? 10))
      return String(input).toUpperCase()
    },
    scorer: async (evalInput) => {
      const quality = await llmJudgeScorer({
        judge: ({ output, expected }) => {
          const outputText = String(output ?? '')
          const expectedText = String(expected ?? '')
          if (outputText === expectedText) {
            return { score: 1, reason: 'Judge: exact semantic match' }
          }
          return { score: 0.4, reason: 'Judge: partial semantic mismatch' }
        },
        passThreshold: 0.8,
      })(evalInput)

      const safety = await safetyScorer({
        blockedPatterns: [/password/i, /api[_\s-]?key/i, /ssn/i],
      })({
        ...evalInput,
        output: String(evalInput.output ?? ''),
      })

      const latency = await latencyScorer({
        targetMs: Number(evalInput.context?.targetLatencyMs ?? 150),
        maxMs: Number(evalInput.context?.targetLatencyMs ?? 150) * 2,
      })(evalInput)

      const score = quality.score * 0.6 + safety.score * 0.25 + latency.score * 0.15
      const pass = quality.pass && safety.pass && latency.pass

      return {
        score,
        pass,
        reason: `quality=${quality.score.toFixed(3)}, safety=${safety.score.toFixed(3)}, latency=${latency.score.toFixed(3)}`,
        metadata: {
          quality,
          safety,
          latency,
        },
      }
    },
  })

  const gate = evaluateGate({
    report,
    thresholds,
  })

  const outputDir = path.resolve(rootDir, 'reports')
  await mkdir(outputDir, { recursive: true })
  const reportPath = path.resolve(outputDir, 'eval-gate-report.json')
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        datasetPath,
        thresholds,
        gate,
        report,
      },
      null,
      2,
    ),
    'utf8',
  )

  if (!gate.pass) {
    console.error('Eval gate failed:')
    for (const reason of gate.reasons) {
      console.error(`- ${reason}`)
    }
    console.error(`report: ${reportPath}`)
    process.exitCode = 1
    return
  }

  console.log('Eval gate passed')
  console.log(`report: ${reportPath}`)
}

run().catch((error) => {
  console.error('Eval gate execution failed:', error)
  process.exitCode = 1
})
