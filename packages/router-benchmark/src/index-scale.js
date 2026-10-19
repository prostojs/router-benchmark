// Router scaling benchmark: lookup throughput vs registered route count (22 → 200), 3 route shapes.
// Usage: node src/index-scale.js [--quick] [--rounds n] [--warmup ms] [--samples n] [--sample-ms ms] [--only a,b]
import { VARIANTS } from './workloads.js'
import { parseRouterOptions, selectRouters, preflightAndPlan, runJobs, reportContext } from './runner.js'
import { writeResultFiles, generateLineChart, environmentMarkdown, mdTable, quickNotes, fmtInt } from 'bench-utils'

const routeCounts = [22, 50, 100, 200]

const pkgDir = new URL('..', import.meta.url).pathname
const opts = parseRouterOptions()
const routerKeys = selectRouters(opts)

const jobs = []
for (const variant of Object.keys(VARIANTS)) {
  for (const count of routeCounts) jobs.push({ id: `${variant}:${count}`, variant, count, perTest: false })
}

await preflightAndPlan(routerKeys, jobs, opts)
const agg = await runJobs(routerKeys, jobs, opts)

// series[variant][routerKey] = { name, points: { [routeCount]: { median, min, max, backend? } } }
// Keyed by router key: a router whose implementation changes with the route count (Hono's
// SmartRouter falls back from RegExpRouter to TrieRouter) stays one series, with the active
// backend recorded per point.
const series = {}
for (const job of jobs) {
  for (const [key, r] of Object.entries(agg[job.id])) {
    const t = r.tests['All together']
    const s = ((series[job.variant] ??= {})[key] ??= { name: r.name, points: {} })
    s.points[r.routeCount] = { median: Math.round(t.median), min: Math.round(t.roundMin), max: Math.round(t.roundMax), backend: r.backend }
  }
}

/** Sorted x values (route counts) of one series, or of all series of a variant. */
const xOf = (...seriesList) => [...new Set(seriesList.flatMap((s) => Object.keys(s.points).map(Number)))].sort((a, b) => a - b)
const cellText = (p) => (p == null ? '-' : p.backend ? `${fmtInt(p.median)} (${p.backend})` : fmtInt(p.median))

for (const variant of Object.keys(VARIANTS)) {
  console.log(`\n## Scaling — ${VARIANTS[variant].label} (op/ms)\n`)
  const all = Object.values(series[variant])
  const counts = xOf(...all)
  console.table(Object.fromEntries(all.map((s) => [s.name, Object.fromEntries(counts.map((c) => [`${c} routes`, cellText(s.points[c])]))])))
  drawChart(all, counts)
}

writeAll()

function writeAll() {
  const { env, versions, settings, jsonSettings } = reportContext(opts, { 'Route counts (target; tables show the actual count per shape)': routeCounts.join(', ') })

  function makeTable(all, counts) {
    return mdTable(
      ['Router', ...counts.map((c) => c + ' routes'), 'first → last'],
      all.map((s) => {
        const present = xOf(s).map((c) => s.points[c].median)
        const ratio = present.length >= 2 ? (present[0] / present[present.length - 1]).toFixed(1) + 'x' : '-'
        return [s.name, ...counts.map((c) => cellText(s.points[c])), ratio]
      }),
      'l' + 'r'.repeat(counts.length + 1),
    )
  }

  let md = `# Router Scaling Benchmark\n\n` + quickNotes(opts).md
  md += `Lookup throughput (route match + param extraction, op/ms) as the number of registered routes grows. `
  md += `All routers are verified to return identical matches/params before measuring. Generated ${env.date}.\n\n---\n\n`

  const svgCharts = {}
  for (const variant of Object.keys(VARIANTS)) {
    const v = VARIANTS[variant]
    const all = Object.values(series[variant])
    const counts = xOf(...all)
    const file = `results-scale-${variant}-chart.svg`
    svgCharts[file] = generateLineChart(
      all.map((s) => ({ name: s.name, points: Object.fromEntries(Object.entries(s.points).map(([c, p]) => [c, { value: p.median, label: p.backend }])) })),
      counts,
      { title: `${v.label} — op/ms vs Route Count`, xLabel: 'Routes registered', yLabel: 'op/ms' },
    )
    md += `## ${v.label}\n\n${v.description}\n\n![${v.label}](results/${file})\n\n`
    md += makeTable(all, counts) + `\n---\n\n`
  }
  md += environmentMarkdown(env, versions, settings)

  writeResultFiles(pkgDir, {
    quick: opts.quick,
    only: opts.only,
    environment: env,
    versions,
    settings: { ...jsonSettings, routeCounts },
    variants: series,
  }, md, { prefix: 'scale', resultsDir: 'results', svgCharts, scratch: opts.scratch })
}

/** Console line chart; `all` = series of one variant, `allCounts` = their sorted x values. */
function drawChart(all, allCounts) {
  const chartWidth = 60
  const chartHeight = 18
  const symbols = ['●', '■', '▲', '◆', '○', '◇', '▼', '★']
  const colors = ['\x1b[31m', '\x1b[34m', '\x1b[32m', '\x1b[33m', '\x1b[35m', '\x1b[36m', '\x1b[91m', '\x1b[94m']
  const reset = '\x1b[0m'

  const maxVal = Math.max(...all.flatMap((s) => Object.values(s.points).map((p) => p.median)))
  const xCol = (c) => Math.round(((c - allCounts[0]) / (allCounts[allCounts.length - 1] - allCounts[0])) * (chartWidth - 1))

  // Y axis labels
  const yStep = maxVal / (chartHeight - 1)

  // Build grid
  const grid = Array.from({ length: chartHeight }, () =>
    Array(chartWidth).fill(' ')
  )

  // Plot each router
  for (let ri = 0; ri < all.length; ri++) {
    const data = all[ri].points
    const counts = xOf(all[ri])

    for (let i = 0; i < counts.length; i++) {
      const x = xCol(counts[i])
      const y = Math.round((data[counts[i]].median / maxVal) * (chartHeight - 1))
      const row = chartHeight - 1 - y
      if (row >= 0 && row < chartHeight && x >= 0 && x < chartWidth) {
        grid[row][x] = symbols[ri % symbols.length]
      }

      // Draw lines between points
      if (i > 0) {
        const prevX = xCol(counts[i - 1])
        const prevY = Math.round((data[counts[i - 1]].median / maxVal) * (chartHeight - 1))
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
    const x = xCol(allCounts[i])
    while (xLine.length < yLabelWidth + 2 + x) xLine += ' '
    xLine += xLabels[i]
  }
  console.log(xLine + '  routes')

  // Legend
  console.log('')
  for (let i = 0; i < all.length; i++) {
    console.log(`  ${colors[i]}${symbols[i]}${reset} ${all[i].name}`)
  }
  console.log('')
}
