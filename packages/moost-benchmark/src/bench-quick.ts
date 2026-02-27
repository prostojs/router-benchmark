/**
 * Quick Moost-only benchmark — screen output only, no file writes.
 *
 * Usage:  tsx src/bench-quick.ts [duration]
 *   duration: seconds per test (default: 0.2)
 */
import { spawn } from 'node:child_process'
import { tests } from './routes.js'

const duration = parseFloat(process.argv[2]) || 0.2

interface TestResult {
  testName: string
  requestsPerSec: number
  latencyAvg: number
  total: number
  errors: number
  errorRate: number
}

interface BenchmarkResult {
  name: string
  results: TestResult[]
}

function runWorker(dur: number): Promise<BenchmarkResult> {
  return new Promise((resolve, reject) => {
    const workerPath = new URL('./bench-one.ts', import.meta.url).pathname
    const child = spawn('tsx', [workerPath, 'moost', String(dur)], {
      cwd: new URL('..', import.meta.url).pathname,
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    let stdout = ''
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`Worker exited with code ${code}`))
      const line = stdout.split('\n').find((l) => l.startsWith('RESULT:'))
      if (!line) return reject(new Error('No RESULT line from worker'))
      resolve(JSON.parse(line.slice('RESULT:'.length)))
    })
  })
}

async function main() {
  console.log(`Moost quick bench (${duration}s per test)\n`)
  const { results } = await runWorker(duration)

  let weightedSum = 0
  let totalWeight = 0
  for (const r of results) {
    const test = tests.find((t) => t.name === r.testName)
    const w = test?.weight ?? 1
    weightedSum += w * r.requestsPerSec
    totalWeight += w
  }
  const avg = Math.round(weightedSum / totalWeight)
  console.log(`\n\navg req/s: ${avg.toLocaleString()}\n`)

  const table: Record<string, { 'req/s': number; 'latency ms': number; errors: string }> = {}
  for (const r of results) {
    table[r.testName] = {
      'req/s': Math.round(r.requestsPerSec),
      'latency ms': r.latencyAvg,
      errors: r.errorRate > 0.001 ? `${(r.errorRate * 100).toFixed(1)}%` : '-',
    }
  }
  console.table(table)
}

main().catch(console.error)
