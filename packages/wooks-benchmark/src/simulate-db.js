import { Redis } from 'ioredis'

/**
 * Create a Redis-backed DB simulator.
 * Each call does a real Redis round-trip (GET/SET/DEL).
 * SET keys auto-expire after 5 seconds.
 */
export function createDb() {
  const redis = new Redis({ host: '127.0.0.1', port: 6379, lazyConnect: false })
  return {
    get: (key) => redis.get('bench:' + key),
    set: (key) => redis.set('bench:' + key, '1', 'EX', 5),
    del: (key) => redis.del('bench:' + key),
  }
}
