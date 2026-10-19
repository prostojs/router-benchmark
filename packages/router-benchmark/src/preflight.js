// Pre-flight equivalence check: every router must agree on every lookup of every
// workload — same match / no-match outcome and the same named params.
import { buildWorkload } from './workloads.js'

// Wildcard captures are exposed under router-specific keys and shapes; only named params are compared.
const WILDCARD_KEYS = new Set(['*', '_', '0', 'path'])

function normalize(params) {
  if (params === null) return 'NO MATCH'
  const named = Object.keys(params).filter((k) => !WILDCARD_KEYS.has(k)).sort()
  return JSON.stringify(named.map((k) => [k, params[k]]))
}

/**
 * @param {Record<string, Function>} routers  key -> router adapter class
 * @returns {{ problems: string[], testCount: number }}  testCount = tests per router in this workload
 */
export function checkEquivalence(routers, variant, count, perTest) {
  const problems = []
  const { routes, tests } = buildWorkload(variant, count, perTest)
  const instances = Object.entries(routers).map(([key, Router]) => {
    const ri = new Router()
    ri.init()
    ri.registerRoutes(routes)
    return [key, ri]
  })
  const urls = new Map()
  for (const t of tests) for (const u of t.urls) urls.set(`${u[0]} ${u[1]}`, u)
  for (const [label, [method, path, expectMatch]] of urls) {
    const results = instances.map(([key, ri]) => [key, normalize(ri.lookup(method, path))])
    for (const [key, r] of results) {
      if (expectMatch === (r === 'NO MATCH')) problems.push(`${variant}/${routes.length}: ${key} ${label} -> ${r} (expected ${expectMatch ? 'a match' : 'no match'})`)
    }
    const distinct = new Set(results.map((r) => r[1]))
    if (distinct.size > 1) problems.push(`${variant}/${routes.length}: routers disagree on ${label}: ${results.map(([k, r]) => `${k}=${r}`).join(', ')}`)
  }
  return { problems, testCount: tests.length }
}
