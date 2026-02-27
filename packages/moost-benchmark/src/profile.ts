/**
 * Profile the Moost server handling requests using the Node.js inspector API.
 *
 * Usage: tsx ./src/profile.ts ["test name"] [duration_seconds]
 */
import { Session } from 'node:inspector/promises'
import { writeFileSync } from 'node:fs'
import autocannon from 'autocannon'
import { createServer } from './servers/moost/main.js'
import { tests } from './routes.js'

const testName = process.argv[2] || 'Short static'
const duration = parseFloat(process.argv[3]) || 5

async function main() {
  const { server, close } = await createServer()
  const addr = server.address() as { port: number }
  const test = tests.find((t) => t.name === testName)
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
  const outFile = `./prof/${testName.replaceAll(' ', '-').toLowerCase()}.cpuprofile`
  writeFileSync(outFile, JSON.stringify(profile))
  session.disconnect()

  console.log(`req/s: ${Math.round(result.requests.average)}`)
  console.log(`Profile saved to ${outFile}`)

  await close()
}

main().catch(console.error)
