import { EventEmitter } from 'node:events'
EventEmitter.defaultMaxListeners = 0

import { runBenchmark } from './run-bench.js'
import { tests } from './routes.js'

import { createServer as createWooksServer } from './servers/wooks.js'
import { createServer as createHonoServer } from './servers/hono.js'

// Hardcoded baseline results from previous full benchmark run
const baselines = [
  {
    name: 'Express',
    results: [
      { testName: 'Short static',                    requestsPerSec: 62000 },
      { testName: 'Login (set-cookie)',               requestsPerSec: 47504 },
      { testName: 'Wildcard + cache',                 requestsPerSec: 56016 },
      { testName: 'Header-auth static',              requestsPerSec: 61488 },
      { testName: 'Header-auth param',               requestsPerSec: 61488 },
      { testName: 'Header-auth FAIL',                requestsPerSec: 62000 },
      { testName: 'Header-auth long static + cache', requestsPerSec: 59504 },
      { testName: 'Header-auth POST + body',         requestsPerSec: 48496 },
      { testName: 'Cookie-auth param+suffix',        requestsPerSec: 58480 },
      { testName: 'Cookie-auth two params',          requestsPerSec: 57488 },
      { testName: 'Cookie-auth FAIL',                requestsPerSec: 58000 },
      { testName: 'Cookie-auth four params',         requestsPerSec: 55984 },
      { testName: 'Cookie-auth POST + body',         requestsPerSec: 44496 },
      { testName: 'Cookie-auth PUT + body',          requestsPerSec: 45008 },
      { testName: 'Wildcard deep',                   requestsPerSec: 59504 },
      { testName: '404 short',                       requestsPerSec: 64496 },
      { testName: '404 deep',                        requestsPerSec: 65008 },
      { testName: 'POST + body + bad header-auth',   requestsPerSec: 48496 },
      { testName: 'POST + body + bad cookie-auth',   requestsPerSec: 45008 },
    ],
  },
  {
    name: 'Wooks (old)',
    results: [
      { testName: 'Short static',                    requestsPerSec: 43952 },
      { testName: 'Login (set-cookie)',               requestsPerSec: 28488 },
      { testName: 'Wildcard + cache',                 requestsPerSec: 42992 },
      { testName: 'Header-auth static',              requestsPerSec: 42992 },
      { testName: 'Header-auth param',               requestsPerSec: 43504 },
      { testName: 'Header-auth FAIL',                requestsPerSec: 33488 },
      { testName: 'Header-auth long static + cache', requestsPerSec: 42512 },
      { testName: 'Header-auth POST + body',         requestsPerSec: 30488 },
      { testName: 'Cookie-auth param+suffix',        requestsPerSec: 41488 },
      { testName: 'Cookie-auth two params',          requestsPerSec: 41488 },
      { testName: 'Cookie-auth FAIL',                requestsPerSec: 33008 },
      { testName: 'Cookie-auth four params',         requestsPerSec: 41488 },
      { testName: 'Cookie-auth POST + body',         requestsPerSec: 29496 },
      { testName: 'Cookie-auth PUT + body',          requestsPerSec: 29000 },
      { testName: 'Wildcard deep',                   requestsPerSec: 42992 },
      { testName: '404 short',                       requestsPerSec: 36496 },
      { testName: '404 deep',                        requestsPerSec: 36496 },
      { testName: 'POST + body + bad header-auth',   requestsPerSec: 30504 },
      { testName: 'POST + body + bad cookie-auth',   requestsPerSec: 29000 },
    ],
  },
  {
    name: 'Fastify',
    results: [
      { testName: 'Short static',                    requestsPerSec: 95584 },
      { testName: 'Login (set-cookie)',               requestsPerSec: 57488 },
      { testName: 'Wildcard + cache',                 requestsPerSec: 91488 },
      { testName: 'Header-auth static',              requestsPerSec: 95008 },
      { testName: 'Header-auth param',               requestsPerSec: 93024 },
      { testName: 'Header-auth FAIL',                requestsPerSec: 93984 },
      { testName: 'Header-auth long static + cache', requestsPerSec: 88032 },
      { testName: 'Header-auth POST + body',         requestsPerSec: 58992 },
      { testName: 'Cookie-auth param+suffix',        requestsPerSec: 92512 },
      { testName: 'Cookie-auth two params',          requestsPerSec: 90976 },
      { testName: 'Cookie-auth FAIL',                requestsPerSec: 93984 },
      { testName: 'Cookie-auth four params',         requestsPerSec: 91488 },
      { testName: 'Cookie-auth POST + body',         requestsPerSec: 57488 },
      { testName: 'Cookie-auth PUT + body',          requestsPerSec: 58000 },
      { testName: 'Wildcard deep',                   requestsPerSec: 92000 },
      { testName: '404 short',                       requestsPerSec: 92512 },
      { testName: '404 deep',                        requestsPerSec: 92000 },
      { testName: 'POST + body + bad header-auth',   requestsPerSec: 58992 },
      { testName: 'POST + body + bad cookie-auth',   requestsPerSec: 58992 },
    ],
  },
  {
    name: 'h3',
    results: [
      { testName: 'Short static',                    requestsPerSec: 88032 },
      { testName: 'Login (set-cookie)',               requestsPerSec: 71840 },
      { testName: 'Wildcard + cache',                 requestsPerSec: 81824 },
      { testName: 'Header-auth static',              requestsPerSec: 87712 },
      { testName: 'Header-auth param',               requestsPerSec: 84768 },
      { testName: 'Header-auth FAIL',                requestsPerSec: 85280 },
      { testName: 'Header-auth long static + cache', requestsPerSec: 84320 },
      { testName: 'Header-auth POST + body',         requestsPerSec: 74656 },
      { testName: 'Cookie-auth param+suffix',        requestsPerSec: 84704 },
      { testName: 'Cookie-auth two params',          requestsPerSec: 84704 },
      { testName: 'Cookie-auth FAIL',                requestsPerSec: 84832 },
      { testName: 'Cookie-auth four params',         requestsPerSec: 81248 },
      { testName: 'Cookie-auth POST + body',         requestsPerSec: 70112 },
      { testName: 'Cookie-auth PUT + body',          requestsPerSec: 70624 },
      { testName: 'Wildcard deep',                   requestsPerSec: 81312 },
      { testName: '404 short',                       requestsPerSec: 50992 },
      { testName: '404 deep',                        requestsPerSec: 49488 },
      { testName: 'POST + body + bad header-auth',   requestsPerSec: 78752 },
      { testName: 'POST + body + bad cookie-auth',   requestsPerSec: 76768 },
    ],
  },
]

