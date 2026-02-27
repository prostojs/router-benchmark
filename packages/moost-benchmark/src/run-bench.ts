import autocannon from 'autocannon'
import type { TestCase } from './routes.js'

interface BenchmarkOpts {
  baseUrl: string
  name: string
  tests: TestCase[]
  duration?: number
  connections?: number
  pipelining?: number
}

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

/**
 * Run autocannon against a list of test cases on an already-running server.
 */
export async function runBenchmark({
  baseUrl,
  name,
  tests,
  duration = 10,
  connections = 100,
  pipelining = 10,
}: BenchmarkOpts): Promise<BenchmarkResult> {
  const results: TestResult[] = []

  for (const test of tests) {
    const opts: autocannon.Options = {
      url: `${baseUrl}${test.path}`,
      method: test.method as autocannon.Options['method'],
      headers: test.headers,
      connections,
      pipelining,
      duration,
    }
    if (test.body) opts.body = test.body
    const result = await autocannon(opts)

    // Count unexpected responses
    const total = result.requests.total
    const expected = Array.isArray(test.expect) ? test.expect : [test.expect || 200]
    let expectedCount = 0
    const stats = (result as any).statusCodeStats
    for (const code of expected) {
      expectedCount += stats?.[String(code)]?.count || 0
    }
    const unexpectedCount = total - expectedCount

    results.push({
      testName: test.name,
      requestsPerSec: result.requests.average,
      latencyAvg: result.latency.average,
      total,
      errors: unexpectedCount,
      errorRate: total > 0 ? unexpectedCount / total : 0,
    })

    process.stderr.write('.')
  }

  return { name, results }
}
