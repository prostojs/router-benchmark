/**
 * Child-process side of the http-bench server protocol (Node IPC channel):
 *   - start ONE framework server (picked by argv[2]; `--db` enables the simulated DB)
 *     and send `{ type: 'listening', port }`;
 *   - on `{ type: 'drain', timeoutMs }` reply `{ type: 'drained', open }` once no client
 *     connection is open any more (or when the timeout expires, with the count still open).
 * The orchestrator only sends `drain` between measured runs, never during one.
 * The server is stopped with SIGTERM (or when the orchestrator goes away).
 *
 * Kept out of the main entry so server processes load nothing but their framework.
 *
 * @param {Record<string, () => Promise<{ createServer: (o: { simulateDb: boolean }) => Promise<{ server: import('node:http').Server }> }>>} loaders
 *   each framework's `createServer` resolves with its listening node:http server
 */
export async function startServerEntry(loaders) {
  const key = process.argv[2]
  if (!Object.hasOwn(loaders, key)) {
    console.error(`Unknown framework "${key}". Expected one of: ${Object.keys(loaders).join(', ')}`)
    process.exit(1)
  }
  if (!process.send) {
    console.error('server entry must be started by the benchmark orchestrator (IPC channel required)')
    process.exit(1)
  }
  const { createServer } = await loaders[key]()
  const { server } = await createServer({ simulateDb: process.argv.includes('--db') })

  // Open client connections, so the orchestrator can wait until the previous run's
  // sockets (destroyed by autocannon, possibly mid-request) are fully gone.
  let open = 0
  let onIdle = null
  server.on('connection', (socket) => {
    open++
    socket.once('close', () => {
      if (--open === 0 && onIdle) onIdle()
    })
  })

  process.on('message', (msg) => {
    if (msg?.type !== 'drain') return
    const reply = () => {
      clearTimeout(timer)
      onIdle = null
      process.send({ type: 'drained', open })
    }
    const timer = setTimeout(reply, msg.timeoutMs)
    if (open === 0) reply()
    else onIdle = reply
  })
  process.on('SIGTERM', () => process.exit(0))
  process.on('disconnect', () => process.exit(0))
  process.send({ type: 'listening', port: server.address().port })
}