const duration = parseInt(process.argv[2], 10) || 0.5

async function startServer(createServer) {
  const { server, close } = await createServer()
  const address = server.address()
  const port = typeof address === 'object' ? address.port : address
  const baseUrl = `http://localhost:${port}`

  // Warmup
  for (const test of tests) {
    try {
      await fetch(`${baseUrl}${test.path}`, {
        method: test.method,
        headers: test.headers,
        body: test.body,
      })
    } catch {}
  }

  return { baseUrl, close }
}

async function main() {
  console.log(`Running Wooks (dev) + Hono with duration=${duration}s per test\n`)

  const liveFrameworks = [
    { name: 'Wooks (dev)', createServer: createWooksServer },
    { name: 'Hono',        createServer: createHonoServer },
  ]

  const liveResults = []
  for (const fw of liveFrameworks) {
    const { baseUrl, close } = await startServer(fw.createServer)
    await new Promise((r) => setTimeout(r, 500))
    process.stdout.write(`Benchmarking ${fw.name}`)
    const result = await runBenchmark({
      baseUrl,
      name: fw.name,
      tests,
      duration,
      connections: 100,
      pipelining: 10,
    })
    await close()
    liveResults.push(result)
    console.log(' done')
  }

  const allResults = [...baselines, ...liveResults]

  // Build table
  const tableData = {}
  for (const test of tests) {
    tableData[test.name] = {}
    for (const fw of allResults) {
      const r = fw.results.find((r) => r.testName === test.name)
      tableData[test.name][`${fw.name} req/s`] = r ? Math.round(r.requestsPerSec) : 0
    }
  }

  console.log('\n## Wooks Dev Benchmark Results\n')
  console.table(tableData)

  // Summary
  const summary = allResults.map(fw => {
    const avg = Math.round(fw.results.reduce((sum, r) => sum + r.requestsPerSec, 0) / fw.results.length)
    return { name: fw.name, avg }
  }).sort((a, b) => b.avg - a.avg)

  printSummary(summary, 'req/s')
}

function printSummary(sorted, unit) {
  const fastest = sorted[0]
  console.log('\n## Summary\n')
  const summaryTable = {}
  for (const entry of sorted) {
    const ratio = fastest.avg / entry.avg
    summaryTable[entry.name] = {
      [`avg ${unit}`]: entry.avg,
      'speed': entry === fastest ? 'fastest' : `${ratio.toFixed(1)}x slower`,
    }
  }
  console.table(summaryTable)

  console.log('')
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const ratio = (sorted[i].avg / sorted[j].avg).toFixed(1)
      console.log(`  ${sorted[i].name} is ${ratio}x faster than ${sorted[j].name}`)
    }
  }
  console.log('')
}

main().catch(console.error)
