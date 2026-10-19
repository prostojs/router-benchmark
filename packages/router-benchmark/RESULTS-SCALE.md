# Router Scaling Benchmark

Lookup throughput (route match + param extraction, op/ms) as the number of registered routes grows. All routers are verified to return identical matches/params before measuring. Generated 2026-10-19T19:37:53.257Z.

---

## Short Routes (2–5 segments)

Shallow paths like `/users/:id`, `/posts/:id/comments`.

![Short Routes (2–5 segments)](results/results-scale-short-chart.svg)

| Router | 22 routes | 50 routes | 100 routes | 200 routes | first → last |
| --- | ---: | ---: | ---: | ---: | ---: |
| ProstoRouter | 43,455 | 14,331 | 13,527 | 12,312 | 3.5x |
| FindMyWay | 35,071 | 20,288 | 19,139 | 15,391 | 2.3x |
| Rou3 | 55,082 | 19,211 | 18,595 | 14,864 | 3.7x |
| Rou3 (compiled) | 140,539 | 39,571 | 38,955 | 38,061 | 3.7x |
| Hono | 54,905 (RegExpRouter) | 14,016 (RegExpRouter) | 11,111 (RegExpRouter) | 7,034 (RegExpRouter) | 7.8x |
| Express | 2,332 | 983 | 607 | 281 | 8.3x |

---

## Long Routes (deep enterprise API)

Deep paths like `/api/v1/organizations/:orgId/workspaces/:wsId/projects/:projectId`.

![Long Routes (deep enterprise API)](results/results-scale-long-chart.svg)

| Router | 22 routes | 50 routes | 100 routes | 200 routes | first → last |
| --- | ---: | ---: | ---: | ---: | ---: |
| ProstoRouter | 9,303 | 8,148 | 6,475 | 5,048 | 1.8x |
| FindMyWay | 10,862 | 10,638 | 10,490 | 10,505 | 1.0x |
| Rou3 | 6,857 | 6,748 | 6,649 | 6,685 | 1.0x |
| Rou3 (compiled) | 36,923 | 29,845 | 30,456 | 30,928 | 1.2x |
| Hono | 8,704 (RegExpRouter) | 7,580 (RegExpRouter) | 4,465 (TrieRouter) | 4,479 (TrieRouter) | 1.9x |
| Express | 1,110 | 1,047 | 929 | 705 | 1.6x |

---

## Mixed Routes (short + long)

Half short (2–5 segments) + half long (deep enterprise API) routes.

![Mixed Routes (short + long)](results/results-scale-mixed-chart.svg)

| Router | 20 routes | 48 routes | 98 routes | 198 routes | first → last |
| --- | ---: | ---: | ---: | ---: | ---: |
| ProstoRouter | 28,981 | 10,864 | 8,935 | 9,335 | 3.1x |
| FindMyWay | 28,167 | 15,403 | 14,580 | 14,201 | 2.0x |
| Rou3 | 30,311 | 15,324 | 12,002 | 10,268 | 3.0x |
| Rou3 (compiled) | 56,597 | 40,181 | 36,171 | 36,727 | 1.5x |
| Hono | 53,689 (RegExpRouter) | 15,047 (RegExpRouter) | 7,783 (RegExpRouter) | 4,115 (TrieRouter) | 13.0x |
| Express | 2,265 | 1,005 | 595 | 288 | 7.9x |

---

## Environment

|  |  |
| --- | --- |
| Date | 2026-10-19T19:37:53.257Z |
| Node.js | v24.22.0 (V8 13.6.233.17-node.57) |
| OS | Darwin 27.0.0 (darwin arm64) |
| CPU | Apple M4 (10 logical cores) |
| Memory | 24 GB |

### Settings

| Setting | Value |
| --- | --- |
| Route counts (target; tables show the actual count per shape) | 22, 50, 100, 200 |
| Rounds | 1 (router order rotated each round; fresh process per router × workload × round) |
| Warmup | 500 ms per test (time-based; also calibrates batch size) |
| Samples | 5 per test per round, ~100 ms each (process.hrtime.bigint) |
| Reported value | median of per-round medians, op/ms (lookups per millisecond) |
| Node flags | --expose-gc (gc() before sampling) |

### Package versions

| Package | Version |
| --- | --- |
| @prostojs/router | 0.3.6 |
| find-my-way | 9.10.0 |
| rou3 | 1.0.0 |
| hono | 4.13.13 |
| express | 5.3.0 |

