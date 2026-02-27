import { EventEmitter } from 'node:events'
EventEmitter.defaultMaxListeners = 0

import { runBenchmark } from './run-bench.js'
import { tests } from './routes.js'
import { writeResultFiles, generateBarChart } from 'bench-utils'

import { createServer as createWooksServer } from './servers/wooks.js'
import { createServer as createExpressServer } from './servers/express.js'
import { createServer as createFastifyServer } from './servers/fastify.js'
import { createServer as createH3Server } from './servers/h3.js'
import { createServer as createHonoServer } from './servers/hono.js'

const frameworks = [
  { name: 'Express', createServer: createExpressServer },
  { name: 'Wooks',   createServer: createWooksServer },
  { name: 'Fastify', createServer: createFastifyServer },
  { name: 'h3',      createServer: createH3Server },
  { name: 'Hono',    createServer: createHonoServer },
]

const duration = parseInt(process.argv[2], 10) || 0.5

async function startServer(createServer) {
  const { server, close } = await createServer()
  const address = server.address()
  const port = typeof address === 'object' ? address.port : address
  const baseUrl = `http://localhost:${port}`

  // Warmup: hit each test route once so frameworks finish lazy init
  for (const test of tests) {
    try {
      await fetch(`${baseUrl}${test.path}`, {
        method: test.method,
        headers: test.headers,
        body: test.body,
      })
    } catch {}
  }

  return { server, baseUrl, close }
}

async function main() {
  console.log(`Running with duration=${duration}s per test\n`)
  const allResults = []

  for (const fw of frameworks) {
    const { baseUrl, close } = await startServer(fw.createServer)
    await new Promise((r) => setTimeout(r, 500)) // Short delay to ensure server is fully ready
    process.stdout.write(`\nBenchmarking ${fw.name}`)
    const result = await runBenchmark({
      baseUrl,
      name: fw.name,
      tests,
      duration,
      connections: 100,
      pipelining: 10,
    })
    await close()
    allResults.push(result)
    console.log(` done`)
  }

  // Build table: { testName: { 'Framework req/s': number, ... } }
  const tableData = {}
  for (const test of tests) {
    tableData[test.name] = {}
    for (const fw of allResults) {
      const r = fw.results.find((r) => r.testName === test.name)
      tableData[test.name][`${fw.name} req/s`] = r ? Math.round(r.requestsPerSec) : 0
      tableData[test.name][`${fw.name} err%`] = r ? r.errorRate : 0
    }
  }

  console.log('\n## Wooks Benchmark Results\n')
  console.table(tableData)

  // Summary: weighted average req/s across all tests per framework
  const summary = allResults.map(fw => {
    let weightedSum = 0
    let totalWeight = 0
    for (const r of fw.results) {
      const test = tests.find(t => t.name === r.testName)
      const w = test?.weight ?? 1
      weightedSum += w * r.requestsPerSec
      totalWeight += w
    }
    const avg = Math.round(weightedSum / totalWeight)
    const totalReqs = fw.results.reduce((sum, r) => sum + r.total, 0)
    const totalErrs = fw.results.reduce((sum, r) => sum + r.errors, 0)
    const errorRate = totalReqs > 0 ? totalErrs / totalReqs : 0
    return { name: fw.name, avg, errorRate }
  }).sort((a, b) => b.avg - a.avg)

  printSummary(summary, 'req/s')

  // Write result files
  writeResults(tableData, summary, allResults)
}

function writeResults(tableData, summary, allResults) {
  const pkgDir = new URL('..', import.meta.url).pathname
  const fastest = summary[0]

  // Bar chart
  const svgChart = generateBarChart(
    summary.map(s => ({ name: s.name, value: s.avg, errorRate: s.errorRate })),
    { title: `HTTP Framework Benchmark — avg req/s`, unit: 'req/s' },
  )

  // Markdown
  let md = `# HTTP Framework Benchmark Results\n\n`
  md += `Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon).\n\n`
  md += `- **${duration}s** per test, **100** connections, **10** pipelining\n`
  md += `- **${tests.length}** test cases covering auth, params, cookies, body parsing, wildcards, 404s\n`
  md += `- Generated: ${new Date().toISOString()}\n\n`

  md += `## Summary\n\n`
  md += `![Summary](results/results-chart.svg)\n\n`
  md += `| Framework | avg req/s | speed | errors |\n`
  md += `|-----------|----------|-------|--------|\n`
  for (const entry of summary) {
    const speed = entry === fastest ? 'fastest' : `${(fastest.avg / entry.avg).toFixed(1)}x slower`
    const errStr = entry.errorRate > 0.001 ? `${(entry.errorRate * 100).toFixed(1)}%` : '-'
    md += `| ${entry.name} | ${entry.avg.toLocaleString()} | ${speed} | ${errStr} |\n`
  }

  md += `\n## Per-Test Results\n\n`
  const fwNames = allResults.map(r => r.name)
  md += `| Test | ${fwNames.map(n => n + ' req/s').join(' | ')} |\n`
  md += `|------|${fwNames.map(() => '---------').join('|')}|\n`
  for (const [testName, row] of Object.entries(tableData)) {
    const vals = fwNames.map(n => {
      const rps = row[`${n} req/s`] ?? '-'
      const errRate = row[`${n} err%`] || 0
      const rpsStr = typeof rps === 'number' ? rps.toLocaleString() : rps
      if (errRate > 0.001) return `${rpsStr} (${(errRate * 100).toFixed(1)}% err)`
      return rpsStr
    })
    md += `| ${testName} | ${vals.join(' | ')} |\n`
  }
  md += '\n'

  // JSON
  const jsonData = {
    timestamp: new Date().toISOString(),
    duration,
    testCount: tests.length,
    perTest: tableData,
    summary: Object.fromEntries(summary.map(s => [s.name, s.avg])),
  }

  writeResultFiles(pkgDir, jsonData, md, {
    resultsDir: 'results',
    svgCharts: { 'results-chart.svg': svgChart },
  })
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
