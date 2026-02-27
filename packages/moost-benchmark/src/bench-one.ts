/**
 * Benchmark worker — runs ONE framework in an isolated process.
 *
 * Usage:  tsx src/bench-one.ts <framework> [duration]
 *   framework: "moost" | "nestjs-express" | "nestjs-fastify"
 *   duration:  seconds per test (default: 0.5)
 *
 * Outputs a single JSON line to stdout (prefixed with "RESULT:").
 */
import { EventEmitter } from 'node:events'
EventEmitter.defaultMaxListeners = 0

import type { Server } from 'node:http'
import { runBenchmark } from './run-bench.js'
import { tests } from './routes.js'

const fwName = process.argv[2]
const duration = parseFloat(process.argv[3]) || 0.5

type CreateServer = () => Promise<{ server: Server; close: () => Promise<void> }>

async function loadCreateServer(fw: string): Promise<{ name: string; createServer: CreateServer }> {
  switch (fw) {
    case 'moost': {
      const m = await import('./servers/moost/main.js')
      return { name: 'Moost', createServer: m.createServer }
    }
    case 'nestjs-express': {
      await import('reflect-metadata')
      const m = await import('./servers/nestjs-express/main.js')
      return { name: 'NestJS (Express)', createServer: m.createServer }
    }
    case 'nestjs-fastify': {
      await import('reflect-metadata')
      const m = await import('./servers/nestjs-fastify/main.js')
      return { name: 'NestJS (Fastify)', createServer: m.createServer }
    }
    default:
      throw new Error(`Unknown framework: ${fw}`)
  }
}

async function main() {
  const { name, createServer } = await loadCreateServer(fwName)
  const { server, close } = await createServer()
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : address
  const baseUrl = `http://localhost:${port}`

  // Warmup: hit each test route once so frameworks finish lazy init
  for (const test of tests) {
    try {
      await fetch(`${baseUrl}${test.path}`, {
        method: test.method,
        headers: test.headers,
        body: test.body,
      })
    } catch {}
  }

  await new Promise((r) => setTimeout(r, 500))

  process.stderr.write(`Benchmarking ${name}`)
  const result = await runBenchmark({
    baseUrl,
    name,
    tests,
    duration,
    connections: 100,
    pipelining: 10,
  })
  await close()

  process.stderr.write(` done\n`)

  // Output result as JSON on stdout
  console.log('RESULT:' + JSON.stringify(result))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
