import autocannon from 'autocannon'

/**
 * Run autocannon against a list of test cases on an already-running server.
 *
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {string} opts.name
 * @param {import('./routes.js').tests} opts.tests
 * @param {number} [opts.duration=10]
 * @param {number} [opts.connections=100]
 * @param {number} [opts.pipelining=10]
 */
export async function runBenchmark({ baseUrl, name, tests, duration = 10, connections = 100, pipelining = 10 }) {
  const results = []

  for (const test of tests) {
    const opts = {
      url: `${baseUrl}${test.path}`,
      method: test.method,
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
    for (const code of expected) {
      expectedCount += result.statusCodeStats?.[String(code)]?.count || 0
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

    process.stdout.write('.')
  }

  return { name, results }
}
