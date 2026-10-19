# DI Framework Benchmark Results

Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon). Generated 2026-10-19T12:04:36.322Z.

## Summary

![Summary](results/results-chart.svg)

| Framework | traffic-mix req/s | spread across rounds | relative | weighted arithmetic avg | status |
| --- | ---: | ---: | ---: | ---: | --- |
| Fastify (no DI) | 107,403 | 107,403 – 107,403 | fastest | 132,044 | ok |
| Wooks (no DI) | 100,135 | 100,135 – 100,135 | 1.07x slower | 131,846 | ok |
| Moost | 95,304 | 95,304 – 95,304 | 1.13x slower | 125,179 | ok |
| NestJS (Fastify) | 72,506 | 72,506 – 72,506 | 1.48x slower | 108,383 | ok |
| Express (no DI) | 63,585 | 63,585 – 63,585 | 1.69x slower | 72,473 | ok |
| NestJS (Express) | 47,702 | 47,702 – 47,702 | 2.25x slower | 59,551 | ok |

"traffic-mix req/s" = weighted harmonic mean of the per-test medians, using the traffic weights below (the throughput of a server receiving that request mix). "weighted arithmetic avg" is shown for comparison only.

## Per-Test Results (median req/s over rounds, ±CV)

| Test | weight | Moost | NestJS (Fastify) | NestJS (Express) | Wooks (no DI) | Fastify (no DI) | Express (no DI) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Short static | 3 | 177,155 | 167,036 | 94,964 | 192,018 | 166,978 | 97,483 |
| Login (set-cookie) | 2 | 89,285 | 98,359 | 56,708 | 89,966 | 105,363 | 67,649 |
| Wildcard + cache | 3 | 156,587 | 167,714 | 88,889 | 163,208 | 174,978 | 97,838 |
| Wildcard deep | 2 | 150,514 | 162,602 | 85,938 | 158,985 | 173,445 | 94,880 |
| Header-auth static | 4 | 165,297 | 163,039 | 91,777 | 176,915 | 180,306 | 102,369 |
| Header-auth param | 6 | 151,786 | 154,829 | 88,557 | 166,217 | 174,550 | 100,151 |
| Header-auth long static + cache | 3 | 153,215 | 158,380 | 86,159 | 163,767 | 174,833 | 97,350 |
| Header-auth POST small body | 3 | 88,688 | 96,765 | 55,718 | 95,354 | 115,267 | 68,191 |
| Header-auth FAIL (401) | 2 | 99,257 | 74,162 | 53,581 | 140,922 | 178,425 | 104,565 |
| Cookie-auth param+suffix | 14 | 146,013 | 117,795 | 62,299 | 149,490 | 133,475 | 70,510 |
| Cookie-auth two params | 20 | 136,364 | 112,839 | 60,535 | 136,599 | 126,308 | 64,849 |
| Cookie-auth four params | 8 | 136,883 | 116,877 | 59,306 | 143,696 | 135,288 | 66,019 |
| Cookie-auth POST small body | 8 | 82,091 | 78,325 | 39,863 | 87,224 | 91,338 | 48,801 |
| Cookie-auth PUT small body | 8 | 82,620 | 78,317 | 40,182 | 88,607 | 91,723 | 49,801 |
| Cookie-auth POST large body | 2 | 9,199 | 12,283 | 12,412 | 9,397 | 12,716 | 12,599 |
| Cookie-auth FAIL (401) | 3 | 100,281 | 76,011 | 52,768 | 145,582 | 180,673 | 97,430 |
| 404 short | 3 | 160,661 | 84,702 | 51,645 | 153,299 | 156,281 | 96,878 |
| 404 deep | 2 | 156,809 | 84,762 | 51,407 | 154,028 | 171,485 | 96,968 |
| POST large body + bad header-auth | 2 | 62,005 | 11,760 | 12,210 | 63,905 | 76,558 | 56,527 |
| POST large body + bad cookie-auth | 2 | 58,963 | 11,743 | 12,007 | 62,267 | 75,619 | 51,973 |

## Latency p99 (ms, median over rounds)

| Test | Moost | NestJS (Fastify) | NestJS (Express) | Wooks (no DI) | Fastify (no DI) | Express (no DI) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Short static | 10 | 12 | 20 | 11 | 14 | 22 |
| Login (set-cookie) | 20 | 17 | 32 | 19 | 16 | 26 |
| Wildcard + cache | 9 | 8 | 16 | 8 | 7 | 14 |
| Wildcard deep | 10 | 8 | 16 | 8 | 8 | 15 |
| Header-auth static | 8 | 9 | 16 | 7 | 7 | 14 |
| Header-auth param | 9 | 9 | 16 | 8 | 9 | 14 |
| Header-auth long static + cache | 10 | 9 | 17 | 10 | 7 | 14 |
| Header-auth POST small body | 19 | 18 | 33 | 18 | 14 | 26 |
| Header-auth FAIL (401) | 14 | 17 | 26 | 9 | 7 | 14 |
| Cookie-auth param+suffix | 9 | 13 | 27 | 9 | 10 | 20 |
| Cookie-auth two params | 14 | 17 | 29 | 18 | 15 | 27 |
| Cookie-auth four params | 10 | 12 | 24 | 9 | 9 | 21 |
| Cookie-auth POST small body | 20 | 23 | 45 | 20 | 18 | 37 |
| Cookie-auth PUT small body | 20 | 23 | 45 | 19 | 18 | 36 |
| Cookie-auth POST large body | 259 | 564 | 472 | 744 | 528 | 609 |
| Cookie-auth FAIL (401) | 13 | 16 | 27 | 9 | 7 | 14 |
| 404 short | 10 | 15 | 28 | 8 | 11 | 17 |
| 404 deep | 9 | 14 | 26 | 9 | 8 | 17 |
| POST large body + bad header-auth | 94 | 716 | 495 | 91 | 74 | 106 |
| POST large body + bad cookie-auth | 99 | 624 | 505 | 93 | 78 | 117 |

## Environment

|  |  |
| --- | --- |
| Date | 2026-10-19T12:04:36.322Z |
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
| moost | 0.6.52 |
| @moostjs/event-http | 0.6.52 |
| @wooksjs/event-http | 0.7.30 |
| wooks | 0.7.30 |
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

