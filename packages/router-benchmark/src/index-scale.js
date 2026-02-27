import { ExpressInterface } from "./routers/express.js";
import { FindMyWayInterface } from "./routers/find-my-way.js";
import { ProstoRouterInterface } from "./routers/prosto-router.js";
import { Rou3RouterInterface } from "./routers/rou3-router.js";
import { HonoRouterInterface } from "./routers/hono-router.js";
import { routes as baseRoutes } from "./routes.js";
import { tests as baseTests } from "./tests.js";
import { generateRoutes } from "./generate-routes.js";
import { generateShortRoutes, generateShortTests } from "./generate-short-routes.js";
import { generateMixedRoutes, generateMixedTests } from "./generate-mixed-routes.js";
import { now } from "./utils.js";
import { writeResultFiles, generateLineChart } from "bench-utils";

const operations = 500000

const routerClasses = [
  ExpressInterface,
  FindMyWayInterface,
  ProstoRouterInterface,
  Rou3RouterInterface,
  HonoRouterInterface,
]

const routeCounts = [22, 50, 100, 200]
const tries = 5

// Hono chart config — shared across all variants
const honoChartConfig = {
  colors: {
    'Hono (RegExpRouter)': '#bb8fce',
    'Hono (TrieRouter)': '#7d3c98',
  },
  series: {
    'Hono (TrieRouter)': { continuesFrom: 'Hono (RegExpRouter)' },
  },
}

main()

function main() {
  console.log('\n' + '█'.repeat(60))
  console.log('  VARIANT 1: Short routes (2-5 segments)')
  console.log('█'.repeat(60))
  const shortResults = runVariant('short')

  console.log('\n\n' + '█'.repeat(60))
  console.log('  VARIANT 2: Long routes (deep enterprise API)')
  console.log('█'.repeat(60))
  const longResults = runVariant('long')

  console.log('\n\n' + '█'.repeat(60))
  console.log('  VARIANT 3: Mixed routes (short + long)')
  console.log('█'.repeat(60))
  const mixedResults = runVariant('mixed')

  // Write combined results
  writeAllResults(shortResults, longResults, mixedResults)
}

