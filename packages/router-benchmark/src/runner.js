// Shared orchestration for the router benchmarks: CLI options, pre-flight, worker
// spawning, rotation of router order between rounds, aggregation, report context.
import { spawn } from 'node:child_process'
import { describe, rotate, parseFlags, parseOnly, collectEnvironment, resolveVersions } from 'bench-utils'
import { routers } from './routers/index.js'
import { buildWorkload } from './workloads.js'
import { checkEquivalence } from './preflight.js'

const DEFAULTS = { rounds: 5, warmupMs: 500, samples: 10, sampleMs: 100 }
const QUICK = { rounds: 1, warmupMs: 50, samples: 3, sampleMs: 20 }

const ROUTER_PACKAGES = ['@prostojs/router', 'find-my-way', 'rou3', 'hono', 'express']

/**
 * Flags: --rounds n  --warmup ms  --samples n  --sample-ms ms  --only a,b  --quick
 * (env: BENCH_ROUNDS, BENCH_WARMUP_MS, BENCH_SAMPLES, BENCH_SAMPLE_MS)
 */
export function parseRouterArgs(argv = process.argv.slice(2)) {
  const { flags } = parseFlags(argv, ['quick'])
  const base = flags.quick ? { ...DEFAULTS, ...QUICK } : DEFAULTS
  const num = (flag, env, key) => {
    const n = Number(flags[flag] ?? process.env[env])
    return Number.isFinite(n) && n > 0 ? n : base[key]
  }
  return {
    quick: !!flags.quick,
    rounds: Math.round(num('rounds', 'BENCH_ROUNDS', 'rounds')),
    warmupMs: num('warmup', 'BENCH_WARMUP_MS', 'warmupMs'),
    samples: Math.round(num('samples', 'BENCH_SAMPLES', 'samples')),
    sampleMs: num('sample-ms', 'BENCH_SAMPLE_MS', 'sampleMs'),
    only: parseOnly(flags),
  }
}

/** Router keys selected by `--only` (all by default). */
export function selectRouters(opts) {
  return Object.keys(routers).filter((k) => !opts.only || opts.only.includes(k))
}

/**
 * Pre-flight equivalence check over every job (aborts on any disagreement), then
 * prints the run plan with a time estimate.
 */
export function preflightAndPlan(routerKeys, jobs, opts) {
  const problems = jobs.flatMap((j) => checkEquivalence(routerKeys, j.variant, j.count, j.perTest))
  if (problems.length) {
    console.error('PRE-FLIGHT EQUIVALENCE CHECK FAILED:\n  - ' + problems.join('\n  - '))
    process.exit(1)
  }
  console.log(`Pre-flight OK: ${routerKeys.length} routers agree on every lookup for all ${jobs.length} workloads.`)

  const testsPerRouter = jobs.reduce((a, j) => a + buildWorkload(j.variant, j.count, j.perTest).tests.length, 0)
  const perTestSec = (opts.warmupMs + opts.samples * opts.sampleMs * 1.1) / 1000
  const perRoundSec = routerKeys.length * (testsPerRouter * perTestSec + jobs.length * 0.3) // + ~0.3s per worker spawn
  const estMin = Math.ceil((perRoundSec * opts.rounds) / 60)
  console.log(`${opts.rounds} round(s), warmup ${opts.warmupMs}ms, ${opts.samples}×${opts.sampleMs}ms samples — estimated ~${estMin} min${opts.quick ? '  [QUICK MODE — numbers are not meaningful]' : ''}\n`)
}

export const NODE_FLAGS = ['--expose-gc']

export function runWorker(cfg) {
  return new Promise((resolve, reject) => {
    const workerPath = new URL('./worker.js', import.meta.url).pathname
    const child = spawn(process.execPath, [...NODE_FLAGS, workerPath, JSON.stringify(cfg)], {
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    let stdout = ''
    child.stdout.on('data', (c) => { stdout += c })
    child.on('close', (code) => {
      const line = stdout.split('\n').find((l) => l.startsWith('RESULT:'))
      if (code !== 0 || !line) return reject(new Error(`worker ${cfg.router}/${cfg.variant}/${cfg.count} failed (exit ${code})`))
      resolve(JSON.parse(line.slice(7)))
    })
  })
}

/**
 * Run `jobs` (each { variant, count, perTest }) for every router, `opts.rounds` times.
 * Router order is rotated every round. Returns
 *   agg[jobId][routerKey] = { name, routeCount, tests: { testName: stats } }
 */
export async function runJobs(routerKeys, jobs, opts) {
  const raw = {}
  for (let r = 0; r < opts.rounds; r++) {
    const order = rotate(routerKeys, r)
    for (const job of jobs) {
      for (const key of order) {
        const res = await runWorker({ router: key, ...job, warmupMs: opts.warmupMs, samples: opts.samples, sampleMs: opts.sampleMs })
        const slot = ((raw[job.id] ??= {})[key] ??= { name: res.name, routeCount: res.routeCount, rounds: [] })
        slot.rounds.push(res.tests)
        process.stdout.write(`\r  round ${r + 1}/${opts.rounds}  ${job.id.padEnd(10)} ${key.padEnd(14)}`)
      }
    }
  }
  process.stdout.write('\n')

  const agg = {}
  for (const [jobId, byRouter] of Object.entries(raw)) {
    agg[jobId] = {}
    for (const [key, slot] of Object.entries(byRouter)) {
      const tests = {}
      for (const testName of Object.keys(slot.rounds[0])) {
        const roundMedians = slot.rounds.map((t) => describe(t[testName].samples).median)
        const all = describe(slot.rounds.flatMap((t) => t[testName].samples))
        const rm = describe(roundMedians)
        tests[testName] = {
          median: rm.median, // median of per-round medians (op/ms)
          roundMin: rm.min,
          roundMax: rm.max,
          sampleCv: all.cv, // coefficient of variation over all samples
          samples: all.n,
        }
      }
      agg[jobId][key] = { name: slot.name, routeCount: slot.routeCount, tests }
    }
  }
  return agg
}

/** Environment, package versions, settings table and JSON settings for the result files. */
export function reportContext(opts, extraSettings = {}) {
  const env = collectEnvironment()
  const versions = resolveVersions(new URL('..', import.meta.url).pathname, ROUTER_PACKAGES)
  const settings = {
    ...extraSettings,
    'Rounds': `${opts.rounds} (router order rotated each round; fresh process per router × workload × round)`,
    'Warmup': `${opts.warmupMs} ms per test (time-based; also calibrates batch size)`,
    'Samples': `${opts.samples} per test per round, ~${opts.sampleMs} ms each (process.hrtime.bigint)`,
    'Reported value': 'median of per-round medians, op/ms (lookups per millisecond)',
    'Node flags': NODE_FLAGS.join(' ') + ' (gc() before sampling)',
  }
  if (opts.quick) settings['QUICK MODE'] = 'smoke test only — numbers are NOT meaningful'
  const jsonSettings = { rounds: opts.rounds, warmupMs: opts.warmupMs, samples: opts.samples, sampleMs: opts.sampleMs, unit: 'op/ms' }
  return { env, versions, settings, jsonSettings }
}
