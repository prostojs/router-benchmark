/**
 * Profile the Moost server handling requests using the Node.js inspector API.
 *
 * Usage: NODE_ENV=production node --import tsx ./src/profile.ts ["test name"] [duration_seconds]
 * (developer tool — profiles server and load generator in one process; not used for results)
 */
import { Session } from 'node:inspector/promises'
import { writeFileSync, mkdirSync } from 'node:fs'
// @ts-ignore — autocannon ships no type declarations
import autocannon from 'autocannon'
import { createServer } from './servers/moost/main.js'
import { tests } from './routes.js'

const testName = process.argv[2] || 'Short static'
const duration = parseFloat(process.argv[3]) || 5

async function main() {
  const addr = await createServer()
  const test = (tests as Array<{ name: string; path: string; method: string; headers: Record<string, string>; body?: string }>).find((t) => t.name === testName)
  if (!test) {
    console.error(`Test "${testName}" not found`)
    process.exit(1)
  }

  console.log(`Profiling "${test.name}" for ${duration}s on port ${addr.port}`)

  // Start CPU profiler
  const session = new Session()
  session.connect()
  await session.post('Profiler.enable')
  await session.post('Profiler.start')

  const result = await autocannon({
    url: `http://127.0.0.1:${addr.port}${test.path}`,
    method: test.method as 'GET',
    headers: test.headers,
    body: test.body,
    duration,
    connections: 10,
    pipelining: 1,
  })

  // Stop profiler and save
  const { profile } = await session.post('Profiler.stop')
  mkdirSync('./prof', { recursive: true })
  const outFile = `./prof/${testName.replaceAll(' ', '-').toLowerCase()}.cpuprofile`
  writeFileSync(outFile, JSON.stringify(profile))
  session.disconnect()

  console.log(`req/s: ${Math.round(result.requests.average)}`)
  console.log(`Profile saved to ${outFile}`)

  process.exit(0)
}

main().catch(console.error)
