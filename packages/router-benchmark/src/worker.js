/**
 * Worker — measures ONE router on ONE workload in a fresh process, so JIT state,
 * inline caches and GC heap are never shared between routers.
 *
 * Usage: node --expose-gc src/worker.js '<json config>'
 *   config: { router, variant, count, perTest, warmupMs, samples, sampleMs }
 * Prints one line `RESULT:<json>` on stdout.
 */
import { routerLoaders } from './routers/index.js'
import { buildWorkload } from './workloads.js'

const cfg = JSON.parse(process.argv[2])
const Router = await routerLoaders[cfg.router]() // only the measured router is loaded
const ri = new Router()
ri.init()
const { routes, tests } = buildWorkload(cfg.variant, cfg.count, cfg.perTest)
ri.registerRoutes(routes)

const yieldToLoop = () => new Promise((r) => setImmediate(r))
const now = () => process.hrtime.bigint()

// The measured loop. Every lookup result is consumed (hit counter, verified at
// the end) and the params object escapes into a module-level sink, so neither the
// lookup nor the params materialization can be optimized away (escape analysis
// could otherwise drop the params allocation of an inlined lookup).
let sink = null
function runBatch(methods, paths, iterations) {
  const n = methods.length
  let hits = 0
  for (let i = 0; i < iterations; i++) {
    for (let k = 0; k < n; k++) {
      const p = ri.lookup(methods[k], paths[k])
      if (p !== null) { hits++; sink = p }
    }
  }
  return hits
}

const out = { name: ri.getName(), backend: ri.getBackend?.(), routeCount: routes.length, tests: {} }

for (const test of tests) {
  const methods = test.urls.map((u) => u[0])
  const paths = test.urls.map((u) => u[1])
  const hitsPerIteration = test.urls.filter((u) => u[2]).length // u = [method, path, expectMatch]

  // Warmup (time-based) — also calibrates the batch size so one sample lasts ~sampleMs
  let iterations = 1
  let opsPerMs = 0
  const warmupEnd = now() + BigInt(Math.round(cfg.warmupMs * 1e6))
  do {
    const t0 = now()
    runBatch(methods, paths, iterations)
    const ms = Number(now() - t0) / 1e6
    opsPerMs = (iterations * methods.length) / Math.max(ms, 1e-3)
    if (ms < 5) iterations *= 2
    await yieldToLoop()
  } while (now() < warmupEnd)
  iterations = Math.max(1, Math.round((opsPerMs * cfg.sampleMs) / methods.length))

  if (global.gc) global.gc()
  await yieldToLoop()

  const samples = []
  let hits = 0
  for (let s = 0; s < cfg.samples; s++) {
    const t0 = now()
    hits += runBatch(methods, paths, iterations)
    const ms = Number(now() - t0) / 1e6
    samples.push((iterations * methods.length) / ms)
    await yieldToLoop() // let deferred work (e.g. Express' setImmediate) run outside the timed region
  }

  const expectedHits = hitsPerIteration * iterations * cfg.samples
  if (hits !== expectedHits) {
    console.error(`${cfg.router} / ${test.name}: ${hits} hits, expected ${expectedHits}`)
    process.exit(1)
  }
  out.tests[test.name] = { samples }
}

out.sinkType = typeof sink // keeps the sink observable
process.stdout.write('RESULT:' + JSON.stringify(out) + '\n')
