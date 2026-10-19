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
 *   1. spawn server, wait for `LISTENING:<port>` on its stdout
 *   2. pre-flight equivalence check: every test is sent once and status, body and
 *      relevant headers are compared with the expected values — any mismatch aborts
 *   3. for every test: warmup run (discarded) + measured run
 *   4. kill server
 * Framework order is rotated between rounds. Per-test result = median over rounds.
 */
import { spawn } from 'node:child_process'
import net from 'node:net'
import autocannon from 'autocannon'
import { describe, weightedHarmonicMean, weightedArithmeticMean, rotate, fmtInt, fmtPct } from './stats.js'
import { collectEnvironment, resolveVersions, environmentMarkdown } from './env.js'
import { generateBarChart } from './svg-bar-chart.js'
import { writeResultFiles } from './write-results.js'
import { parseFlags, parseOnly } from './args.js'

const MAX_ERROR_RATE = 0.001 // a measured run with >0.1% unexpected responses/errors is INVALID

const DEFAULTS = { warmup: 2, duration: 5, rounds: 3, connections: 100, pipelining: 10, workers: 0 }
const QUICK = { warmup: 1, duration: 1, rounds: 1 }
// autocannon only checks its stop condition on its 1s sampling tick, so runs shorter
// than 1s are not honoured (a "0.5s" run really lasts ~1s and is a single sample).
const MIN_DURATION = 1

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
 *   --baselines         also run the suite's optional baseline frameworks (cfg.baselines)
 *   <number>            legacy positional: measured seconds per test
 */
export function parseHttpBenchArgs(argv = process.argv.slice(2)) {
  const { flags, positional } = parseFlags(argv, ['quick', 'db', 'baselines'])
  const quick = !!flags.quick
  const base = quick ? { ...DEFAULTS, ...QUICK } : DEFAULTS
  const num = (name, envName) => {
    const raw = flags[name] ?? process.env[envName]
    const n = raw == null ? NaN : Number(raw)
    return Number.isFinite(n) ? n : base[name]
  }
  const opts = {
    quick,
    db: !!flags.db,
    baselines: !!flags.baselines,
    warmup: num('warmup', 'BENCH_WARMUP'),
    duration: num('duration', 'BENCH_DURATION'),
    rounds: Math.max(1, Math.round(num('rounds', 'BENCH_ROUNDS'))),
    connections: num('connections', 'BENCH_CONNECTIONS'),
    pipelining: num('pipelining', 'BENCH_PIPELINING'),
    workers: num('workers', 'BENCH_WORKERS'),
    only: parseOnly(flags),
  }
  const legacyDuration = positional.map(Number).find((n) => Number.isFinite(n) && n > 0)
  if (legacyDuration && flags.duration == null) opts.duration = legacyDuration
  opts.duration = Math.max(MIN_DURATION, opts.duration)
  if (opts.warmup > 0) opts.warmup = Math.max(MIN_DURATION, opts.warmup)
  return opts
}

async function checkRedis() {
  await new Promise((resolve, reject) => {
    const sock = net.connect(6379, '127.0.0.1')
    const timer = setTimeout(() => { sock.destroy(); reject(new Error('Redis PING timed out')) }, 2000)
    sock.on('connect', () => sock.write('PING\r\n'))
    sock.on('data', (d) => {
      clearTimeout(timer)
      sock.end()
      d.toString().startsWith('+PONG') ? resolve() : reject(new Error(`Unexpected Redis reply: ${d}`))
    })
    sock.on('error', (e) => { clearTimeout(timer); reject(e) })
  })
}

let currentChild = null
process.on('exit', () => { if (currentChild) currentChild.kill('SIGKILL') })
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { if (currentChild) currentChild.kill('SIGKILL'); process.exit(130) })
}

function startServer(spec, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    currentChild = child
    let buf = ''
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`${label}: server did not start within 60s`)) }, 60000)
    child.stdout.on('data', (chunk) => {
      buf += chunk.toString()
      const m = buf.match(/LISTENING:(\d+)/)
      if (m) {
        clearTimeout(timer)
        child.stdout.removeAllListeners('data')
        child.stdout.resume()
        resolve({ child, port: Number(m[1]) })
      }
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`${label}: server exited early with code ${code}`))
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

