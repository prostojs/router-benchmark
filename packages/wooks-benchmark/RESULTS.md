# HTTP Framework Benchmark Results

Full HTTP request handling benchmark using [autocannon](https://github.com/mcollina/autocannon). Generated 2026-10-19T19:42:57.016Z.

## Summary

![Summary](results/results-chart.svg)

| Framework | traffic-mix req/s | spread across rounds | relative | weighted arithmetic avg | status |
| --- | ---: | ---: | ---: | ---: | --- |
| Fastify | 116,447 | 116,447 – 116,447 | fastest | 148,515 | ok |
| Wooks | 113,670 | 113,670 – 113,670 | 1.02x slower | 144,070 | ok |
| Hono | 95,579 | 95,579 – 95,579 | 1.22x slower | 115,470 | ok |
| h3 | 84,600 | 84,600 – 84,600 | 1.38x slower | 100,555 | ok |
| Express | 59,065 | 59,065 – 59,065 | 1.97x slower | 67,647 | ok |

"traffic-mix req/s" = weighted harmonic mean of the per-test medians, using the traffic weights below (the throughput of a server receiving that request mix). "weighted arithmetic avg" is shown for comparison only.

## Per-Test Results (median req/s over rounds, ±CV)

| Test | weight | Wooks | Fastify | h3 | Hono | Express |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Short static | 3 | 200,781 | 208,400 | 177,950 | 181,543 | 100,531 |
| Login (set-cookie) | 2 | 96,567 | 111,213 | 90,688 | 77,687 | 64,305 |
| Wildcard + cache | 3 | 179,509 | 201,737 | 139,333 | 133,462 | 93,327 |
| Wildcard deep | 2 | 172,224 | 203,069 | 136,914 | 132,884 | 90,773 |
| Header-auth static | 4 | 192,700 | 205,245 | 170,819 | 162,689 | 99,459 |
| Header-auth param | 6 | 181,910 | 205,368 | 126,153 | 156,680 | 97,087 |
| Header-auth long static + cache | 3 | 187,101 | 197,915 | 149,901 | 125,683 | 93,039 |
| Header-auth POST small body | 3 | 101,974 | 120,406 | 104,774 | 93,771 | 64,742 |
| Header-auth FAIL (401) | 2 | 147,657 | 204,044 | 81,051 | 163,238 | 96,919 |
| Cookie-auth param+suffix | 14 | 161,575 | 144,197 | 101,936 | 114,996 | 60,862 |
| Cookie-auth two params | 20 | 160,231 | 146,825 | 102,482 | 114,756 | 58,289 |
| Cookie-auth four params | 8 | 153,974 | 145,212 | 98,930 | 112,134 | 57,046 |
| Cookie-auth POST small body | 8 | 89,296 | 94,473 | 71,051 | 72,430 | 45,509 |
| Cookie-auth PUT small body | 8 | 90,063 | 95,022 | 71,867 | 73,122 | 46,390 |
| Cookie-auth POST large body | 2 | 13,255 | 12,588 | 13,902 | 14,177 | 12,541 |
| Cookie-auth FAIL (401) | 3 | 140,985 | 199,628 | 80,227 | 159,815 | 93,133 |
| 404 short | 3 | 173,079 | 196,482 | 82,696 | 174,160 | 98,765 |
| 404 deep | 2 | 166,838 | 191,773 | 80,727 | 169,182 | 96,786 |
| POST large body + bad header-auth | 2 | 67,941 | 86,229 | 49,066 | 69,933 | 58,002 |
| POST large body + bad cookie-auth | 2 | 66,117 | 86,926 | 47,245 | 65,058 | 52,863 |

## Latency p99 (ms, median over rounds)

| Test | Wooks | Fastify | h3 | Hono | Express |
| --- | ---: | ---: | ---: | ---: | ---: |
| Short static | 7 | 7 | 8 | 9 | 19 |
| Login (set-cookie) | 17 | 15 | 19 | 23 | 28 |
| Wildcard + cache | 7 | 6 | 10 | 10 | 14 |
| Wildcard deep | 7 | 6 | 10 | 10 | 15 |
| Header-auth static | 6 | 6 | 8 | 8 | 14 |
| Header-auth param | 7 | 6 | 20 | 8 | 14 |
| Header-auth long static + cache | 7 | 6 | 9 | 11 | 15 |
| Header-auth POST small body | 16 | 14 | 16 | 18 | 27 |
| Header-auth FAIL (401) | 8 | 6 | 17 | 8 | 15 |
| Cookie-auth param+suffix | 8 | 9 | 14 | 13 | 23 |
| Cookie-auth two params | 8 | 9 | 13 | 11 | 24 |
| Cookie-auth four params | 8 | 8 | 13 | 11 | 25 |
| Cookie-auth POST small body | 18 | 17 | 24 | 24 | 40 |
| Cookie-auth PUT small body | 18 | 17 | 24 | 24 | 38 |
| Cookie-auth POST large body | 448 | 624 | 451 | 476 | 623 |
| Cookie-auth FAIL (401) | 9 | 6 | 17 | 8 | 15 |
| 404 short | 7 | 6 | 16 | 7 | 16 |
| 404 deep | 8 | 7 | 17 | 8 | 16 |
| POST large body + bad header-auth | 87 | 66 | 123 | 87 | 104 |
| POST large body + bad cookie-auth | 88 | 65 | 129 | 87 | 118 |

## Environment

|  |  |
| --- | --- |
| Date | 2026-10-19T19:42:57.016Z |
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

