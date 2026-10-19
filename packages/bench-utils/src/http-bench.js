/**
 * Shared HTTP benchmark harness (used by wooks-benchmark and moost-benchmark).
 *
 * Isolation model:
 *   - every framework server runs in its OWN child process (NODE_ENV=production),
 *     started fresh for every round and killed afterwards — one server at a time;
 *   - the load generator (autocannon) runs in this orchestrator process, which
 *     does nothing else while a measurement is in progress.
 *
 * Per round and framework:
 *   1. spawn `node <entry> <key>`, wait for its `listening` IPC message (see server-entry.js)
 *   2. pre-flight equivalence check: every test is sent once and status, body and
 *      relevant headers are compared with the expected values — any mismatch aborts
 *   3. for every test: warmup run (discarded) + measured run; after each run, wait until
 *      the server reports all client connections closed (drain)
 *   4. kill server
 * Framework order is rotated between rounds. Per-test result = median over rounds.
 */
import { spawn } from 'node:child_process'
import autocannon from 'autocannon'
import { describe, weightedHarmonicMean, weightedArithmeticMean, rotate, rankRelative, fmtInt, fmtPct } from './stats.js'
import { collectEnvironment, resolveVersions, environmentMarkdown } from './env.js'
import { generateBarChart } from './svg-bar-chart.js'
import { writeResultFiles } from './write-results.js'
import { parseBenchOptions, quickNotes } from './args.js'
import { mdTable } from './md-table.js'
import { checkRedis, REDIS_HOST, REDIS_PORT } from './simulate-db.js'

const MAX_ERROR_RATE = 0.001 // a measured run with >0.1% unexpected responses/errors is INVALID
const DRAIN_TIMEOUT_MS = 5000 // server sockets still open this long after a run → abort
const HARNESS_PACKAGES = ['autocannon', 'ioredis']

/**
 * CLI flags (env var in brackets):
 *   --warmup <s>        [BENCH_WARMUP]       warmup seconds per test (default 2; 0 disables; min 1)
 *   --duration <s>      [BENCH_DURATION]     measured seconds per test (default 5; min 1)
 *   --rounds <n>        [BENCH_ROUNDS]       rounds, fresh server per round (default 3)
 *   --connections <n>   [BENCH_CONNECTIONS]  autocannon connections (default 100)
 *   --pipelining <n>    [BENCH_PIPELINING]   autocannon pipelining (default 10)
 *   --workers <n>       [BENCH_WORKERS]      autocannon worker threads (default 0 = main thread)
 *   --only <a,b>        run only these framework keys
 *   --quick             smoke mode: 1s warmup, 1s measure, 1 round (results are NOT meaningful)
 *   --db                simulated DB (Redis on 127.0.0.1:6379, `bench:` keys only)
 *   --baselines         also run the frameworks marked `optional`
 */
// autocannon only checks its stop condition on its 1s sampling tick, so runs shorter
// than 1s are not honoured (a "0.5s" run really lasts ~1s and is a single sample) → min 1.
const OPTION_SPEC = {
  booleans: ['db', 'baselines'],
  numbers: {
    warmup: { env: 'BENCH_WARMUP', default: 2, quick: 1, min: 1, allowZero: true },
    duration: { env: 'BENCH_DURATION', default: 5, quick: 1, min: 1 },
    rounds: { env: 'BENCH_ROUNDS', default: 3, quick: 1, min: 1, int: true },
    connections: { env: 'BENCH_CONNECTIONS', default: 100, min: 1, int: true },
    pipelining: { env: 'BENCH_PIPELINING', default: 10, min: 1, int: true },
    workers: { env: 'BENCH_WORKERS', default: 0, min: 1, int: true, allowZero: true },
  },
}

let currentChild = null
process.on('exit', () => { if (currentChild) currentChild.kill('SIGKILL') })
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { if (currentChild) currentChild.kill('SIGKILL'); process.exit(130) })
}

/** Every server runs as `node <entry> <key> [--db]` — same binary and flags for all frameworks. */
function startServer(fw, db) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fw.serverSpec.entry, fw.key, ...(db ? ['--db'] : [])], {
      cwd: fw.serverSpec.cwd,
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    })
    currentChild = child
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`${fw.name}: server did not start within 60s`)) }, 60000)
    child.on('message', function onListening(msg) {
      if (msg?.type !== 'listening') return
      clearTimeout(timer)
      child.off('message', onListening)
      resolve({ child, port: msg.port })
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`${fw.name}: server exited early with code ${code}`))
    })
  })
}

