# HTTP Framework Benchmark Results (with simulated DB)

Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon).

- **0.5s** per test, **100** connections, **10** pipelining
- **20** test cases covering auth, params, cookies, body parsing, wildcards, 404s
- Generated: 2026-02-27T09:49:11.881Z

## Summary

![Summary](results/results-db-chart.svg)

| Framework | avg req/s | speed | errors |
|-----------|----------|-------|--------|
| Wooks | 50,854 | fastest | - |
| Fastify | 49,879 | 1.0x slower | - |
| h3 | 47,575 | 1.1x slower | - |
| Hono | 45,542 | 1.1x slower | - |
| Express | 37,868 | 1.3x slower | - |

## Per-Test Results

| Test | Express req/s | Wooks req/s | Fastify req/s | h3 req/s | Hono req/s |
|------|---------|---------|---------|---------|---------|
| Short static | 57,488 | 86,496 | 85,024 | 80,288 | 85,472 |
| Login (set-cookie) | 34,448 | 35,568 | 39,664 | 44,464 | 29,688 |
| Wildcard + cache | 58,000 | 81,504 | 82,976 | 76,384 | 76,960 |
| Wildcard deep | 58,000 | 82,464 | 84,000 | 76,320 | 78,496 |
| Header-auth static | 42,320 | 49,456 | 56,304 | 52,464 | 48,080 |
| Header-auth param | 41,776 | 50,640 | 55,344 | 51,120 | 48,496 |
| Header-auth long static + cache | 40,880 | 50,672 | 54,032 | 51,792 | 47,440 |
| Header-auth POST small body | 35,504 | 37,488 | 40,912 | 45,136 | 31,128 |
| Header-auth FAIL (401) | 60,496 | 66,528 | 84,512 | 79,328 | 76,512 |
| Cookie-auth param+suffix | 35,792 | 51,856 | 46,544 | 44,144 | 41,360 |
| Cookie-auth two params | 34,768 | 51,600 | 45,808 | 43,408 | 41,392 |
| Cookie-auth four params | 33,904 | 49,872 | 45,392 | 42,096 | 42,320 |
| Cookie-auth POST small body | 29,656 | 34,896 | 35,568 | 38,128 | 28,152 |
| Cookie-auth PUT small body | 30,744 | 35,536 | 35,824 | 38,416 | 28,168 |
| Cookie-auth POST large body | 10,268 | 8,764 | 8,284 | 9,500 | 9,748 |
| Cookie-auth FAIL (401) | 56,016 | 64,976 | 79,520 | 74,784 | 73,504 |
| 404 short | 59,984 | 75,488 | 86,496 | 49,488 | 81,504 |
| 404 deep | 59,504 | 75,488 | 85,472 | 48,016 | 82,528 |
| POST large body + bad header-auth | 11,900 | 34,480 | 9,612 | 39,440 | 32,976 |
| POST large body + bad cookie-auth | 11,564 | 33,456 | 9,300 | 38,928 | 33,488 |

