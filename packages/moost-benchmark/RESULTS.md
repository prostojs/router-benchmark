# DI Framework Benchmark Results

Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon). Generated 2026-10-19T20:33:30.521Z.

## Summary

![Summary](results/results-chart.svg)

| Framework | traffic-mix req/s | spread across rounds | relative | weighted arithmetic avg | status |
| --- | ---: | ---: | ---: | ---: | --- |
| Fastify (no DI) | 115,810 | 115,205 – 117,012 | fastest | 146,958 | ok |
| Wooks (no DI) | 115,670 | 115,224 – 116,295 | 1.00x slower | 146,535 | ok |
| Moost | 102,250 | 101,661 – 102,649 | 1.13x slower | 126,310 | ok |
| NestJS (Fastify) | 73,569 | 73,639 – 74,107 | 1.57x slower | 111,286 | ok |
| Express (no DI) | 62,901 | 62,024 – 63,024 | 1.84x slower | 71,978 | ok |
| NestJS (Express) | 48,369 | 48,019 – 48,913 | 2.39x slower | 60,444 | ok |

"traffic-mix req/s" = weighted harmonic mean of the per-test medians, using the traffic weights below (the throughput of a server receiving that request mix). "weighted arithmetic avg" is shown for comparison only.

## Per-Test Results (median req/s over rounds, ±CV)

| Test | weight | Moost | NestJS (Fastify) | NestJS (Express) | Wooks (no DI) | Fastify (no DI) | Express (no DI) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Short static | 3 | 181,306 ±0% | 174,559 ±1% | 98,754 ±1% | 202,097 ±0% | 204,728 ±2% | 105,630 ±1% |
| Login (set-cookie) | 2 | 89,277 ±1% | 95,875 ±1% | 57,000 ±1% | 97,072 ±0% | 111,661 ±0% | 65,433 ±0% |
| Wildcard + cache | 3 | 158,274 ±1% | 170,603 ±1% | 88,606 ±1% | 183,684 ±1% | 196,800 ±2% | 95,404 ±2% |
| Wildcard deep | 2 | 153,156 ±0% | 169,681 ±1% | 86,334 ±0% | 176,777 ±3% | 197,141 ±2% | 91,753 ±1% |
| Header-auth static | 4 | 164,383 ±0% | 164,739 ±1% | 92,800 ±0% | 196,625 ±1% | 203,193 ±1% | 100,835 ±1% |
| Header-auth param | 6 | 151,179 ±0% | 155,425 ±1% | 88,949 ±0% | 184,582 ±0% | 201,529 ±1% | 98,327 ±1% |
| Header-auth long static + cache | 3 | 151,847 ±1% | 160,163 ±1% | 86,452 ±1% | 191,728 ±1% | 194,807 ±1% | 93,983 ±1% |
| Header-auth POST small body | 3 | 88,985 ±0% | 95,050 ±1% | 55,774 ±1% | 102,684 ±1% | 121,787 ±1% | 65,690 ±1% |
| Header-auth FAIL (401) | 2 | 100,642 ±0% | 77,042 ±2% | 53,661 ±0% | 150,980 ±0% | 197,411 ±2% | 100,840 ±1% |
| Cookie-auth param+suffix | 14 | 144,017 ±0% | 120,916 ±1% | 63,371 ±2% | 164,856 ±1% | 145,290 ±1% | 68,938 ±2% |
| Cookie-auth two params | 20 | 142,449 ±1% | 120,891 ±1% | 62,729 ±1% | 162,891 ±1% | 145,334 ±1% | 67,941 ±1% |
| Cookie-auth four params | 8 | 136,882 ±0% | 120,077 ±1% | 59,564 ±2% | 154,966 ±0% | 143,230 ±1% | 64,259 ±1% |
| Cookie-auth POST small body | 8 | 81,512 ±1% | 77,327 ±1% | 40,114 ±2% | 90,982 ±1% | 94,643 ±1% | 45,978 ±1% |
| Cookie-auth PUT small body | 8 | 81,501 ±1% | 77,593 ±1% | 40,484 ±1% | 92,186 ±1% | 94,764 ±0% | 46,645 ±1% |
| Cookie-auth POST large body | 2 | 13,345 ±1% | 12,340 ±2% | 12,654 ±1% | 13,470 ±1% | 12,618 ±2% | 12,604 ±0% |
| Cookie-auth FAIL (401) | 3 | 100,671 ±0% | 79,862 ±2% | 52,673 ±0% | 143,102 ±1% | 196,614 ±0% | 94,018 ±1% |
| 404 short | 3 | 163,279 ±0% | 85,978 ±0% | 52,415 ±1% | 176,050 ±1% | 190,758 ±1% | 99,563 ±1% |
| 404 deep | 2 | 157,902 ±0% | 85,507 ±1% | 52,096 ±1% | 169,404 ±1% | 188,900 ±1% | 97,298 ±1% |
| POST large body + bad header-auth | 2 | 60,795 ±5% | 11,799 ±1% | 12,357 ±1% | 69,679 ±1% | 85,500 ±3% | 59,745 ±1% |
| POST large body + bad cookie-auth | 2 | 59,344 ±1% | 11,705 ±1% | 12,118 ±0% | 67,920 ±2% | 84,539 ±1% | 53,668 ±0% |

