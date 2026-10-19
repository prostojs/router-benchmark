# DI Framework Benchmark Results (with simulated DB)

Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon). Generated 2026-10-19T19:54:30.789Z.

## Summary

![Summary](results/results-db-chart.svg)

| Framework | traffic-mix req/s | spread across rounds | relative | weighted arithmetic avg | status |
| --- | ---: | ---: | ---: | ---: | --- |
| Moost | 73,910 | 73,910 – 73,910 | fastest | 88,903 | ok |
| NestJS (Fastify) | 60,518 | 60,518 – 60,518 | 1.22x slower | 84,216 | ok |
| NestJS (Express) | 42,691 | 42,691 – 42,691 | 1.73x slower | 52,414 | ok |

"traffic-mix req/s" = weighted harmonic mean of the per-test medians, using the traffic weights below (the throughput of a server receiving that request mix). "weighted arithmetic avg" is shown for comparison only.

## Per-Test Results (median req/s over rounds, ±CV)

| Test | weight | Moost | NestJS (Fastify) | NestJS (Express) |
| --- | ---: | ---: | ---: | ---: |
| Short static | 3 | 178,798 | 169,445 | 96,877 |
| Login (set-cookie) | 2 | 66,411 | 71,868 | 47,802 |
| Wildcard + cache | 3 | 157,036 | 166,690 | 89,617 |
| Wildcard deep | 2 | 153,742 | 166,657 | 87,677 |
| Header-auth static | 4 | 88,420 | 103,954 | 71,061 |
| Header-auth param | 6 | 87,525 | 100,084 | 68,587 |
| Header-auth long static + cache | 3 | 84,951 | 100,152 | 66,514 |
| Header-auth POST small body | 3 | 66,167 | 70,440 | 47,130 |
| Header-auth FAIL (401) | 2 | 92,573 | 75,778 | 53,556 |
| Cookie-auth param+suffix | 14 | 84,897 | 86,672 | 53,890 |
| Cookie-auth two params | 20 | 86,162 | 84,420 | 52,745 |
| Cookie-auth four params | 8 | 85,918 | 85,726 | 51,189 |
| Cookie-auth POST small body | 8 | 60,990 | 59,444 | 34,945 |
| Cookie-auth PUT small body | 8 | 61,432 | 59,233 | 34,742 |
| Cookie-auth POST large body | 2 | 11,359 | 11,457 | 10,821 |
| Cookie-auth FAIL (401) | 3 | 97,191 | 76,428 | 53,104 |
| 404 short | 3 | 161,069 | 84,316 | 52,441 |
| 404 deep | 2 | 157,081 | 83,966 | 52,162 |
| POST large body + bad header-auth | 2 | 59,894 | 11,594 | 12,110 |
| POST large body + bad cookie-auth | 2 | 57,601 | 11,602 | 11,978 |

## Latency p99 (ms, median over rounds)

| Test | Moost | NestJS (Fastify) | NestJS (Express) |
| --- | ---: | ---: | ---: |
| Short static | 9 | 10 | 14 |
| Login (set-cookie) | 28 | 21 | 32 |
| Wildcard + cache | 10 | 8 | 16 |
| Wildcard deep | 10 | 8 | 16 |
| Header-auth static | 19 | 20 | 22 |
| Header-auth param | 20 | 16 | 23 |
| Header-auth long static + cache | 21 | 21 | 33 |
| Header-auth POST small body | 23 | 21 | 34 |
| Header-auth FAIL (401) | 13 | 17 | 27 |
| Cookie-auth param+suffix | 20 | 18 | 29 |
| Cookie-auth two params | 18 | 19 | 29 |
| Cookie-auth four params | 18 | 18 | 31 |
| Cookie-auth POST small body | 28 | 25 | 45 |
| Cookie-auth PUT small body | 25 | 26 | 44 |
| Cookie-auth POST large body | 105 | 692 | 109 |
| Cookie-auth FAIL (401) | 13 | 26 | 26 |
| 404 short | 8 | 15 | 27 |
| 404 deep | 8 | 15 | 26 |
| POST large body + bad header-auth | 99 | 781 | 572 |
| POST large body + bad cookie-auth | 103 | 723 | 634 |

## Environment

|  |  |
| --- | --- |
| Date | 2026-10-19T19:54:30.789Z |
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

