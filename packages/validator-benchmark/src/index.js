// Orchestrator: pre-flight equivalence checks, then one child process per
// (engine, mode, scenario) job, repeated over several rounds in varying order.
// Usage: node src/index.js [--quick] [--rounds n] [--warmup ms] [--samples n] [--sample-ms ms] [--only a,b]
import { spawnSync } from 'node:child_process'
import {
  parseBenchOptions, quickNotes, writeResultFiles, generateGroupedBarChart,
  collectEnvironment, resolveVersions, describe, quantile, fmtCompact,
} from 'bench-utils'
import { MODES, SCENARIOS, ENGINES, listJobs, listSkipped, pkgOf, pkgsOf } from './setup.js'
import { runPreflight } from './preflight.js'
import { renderMarkdown, groupResults } from './report.js'

const pkgDir = new URL('..', import.meta.url).pathname
const engineKeys = Object.keys(ENGINES)
const engineMeta = (pick) => Object.fromEntries(engineKeys.map((k) => [k, pick(ENGINES[k], k)]))
const PACKAGES = [...new Set(engineKeys.flatMap(pkgsOf))]
const NODE_FLAGS = ['--expose-gc']

/**
 * Flags (env var in brackets):
 *   --rounds n [BENCH_ROUNDS]  --warmup ms [BENCH_WARMUP_MS]  --samples n [BENCH_SAMPLES]
 *   --sample-ms ms [BENCH_SAMPLE_MS]  --only a,b  --quick
 * `--only` takes comma-separated substrings matched against "mode/scenario/engine".
 */
const opts = parseBenchOptions(process.argv.slice(2), {
  numbers: {
    rounds: { env: 'BENCH_ROUNDS', default: 3, quick: 1, min: 1, int: true },
    warmupMs: { flag: 'warmup', env: 'BENCH_WARMUP_MS', default: 1000, quick: 150, min: 1 },
    samples: { env: 'BENCH_SAMPLES', default: 25, quick: 5, min: 1, int: true },
    sampleMs: { flag: 'sample-ms', env: 'BENCH_SAMPLE_MS', default: 40, quick: 10, min: 1 },
  },
})

const jobs = listJobs().filter((j) => !opts.only || opts.only.some((f) => key(j).includes(f)))
if (!jobs.length) throw new Error(`--only ${opts.only.join(',')} matches no job (format: mode/scenario/engine)`)

console.log(`Validator benchmark — ${jobs.length} jobs, ${opts.rounds} round(s), warmup ${opts.warmupMs}ms, ` +
  `${opts.samples}×${opts.sampleMs}ms samples${quickNotes(opts).consoleSuffix}\n`)

const preflight = runPreflight()

const samples = new Map(jobs.map((j) => [key(j), { ...j, rounds: [], batches: [] }]))

const workerPath = new URL('./worker.js', import.meta.url).pathname
const t0 = Date.now()
for (let r = 0; r < opts.rounds; r++) {
  const order = roundOrder(jobs, r)
  console.log(`\nRound ${r + 1}/${opts.rounds} (${order.length} jobs, order: ${roundLabel(r)})`)
  for (const [i, job] of order.entries()) {
    const payload = JSON.stringify({ ...job, warmupMs: opts.warmupMs, samples: opts.samples, sampleMs: opts.sampleMs })
    const res = spawnSync(process.execPath, [...NODE_FLAGS, workerPath, payload], { encoding: 'utf8' })
    if (res.status !== 0) {
      console.error(res.stderr || res.stdout)
      throw new Error(`worker failed for ${key(job)}`)
    }
    const out = JSON.parse(res.stdout.trim().split('\n').pop())
    const acc = samples.get(key(job))
    acc.rounds.push(out.opsPerSec)
    acc.batches.push(out.batch)
    const m = describe(out.opsPerSec).median
    process.stdout.write(`  [${String(i + 1).padStart(3)}/${order.length}] ${key(job).padEnd(64)} ${fmtCompact(m).padStart(8)} ops/s\n`)
  }
}
const elapsedSec = Math.round((Date.now() - t0) / 1000)

// Aggregate: pool all samples of all rounds.
const results = [...samples.values()].map((j) => {
  const all = j.rounds.flat().sort((a, b) => a - b)
  const med = quantile(all, 0.5)
  return {
    mode: j.mode,
    scenario: j.scenario,
    engine: j.engine,
    opsPerSec: Math.round(med),
    p25: Math.round(quantile(all, 0.25)),
    p75: Math.round(quantile(all, 0.75)),
    nsPerOp: Math.round(1e9 / med),
    samples: all.length,
    roundMedians: j.rounds.map((s) => Math.round(describe(s).median)),
    roundBatchSizes: j.batches, // calls per timed sample, per round (from the worker's calibration)
  }
})

