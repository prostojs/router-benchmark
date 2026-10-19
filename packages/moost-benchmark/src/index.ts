// @ts-ignore — plain JS module without type declarations
import { runHttpSuite } from 'bench-utils/http-bench'
import { tests, validationChecks } from './routes.js'

// Runs from the compiled `dist/` (`pnpm build`): every server — DI frameworks and
// baselines alike — is started as plain `node <entry>`, no loader.
const pkgDir = new URL('..', import.meta.url).pathname
const moostServer = { entry: new URL('./server.js', import.meta.url).pathname, cwd: pkgDir }
const baselineServer = {
  entry: new URL('../../wooks-benchmark/src/server.js', import.meta.url).pathname,
  cwd: new URL('../../wooks-benchmark/', import.meta.url).pathname,
}
const nestPackages = ['@nestjs/core', '@nestjs/common', 'reflect-metadata', 'rxjs']

await runHttpSuite({
  pkgDir,
  title: 'DI Framework Benchmark',
  tests,
  extraChecks: validationChecks,
  frameworks: [
    {
      name: 'Moost', key: 'moost', color: '#58d68d', serverSpec: moostServer,
      versions: ['moost', '@moostjs/event-http', '@wooksjs/event-http', 'wooks', '@prostojs/router'],
    },
    {
      name: 'NestJS (Fastify)', key: 'nestjs-fastify', color: '#5dade2', serverSpec: moostServer,
      versions: [...nestPackages, '@nestjs/platform-fastify', ['@nestjs/platform-fastify', 'fastify'], '@fastify/cookie'],
    },
    {
      name: 'NestJS (Express)', key: 'nestjs-express', color: '#bb8fce', serverSpec: moostServer,
      versions: [...nestPackages, '@nestjs/platform-express', ['@nestjs/platform-express', 'express'], 'cookie-parser'],
    },
    // `--baselines`: also measure the underlying HTTP frameworks (servers from wooks-benchmark)
    // in the same run, so DI-layer overhead can be computed from one consistent measurement.
    { name: 'Wooks (no DI)', key: 'wooks', color: '#a9dfbf', versions: ['@wooksjs/event-http'] },
    { name: 'Fastify (no DI)', key: 'fastify', color: '#aed6f1', versions: ['fastify', '@fastify/cookie'] },
    { name: 'Express (no DI)', key: 'express', color: '#d7bde2', versions: ['express', 'cookie-parser'] },
  ].map((f) => f.serverSpec ? f : { ...f, serverSpec: baselineServer, optional: true }),
})
