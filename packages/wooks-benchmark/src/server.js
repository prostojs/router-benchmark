/**
 * Server process entry — starts ONE framework server and reports its port.
 *
 * Usage: node src/server.js <framework> [--db]
 * Reports its port over the IPC channel (see bench-utils/server-entry). Started by the orchestrator
 * (src/index.js) with NODE_ENV=production; killed with SIGTERM.
 */
import { startServerEntry } from 'bench-utils/server-entry'

await startServerEntry({
  wooks: () => import('./servers/wooks.js'),
  express: () => import('./servers/express.js'),
  fastify: () => import('./servers/fastify.js'),
  h3: () => import('./servers/h3.js'),
  hono: () => import('./servers/hono.js'),
})
