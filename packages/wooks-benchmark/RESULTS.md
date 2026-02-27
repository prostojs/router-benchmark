# HTTP Framework Benchmark Results

Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon).

- **0.5s** per test, **100** connections, **10** pipelining
- **20** test cases covering auth, params, cookies, body parsing, wildcards, 404s
- Generated: 2026-02-27T00:28:14.662Z

## Summary

![Summary](results/results-chart.svg)

| Framework | avg req/s | speed | errors |
|-----------|----------|-------|--------|
| Wooks | 70,332 | fastest | - |
| Fastify | 68,273 | 1.0x slower | - |
| h3 | 64,860 | 1.1x slower | - |
| Hono | 59,466 | 1.2x slower | - |
| Express | 47,147 | 1.5x slower | - |

## Per-Test Results

| Test | Express req/s | Wooks req/s | Fastify req/s | h3 req/s | Hono req/s |
|------|---------|---------|---------|---------|---------|
| Short static | 58,512 | 89,504 | 87,520 | 81,184 | 85,472 |
| Login (set-cookie) | 43,504 | 45,488 | 53,488 | 67,296 | 35,504 |
| Wildcard + cache | 56,496 | 80,480 | 85,472 | 76,384 | 75,488 |
| Wildcard deep | 58,000 | 84,512 | 85,984 | 75,808 | 76,000 |
| Header-auth static | 60,496 | 80,480 | 88,480 | 82,144 | 77,024 |
| Header-auth param | 58,992 | 78,496 | 85,984 | 78,752 | 76,512 |
| Header-auth long static + cache | 58,992 | 77,984 | 82,528 | 78,304 | 72,032 |
| Header-auth POST small body | 43,984 | 50,000 | 55,984 | 69,664 | 38,000 |
| Header-auth FAIL (401) | 60,016 | 69,472 | 87,968 | 78,752 | 74,016 |
| Cookie-auth param+suffix | 49,008 | 82,016 | 73,504 | 66,144 | 64,016 |
| Cookie-auth two params | 48,016 | 82,528 | 73,504 | 65,632 | 63,504 |
| Cookie-auth four params | 46,992 | 81,504 | 71,968 | 64,752 | 63,504 |
| Cookie-auth POST small body | 35,504 | 46,992 | 47,024 | 56,688 | 34,000 |
| Cookie-auth PUT small body | 35,984 | 46,992 | 46,992 | 57,648 | 33,008 |
| Cookie-auth POST large body | 11,220 | 9,612 | 9,300 | 10,764 | 10,564 |
| Cookie-auth FAIL (401) | 57,488 | 69,024 | 84,512 | 76,320 | 74,976 |
| 404 short | 61,008 | 76,512 | 87,008 | 50,000 | 82,016 |
| 404 deep | 62,000 | 75,488 | 85,024 | 48,496 | 80,480 |
| POST large body + bad header-auth | 11,564 | 34,480 | 9,300 | 39,408 | 32,472 |
| POST large body + bad cookie-auth | 11,220 | 34,480 | 9,612 | 38,480 | 33,488 |

