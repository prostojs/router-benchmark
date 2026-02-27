# DI Framework Benchmark Results (with simulated DB)

Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon).

- **0.5s** per test, **100** connections, **10** pipelining
- **20** test cases covering auth, params, cookies, body parsing, wildcards, 404s
- Generated: 2026-02-27T09:46:55.019Z

## Summary

![Summary](results/results-db-chart.svg)

| Framework | avg req/s | speed | errors |
|-----------|----------|-------|--------|
| Moost | 49,415 | fastest | - |
| NestJS (Fastify) | 48,194 | 1.0x slower | - |
| NestJS (Express) | 37,296 | 1.3x slower | - |

## Per-Test Results

| Test | NestJS (Express) req/s | NestJS (Fastify) req/s | Moost req/s |
|------|---------|---------|---------|
| Short static | 51,504 | 80,032 | 82,976 |
| Login (set-cookie) | 31,544 | 37,136 | 33,744 |
| Wildcard + cache | 54,992 | 81,504 | 81,504 |
| Wildcard deep | 54,000 | 82,528 | 82,016 |
| Header-auth static | 45,456 | 57,904 | 52,816 |
| Header-auth param | 45,744 | 56,432 | 50,768 |
| Header-auth long static + cache | 44,176 | 56,048 | 51,056 |
| Header-auth POST small body | 33,776 | 38,928 | 35,344 |
| Header-auth FAIL (401) | 41,488 | 50,992 | 59,984 |
| Cookie-auth param+suffix | 39,376 | 50,064 | 49,456 |
| Cookie-auth two params | 39,056 | 50,288 | 49,136 |
| Cookie-auth four params | 37,520 | 50,224 | 48,432 |
| Cookie-auth POST small body | 28,376 | 33,904 | 33,936 |
| Cookie-auth PUT small body | 28,728 | 33,840 | 33,936 |
| Cookie-auth POST large body | 9,748 | 8,524 | 8,764 |
| Cookie-auth FAIL (401) | 38,992 | 50,000 | 58,000 |
| 404 short | 40,016 | 57,488 | 81,504 |
| 404 deep | 39,504 | 56,496 | 80,480 |
| POST large body + bad header-auth | 10,244 | 9,004 | 29,496 |
| POST large body + bad cookie-auth | 10,244 | 8,700 | 29,976 |

