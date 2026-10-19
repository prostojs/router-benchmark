# Router Benchmark Results

Three route-shape variants at 22 routes each. Every lookup = route match + param extraction; all routers are verified to return identical matches/params before measuring. Generated 2026-10-19T11:51:11.304Z.

---

## Short Routes (2–5 segments)

Shallow paths like `/users/:id`, `/posts/:id/comments`.

![Short Routes (2–5 segments)](results/results-short-chart.svg)

| Router | op/ms (median) | round min – max | sample CV | speed |
| --- | ---: | ---: | ---: | --- |
| Rou3 (compiled) | 135,452 | 135,452 – 135,452 | 0.9% | fastest |
| Hono (RegExpRouter) | 56,638 | 56,638 – 56,638 | 0.2% | 2.39x slower |
| Rou3 | 56,277 | 56,277 – 56,277 | 2.9% | 2.41x slower |
| ProstoRouter | 43,488 | 43,488 – 43,488 | 2.5% | 3.11x slower |
| FindMyWay | 34,096 | 34,096 – 34,096 | 1.8% | 3.97x slower |
| Express | 2,438 | 2,438 – 2,438 | 1.3% | 55.55x slower |

---

## Long Routes (deep enterprise API)

Deep paths like `/api/v1/organizations/:orgId/workspaces/:wsId/projects/:projectId`.

![Long Routes (deep enterprise API)](results/results-long-chart.svg)

| Router | op/ms (median) | round min – max | sample CV | speed |
| --- | ---: | ---: | ---: | --- |
| Rou3 (compiled) | 39,335 | 39,335 – 39,335 | 0.1% | fastest |
| FindMyWay | 11,090 | 11,090 – 11,090 | 0.2% | 3.55x slower |
| ProstoRouter | 9,604 | 9,604 – 9,604 | 0.2% | 4.10x slower |
| Hono (RegExpRouter) | 8,906 | 8,906 – 8,906 | 3.3% | 4.42x slower |
| Rou3 | 6,537 | 6,537 – 6,537 | 0.3% | 6.02x slower |
| Express | 1,144 | 1,144 – 1,144 | 1.4% | 34.37x slower |

### Per-Test Results (op/ms, median)

| Test | Rou3 (compiled) | FindMyWay | ProstoRouter | Hono (RegExpRouter) | Rou3 | Express |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Short static | 154,698 | 41,997 | 62,571 | 57,277 | 250,381 | 4,177 |
| Long static | 151,102 | 14,233 | 47,629 | 57,891 | 96,881 | 2,030 |
| Wildcard | 31,133 | 22,003 | 10,561 | 13,169 | 6,223 | 1,338 |
| Single param | 36,555 | 14,875 | 10,891 | 8,572 | 9,540 | 1,920 |
| Param + suffix | 35,242 | 12,228 | 9,269 | 8,527 | 8,548 | 1,761 |
| Param + tasks | 34,728 | 11,464 | 8,978 | 8,375 | 8,673 | 1,399 |
| Two params | 32,998 | 9,259 | 8,644 | 7,012 | 7,736 | 1,124 |
| Two params + suffix | 32,153 | 8,215 | 7,669 | 6,961 | 7,017 | 1,033 |
| Four params | 29,279 | 6,924 | 5,929 | 5,209 | 4,462 | 793 |
| POST with params | 32,382 | 8,941 | 7,961 | 8,354 | 5,595 | 750 |
| PUT with params | 33,008 | 11,225 | 8,649 | 8,393 | 6,205 | 872 |
| DELETE with params | 33,284 | 11,280 | 8,856 | 8,363 | 6,139 | 663 |
| 404 not found | 45,141 | 29,273 | 12,864 | 42,297 | 10,155 | 1,780 |
| All together | 39,335 | 11,090 | 9,604 | 8,906 | 6,537 | 1,144 |

---

## Mixed Routes (short + long)

Half short (2–5 segments) + half long (deep enterprise API) routes.

![Mixed Routes (short + long)](results/results-mixed-chart.svg)

| Router | op/ms (median) | round min – max | sample CV | speed |
| --- | ---: | ---: | ---: | --- |
| Rou3 (compiled) | 56,940 | 56,940 – 56,940 | 2.0% | fastest |
| Hono (RegExpRouter) | 53,412 | 53,412 – 53,412 | 0.2% | 1.07x slower |
| Rou3 | 30,704 | 30,704 – 30,704 | 0.3% | 1.85x slower |
| ProstoRouter | 29,171 | 29,171 – 29,171 | 2.0% | 1.95x slower |
| FindMyWay | 28,068 | 28,068 – 28,068 | 1.3% | 2.03x slower |
| Express | 2,177 | 2,177 – 2,177 | 1.4% | 26.16x slower |

---

## Environment

|  |  |
| --- | --- |
| Date | 2026-10-19T11:51:11.304Z |
| Node.js | v24.22.0 (V8 13.6.233.17-node.57) |
| OS | Darwin 27.0.0 (darwin arm64) |
| CPU | Apple M4 (10 logical cores) |
| Memory | 24 GB |

### Settings

| Setting | Value |
| --- | --- |
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