## Latency p99 (ms, median over rounds)

| Test | Moost | NestJS (Fastify) | NestJS (Express) | Wooks (no DI) | Fastify (no DI) | Express (no DI) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Short static | 8 | 8 | 15 | 7 | 7 | 13 |
| Login (set-cookie) | 20 | 18 | 31 | 17 | 15 | 27 |
| Wildcard + cache | 9 | 8 | 16 | 7 | 7 | 14 |
| Wildcard deep | 9 | 8 | 16 | 7 | 7 | 15 |
| Header-auth static | 8 | 9 | 15 | 6 | 6 | 14 |
| Header-auth param | 9 | 9 | 16 | 7 | 6 | 14 |
| Header-auth long static + cache | 10 | 8 | 16 | 7 | 7 | 15 |
| Header-auth POST small body | 19 | 18 | 32 | 16 | 14 | 27 |
| Header-auth FAIL (401) | 12 | 16 | 26 | 8 | 7 | 14 |
| Cookie-auth param+suffix | 9 | 11 | 23 | 8 | 9 | 20 |
| Cookie-auth two params | 9 | 11 | 22 | 8 | 9 | 20 |
| Cookie-auth four params | 10 | 11 | 24 | 8 | 9 | 21 |
| Cookie-auth POST small body | 20 | 23 | 45 | 18 | 18 | 39 |
| Cookie-auth PUT small body | 20 | 23 | 45 | 18 | 18 | 38 |
| Cookie-auth POST large body | 563 | 646 | 610 | 511 | 630 | 523 |
| Cookie-auth FAIL (401) | 12 | 16 | 27 | 9 | 7 | 15 |
| 404 short | 8 | 14 | 26 | 7 | 7 | 16 |
| 404 deep | 9 | 14 | 26 | 8 | 7 | 16 |
| POST large body + bad header-auth | 95 | 514 | 492 | 83 | 66 | 100 |
| POST large body + bad cookie-auth | 100 | 722 | 499 | 87 | 66 | 112 |

## Environment

|  |  |
| --- | --- |
| Date | 2026-10-19T20:33:30.521Z |
| Node.js | v24.22.0 (V8 13.6.233.17-node.57) |
| OS | Darwin 27.0.0 (darwin arm64) |
| CPU | Apple M4 (10 logical cores) |
| Memory | 24 GB |

### Settings

| Setting | Value |
| --- | --- |
| Mode | pure framework overhead |
| Warmup per test | 1s (discarded) |
| Measured per test | 2s |
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
| moost | 0.6.53 |
| @moostjs/event-http | 0.6.53 |
| @wooksjs/event-http | 0.7.31 |
| wooks | 0.7.31 |
| @prostojs/router | 0.3.6 |
| @nestjs/core | 12.1.3 |
| @nestjs/common | 12.1.3 |
| reflect-metadata | 0.2.2 |
| rxjs | 7.8.2 |
| @nestjs/platform-fastify | 12.1.3 |
| fastify (via @nestjs/platform-fastify) | 5.12.7 |
| @fastify/cookie | 11.1.3 |
| @nestjs/platform-express | 12.1.3 |
| express (via @nestjs/platform-express) | 5.3.0 |
| cookie-parser | 1.4.7 |
| fastify | 5.12.7 |
| express | 5.3.0 |

