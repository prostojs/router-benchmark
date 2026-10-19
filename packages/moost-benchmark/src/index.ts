// @ts-ignore — plain JS module without type declarations
import { runHttpSuite } from 'bench-utils'
import { tests, validationChecks } from './routes.js'

const pkgDir = new URL('..', import.meta.url).pathname

// Every server — including the baselines — runs under the same loader (tsx, resolved from
// this package) and Node flags.
const tsxServer = (entry: string) => (key: string, db: boolean) => ({
  command: process.execPath,
  args: ['--import', 'tsx', new URL(entry, import.meta.url).pathname, key, ...(db ? ['--db'] : [])],
  cwd: pkgDir,
})

await runHttpSuite({
  pkgDir,
  title: 'DI Framework Benchmark',
  tests,
  extraChecks: validationChecks,
  frameworks: [
    { name: 'Moost', key: 'moost', color: '#58d68d' },
    { name: 'NestJS (Fastify)', key: 'nestjs-fastify', color: '#5dade2' },
    { name: 'NestJS (Express)', key: 'nestjs-express', color: '#bb8fce' },
  ],
  serverSpec: tsxServer('./server.ts'),
  // `--baselines`: also measure the underlying HTTP frameworks (servers from wooks-benchmark)
  // in the same run, so DI-layer overhead can be computed from one consistent measurement.
  baselines: [
    { name: 'Wooks (no DI)', key: 'wooks', color: '#a9dfbf' },
    { name: 'Fastify (no DI)', key: 'fastify', color: '#aed6f1' },
    { name: 'Express (no DI)', key: 'express', color: '#d7bde2' },
  ].map((f) => ({ ...f, serverSpec: tsxServer('../../wooks-benchmark/src/server.js') })),
  baselineVersions: {
    pkgDir: new URL('../../wooks-benchmark', import.meta.url).pathname,
    packages: ['@wooksjs/event-http', 'fastify', '@fastify/cookie', 'express', 'cookie-parser'],
  },
  versionPackages: [
    'moost', '@moostjs/event-http', '@wooksjs/event-http', 'wooks', '@prostojs/router',
    '@nestjs/core', '@nestjs/common', '@nestjs/platform-express', '@nestjs/platform-fastify',
    ['@nestjs/platform-express', 'express'], ['@nestjs/platform-fastify', 'fastify'],
    '@fastify/cookie', 'cookie-parser', 'reflect-metadata', 'rxjs', 'tsx', 'autocannon', 'ioredis',
  ],
})