async function stopServer(child) {
  child.removeAllListeners('exit')
  if (child.exitCode !== null || child.signalCode !== null) { currentChild = null; return }
  const exited = new Promise((r) => child.once('exit', r))
  child.kill('SIGTERM')
  const t = setTimeout(() => child.kill('SIGKILL'), 3000)
  await exited
  clearTimeout(t)
  currentChild = null
}

/**
 * autocannon stops by destroying its sockets, possibly mid-request (e.g. halfway through
 * a 25 KB body). Ask the server process to report once all client connections are closed,
 * so the next run never starts while the server is still busy with the previous one.
 * Only called between runs — never while autocannon is measuring.
 */
function drain(child, label) {
  return new Promise((resolve, reject) => {
    const onExit = (code) => reject(new Error(`${label}: server exited with code ${code} while draining`))
    child.once('exit', onExit)
    child.on('message', function onDrained(msg) {
      if (msg?.type !== 'drained') return
      child.off('message', onDrained)
      child.off('exit', onExit)
      if (msg.open === 0) resolve()
      else reject(new Error(`${label}: ${msg.open} connection(s) still open ${DRAIN_TIMEOUT_MS} ms after the run — aborting`))
    })
    child.send({ type: 'drain', timeoutMs: DRAIN_TIMEOUT_MS })
  })
}

/** Send every test once and compare with the expected response. Returns a list of problems. */
async function preflight(baseUrl, tests) {
  const problems = []
  for (const t of tests) {
    let res, body
    try {
      // `connection: close` so the pre-flight leaves no idle keep-alive socket behind (see drain)
      res = await fetch(baseUrl + t.path, { method: t.method, headers: { ...t.headers, connection: 'close' }, body: t.body })
      body = await res.text()
    } catch (e) {
      problems.push(`${t.name}: request failed (${e.message})`)
      continue
    }
    const expectedStatus = t.expect ?? 200
    if (res.status !== expectedStatus) problems.push(`${t.name}: status ${res.status}, expected ${expectedStatus} (body: ${body.slice(0, 120)})`)
    if (t.expectBody !== undefined && body !== t.expectBody) problems.push(`${t.name}: body ${JSON.stringify(body.slice(0, 120))}, expected ${JSON.stringify(t.expectBody)}`)
    for (const [name, expected] of Object.entries(t.expectHeaders ?? {})) {
      const actual = res.headers.get(name)
      const ok = expected instanceof RegExp ? expected.test(actual ?? '') : actual === expected
      if (!ok) problems.push(`${t.name}: header ${name}=${JSON.stringify(actual)}, expected ${expected}`)
    }
    if (t.expectSetCookie) {
      const cookies = res.headers.getSetCookie()
      for (const re of t.expectSetCookie) {
        if (!cookies.some((c) => re.test(c))) problems.push(`${t.name}: no Set-Cookie matching ${re} (got ${JSON.stringify(cookies)})`)
      }
    }
  }
  return problems
}

async function cannon(baseUrl, test, opts, duration) {
  const o = {
    url: baseUrl + test.path,
    method: test.method,
    headers: test.headers,
    connections: opts.connections,
    pipelining: opts.pipelining,
    duration,
  }
  if (opts.workers > 0) o.workers = opts.workers
  if (test.body) o.body = test.body
  return autocannon(o)
}

function evaluate(test, result) {
  const expected = String(test.expect ?? 200)
  let responses = 0
  let unexpected = 0
  for (const [code, { count }] of Object.entries(result.statusCodeStats ?? {})) {
    responses += count
    if (code !== expected) unexpected += count
  }
  const failures = unexpected + (result.errors || 0) + (result.timeouts || 0)
  const errorRate = responses + failures > 0 ? failures / Math.max(1, responses) : 1
  return {
    rps: responses / result.duration,
    responses,
    unexpected,
    socketErrors: result.errors || 0,
    timeouts: result.timeouts || 0,
    errorRate,
    latencyP50: result.latency.p50,
    latencyP99: result.latency.p99,
    valid: responses > 0 && errorRate <= MAX_ERROR_RATE,
  }
}

/**
 * Merge per-framework version maps. A package listed by several frameworks is recorded
 * once; if two frameworks resolve different copies, the later one is keyed `pkg (Framework)`.
 */
