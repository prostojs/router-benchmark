// Generates mixed route sets — half short (2-5 segments) + half long (deep enterprise API).
// Exercises routers with both shallow many-prefix and deep shared-prefix routes in the same tree.

import { generateShortRoutes, generateShortTests } from './generate-short-routes.js'
import { generateRoutes } from './generate-routes.js'

export function generateMixedRoutes(target) {
  const half = Math.ceil(target / 2)
  const shortRoutes = generateShortRoutes(half)
  const longRoutes = generateRoutes(half)

  // Deduplicate by method:url
  const seen = new Set()
  const routes = []

  for (const r of shortRoutes) {
    const key = `${r.method}:${r.url}`
    if (!seen.has(key)) {
      seen.add(key)
      routes.push(r)
    }
  }
  for (const r of longRoutes) {
    const key = `${r.method}:${r.url}`
    if (!seen.has(key)) {
      seen.add(key)
      routes.push(r)
    }
  }

  return routes.slice(0, target)
}

// Generate test URLs for a mixed route set — picks from both short and long segments.
// Each URL is [method, path, expectMatch].
export function generateMixedTests(routes) {
  const shortRoutes = routes.filter(r => !r.url.startsWith('/api/v1/'))
  const longRoutes = routes.filter(r => r.url.startsWith('/api/v1/'))

  function fillParams(url) {
    return url
      .replace(/\*/g, 'assets/images/hero-banner.webp')
      .replace(/:(\w+)/g, (_, name) => `${name}_val`)
  }

  function spread(arr, count) {
    if (arr.length <= count) return arr
    const step = arr.length / count
    const result = []
    for (let i = 0; i < count; i++) {
      result.push(arr[Math.floor(i * step)])
    }
    return result
  }

  const urls = []

  // Short routes: pick statics + parametric
  const shortStatics = shortRoutes.filter(r => !r.url.includes(':') && !r.url.includes('*'))
  const shortParam = shortRoutes.filter(r => r.url.includes(':'))
  for (const r of spread(shortStatics, 2)) urls.push([r.method, r.url, true])
  for (const r of spread(shortParam, 4)) urls.push([r.method, fillParams(r.url), true])

  // Long routes: pick statics + parametric
  const longStatics = longRoutes.filter(r => !r.url.includes(':') && !r.url.includes('*'))
  const longParam = longRoutes.filter(r => r.url.includes(':'))
  for (const r of spread(longStatics, 2)) urls.push([r.method, r.url, true])
  for (const r of spread(longParam, 4)) urls.push([r.method, fillParams(r.url), true])

  // 404
  urls.push(['GET', '/not/found', false])
  urls.push(['GET', '/api/v1/this/does/not/exist', false])

  return urls
}
