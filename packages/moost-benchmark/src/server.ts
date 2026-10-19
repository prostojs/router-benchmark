/**
 * Server process entry — starts ONE framework server and reports its port.
 *
 * Usage: node dist/server.js <framework> [--db]  (compiled with `pnpm build`)
 * Reports its port over the IPC channel (see bench-utils/server-entry). Started by the orchestrator
 * (dist/index.js) with NODE_ENV=production; killed with SIGTERM.
 * Each framework runs in its own process (also avoids reflect-metadata clashes).
 */
// @ts-ignore — plain JS module without type declarations
import { startServerEntry } from 'bench-utils/server-entry'

await startServerEntry({
  moost: () => import('./servers/moost/main.js'),
  'nestjs-express': () => import('./servers/nestjs-express/main.js'),
  'nestjs-fastify': () => import('./servers/nestjs-fastify/main.js'),
})
