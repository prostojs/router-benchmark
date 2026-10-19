import { runHttpSuite } from 'bench-utils'
import { tests, validationChecks } from './routes.js'

const pkgDir = new URL('..', import.meta.url).pathname

await runHttpSuite({
  pkgDir,
  title: 'HTTP Framework Benchmark',
  tests,
  extraChecks: validationChecks,
  frameworks: [
    { name: 'Wooks', key: 'wooks', color: '#58d68d' },
    { name: 'Fastify', key: 'fastify', color: '#5dade2' },
    { name: 'h3', key: 'h3', color: '#f4d03f' },
    { name: 'Hono', key: 'hono', color: '#eb984e' },
    { name: 'Express', key: 'express', color: '#bb8fce' },
  ],
  serverSpec: (key, db) => ({
    command: process.execPath,
    args: [new URL('./server.js', import.meta.url).pathname, key, ...(db ? ['--db'] : [])],
    cwd: pkgDir,
  }),
  versionPackages: [
    'wooks', '@wooksjs/event-http', '@wooksjs/http-body', '@prostojs/router',
    'fastify', '@fastify/cookie', 'h3', 'hono', '@hono/node-server',
    'express', 'cookie-parser', 'autocannon', 'ioredis',
  ],
})