function mergeVersions(target, versions, owner) {
  for (const [pkg, v] of Object.entries(versions)) {
    if (!(pkg in target)) target[pkg] = v
    else if (target[pkg] !== v) target[`${pkg} (${owner})`] = v
  }
  return target
}

/**
 * Run the whole suite and write results.
 *
 * @param {object} cfg
 * @param {string} cfg.pkgDir
 * @param {string} cfg.title                 markdown/chart title
 * @param {Array<{
 *   name: string, key: string, color?: string,
 *   serverSpec: { entry: string, cwd: string },
 *   versions?: Array<string | [string, string]>,
 *   optional?: boolean,
 * }>} cfg.frameworks
 *   `serverSpec.entry` is started as `node <entry> <key> [--db]` in `serverSpec.cwd`;
 *   `versions` are resolved from `serverSpec.cwd` (where the server resolves its deps);
 *   `optional` frameworks run only with `--baselines` or when named in `--only`
 * @param {Array<object>} cfg.tests          test cases (see saas-api.js)
 * @param {Array<object>} [cfg.extraChecks]  pre-flight-only checks (not measured)
 * @param {string} [cfg.notes]               extra markdown appended to methodology
 */
export async function runHttpSuite(cfg) {
  const opts = parseBenchOptions(process.argv.slice(2), OPTION_SPEC)
  const unknown = (opts.only ?? []).filter((k) => !cfg.frameworks.some((f) => f.key === k))
  if (unknown.length) throw new Error(`Unknown --only key(s): ${unknown.join(', ')} (expected: ${cfg.frameworks.map((f) => f.key).join(', ')})`)
  // `--only` selects by key, optional (baseline) entries included; otherwise optional ones need `--baselines`
  const frameworks = cfg.frameworks.filter((f) => (opts.only ? opts.only.includes(f.key) : opts.baselines || !f.optional))
  const tests = cfg.tests
  const quick = quickNotes(opts)
  // load-generation time only; server start-up, pre-flight and drain waits come on top
  const estimate = Math.ceil((tests.length * (opts.warmup + opts.duration) * frameworks.length * opts.rounds) / 60)

  console.log(`${cfg.title}${opts.db ? ' (simulated DB)' : ''}`)
  console.log(`warmup ${opts.warmup}s + measure ${opts.duration}s per test, ${opts.rounds} round(s), ` +
    `${opts.connections} connections, pipelining ${opts.pipelining}, ${tests.length} tests, ${frameworks.length} frameworks`)
  console.log(`estimated duration: > ${estimate} min${quick.consoleSuffix}\n`)

  if (opts.db) {
    try { await checkRedis() } catch (e) {
      console.error(`--db requires Redis on ${REDIS_HOST}:${REDIS_PORT}: ${e.message}`)
      process.exit(1)
    }
  }

  // raw[fw][test] = per-round evaluations
  const raw = Object.fromEntries(frameworks.map((f) => [f.name, Object.fromEntries(tests.map((t) => [t.name, []]))]))

  for (let r = 0; r < opts.rounds; r++) {
    const order = rotate(frameworks, r)
    console.log(`Round ${r + 1}/${opts.rounds}: ${order.map((f) => f.name).join(' -> ')}`)
    for (const fw of order) {
      const { child, port } = await startServer(fw, opts.db)
      const baseUrl = `http://127.0.0.1:${port}`
      try {
        const problems = await preflight(baseUrl, [...tests, ...(cfg.extraChecks ?? [])])
        if (problems.length) {
          console.error(`\nPRE-FLIGHT EQUIVALENCE CHECK FAILED for ${fw.name}:\n  - ${problems.join('\n  - ')}`)
          await stopServer(child)
          process.exit(1)
        }
        await drain(child, fw.name)
        process.stdout.write(`  ${fw.name.padEnd(20)} `)
        for (const test of tests) {
          if (opts.warmup > 0) {
            await cannon(baseUrl, test, opts, opts.warmup)
            await drain(child, `${fw.name} / ${test.name} (warmup)`)
          }
          const ev = evaluate(test, await cannon(baseUrl, test, opts, opts.duration))
          await drain(child, `${fw.name} / ${test.name}`)
          raw[fw.name][test.name].push(ev)
          process.stdout.write(ev.valid ? '.' : 'x')
        }
        process.stdout.write('\n')
      } finally {
        await stopServer(child)
      }
    }
  }

  // ---- aggregate ----
  const perTest = {}
  for (const test of tests) {
    perTest[test.name] = { weight: test.weight, expectStatus: test.expect ?? 200, frameworks: {} }
    for (const fw of frameworks) {
      const evs = raw[fw.name][test.name]
      const valid = evs.every((e) => e.valid)
      const d = describe(evs.map((e) => e.rps))
      perTest[test.name].frameworks[fw.name] = {
        medianRps: d.median,
        minRps: d.min,
        maxRps: d.max,
        cv: d.cv,
        rounds: evs.map((e) => Math.round(e.rps)),
        latencyP50ms: describe(evs.map((e) => e.latencyP50)).median,
        latencyP99ms: describe(evs.map((e) => e.latencyP99)).median,
        errorRate: Math.max(...evs.map((e) => e.errorRate)),
        unexpectedResponses: evs.reduce((a, e) => a + e.unexpected, 0),
        socketErrors: evs.reduce((a, e) => a + e.socketErrors + e.timeouts, 0),
        valid,
      }
    }
  }

  const summary = rankRelative(frameworks.map((fw) => {
    const cells = tests.map((t) => ({ weight: t.weight, value: perTest[t.name].frameworks[fw.name].medianRps }))
    const perRound = []
    for (let r = 0; r < opts.rounds; r++) {
      perRound.push(weightedHarmonicMean(tests.map((t) => ({ weight: t.weight, value: raw[fw.name][t.name][r]?.rps }))))
    }
    const rd = describe(perRound)
    const invalidTests = tests.filter((t) => !perTest[t.name].frameworks[fw.name].valid).map((t) => t.name)
    return {
      name: fw.name,
      value: weightedHarmonicMean(cells), // traffic-mix req/s (headline)
      weightedArithmeticRps: weightedArithmeticMean(cells),
      roundMin: rd.min,
      roundMax: rd.max,
      roundCv: rd.cv,
      valid: invalidTests.length === 0,
      invalidTests,
    }
  }))

  const env = collectEnvironment()
  const versions = resolveVersions(new URL('..', import.meta.url).pathname, HARNESS_PACKAGES)
  for (const fw of frameworks) mergeVersions(versions, resolveVersions(fw.serverSpec.cwd, fw.versions ?? []), fw.name)
  const settings = {
    'Mode': opts.db ? 'simulated DB (one Redis round-trip per authenticated request)' : 'pure framework overhead',
    'Warmup per test': `${opts.warmup}s (discarded)`,
    'Measured per test': `${opts.duration}s`,
    'Rounds': `${opts.rounds} (fresh server process per round, framework order rotated; per-test value = median)`,
    'Load generator': `autocannon, ${opts.connections} connections, pipelining ${opts.pipelining}${opts.workers ? `, ${opts.workers} workers` : ''}, in orchestrator process`,
    'Server process': `one child process per framework (\`node <entry>\`, no loaders), NODE_ENV=production, logging disabled, 127.0.0.1`,
    'Between runs': `wait until the server reports all client connections closed (abort after ${DRAIN_TIMEOUT_MS / 1000}s)`,
    'Headline metric': 'weighted harmonic mean of per-test median req/s (traffic-mix throughput)',
    'Validity': `pre-flight equivalence check per server start; a measured run with > ${MAX_ERROR_RATE * 100}% unexpected status/socket errors is INVALID`,
    ...quick.settings,
  }

  printConsole(summary, perTest, tests, frameworks)

  // ---- write files ----
  const dbSuffix = opts.db ? '-db' : ''
  const dbLabel = opts.db ? ' (with simulated DB)' : ''
  const chartFile = `results${dbSuffix}-chart.svg`
  const svg = generateBarChart(
    summary.map((s) => ({
      name: s.name,
      value: s.value ?? 0,
      range: [s.roundMin, s.roundMax],
      invalid: !s.valid,
      note: s.valid ? s.relative : 'INVALID (unexpected responses)',
    })),
    {
      title: `${cfg.title}${dbLabel} — traffic-mix req/s`,
      subtitle: `${env.node} · ${env.cpu} · ${opts.rounds}×(${opts.warmup}s+${opts.duration}s)/test · c${opts.connections} p${opts.pipelining} · whiskers = min–max across rounds`,
      unit: 'req/s',
      colors: Object.fromEntries(frameworks.filter((f) => f.color).map((f) => [f.name, f.color])),
    },
  )

  const names = frameworks.map((f) => f.name)
  let md = `# ${cfg.title} Results${dbLabel}\n\n` + quick.md
  md += `Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon). Generated ${env.date}.\n\n`
  md += `## Summary\n\n![Summary](results/${chartFile})\n\n`
  md += mdTable(
    ['Framework', 'traffic-mix req/s', 'spread across rounds', 'relative', 'weighted arithmetic avg', 'status'],
    summary.map((s) => [
      s.name, fmtInt(s.value), `${fmtInt(s.roundMin)} – ${fmtInt(s.roundMax)}`, s.relative, fmtInt(s.weightedArithmeticRps),
      s.valid ? 'ok' : `INVALID (${s.invalidTests.join(', ')})`,
    ]),
    'lrrrrl',
  )
  md += `\n"traffic-mix req/s" = weighted harmonic mean of the per-test medians, using the traffic weights below `
  md += `(the throughput of a server receiving that request mix). "weighted arithmetic avg" is shown for comparison only.\n\n`

  md += `## Per-Test Results (median req/s over rounds, ±CV)\n\n`
  md += mdTable(['Test', 'weight', ...names], tests.map((t) => [t.name, t.weight, ...frameworks.map((f) => {
    const c = perTest[t.name].frameworks[f.name]
    let s = `${fmtInt(c.medianRps)}${opts.rounds > 1 ? ` ±${fmtPct(c.cv, 0)}` : ''}`
    if (!c.valid) s += ` (INVALID, ${fmtPct(c.errorRate)} err)`
    return s
  })]), 'lr' + 'r'.repeat(names.length))
  md += `\n## Latency p99 (ms, median over rounds)\n\n`
  md += mdTable(['Test', ...names], tests.map((t) => [t.name, ...frameworks.map((f) => perTest[t.name].frameworks[f.name].latencyP99ms ?? '-')]), 'l' + 'r'.repeat(names.length))
  md += `\n`
  if (cfg.notes) md += cfg.notes + '\n\n'
  md += environmentMarkdown(env, versions, settings)

  const json = {
    title: cfg.title,
    mode: opts.db ? 'db' : 'pure',
    quick: opts.quick,
    only: opts.only,
    environment: env,
    versions,
    settings: {
      warmupSec: opts.warmup,
      durationSec: opts.duration,
      rounds: opts.rounds,
      connections: opts.connections,
      pipelining: opts.pipelining,
      workers: opts.workers,
      maxErrorRate: MAX_ERROR_RATE,
      drainTimeoutMs: DRAIN_TIMEOUT_MS,
      headlineMetric: 'weightedHarmonicMeanOfMedianRps',
    },
    summary: Object.fromEntries(summary.map((s) => [s.name, {
      mixRps: s.value && Math.round(s.value),
      weightedArithmeticRps: s.weightedArithmeticRps && Math.round(s.weightedArithmeticRps),
      roundMinRps: s.roundMin && Math.round(s.roundMin),
      roundMaxRps: s.roundMax && Math.round(s.roundMax),
      roundCv: s.roundCv,
      relative: s.relative,
      valid: s.valid,
      invalidTests: s.invalidTests,
    }])),
    perTest,
  }

  writeResultFiles(cfg.pkgDir, json, md, {
    prefix: opts.db ? 'db' : '',
    resultsDir: 'results',
    files: { [chartFile]: svg },
    scratch: opts.scratch,
  })

  if (summary.some((s) => !s.valid)) {
    console.error('\nWARNING: some results are INVALID (unexpected responses during measurement) — see table above.')
    process.exitCode = 2
  }
}

function printConsole(summary, perTest, tests, frameworks) {
  const table = {}
  for (const t of tests) {
    table[t.name] = {}
    for (const f of frameworks) {
      const c = perTest[t.name].frameworks[f.name]
      table[t.name][f.name] = `${fmtInt(c.medianRps)}${c.valid ? '' : ' INVALID'}`
    }
  }
  console.log('\n## Per-test median req/s\n')
  console.table(table)
  console.log('\n## Summary (weighted harmonic mean)\n')
  console.table(Object.fromEntries(summary.map((s) => [s.name, {
    'mix req/s': fmtInt(s.value),
    'rounds min–max': `${fmtInt(s.roundMin)} – ${fmtInt(s.roundMax)}`,
    relative: s.relative,
  }])))
}
