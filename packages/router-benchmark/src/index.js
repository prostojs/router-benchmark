// Basic router benchmark: 3 route shapes at 22 routes, per-test breakdown for the long shape.
// Usage: node src/index.js [--quick] [--rounds n] [--warmup ms] [--samples n] [--sample-ms ms] [--only a,b]
import { VARIANTS, BASE_ROUTE_COUNT } from './workloads.js'
import { parseRouterArgs, selectRouters, preflightAndPlan, runJobs, reportContext } from './runner.js'
import { writeResultFiles, generateBarChart, environmentMarkdown, fmtInt, fmtPct } from 'bench-utils'

const pkgDir = new URL('..', import.meta.url).pathname
const opts = parseRouterArgs()
const routerKeys = selectRouters(opts)

const jobs = Object.keys(VARIANTS).map((variant) => ({
  id: variant, variant, count: BASE_ROUTE_COUNT, perTest: variant === 'long',
}))

preflightAndPlan(routerKeys, jobs, opts)
const agg = await runJobs(routerKeys, jobs, opts)

// ---- report ----
const { env, versions, settings, jsonSettings } = reportContext(opts)

let md = `# Router Benchmark Results\n\n`
if (opts.quick) md += `> **QUICK MODE — smoke test only, numbers are not meaningful.**\n\n`
md += `Three route-shape variants at ${BASE_ROUTE_COUNT} routes each. Every lookup = route match + param extraction; `
md += `all routers are verified to return identical matches/params before measuring. Generated ${env.date}.\n\n---\n\n`

const jsonVariants = {}
const svgCharts = {}

for (const job of jobs) {
  const v = VARIANTS[job.variant]
  const byRouter = agg[job.id]
  const keys = Object.keys(byRouter)
  const testNames = Object.keys(byRouter[keys[0]].tests)
  const summary = keys.map((k) => {
    const t = byRouter[k].tests['All together']
    return { key: k, name: byRouter[k].name, value: t.median, range: [t.roundMin, t.roundMax], cv: t.sampleCv }
  }).sort((a, b) => b.value - a.value)
  const fastest = summary[0]
  const speed = (s) => (s === fastest ? 'fastest' : `${(fastest.value / s.value).toFixed(2)}x slower`)

  console.log(`\n## ${v.label}`)
  console.table(Object.fromEntries(summary.map((s) => [s.name, {
    'op/ms': Math.round(s.value), 'cv': fmtPct(s.cv), speed: speed(s),
  }])))

  const chartFile = `results-${job.variant}-chart.svg`
  svgCharts[chartFile] = generateBarChart(summary.map((s) => ({ name: s.name, value: s.value, range: s.range })), {
    title: `${v.label} — ${byRouter[keys[0]].routeCount} routes (op/ms)`,
    subtitle: `${env.node} · ${env.cpu} · median of ${opts.rounds} rounds · whiskers = min–max round median`,
    unit: 'op/ms',
  })

  md += `## ${v.label}\n\n${v.description}\n\n![${v.label}](results/${chartFile})\n\n`
  md += `| Router | op/ms (median) | round min – max | sample CV | speed |\n|--------|---:|---:|---:|---|\n`
  for (const s of summary) {
    md += `| ${s.name} | ${fmtInt(s.value)} | ${fmtInt(s.range[0])} – ${fmtInt(s.range[1])} | ${fmtPct(s.cv)} | ${speed(s)} |\n`
  }
  md += `\n`
  if (testNames.length > 1) {
    md += `### Per-Test Results (op/ms, median)\n\n| Test | ${summary.map((s) => s.name).join(' | ')} |\n|------|${summary.map(() => '---:').join('|')}|\n`
    for (const tn of testNames) md += `| ${tn} | ${summary.map((s) => fmtInt(byRouter[s.key].tests[tn].median)).join(' | ')} |\n`
    md += `\n`
  }
  md += `---\n\n`

  jsonVariants[job.variant] = {
    routeCount: byRouter[keys[0]].routeCount,
    summary: Object.fromEntries(summary.map((s) => [s.name, Math.round(s.value)])),
    perTest: Object.fromEntries(testNames.map((tn) => [tn, Object.fromEntries(keys.map((k) => [byRouter[k].name, byRouter[k].tests[tn]]))])),
  }
}

md += environmentMarkdown(env, versions, settings)

writeResultFiles(pkgDir, {
  quick: opts.quick || !!opts.only,
  environment: env,
  versions,
  settings: jsonSettings,
  variants: jsonVariants,
}, md, { resultsDir: 'results', svgCharts })
