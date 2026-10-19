// Deterministic route sets + lookup workloads, shared by the orchestrators,
// the pre-flight check and the per-router worker processes.
import { routes as longRoutes } from './routes.js'
import { tests as longTests } from './tests.js'
import { generateRoutes } from './generate-routes.js'
import { generateShortRoutes, generateShortTests } from './generate-short-routes.js'
import { generateMixedRoutes, generateMixedTests } from './generate-mixed-routes.js'

export const VARIANTS = {
  short: {
    label: 'Short Routes (2–5 segments)',
    description: 'Shallow paths like `/users/:id`, `/posts/:id/comments`.',
  },
  long: {
    label: 'Long Routes (deep enterprise API)',
    description: 'Deep paths like `/api/v1/organizations/:orgId/workspaces/:wsId/projects/:projectId`.',
  },
  mixed: {
    label: 'Mixed Routes (short + long)',
    description: 'Half short (2–5 segments) + half long (deep enterprise API) routes.',
  },
}

export const BASE_ROUTE_COUNT = longRoutes.length // 22

/**
 * @param {'short'|'long'|'mixed'} variant
 * @param {number} count  target route count
 * @param {boolean} perTest  long variant only: return every individual test (basic bench)
 *   instead of just the "All together" workload (scale bench)
 * @returns {{ routes: Array<{method,url}>, tests: Array<{name, urls: Array<[method: string, path: string, expectMatch: boolean]>}> }}
 */
export function buildWorkload(variant, count, perTest = false) {
  if (variant === 'short') {
    const routes = generateShortRoutes(count)
    return { routes, tests: [{ name: 'All together', urls: generateShortTests(routes) }] }
  }
  if (variant === 'mixed') {
    const routes = generateMixedRoutes(count)
    return { routes, tests: [{ name: 'All together', urls: generateMixedTests(routes) }] }
  }
  if (variant === 'long') {
    const routes = count <= longRoutes.length ? longRoutes : generateRoutes(count, longRoutes)
    const tests = perTest ? longTests : longTests.filter((t) => t.name === 'All together')
    return { routes, tests }
  }
  throw new Error(`Unknown variant ${variant}`)
}