function runVariant(variant) {
  // Same workload as basic bench "All together" test — stays constant for long routes
  const longWorkload = baseTests.find(t => t.name === 'All together')

  const results = {}

  for (const count of routeCounts) {
    let routes, workloadUrls

    if (variant === 'short') {
      routes = generateShortRoutes(count)
      workloadUrls = generateShortTests(routes)
    } else if (variant === 'mixed') {
      routes = generateMixedRoutes(count)
      workloadUrls = generateMixedTests(routes)
    } else {
      routes = count <= baseRoutes.length
        ? baseRoutes
        : generateRoutes(count, baseRoutes)
      workloadUrls = longWorkload.urls
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log(`  ${routes.length} routes registered`)
    console.log(`${'='.repeat(60)}`)

    for (const RouterClass of routerClasses) {
      const ri = new RouterClass()
      ri.init()
      ri.registerRoutes(routes)
      const name = ri.getName()

      if (!results[name]) results[name] = {}

      const urls = workloadUrls
      const values = []
      for (let t = 0; t < tries; t++) {
        const ops = Math.floor(operations / urls.length)
        let sink  // prevent dead-code elimination
        const start = now()
        for (let o = 0; o < ops; o++) {
          for (let k = 0; k < urls.length; k++) {
            sink = ri.lookup(...urls[k])
          }
        }
        void sink
        values.push(Math.round((ops * urls.length) / (now() - start)))
      }

      const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      results[name][routes.length] = avg
      console.log(`  ${name.padEnd(22)} ${String(avg).padStart(7)} op/ms`)
    }
  }

  // Summary table
  const names = Object.keys(results)
  const actualCounts = [...new Set(names.flatMap(n => Object.keys(results[n]).map(Number)))].sort((a, b) => a - b)

  console.log(`\n\n## Scaling Results — ${variant} routes (op/ms)\n`)
  const tableData = {}
  for (const name of names) {
    tableData[name] = {}
    for (const c of actualCounts) {
      tableData[name][`${c} routes`] = results[name][c] ?? '-'
    }
  }
  console.table(tableData)

  // ASCII chart
  console.log(`\n## Performance vs Route Count — ${variant}\n`)
  drawChart(results)

  return results
}

function writeAllResults(shortResults, longResults, mixedResults) {
  const pkgDir = new URL('..', import.meta.url).pathname

  // Build SVG charts
  function makeSvg(results, title) {
    const names = Object.keys(results)
    const counts = [...new Set(names.flatMap(n => Object.keys(results[n]).map(Number)))].sort((a, b) => a - b)
    return generateLineChart(results, counts, {
      title,
      xLabel: 'Routes registered',
      yLabel: 'op/ms',
      ...honoChartConfig,
    })
  }

  const shortSvg = makeSvg(shortResults, 'Short Routes (2–5 segments) — op/ms vs Route Count')
  const longSvg = makeSvg(longResults, 'Long Routes (deep enterprise API) — op/ms vs Route Count')
  const mixedSvg = makeSvg(mixedResults, 'Mixed Routes (short + long) — op/ms vs Route Count')

  // Build table for a variant
  function makeTable(results) {
    const names = Object.keys(results)
    const counts = [...new Set(names.flatMap(n => Object.keys(results[n]).map(Number)))].sort((a, b) => a - b)
    let t = `| Router | ${counts.map(c => c + ' routes').join(' | ')} | degradation |\n`
    t += `|--------|${counts.map(() => '---------').join('|')}|-------------|\n`
    for (const name of names) {
      const vals = counts.map(c => results[name][c])
      const present = vals.filter(Boolean)
      const ratio = present.length >= 2 ? (present[0] / present[present.length - 1]).toFixed(1) + 'x' : '-'
      t += `| ${name} | ${vals.map(v => v ?? '-').join(' | ')} | ${ratio} |\n`
    }
    return t
  }

  // Build observations for a variant
  function makeObservations(results) {
    const names = Object.keys(results)
    const counts = [...new Set(names.flatMap(n => Object.keys(results[n]).map(Number)))].sort((a, b) => a - b)
    let obs = ''
    for (const name of names) {
      const vals = counts.map(c => results[name][c]).filter(Boolean)
      if (vals.length >= 2) {
        const ratio = (vals[0] / vals[vals.length - 1]).toFixed(1)
        const trend = ratio > 1.5 ? 'degrades' : ratio > 1.1 ? 'slight decline' : 'stable'
        obs += `- **${name}**: ${vals[0]} → ${vals[vals.length - 1]} op/ms (${ratio}x, ${trend})\n`
      }
    }
    return obs
  }

  // Combined markdown
  let md = `# Router Scaling Benchmark\n\n`
  md += `Measures how router lookup performance changes as the number of registered routes grows.\n`
  md += `Three route-shape variants are tested to reveal different scaling characteristics.\n\n`
  md += `- **${operations.toLocaleString()}** operations per test, **${tries}** runs averaged\n`
  md += `- Route counts: ${routeCounts.join(', ')}\n`
  md += `- Generated: ${new Date().toISOString()}\n\n`
  md += `---\n\n`

  md += `## Short Routes (2–5 segments)\n\n`
  md += `Shallow paths like \`/users/:id\`, \`/posts/:id/comments\`, \`/orders/:id/items\`.\n`
  md += `Many distinct top-level prefixes, few path segments per route.\n\n`
  md += `![Short routes](results/results-scale-short-chart.svg)\n\n`
  md += makeTable(shortResults)
  md += `\n`
  md += makeObservations(shortResults)
  md += `\n---\n\n`

  md += `## Long Routes (deep enterprise API)\n\n`
  md += `Deep paths like \`/api/v1/organizations/:orgId/workspaces/:wsId/projects/:projectId\`.\n`
  md += `Shared \`/api/v1/\` prefix, many segments per route (5–10), realistic enterprise SaaS API.\n\n`
  md += `![Long routes](results/results-scale-long-chart.svg)\n\n`
  md += makeTable(longResults)
  md += `\n`
  md += makeObservations(longResults)
  md += `\n---\n\n`

  md += `## Mixed Routes (short + long)\n\n`
  md += `Half short (2–5 segments) + half long (deep enterprise API) routes.\n`
  md += `Exercises routers with both shallow many-prefix and deep shared-prefix routes in the same tree.\n\n`
  md += `![Mixed routes](results/results-scale-mixed-chart.svg)\n\n`
  md += makeTable(mixedResults)
  md += `\n`
  md += makeObservations(mixedResults)
  md += `\n---\n\n`

  md += `## Key Takeaways\n\n`
  md += `- **Short routes** have higher absolute throughput (shorter strings, fewer segments to match) `
  md += `but all routers degrade more steeply because the route set has many distinct prefixes competing in each bucket.\n`
  md += `- **Long routes** have lower absolute throughput but trie-based routers (Rou3, FindMyWay) `
  md += `stay nearly flat — the shared prefix structure plays to their strength.\n`
  md += `- **Mixed routes** sit between the two — routers must handle both patterns efficiently.\n`
  md += `- **Regex-alternation routers** (ProstoRouter, Hono RegExpRouter) degrade as route count grows `
  md += `because V8 tests regex alternatives sequentially — O(n) per bucket.\n`
  md += `- **Rou3** shows the best scaling profile: near-constant performance regardless of route count.\n`
  md += `- **FindMyWay** is also stable but at a lower absolute level due to its more complex trie implementation.\n`

  // Combined JSON
  const jsonData = {
    timestamp: new Date().toISOString(),
    operations,
    tries,
    routeCounts,
    variants: {
      short: shortResults,
      long: longResults,
      mixed: mixedResults,
    },
  }

  writeResultFiles(pkgDir, jsonData, md, {
    prefix: 'scale',
    resultsDir: 'results',
    svgCharts: {
      'results-scale-short-chart.svg': shortSvg,
      'results-scale-long-chart.svg': longSvg,
      'results-scale-mixed-chart.svg': mixedSvg,
    },
  })
}

function drawChart(results) {
  const chartWidth = 60
  const chartHeight = 18
  const names = Object.keys(results)
  const symbols = ['●', '■', '▲', '◆', '○', '◇', '▼', '★']
  const colors = ['\x1b[31m', '\x1b[34m', '\x1b[32m', '\x1b[33m', '\x1b[35m', '\x1b[36m', '\x1b[91m', '\x1b[94m']
  const reset = '\x1b[0m'

  // Collect all data points
  const allCounts = [...new Set(
    names.flatMap(n => Object.keys(results[n]).map(Number))
  )].sort((a, b) => a - b)

  const allValues = names.flatMap(n => Object.values(results[n]))
  const maxVal = Math.max(...allValues)

  // Y axis labels
  const yStep = maxVal / (chartHeight - 1)

  // Build grid
  const grid = Array.from({ length: chartHeight }, () =>
    Array(chartWidth).fill(' ')
  )

  // Plot each router
  for (let ri = 0; ri < names.length; ri++) {
    const data = results[names[ri]]
    const counts = Object.keys(data).map(Number).sort((a, b) => a - b)

    for (let i = 0; i < counts.length; i++) {
      const x = Math.round(((counts[i] - allCounts[0]) / (allCounts[allCounts.length - 1] - allCounts[0])) * (chartWidth - 1))
      const y = Math.round((data[counts[i]] / maxVal) * (chartHeight - 1))
      const row = chartHeight - 1 - y
      if (row >= 0 && row < chartHeight && x >= 0 && x < chartWidth) {
        grid[row][x] = symbols[ri % symbols.length]
      }

      // Draw lines between points
      if (i > 0) {
        const prevX = Math.round(((counts[i - 1] - allCounts[0]) / (allCounts[allCounts.length - 1] - allCounts[0])) * (chartWidth - 1))
        const prevY = Math.round((data[counts[i - 1]] / maxVal) * (chartHeight - 1))
        const steps = Math.max(Math.abs(x - prevX), 1)
        for (let s = 1; s < steps; s++) {
          const ix = Math.round(prevX + (x - prevX) * (s / steps))
          const iy = Math.round(prevY + (y - prevY) * (s / steps))
          const irow = chartHeight - 1 - iy
          if (irow >= 0 && irow < chartHeight && ix >= 0 && ix < chartWidth) {
            if (grid[irow][ix] === ' ') {
              grid[irow][ix] = '·'
            }
          }
        }
      }
    }
  }

  // Render
  const yLabelWidth = String(Math.round(maxVal)).length + 1
  for (let row = 0; row < chartHeight; row++) {
    const val = Math.round(maxVal - (row * yStep))
    const label = (row % 3 === 0) ? String(val).padStart(yLabelWidth) : ' '.repeat(yLabelWidth)
    let line = ''
    for (let col = 0; col < chartWidth; col++) {
      const ch = grid[row][col]
      const routerIdx = symbols.indexOf(ch)
      if (routerIdx >= 0) {
        line += colors[routerIdx] + ch + reset
      } else {
        line += ch
      }
    }
    const border = (row % 3 === 0) ? '┤' : '│'
    console.log(`${label} ${border}${line}`)
  }

  // X axis
  console.log(' '.repeat(yLabelWidth) + ' └' + '─'.repeat(chartWidth))
  const xLabels = allCounts.map(c => String(c))
  let xLine = ' '.repeat(yLabelWidth + 2)
  for (let i = 0; i < allCounts.length; i++) {
    const x = Math.round(((allCounts[i] - allCounts[0]) / (allCounts[allCounts.length - 1] - allCounts[0])) * (chartWidth - 1))
    while (xLine.length < yLabelWidth + 2 + x) xLine += ' '
    xLine += xLabels[i]
  }
  console.log(xLine + '  routes')

  // Legend
  console.log('')
  for (let i = 0; i < names.length; i++) {
    console.log(`  ${colors[i]}${symbols[i]}${reset} ${names[i]}`)
  }
  console.log('')
}
