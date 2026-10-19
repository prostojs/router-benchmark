# HTTP Framework Benchmark Results (with simulated DB)

Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon). Generated 2026-10-19T20:43:42.055Z.

## Summary

![Summary](results/results-db-chart.svg)

| Framework | traffic-mix req/s | spread across rounds | relative | weighted arithmetic avg | status |
| --- | ---: | ---: | ---: | ---: | --- |
| Fastify | 87,791 | 80,649 – 89,048 | fastest | 109,795 | ok |
| Wooks | 82,779 | 81,913 – 83,445 | 1.06x slower | 100,527 | ok |
| Hono | 69,204 | 66,321 – 70,115 | 1.27x slower | 84,187 | ok |
| h3 | 67,771 | 67,439 – 68,260 | 1.30x slower | 77,978 | ok |
| Express | 51,933 | 50,610 – 52,614 | 1.69x slower | 59,980 | ok |

"traffic-mix req/s" = weighted harmonic mean of the per-test medians, using the traffic weights below (the throughput of a server receiving that request mix). "weighted arithmetic avg" is shown for comparison only.

## Per-Test Results (median req/s over rounds, ±CV)

| Test | weight | Wooks | Fastify | h3 | Hono | Express |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Short static | 3 | 190,585 ±3% | 192,967 ±12% | 172,741 ±2% | 177,976 ±1% | 106,964 ±1% |
| Login (set-cookie) | 2 | 73,015 ±2% | 82,479 ±9% | 72,544 ±2% | 59,592 ±1% | 53,939 ±3% |
| Wildcard + cache | 3 | 173,362 ±2% | 189,943 ±11% | 137,942 ±2% | 134,316 ±2% | 99,895 ±2% |
| Wildcard deep | 2 | 167,299 ±2% | 188,734 ±11% | 136,762 ±2% | 130,705 ±0% | 96,316 ±2% |
| Header-auth static | 4 | 107,381 ±3% | 125,401 ±8% | 98,115 ±2% | 85,737 ±11% | 70,156 ±3% |
| Header-auth param | 6 | 101,721 ±4% | 124,647 ±8% | 91,381 ±3% | 85,688 ±6% | 69,997 ±1% |
| Header-auth long static + cache | 3 | 102,012 ±3% | 121,226 ±7% | 89,697 ±2% | 75,878 ±2% | 67,834 ±2% |
| Header-auth POST small body | 3 | 75,695 ±1% | 84,181 ±6% | 77,649 ±0% | 68,327 ±2% | 55,226 ±2% |
| Header-auth FAIL (401) | 2 | 146,805 ±1% | 189,145 ±11% | 79,054 ±1% | 156,855 ±2% | 102,116 ±3% |
| Cookie-auth param+suffix | 14 | 95,263 ±2% | 99,171 ±6% | 73,411 ±0% | 71,148 ±4% | 52,446 ±2% |
| Cookie-auth two params | 20 | 94,975 ±2% | 97,556 ±6% | 73,519 ±1% | 72,856 ±8% | 51,254 ±3% |
| Cookie-auth four params | 8 | 92,629 ±2% | 98,047 ±6% | 70,418 ±2% | 71,488 ±3% | 49,699 ±3% |
| Cookie-auth POST small body | 8 | 67,799 ±1% | 71,232 ±6% | 56,382 ±2% | 56,311 ±2% | 40,296 ±3% |
| Cookie-auth PUT small body | 8 | 68,287 ±2% | 70,419 ±5% | 58,100 ±2% | 56,441 ±2% | 39,015 ±2% |
| Cookie-auth POST large body | 2 | 12,045 ±0% | 11,551 ±2% | 13,153 ±2% | 12,123 ±4% | 11,654 ±0% |
| Cookie-auth FAIL (401) | 3 | 142,250 ±1% | 193,404 ±12% | 79,667 ±1% | 158,459 ±1% | 93,325 ±2% |
| 404 short | 3 | 170,972 ±2% | 176,631 ±10% | 83,665 ±0% | 164,402 ±2% | 97,269 ±1% |
| 404 deep | 2 | 161,528 ±2% | 169,443 ±10% | 81,470 ±0% | 160,957 ±3% | 96,530 ±1% |
| POST large body + bad header-auth | 2 | 66,788 ±2% | 78,339 ±7% | 48,276 ±2% | 64,584 ±4% | 57,959 ±2% |
| POST large body + bad cookie-auth | 2 | 65,192 ±2% | 79,261 ±6% | 46,562 ±1% | 63,428 ±2% | 53,698 ±1% |