/** Send every test once and compare with the expected response. Returns a list of problems. */
export async function preflight(baseUrl, tests) {
  const problems = []
  for (const t of tests) {
    let res, body
    try {
      res = await fetch(baseUrl + t.path, { method: t.method, headers: t.headers, body: t.body })
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
    if (t.forbidSetCookie && res.headers.getSetCookie().length) problems.push(`${t.name}: unexpected Set-Cookie ${JSON.stringify(res.headers.getSetCookie())}`)
  }
  return problems
}

/**
 * autocannon stops by destroying its sockets, possibly mid-request (e.g. halfway
 * through a 25 KB body). Give the server time to drain those before the next run,
 * otherwise the next run's connects can fail while the server is still busy.
 */
async function settle(baseUrl) {
  await new Promise((r) => setTimeout(r, 300))
  try { await (await fetch(baseUrl + '/health')).text() } catch {}
  await new Promise((r) => setTimeout(r, 50))
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
  const expected = new Set([String(test.expect ?? 200)])
  let responses = 0
  let unexpected = 0
  for (const [code, { count }] of Object.entries(result.statusCodeStats ?? {})) {
    responses += count
    if (!expected.has(code)) unexpected += count
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
 * Run the whole suite and write results.
 *
 * @param {object} cfg
 * @param {string} cfg.pkgDir
 * @param {string} cfg.title                 markdown/chart title
 * @param {Array<{name:string,key:string,color?:string,serverSpec?:Function}>} cfg.frameworks
 * @param {Array<object>} [cfg.baselines]   extra frameworks run only with --baselines
 * @param {{pkgDir: string, packages: Array<string|[string,string]>}} [cfg.baselineVersions]  where the baseline servers resolve their deps from
 * @param {Array<object>} cfg.tests          test cases (see saas-api.js)
 * @param {Array<object>} [cfg.extraChecks]  pre-flight-only checks (not measured)
 * @param {(key:string, db:boolean) => {command:string,args:string[],cwd:string}} cfg.serverSpec
 * @param {Array<string|[string,string]>} cfg.versionPackages
 * @param {string} [cfg.notes]               extra markdown appended to methodology
 */
export async function runHttpSuite(cfg) {
  const opts = parseHttpBenchArgs()
  const all = opts.baselines ? [...cfg.frameworks, ...(cfg.baselines ?? [])] : cfg.frameworks
  const frameworks = opts.only ? all.filter((f) => opts.only.includes(f.key)) : all
  const tests = cfg.tests
  const perServer = tests.length * (opts.warmup + opts.duration + (opts.warmup > 0 ? 1.4 : 0.7)) + 3
  const estimate = Math.ceil((perServer * frameworks.length * opts.rounds) / 60)

  console.log(`${cfg.title}${opts.db ? ' (simulated DB)' : ''}`)
  console.log(`warmup ${opts.warmup}s + measure ${opts.duration}s per test, ${opts.rounds} round(s), ` +
    `${opts.connections} connections, pipelining ${opts.pipelining}, ${tests.length} tests, ${frameworks.length} frameworks`)
  console.log(`estimated duration: ~${estimate} min${opts.quick ? '  [QUICK MODE — numbers are not meaningful]' : ''}\n`)

  if (opts.db) {
    try { await checkRedis() } catch (e) {
      console.error(`--db requires Redis on 127.0.0.1:6379: ${e.message}`)
      process.exit(1)
    }
  }

  // raw[fw][test] = per-round evaluations
  const raw = Object.fromEntries(frameworks.map((f) => [f.name, Object.fromEntries(tests.map((t) => [t.name, []]))]))

  for (let r = 0; r < opts.rounds; r++) {
    const order = rotate(frameworks, r)
    console.log(`Round ${r + 1}/${opts.rounds}: ${order.map((f) => f.name).join(' -> ')}`)
    for (const fw of order) {
      const { child, port } = await startServer((fw.serverSpec ?? cfg.serverSpec)(fw.key, opts.db), fw.name)
      const baseUrl = `http://127.0.0.1:${port}`
      try {
        const problems = await preflight(baseUrl, [...tests, ...(cfg.extraChecks ?? [])])
        if (problems.length) {
          console.error(`\nPRE-FLIGHT EQUIVALENCE CHECK FAILED for ${fw.name}:\n  - ${problems.join('\n  - ')}`)
          await stopServer(child)
          process.exit(1)
        }
        process.stdout.write(`  ${fw.name.padEnd(20)} `)
        for (const test of tests) {
          if (opts.warmup > 0) {
            await cannon(baseUrl, test, opts, opts.warmup)
            await settle(baseUrl)
          }
          const ev = evaluate(test, await cannon(baseUrl, test, opts, opts.duration))
          await settle(baseUrl)
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

  const summary = frameworks.map((fw) => {
    const cells = tests.map((t) => ({ weight: t.weight, value: perTest[t.name].frameworks[fw.name].medianRps }))
    const perRound = []
    for (let r = 0; r < opts.rounds; r++) {
      perRound.push(weightedHarmonicMean(tests.map((t) => ({ weight: t.weight, value: raw[fw.name][t.name][r]?.rps }))))
    }
    const rd = describe(perRound)
    const invalidTests = tests.filter((t) => !perTest[t.name].frameworks[fw.name].valid).map((t) => t.name)
    return {
      name: fw.name,
      key: fw.key,
      color: fw.color,
      mixRps: weightedHarmonicMean(cells),
      weightedArithmeticRps: weightedArithmeticMean(cells),
      roundMin: rd.min,
      roundMax: rd.max,
      roundCv: rd.cv,
      valid: invalidTests.length === 0,
      invalidTests,
    }
  }).sort((a, b) => (b.valid - a.valid) || (b.mixRps - a.mixRps))

  const env = collectEnvironment()
  const versions = resolveVersions(cfg.pkgDir, cfg.versionPackages)
  if (opts.baselines && cfg.baselineVersions) {
    for (const [name, v] of Object.entries(resolveVersions(cfg.baselineVersions.pkgDir, cfg.baselineVersions.packages))) {
      versions[`${name} (baselines)`] = v
    }
  }
  const settings = {
    'Mode': opts.db ? 'simulated DB (one Redis round-trip per authenticated request)' : 'pure framework overhead',
    'Warmup per test': `${opts.warmup}s (discarded)`,
    'Measured per test': `${opts.duration}s`,
    'Rounds': `${opts.rounds} (fresh server process per round, framework order rotated; per-test value = median)`,
    'Load generator': `autocannon, ${opts.connections} connections, pipelining ${opts.pipelining}${opts.workers ? `, ${opts.workers} workers` : ''}, in orchestrator process`,
    'Server process': 'one child process per framework, NODE_ENV=production, logging disabled, 127.0.0.1',
    'Headline metric': 'weighted harmonic mean of per-test median req/s (traffic-mix throughput)',
    'Validity': `pre-flight equivalence check per server start; a measured run with > ${MAX_ERROR_RATE * 100}% unexpected status/socket errors is INVALID`,
  }
  if (opts.quick) settings['QUICK MODE'] = 'smoke test only — numbers are NOT meaningful'

  printConsole(summary, perTest, tests, frameworks)

  // ---- write files ----
  const dbSuffix = opts.db ? '-db' : ''
  const dbLabel = opts.db ? ' (with simulated DB)' : ''
  const chartFile = `results${dbSuffix}-chart.svg`
  const svg = generateBarChart(
    summary.map((s) => ({ name: s.name, value: s.mixRps ?? 0, range: [s.roundMin, s.roundMax], invalid: !s.valid })),
    {
      title: `${cfg.title}${dbLabel} — traffic-mix req/s`,
      subtitle: `${env.node} · ${env.cpu} · ${opts.rounds}×(${opts.warmup}s+${opts.duration}s)/test · c${opts.connections} p${opts.pipelining} · whiskers = min–max across rounds`,
      unit: 'req/s',
      colors: Object.fromEntries(frameworks.filter((f) => f.color).map((f) => [f.name, f.color])),
    },
  )

  let md = `# ${cfg.title} Results${dbLabel}\n\n`
  if (opts.quick) md += `> **QUICK MODE — smoke test only, numbers are not meaningful.**\n\n`
  md += `Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon). Generated ${env.date}.\n\n`
  md += `## Summary\n\n![Summary](results/${chartFile})\n\n`
  md += `| Framework | traffic-mix req/s | spread across rounds | relative | weighted arithmetic avg | status |\n`
  md += `|-----------|------------------:|---------------------:|---------:|------------------------:|--------|\n`
  const best = summary.find((s) => s.valid) ?? summary[0]
  for (const s of summary) {
    const rel = s === best ? 'fastest' : s.valid ? `${(best.mixRps / s.mixRps).toFixed(2)}x slower` : '-'
    const status = s.valid ? 'ok' : `INVALID (${s.invalidTests.join(', ')})`
    md += `| ${s.name} | ${fmtInt(s.mixRps)} | ${fmtInt(s.roundMin)} – ${fmtInt(s.roundMax)} | ${rel} | ${fmtInt(s.weightedArithmeticRps)} | ${status} |\n`
  }
  md += `\n"traffic-mix req/s" = weighted harmonic mean of the per-test medians, using the traffic weights below `
  md += `(the throughput of a server receiving that request mix). "weighted arithmetic avg" is shown for comparison only.\n\n`

  md += `## Per-Test Results (median req/s over rounds, ±CV)\n\n`
  md += `| Test | weight | ${frameworks.map((f) => f.name).join(' | ')} |\n`
  md += `|------|-------:|${frameworks.map(() => '---:').join('|')}|\n`
  for (const t of tests) {
    const cells = frameworks.map((f) => {
      const c = perTest[t.name].frameworks[f.name]
      let s = `${fmtInt(c.medianRps)}${opts.rounds > 1 ? ` ±${fmtPct(c.cv, 0)}` : ''}`
      if (!c.valid) s += ` (INVALID, ${fmtPct(c.errorRate)} err)`
      return s
    })
    md += `| ${t.name} | ${t.weight} | ${cells.join(' | ')} |\n`
  }
  md += `\n## Latency p99 (ms, median over rounds)\n\n`
  md += `| Test | ${frameworks.map((f) => f.name).join(' | ')} |\n|------|${frameworks.map(() => '---:').join('|')}|\n`
  for (const t of tests) {
    md += `| ${t.name} | ${frameworks.map((f) => perTest[t.name].frameworks[f.name].latencyP99ms ?? '-').join(' | ')} |\n`
  }
  md += `\n`
  if (cfg.notes) md += cfg.notes + '\n\n'
  md += environmentMarkdown(env, versions, settings)

  const json = {
    title: cfg.title,
    mode: opts.db ? 'db' : 'pure',
    // partial (--only) runs are not publishable either → written to .quick/ like smoke runs
    quick: opts.quick || !!opts.only,
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
      headlineMetric: 'weightedHarmonicMeanOfMedianRps',
    },
    summary: Object.fromEntries(summary.map((s) => [s.name, {
      mixRps: s.mixRps && Math.round(s.mixRps),
      weightedArithmeticRps: s.weightedArithmeticRps && Math.round(s.weightedArithmeticRps),
      roundMinRps: s.roundMin && Math.round(s.roundMin),
      roundMaxRps: s.roundMax && Math.round(s.roundMax),
      roundCv: s.roundCv,
      valid: s.valid,
      invalidTests: s.invalidTests,
    }])),
    perTest,
  }

  writeResultFiles(cfg.pkgDir, json, md, {
    prefix: opts.db ? 'db' : '',
    resultsDir: 'results',
    svgCharts: { [chartFile]: svg },
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
  const best = summary.find((s) => s.valid) ?? summary[0]
  const st = {}
  for (const s of summary) {
    st[s.name] = {
      'mix req/s': fmtInt(s.mixRps),
      'rounds min–max': `${fmtInt(s.roundMin)} – ${fmtInt(s.roundMax)}`,
      relative: s === best ? 'fastest' : s.valid ? `${(best.mixRps / s.mixRps).toFixed(2)}x slower` : 'INVALID',
    }
  }
  console.log('\n## Summary (weighted harmonic mean)\n')
  console.table(st)
}
