# HTTP Framework Benchmark Results (with simulated DB)

Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon). Generated 2026-10-19T12:08:20.365Z.

## Summary

![Summary](results/results-db-chart.svg)

| Framework | traffic-mix req/s | spread across rounds | relative | weighted arithmetic avg | status |
| --- | ---: | ---: | ---: | ---: | --- |
| Fastify | 78,315 | 78,315 – 78,315 | fastest | 95,043 | ok |
| Wooks | 75,499 | 75,499 – 75,499 | 1.04x slower | 97,777 | ok |
| Hono | 61,399 | 61,399 – 61,399 | 1.28x slower | 72,737 | ok |
| h3 | 60,826 | 60,826 – 60,826 | 1.29x slower | 70,182 | ok |
| Express | 48,914 | 48,914 – 48,914 | 1.60x slower | 55,261 | ok |

"traffic-mix req/s" = weighted harmonic mean of the per-test medians, using the traffic weights below (the throughput of a server receiving that request mix). "weighted arithmetic avg" is shown for comparison only.

## Per-Test Results (median req/s over rounds, ±CV)

| Test | weight | Wooks | Fastify | h3 | Hono | Express |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Short static | 3 | 193,610 | 144,539 | 168,856 | 144,290 | 85,159 |
| Login (set-cookie) | 2 | 70,011 | 71,777 | 70,486 | 52,780 | 48,413 |
| Wildcard + cache | 3 | 175,425 | 157,000 | 133,345 | 111,027 | 89,409 |
| Wildcard deep | 2 | 171,452 | 154,725 | 123,805 | 110,894 | 82,505 |
| Header-auth static | 4 | 107,629 | 107,265 | 88,267 | 79,751 | 65,929 |
| Header-auth param | 6 | 90,191 | 106,834 | 87,547 | 67,916 | 63,852 |
| Header-auth long static + cache | 3 | 105,273 | 104,271 | 84,814 | 66,753 | 60,638 |
| Header-auth POST small body | 3 | 78,792 | 74,456 | 66,239 | 60,826 | 51,773 |
| Header-auth FAIL (401) | 2 | 149,709 | 158,029 | 80,667 | 132,749 | 91,693 |
| Cookie-auth param+suffix | 14 | 89,573 | 87,433 | 65,835 | 62,272 | 48,089 |
| Cookie-auth two params | 20 | 87,548 | 89,545 | 58,967 | 63,433 | 48,311 |
| Cookie-auth four params | 8 | 88,530 | 87,750 | 61,180 | 62,913 | 46,758 |
| Cookie-auth POST small body | 8 | 68,343 | 63,209 | 51,403 | 49,236 | 39,479 |
| Cookie-auth PUT small body | 8 | 68,507 | 63,494 | 52,794 | 51,064 | 40,725 |
| Cookie-auth POST large body | 2 | 8,025 | 10,921 | 13,142 | 12,273 | 11,027 |
| Cookie-auth FAIL (401) | 3 | 142,119 | 142,228 | 76,521 | 133,573 | 80,870 |
| 404 short | 3 | 171,828 | 154,165 | 74,425 | 141,535 | 86,466 |
| 404 deep | 2 | 163,903 | 150,575 | 76,627 | 140,223 | 91,168 |
| POST large body + bad header-auth | 2 | 68,341 | 67,533 | 45,900 | 58,385 | 55,364 |
| POST large body + bad cookie-auth | 2 | 66,985 | 73,300 | 40,976 | 56,211 | 50,406 |

## Latency p99 (ms, median over rounds)

| Test | Wooks | Fastify | h3 | Hono | Express |
| --- | ---: | ---: | ---: | ---: | ---: |
| Short static | 10 | 15 | 12 | 13 | 24 |
| Login (set-cookie) | 26 | 22 | 22 | 31 | 33 |
| Wildcard + cache | 11 | 12 | 13 | 14 | 16 |
| Wildcard deep | 11 | 12 | 14 | 15 | 20 |
| Header-auth static | 17 | 16 | 23 | 19 | 24 |
| Header-auth param | 24 | 19 | 18 | 33 | 24 |
| Header-auth long static + cache | 19 | 19 | 20 | 27 | 26 |
| Header-auth POST small body | 22 | 21 | 34 | 25 | 31 |
| Header-auth FAIL (401) | 11 | 12 | 18 | 13 | 18 |
| Cookie-auth param+suffix | 21 | 21 | 26 | 29 | 33 |
| Cookie-auth two params | 21 | 18 | 36 | 30 | 32 |
| Cookie-auth four params | 18 | 19 | 31 | 26 | 34 |
| Cookie-auth POST small body | 25 | 25 | 35 | 39 | 39 |
| Cookie-auth PUT small body | 26 | 24 | 31 | 35 | 41 |
| Cookie-auth POST large body | 119 | 90 | 81 | 90 | 97 |
| Cookie-auth FAIL (401) | 12 | 16 | 19 | 13 | 26 |
| 404 short | 11 | 12 | 20 | 12 | 26 |
| 404 deep | 11 | 12 | 19 | 12 | 19 |
| POST large body + bad header-auth | 90 | 65 | 132 | 101 | 107 |
| POST large body + bad cookie-auth | 88 | 79 | 158 | 107 | 120 |

## Environment

|  |  |
| --- | --- |
| Date | 2026-10-19T12:08:20.365Z |
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
| Rounds | 1 (fresh server process per round, framework order rotated; per-test value = median) |
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
| wooks | 0.7.30 |
| @wooksjs/event-http | 0.7.30 |
| @wooksjs/http-body | 0.7.30 |
| @prostojs/router | 0.3.6 |
| fastify | 5.12.7 |
| @fastify/cookie | 11.1.3 |
| h3 | 2.0.5 |
| hono | 4.13.13 |
| @hono/node-server | 2.1.5 |
| express | 5.3.0 |
| cookie-parser | 1.4.7 |

