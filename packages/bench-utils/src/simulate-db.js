/**
 * Simulated DB for the `--db` mode of the HTTP benchmarks: every call is one real
 * Redis round-trip. Only `bench:`-prefixed keys are ever touched; SET keys expire
 * after 5 seconds.
 */
import net from 'node:net'
import { Redis } from 'ioredis'

export const REDIS_HOST = '127.0.0.1'
export const REDIS_PORT = 6379

export function createDb() {
  const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT, lazyConnect: false })
  return {
    get: (key) => redis.get('bench:' + key),
    set: (key) => redis.set('bench:' + key, '1', 'EX', 5),
    del: (key) => redis.del('bench:' + key),
  }
}

/** Resolves when Redis answers PING (used by the orchestrator before a `--db` run). */
export function checkRedis() {
  return new Promise((resolve, reject) => {
    const sock = net.connect(REDIS_PORT, REDIS_HOST)
    const timer = setTimeout(() => { sock.destroy(); reject(new Error('Redis PING timed out')) }, 2000)
    sock.on('connect', () => sock.write('PING\r\n'))
    sock.on('data', (d) => {
      clearTimeout(timer)
      sock.end()
      d.toString().startsWith('+PONG') ? resolve() : reject(new Error(`Unexpected Redis reply: ${d}`))
    })
    sock.on('error', (e) => { clearTimeout(timer); reject(e) })
  })
}
