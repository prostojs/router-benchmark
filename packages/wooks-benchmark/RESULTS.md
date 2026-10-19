# HTTP Framework Benchmark Results

Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon). Generated 2026-10-19T11:58:10.583Z.

## Summary

![Summary](results/results-chart.svg)

| Framework | traffic-mix req/s | spread across rounds | relative | weighted arithmetic avg | status |
| --- | ---: | ---: | ---: | ---: | --- |
| Fastify | 115,880 | 115,880 – 115,880 | fastest | 147,251 | ok |
| Wooks | 107,749 | 107,749 – 107,749 | 1.08x slower | 147,048 | ok |
| Hono | 98,364 | 98,364 – 98,364 | 1.18x slower | 120,282 | ok |
| h3 | 86,165 | 86,165 – 86,165 | 1.34x slower | 103,598 | ok |
| Express | 63,060 | 63,060 – 63,060 | 1.84x slower | 72,742 | ok |

"traffic-mix req/s" = weighted harmonic mean of the per-test medians, using the traffic weights below (the throughput of a server receiving that request mix). "weighted arithmetic avg" is shown for comparison only.

## Per-Test Results (median req/s over rounds, ±CV)

| Test | weight | Wooks | Fastify | h3 | Hono | Express |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Short static | 3 | 203,027 | 208,728 | 177,668 | 196,876 | 109,794 |
| Login (set-cookie) | 2 | 96,806 | 112,849 | 93,125 | 81,680 | 67,725 |
| Wildcard + cache | 3 | 184,294 | 194,443 | 139,541 | 139,187 | 97,024 |
| Wildcard deep | 2 | 176,743 | 200,077 | 138,699 | 141,025 | 96,014 |
| Header-auth static | 4 | 200,719 | 206,265 | 171,945 | 169,154 | 104,448 |
| Header-auth param | 6 | 187,336 | 201,067 | 156,537 | 162,230 | 102,290 |
| Header-auth long static + cache | 3 | 187,236 | 190,313 | 153,329 | 130,159 | 97,746 |
| Header-auth POST small body | 3 | 102,785 | 123,533 | 102,789 | 97,660 | 68,286 |
| Header-auth FAIL (401) | 2 | 150,297 | 199,486 | 79,459 | 169,490 | 104,780 |
| Cookie-auth param+suffix | 14 | 166,358 | 146,671 | 104,379 | 120,472 | 69,712 |
| Cookie-auth two params | 20 | 164,062 | 143,713 | 104,620 | 119,330 | 66,899 |
| Cookie-auth four params | 8 | 156,565 | 143,413 | 100,112 | 116,922 | 64,084 |
| Cookie-auth POST small body | 8 | 91,258 | 95,225 | 72,223 | 76,055 | 45,834 |
| Cookie-auth PUT small body | 8 | 91,891 | 95,894 | 73,192 | 76,090 | 46,482 |
| Cookie-auth POST large body | 2 | 9,380 | 12,658 | 13,865 | 13,701 | 12,526 |
| Cookie-auth FAIL (401) | 3 | 141,794 | 201,357 | 79,219 | 167,076 | 92,175 |
| 404 short | 3 | 171,582 | 191,514 | 83,680 | 181,131 | 98,769 |
| 404 deep | 2 | 170,276 | 192,648 | 81,537 | 169,034 | 102,443 |
| POST large body + bad header-auth | 2 | 68,858 | 83,772 | 49,096 | 67,501 | 57,177 |
| POST large body + bad cookie-auth | 2 | 66,564 | 78,540 | 47,330 | 65,670 | 52,424 |

## Latency p99 (ms, median over rounds)

| Test | Wooks | Fastify | h3 | Hono | Express |
| --- | ---: | ---: | ---: | ---: | ---: |
| Short static | 7 | 7 | 8 | 7 | 13 |
| Login (set-cookie) | 17 | 15 | 19 | 22 | 27 |
| Wildcard + cache | 7 | 10 | 10 | 10 | 15 |
| Wildcard deep | 7 | 6 | 10 | 9 | 14 |
| Header-auth static | 6 | 6 | 8 | 8 | 14 |
| Header-auth param | 7 | 6 | 9 | 8 | 14 |
| Header-auth long static + cache | 10 | 10 | 9 | 10 | 14 |
| Header-auth POST small body | 16 | 13 | 18 | 18 | 26 |
| Header-auth FAIL (401) | 8 | 7 | 18 | 8 | 14 |
| Cookie-auth param+suffix | 8 | 9 | 14 | 11 | 20 |
| Cookie-auth two params | 8 | 10 | 14 | 11 | 20 |
| Cookie-auth four params | 8 | 9 | 14 | 11 | 21 |
| Cookie-auth POST small body | 18 | 17 | 24 | 23 | 39 |
| Cookie-auth PUT small body | 18 | 17 | 24 | 23 | 38 |
| Cookie-auth POST large body | 461 | 545 | 422 | 490 | 622 |
| Cookie-auth FAIL (401) | 9 | 6 | 18 | 8 | 15 |
| 404 short | 12 | 9 | 16 | 7 | 16 |
| 404 deep | 8 | 7 | 16 | 8 | 16 |
| POST large body + bad header-auth | 83 | 66 | 123 | 89 | 106 |
| POST large body + bad cookie-auth | 85 | 68 | 128 | 92 | 116 |

## Environment

|  |  |
| --- | --- |
| Date | 2026-10-19T11:58:10.583Z |
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

