/**
 * Child-process side of the http-bench server protocol: start ONE framework server
 * (picked by argv[2], `--db` enables the simulated DB) and print `LISTENING:<port>`
 * once ready. The orchestrator stops it with SIGTERM.
 *
 * Kept out of the main entry so server processes load nothing but their framework.
 *
 * @param {Record<string, () => Promise<{ createServer: (o: { simulateDb?: boolean }) => Promise<{ port: number }> }>>} loaders
 */
export async function startServerEntry(loaders) {
  const key = process.argv[2]
  if (!Object.hasOwn(loaders, key)) {
    console.error(`Unknown framework "${key}". Expected one of: ${Object.keys(loaders).join(', ')}`)
    process.exit(1)
  }
  const { createServer } = await loaders[key]()
  const { port } = await createServer({ simulateDb: process.argv.includes('--db') })
  process.on('SIGTERM', () => process.exit(0))
  process.stdout.write(`LISTENING:${port}\n`)
}
