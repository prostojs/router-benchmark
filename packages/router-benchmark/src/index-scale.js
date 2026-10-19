// Router scaling benchmark: lookup throughput vs registered route count (22 → 200), 3 route shapes.
// Usage: node src/index-scale.js [--quick] [--rounds n] [--warmup ms] [--samples n] [--sample-ms ms] [--only a,b]
import { VARIANTS } from './workloads.js'
import { parseRouterArgs, selectRouters, preflightAndPlan, runJobs, reportContext } from './runner.js'
import { writeResultFiles, generateLineChart, environmentMarkdown, fmtInt } from 'bench-utils'

const routeCounts = [22, 50, 100, 200]

// Hono's SmartRouter switches from RegExpRouter to TrieRouter when the route set
// cannot be compiled into one regex — drawn as one continued series.
const honoChartConfig = {
  colors: {
    'Hono (RegExpRouter)': '#bb8fce',
    'Hono (TrieRouter)': '#7d3c98',
  },
  series: {
    'Hono (TrieRouter)': { continuesFrom: 'Hono (RegExpRouter)' },
  },
}

const pkgDir = new URL('..', import.meta.url).pathname
const opts = parseRouterArgs()
const routerKeys = selectRouters(opts)

const jobs = []
for (const variant of Object.keys(VARIANTS)) {
  for (const count of routeCounts) jobs.push({ id: `${variant}:${count}`, variant, count, perTest: false })
}

preflightAndPlan(routerKeys, jobs, opts)
const agg = await runJobs(routerKeys, jobs, opts)

// results[variant][routerName][routeCount] = op/ms ; spread[variant][routerName][routeCount] = [min, max]
const results = {}
const spread = {}
for (const job of jobs) {
  for (const [, r] of Object.entries(agg[job.id])) {
    const t = r.tests['All together']
    ;((results[job.variant] ??= {})[r.name] ??= {})[r.routeCount] = Math.round(t.median)
    ;((spread[job.variant] ??= {})[r.name] ??= {})[r.routeCount] = [Math.round(t.roundMin), Math.round(t.roundMax)]
  }
}

for (const variant of Object.keys(VARIANTS)) {
  console.log(`\n## Scaling — ${VARIANTS[variant].label} (op/ms)\n`)
  const counts = countsOf(results[variant])
  console.table(Object.fromEntries(Object.entries(results[variant]).map(([n, v]) => [n, Object.fromEntries(counts.map((c) => [`${c} routes`, v[c] ?? '-']))])))
  drawChart(results[variant])
}

writeAll()

function countsOf(res) {
  return [...new Set(Object.values(res).flatMap((v) => Object.keys(v).map(Number)))].sort((a, b) => a - b)
}

function writeAll() {
  const { env, versions, settings, jsonSettings } = reportContext(opts, { 'Route counts': routeCounts.join(', ') })

  function makeTable(res) {
    const names = Object.keys(res)
    const counts = countsOf(res)
    let t = `| Router | ${counts.map((c) => c + ' routes').join(' | ')} | first → last |\n`
    t += `|--------|${counts.map(() => '---:').join('|')}|---:|\n`
    for (const name of names) {
      const vals = counts.map((c) => res[name][c])
      const present = vals.filter(Boolean)
      const ratio = present.length >= 2 ? (present[0] / present[present.length - 1]).toFixed(1) + 'x' : '-'
      t += `| ${name} | ${vals.map((v) => (v == null ? '-' : fmtInt(v))).join(' | ')} | ${ratio} |\n`
    }
    return t
  }

  let md = `# Router Scaling Benchmark\n\n`
  if (opts.quick) md += `> **QUICK MODE — smoke test only, numbers are not meaningful.**\n\n`
  md += `Lookup throughput (route match + param extraction, op/ms) as the number of registered routes grows. `
  md += `All routers are verified to return identical matches/params before measuring. Generated ${env.date}.\n\n---\n\n`

  const svgCharts = {}
  for (const variant of Object.keys(VARIANTS)) {
    const v = VARIANTS[variant]
    const file = `results-scale-${variant}-chart.svg`
    svgCharts[file] = generateLineChart(results[variant], countsOf(results[variant]), {
      title: `${v.label} — op/ms vs Route Count`,
      xLabel: 'Routes registered',
      yLabel: 'op/ms',
      ...honoChartConfig,
    })
    md += `## ${v.label}\n\n${v.description}\n\n![${v.label}](results/${file})\n\n`
    md += makeTable(results[variant]) + `\n---\n\n`
  }
  md += environmentMarkdown(env, versions, settings)

  writeResultFiles(pkgDir, {
    quick: opts.quick || !!opts.only,
    environment: env,
    versions,
    settings: { ...jsonSettings, routeCounts },
    variants: results,
    roundSpread: spread,
  }, md, { prefix: 'scale', resultsDir: 'results', svgCharts })
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
