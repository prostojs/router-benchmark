# DI Framework Benchmark Results (with simulated DB)

Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon). Generated 2026-10-19T12:10:43.899Z.

## Summary

![Summary](results/results-db-chart.svg)

| Framework | traffic-mix req/s | spread across rounds | relative | weighted arithmetic avg | status |
| --- | ---: | ---: | ---: | ---: | --- |
| Moost | 68,346 | 68,346 – 68,346 | fastest | 86,242 | ok |
| NestJS (Fastify) | 59,632 | 59,632 – 59,632 | 1.15x slower | 82,723 | ok |
| NestJS (Express) | 42,168 | 42,168 – 42,168 | 1.62x slower | 51,155 | ok |

"traffic-mix req/s" = weighted harmonic mean of the per-test medians, using the traffic weights below (the throughput of a server receiving that request mix). "weighted arithmetic avg" is shown for comparison only.

## Per-Test Results (median req/s over rounds, ±CV)

| Test | weight | Moost | NestJS (Fastify) | NestJS (Express) |
| --- | ---: | ---: | ---: | ---: |
| Short static | 3 | 162,051 | 168,958 | 97,602 |
| Login (set-cookie) | 2 | 65,342 | 71,902 | 46,584 |
| Wildcard + cache | 3 | 152,038 | 165,359 | 89,414 |
| Wildcard deep | 2 | 149,548 | 165,772 | 87,174 |
| Header-auth static | 4 | 79,161 | 102,806 | 69,979 |
| Header-auth param | 6 | 74,627 | 96,921 | 66,988 |
| Header-auth long static + cache | 3 | 76,104 | 99,462 | 65,064 |
| Header-auth POST small body | 3 | 57,854 | 71,546 | 45,305 |
| Header-auth FAIL (401) | 2 | 90,191 | 75,311 | 53,354 |
| Cookie-auth param+suffix | 14 | 85,981 | 85,988 | 51,498 |
| Cookie-auth two params | 20 | 86,689 | 79,590 | 50,787 |
| Cookie-auth four params | 8 | 83,240 | 82,975 | 49,355 |
| Cookie-auth POST small body | 8 | 60,406 | 58,818 | 33,323 |
| Cookie-auth PUT small body | 8 | 60,879 | 59,815 | 34,418 |
| Cookie-auth POST large body | 2 | 8,030 | 11,195 | 11,740 |
| Cookie-auth FAIL (401) | 3 | 95,265 | 79,198 | 52,520 |
| 404 short | 3 | 164,069 | 84,708 | 52,808 |
| 404 deep | 2 | 156,920 | 84,359 | 52,287 |
| POST large body + bad header-auth | 2 | 56,386 | 11,625 | 12,665 |
| POST large body + bad cookie-auth | 2 | 55,568 | 11,511 | 12,192 |

## Latency p99 (ms, median over rounds)

| Test | Moost | NestJS (Fastify) | NestJS (Express) |
| --- | ---: | ---: | ---: |
| Short static | 14 | 10 | 15 |
| Login (set-cookie) | 28 | 22 | 112 |
| Wildcard + cache | 10 | 8 | 16 |
| Wildcard deep | 10 | 8 | 16 |
| Header-auth static | 22 | 15 | 22 |
| Header-auth param | 25 | 16 | 23 |
| Header-auth long static + cache | 24 | 16 | 24 |
| Header-auth POST small body | 32 | 21 | 40 |
| Header-auth FAIL (401) | 17 | 18 | 28 |
| Cookie-auth param+suffix | 18 | 18 | 34 |
| Cookie-auth two params | 19 | 25 | 34 |
| Cookie-auth four params | 20 | 19 | 37 |
| Cookie-auth POST small body | 25 | 27 | 56 |
| Cookie-auth PUT small body | 25 | 26 | 54 |
| Cookie-auth POST large body | 126 | 96 | 701 |
| Cookie-auth FAIL (401) | 19 | 16 | 27 |
| 404 short | 8 | 16 | 27 |
| 404 deep | 9 | 16 | 28 |
| POST large body + bad header-auth | 106 | 904 | 737 |
| POST large body + bad cookie-auth | 108 | 191 | 494 |

## Environment

|  |  |
| --- | --- |
| Date | 2026-10-19T12:10:43.899Z |
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

