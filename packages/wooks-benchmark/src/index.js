import { runHttpSuite } from 'bench-utils/http-bench'
import { tests, validationChecks } from './routes.js'

const pkgDir = new URL('..', import.meta.url).pathname
const serverSpec = { entry: new URL('./server.js', import.meta.url).pathname, cwd: pkgDir }

await runHttpSuite({
  pkgDir,
  title: 'HTTP Framework Benchmark',
  tests,
  extraChecks: validationChecks,
  frameworks: [
    { name: 'Wooks', key: 'wooks', color: '#58d68d', versions: ['wooks', '@wooksjs/event-http', '@wooksjs/http-body', '@prostojs/router'] },
    { name: 'Fastify', key: 'fastify', color: '#5dade2', versions: ['fastify', '@fastify/cookie'] },
    { name: 'h3', key: 'h3', color: '#f4d03f', versions: ['h3'] },
    { name: 'Hono', key: 'hono', color: '#eb984e', versions: ['hono', '@hono/node-server'] },
    { name: 'Express', key: 'express', color: '#bb8fce', versions: ['express', 'cookie-parser'] },
  ].map((f) => ({ ...f, serverSpec })),
})