## Latency p99 (ms, median over rounds)

| Test | Wooks | Fastify | h3 | Hono | Express |
| --- | ---: | ---: | ---: | ---: | ---: |
| Short static | 8 | 8 | 9 | 8 | 14 |
| Login (set-cookie) | 21 | 18 | 22 | 26 | 34 |
| Wildcard + cache | 7 | 7 | 10 | 10 | 14 |
| Wildcard deep | 8 | 7 | 10 | 10 | 15 |
| Header-auth static | 18 | 16 | 16 | 20 | 23 |
| Header-auth param | 17 | 14 | 17 | 21 | 22 |
| Header-auth long static + cache | 19 | 16 | 18 | 23 | 24 |
| Header-auth POST small body | 20 | 18 | 19 | 23 | 32 |
| Header-auth FAIL (401) | 9 | 7 | 18 | 8 | 14 |
| Cookie-auth param+suffix | 17 | 17 | 21 | 25 | 32 |
| Cookie-auth two params | 17 | 17 | 21 | 21 | 33 |
| Cookie-auth four params | 16 | 17 | 24 | 24 | 35 |
| Cookie-auth POST small body | 26 | 24 | 27 | 28 | 47 |
| Cookie-auth PUT small body | 26 | 21 | 26 | 28 | 48 |
| Cookie-auth POST large body | 93 | 104 | 80 | 95 | 90 |
| Cookie-auth FAIL (401) | 9 | 7 | 18 | 8 | 15 |
| 404 short | 8 | 9 | 16 | 8 | 16 |
| 404 deep | 8 | 10 | 17 | 8 | 16 |
| POST large body + bad header-auth | 87 | 71 | 125 | 93 | 109 |
| POST large body + bad cookie-auth | 86 | 70 | 136 | 96 | 111 |

## Environment

|  |  |
| --- | --- |
| Date | 2026-10-19T20:43:42.055Z |
| Node.js | v24.22.0 (V8 13.6.233.17-node.57) |
| OS | Darwin 27.0.0 (darwin arm64) |
| CPU | Apple M4 (10 logical cores) |
| Memory | 24 GB |

### Settings

| Setting | Value |
| --- | --- |
| Mode | simulated DB (one Redis round-trip per authenticated request) |
| Warmup per test | 1s (discarded) |
| Measured per test | 1s |
| Rounds | 3 (fresh server process per round, framework order rotated; per-test value = median) |
| Load generator | autocannon, 100 connections, pipelining 10, in orchestrator process |
| Server process | one child process per framework (`node <entry>`, no loaders), NODE_ENV=production, logging disabled, 127.0.0.1 |
| Between runs | wait until the server reports all client connections closed (abort after 5s) |
| Headline metric | weighted harmonic mean of per-test median req/s (traffic-mix throughput) |
| Validity | pre-flight equivalence check per server start; a measured run with > 0.1% unexpected status/socket errors is INVALID |

### Package versions

| Package | Version |
| --- | --- |
| autocannon | 8.0.0 |
| ioredis | 6.0.0 |
| wooks | 0.7.31 |
| @wooksjs/event-http | 0.7.31 |
| @wooksjs/http-body | 0.7.31 |
| @prostojs/router | 0.3.6 |
| fastify | 5.12.7 |
| @fastify/cookie | 11.1.3 |
| h3 | 2.0.5 |
| hono | 4.13.13 |
| @hono/node-server | 2.1.5 |
| express | 5.3.0 |
| cookie-parser | 1.4.7 |

