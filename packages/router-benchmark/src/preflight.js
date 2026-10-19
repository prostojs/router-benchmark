// Pre-flight equivalence check: every router must agree on every lookup of every
// workload — same match / no-match outcome and the same named params.
import { routers } from './routers/index.js'
import { buildWorkload, isExpected404 } from './workloads.js'

// Wildcard captures are exposed under router-specific keys and shapes; only named params are compared.
const WILDCARD_KEYS = new Set(['*', '_', '0', 'path'])

function normalize(params) {
  if (params === null) return 'NO MATCH'
  const named = Object.keys(params).filter((k) => !WILDCARD_KEYS.has(k)).sort()
  return JSON.stringify(named.map((k) => [k, params[k]]))
}

/** @returns {string[]} problems */
export function checkEquivalence(routerKeys, variant, count, perTest) {
  const problems = []
  const { routes, tests } = buildWorkload(variant, count, perTest)
  const instances = routerKeys.map((key) => {
    const ri = new routers[key]()
    ri.init()
    ri.registerRoutes(routes)
    return [key, ri]
  })
  const urls = new Map()
  for (const t of tests) for (const u of t.urls) urls.set(u.join(' '), u)
  for (const [label, [method, path]] of urls) {
    const results = instances.map(([key, ri]) => [key, normalize(ri.lookup(method, path))])
    const expected404 = isExpected404(path)
    for (const [key, r] of results) {
      if (expected404 !== (r === 'NO MATCH')) problems.push(`${variant}/${routes.length}: ${key} ${label} -> ${r} (expected ${expected404 ? 'no match' : 'a match'})`)
    }
    const distinct = new Set(results.map((r) => r[1]))
    if (distinct.size > 1) problems.push(`${variant}/${routes.length}: routers disagree on ${label}: ${results.map(([k, r]) => `${k}=${r}`).join(', ')}`)
  }
  return problems
}
