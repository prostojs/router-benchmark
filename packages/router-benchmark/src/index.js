// Basic router benchmark: 3 route shapes at 22 routes, per-test breakdown for the long shape.
// Usage: node src/index.js [--quick] [--rounds n] [--warmup ms] [--samples n] [--sample-ms ms] [--only a,b]
import { VARIANTS, BASE_ROUTE_COUNT } from './workloads.js'
import { parseRouterOptions, selectRouters, preflightAndPlan, runJobs, reportContext } from './runner.js'
import { writeResultFiles, generateBarChart, environmentMarkdown, rankRelative, mdTable, quickNotes, fmtInt, fmtPct } from 'bench-utils'

const pkgDir = new URL('..', import.meta.url).pathname
const opts = parseRouterOptions()
const routerKeys = selectRouters(opts)

const jobs = Object.keys(VARIANTS).map((variant) => ({
  id: variant, variant, count: BASE_ROUTE_COUNT, perTest: variant === 'long',
}))

await preflightAndPlan(routerKeys, jobs, opts)
const agg = await runJobs(routerKeys, jobs, opts)

// ---- report ----
const { env, versions, settings, jsonSettings } = reportContext(opts)
const displayName = (r) => (r.backend ? `${r.name} (${r.backend})` : r.name)

let md = `# Router Benchmark Results\n\n` + quickNotes(opts).md
md += `Three route-shape variants at ${BASE_ROUTE_COUNT} routes each. Every lookup = route match + param extraction; `
md += `all routers are verified to return identical matches/params before measuring. Generated ${env.date}.\n\n---\n\n`

const jsonVariants = {}
const svgCharts = {}

for (const job of jobs) {
  const v = VARIANTS[job.variant]
  const byRouter = agg[job.id]
  const keys = Object.keys(byRouter)
  const routeCount = byRouter[keys[0]].routeCount
  const testNames = Object.keys(byRouter[keys[0]].tests)
  const summary = rankRelative(keys.map((k) => {
    const t = byRouter[k].tests['All together']
    return { key: k, name: displayName(byRouter[k]), value: t.median, range: [t.roundMin, t.roundMax], cv: t.sampleCv }
  }))

  console.log(`\n## ${v.label}`)
  console.table(Object.fromEntries(summary.map((s) => [s.name, {
    'op/ms': Math.round(s.value), 'cv': fmtPct(s.cv), speed: s.relative,
  }])))

  const chartFile = `results-${job.variant}-chart.svg`
  svgCharts[chartFile] = generateBarChart(summary.map((s) => ({ name: s.name, value: s.value, range: s.range, note: s.relative })), {
    title: `${v.label} — ${routeCount} routes (op/ms)`,
    subtitle: `${env.node} · ${env.cpu} · median of ${opts.rounds} rounds · whiskers = min–max round median`,
    unit: 'op/ms',
  })

  md += `## ${v.label}\n\n${v.description}\n\n![${v.label}](results/${chartFile})\n\n`
  md += mdTable(
    ['Router', 'op/ms (median)', 'round min – max', 'sample CV', 'speed'],
    summary.map((s) => [s.name, fmtInt(s.value), `${fmtInt(s.range[0])} – ${fmtInt(s.range[1])}`, fmtPct(s.cv), s.relative]),
    'lrrrl',
  ) + `\n`
  if (testNames.length > 1) {
    md += `### Per-Test Results (op/ms, median)\n\n`
    md += mdTable(
      ['Test', ...summary.map((s) => s.name)],
      testNames.map((tn) => [tn, ...summary.map((s) => fmtInt(byRouter[s.key].tests[tn].median))]),
      'l' + 'r'.repeat(summary.length),
    ) + `\n`
  }
  md += `---\n\n`

  jsonVariants[job.variant] = {
    routeCount,
    summary: Object.fromEntries(summary.map((s) => [s.name, Math.round(s.value)])),
    perTest: Object.fromEntries(testNames.map((tn) => [tn, Object.fromEntries(summary.map((s) => [s.name, byRouter[s.key].tests[tn]]))])),
  }
}

md += environmentMarkdown(env, versions, settings)

writeResultFiles(pkgDir, {
  quick: opts.quick,
  only: opts.only,
  environment: env,
  versions,
  settings: jsonSettings,
  variants: jsonVariants,
}, md, { resultsDir: 'results', files: svgCharts, scratch: opts.scratch })
