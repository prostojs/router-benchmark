# DI Framework Benchmark Results

Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon).

- **0.5s** per test, **100** connections, **10** pipelining
- **20** test cases covering auth, params, cookies, body parsing, wildcards, 404s
- Generated: 2026-02-27T00:32:16.708Z

## Summary

![Summary](results/results-chart.svg)

| Framework | avg req/s | speed | errors |
|-----------|----------|-------|--------|
| Moost | 66,049 | fastest | - |
| NestJS (Fastify) | 60,196 | 1.1x slower | - |
| NestJS (Express) | 42,359 | 1.6x slower | - |

## Per-Test Results

| Test | NestJS (Express) req/s | NestJS (Fastify) req/s | Moost req/s |
|------|---------|---------|---------|
| Short static | 54,512 | 77,984 | 79,520 |
| Login (set-cookie) | 40,496 | 47,984 | 43,504 |
| Wildcard + cache | 54,000 | 80,032 | 79,008 |
| Wildcard deep | 50,992 | 81,504 | 77,984 |
| Header-auth static | 55,504 | 82,016 | 82,016 |
| Header-auth param | 54,992 | 80,992 | 79,520 |
| Header-auth long static + cache | 54,992 | 79,008 | 79,520 |
| Header-auth POST small body | 39,504 | 50,512 | 45,488 |
| Header-auth FAIL (401) | 40,016 | 50,480 | 58,512 |
| Cookie-auth param+suffix | 46,000 | 67,488 | 77,024 |
| Cookie-auth two params | 46,000 | 66,528 | 76,512 |
| Cookie-auth four params | 44,496 | 66,976 | 76,000 |
| Cookie-auth POST small body | 32,504 | 42,992 | 42,512 |
| Cookie-auth PUT small body | 32,488 | 42,512 | 42,000 |
| Cookie-auth POST large body | 10,564 | 9,300 | 9,300 |
| Cookie-auth FAIL (401) | 38,512 | 51,024 | 57,488 |
| 404 short | 38,992 | 56,016 | 77,472 |
| 404 deep | 38,992 | 56,016 | 78,496 |
| POST large body + bad header-auth | 10,244 | 9,004 | 28,984 |
| POST large body + bad cookie-auth | 9,924 | 9,004 | 29,000 |