const groups = groupResults(results)
printSummary(groups)

const environment = collectEnvironment()
const versions = resolveVersions(pkgDir, PACKAGES)
const report = {
  quick: opts.quick,
  only: opts.only,
  elapsedSec,
  environment,
  versions,
  settings: { rounds: opts.rounds, warmupMs: opts.warmupMs, samples: opts.samples, sampleMs: opts.sampleMs, nodeFlags: NODE_FLAGS, unit: 'ops/s' },
  modes: MODES,
  engines: engineMeta((e) => e.label),
  scenarios: Object.fromEntries(Object.entries(SCENARIOS).map(([k, s]) => [k, { target: s.target, errors: s.errors, freshInputPerCall: !!s.fresh, valid: Object.fromEntries(Object.keys(MODES).map((m) => [m, s.valid(m)])) }])),
  preflight,
}

// Bars keep the fixed ENGINES order inside each group, so every engine sits in the same place.
// With this many engines each bar carries its own label (no color legend to match against).
const files = { 'summary.json': JSON.stringify(summarize(report, groups), null, 2) + '\n' }
for (const { mode, scenarios } of groups) {
  const chartGroups = scenarios.map(({ scenario, rows }) => ({
    category: scenario,
    bars: rows
      .toSorted((a, b) => engineKeys.indexOf(a.engine) - engineKeys.indexOf(b.engine))
      .map((r) => ({ name: r.engine, value: r.value, low: r.p25, high: r.p75 })),
  }))
  files[`${mode}-chart.svg`] = generateGroupedBarChart(chartGroups, {
    title: `Validation throughput — unknown props: ${mode}`,
    subtitle: `ops/s, higher is better · Node ${environment.node} · ${environment.cpu}`,
    colors: engineMeta((e) => e.color),
    labels: engineMeta((e) => e.label),
    rowLabels: true,
  })
}

// --quick / --only runs land in the git-ignored .quick/ directory (same layout).
writeResultFiles(pkgDir, { ...report, results }, renderMarkdown(report, groups, opts), {
  scratch: opts.scratch,
  resultsDir: 'results',
  files,
})

// ─── helpers ───────────────────────────────────────────────────────────────

function key(j) {
  return `${j.mode}/${j.scenario}/${j.engine}`
}

/**
 * Compact, chart-ready summary (results/summary.json): engine metadata, then
 * `results[mode][scenario][engine] = median ops/s`, plus the cells that were not run and why.
 */
function summarize(report, groups) {
  const results = {}
  for (const { mode, scenarios } of groups)
    for (const { scenario, rows } of scenarios)
      (results[mode] ??= {})[scenario] = Object.fromEntries(rows.map((r) => [r.engine, r.opsPerSec]))
  return {
    generated: report.environment.date,
    quick: report.quick,
    unit: 'ops/s (median)',
    environment: { node: report.environment.node, cpu: report.environment.cpu, os: report.environment.os },
    engines: engineMeta((e, k) => ({
      label: e.label,
      library: pkgOf(k),
      version: report.versions[pkgOf(k)],
      color: e.color,
      booleanOnly: !!e.booleanOnly,
    })),
    modes: Object.keys(MODES),
    scenarios: Object.fromEntries(Object.entries(report.scenarios).map(([k, s]) => [k, { target: s.target, errors: s.errors, valid: s.valid }])),
    results,
    skipped: listSkipped(),
  }
}

/** Round r runs the jobs forward, then reversed, then in a seeded shuffle. */
function roundLabel(r) {
  return r === 0 ? 'forward' : r === 1 ? 'reverse' : 'shuffled'
}

function roundOrder(list, r) {
  if (r === 0) return [...list]
  if (r === 1) return [...list].reverse()
  const a = [...list]
  let seed = 0x9e3779b9 ^ r
  const rand = () => ((seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 2 ** 32
  for (let i = a.length - 1; i > 0; i--) {
    const k = Math.floor(rand() * (i + 1))
    ;[a[i], a[k]] = [a[k], a[i]]
  }
  return a
}

function printSummary(groups) {
  for (const { mode, scenarios } of groups) {
    console.log(`\n── unknown props: ${mode} ──`)
    for (const { scenario, rows } of scenarios) {
      console.log(`  ${scenario}`)
      for (const r of rows)
        console.log(`    ${ENGINES[r.engine].label.padEnd(46)} ${fmtCompact(r.opsPerSec).padStart(8)} ops/s  [${fmtCompact(r.p25)}–${fmtCompact(r.p75)}]  ${String(r.nsPerOp).padStart(7)} ns/op  ${r.relative}`)
    }
  }
}
