// Shared orchestration for the router benchmarks: CLI options, pre-flight, worker
// spawning, rotation of router order between rounds, aggregation, report context.
import { spawn } from 'node:child_process'
import { describe, rotate, parseBenchOptions, quickNotes, collectEnvironment, resolveVersions } from 'bench-utils'
import { routerLoaders } from './routers/index.js'
import { checkEquivalence } from './preflight.js'

const ROUTER_PACKAGES = ['@prostojs/router', 'find-my-way', 'rou3', 'hono', 'express']

/**
 * Flags (env var in brackets):
 *   --rounds n [BENCH_ROUNDS]  --warmup ms [BENCH_WARMUP_MS]  --samples n [BENCH_SAMPLES]
 *   --sample-ms ms [BENCH_SAMPLE_MS]  --only a,b  --quick
 */
const OPTION_SPEC = {
  numbers: {
    rounds: { env: 'BENCH_ROUNDS', default: 5, quick: 1, min: 1, int: true },
    warmupMs: { flag: 'warmup', env: 'BENCH_WARMUP_MS', default: 500, quick: 50, min: 1 },
    samples: { env: 'BENCH_SAMPLES', default: 10, quick: 3, min: 1, int: true },
    sampleMs: { flag: 'sample-ms', env: 'BENCH_SAMPLE_MS', default: 100, quick: 20, min: 1 },
  },
}

export function parseRouterOptions(argv = process.argv.slice(2)) {
  return parseBenchOptions(argv, OPTION_SPEC)
}

/** Router keys selected by `--only` (all by default). */
export function selectRouters(opts) {
  const unknown = (opts.only ?? []).filter((k) => !(k in routerLoaders))
  if (unknown.length) throw new Error(`Unknown --only key(s): ${unknown.join(', ')} (expected: ${Object.keys(routerLoaders).join(', ')})`)
  return Object.keys(routerLoaders).filter((k) => !opts.only || opts.only.includes(k))
}

/**
 * Pre-flight equivalence check over every job (aborts on any disagreement), then
 * prints the run plan with a time estimate.
 */
export async function preflightAndPlan(routerKeys, jobs, opts) {
  const routers = Object.fromEntries(await Promise.all(routerKeys.map(async (k) => [k, await routerLoaders[k]()])))
  const checks = jobs.map((j) => checkEquivalence(routers, j.variant, j.count, j.perTest))
  const problems = checks.flatMap((c) => c.problems)
  if (problems.length) {
    console.error('PRE-FLIGHT EQUIVALENCE CHECK FAILED:\n  - ' + problems.join('\n  - '))
    process.exit(1)
  }
  console.log(`Pre-flight OK: ${routerKeys.length} routers agree on every lookup for all ${jobs.length} workloads.`)

  // measuring time only (warmup + samples); worker start-up comes on top
  const testsPerRouter = checks.reduce((a, c) => a + c.testCount, 0)
  const measureMs = routerKeys.length * testsPerRouter * (opts.warmupMs + opts.samples * opts.sampleMs) * opts.rounds
  console.log(`${opts.rounds} round(s), warmup ${opts.warmupMs}ms, ${opts.samples}×${opts.sampleMs}ms samples — ` +
    `estimated > ${Math.ceil(measureMs / 60000)} min${quickNotes(opts).consoleSuffix}\n`)
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
 *   agg[jobId][routerKey] = { name, backend?, routeCount, tests: { testName: stats } }
 */
export async function runJobs(routerKeys, jobs, opts) {
  const raw = {}
  for (let r = 0; r < opts.rounds; r++) {
    const order = rotate(routerKeys, r)
    for (const job of jobs) {
      for (const key of order) {
        const res = await runWorker({ router: key, ...job, warmupMs: opts.warmupMs, samples: opts.samples, sampleMs: opts.sampleMs })
        const slot = ((raw[job.id] ??= {})[key] ??= { name: res.name, backend: res.backend, routeCount: res.routeCount, rounds: [] })
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
      agg[jobId][key] = { name: slot.name, backend: slot.backend, routeCount: slot.routeCount, tests }
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
    ...quickNotes(opts).settings,
  }
  const jsonSettings = { rounds: opts.rounds, warmupMs: opts.warmupMs, samples: opts.samples, sampleMs: opts.sampleMs, unit: 'op/ms' }
  return { env, versions, settings, jsonSettings }
}
