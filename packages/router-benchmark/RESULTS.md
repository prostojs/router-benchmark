# Router Benchmark Results

Three route-shape variants at 22 routes each. Every lookup = route match + param extraction; all routers are verified to return identical matches/params before measuring. Generated 2026-10-19T19:36:37.506Z.

---

## Short Routes (2–5 segments)

Shallow paths like `/users/:id`, `/posts/:id/comments`.

![Short Routes (2–5 segments)](results/results-short-chart.svg)

| Router | op/ms (median) | round min – max | sample CV | speed |
| --- | ---: | ---: | ---: | --- |
| Rou3 (compiled) | 142,365 | 142,365 – 142,365 | 1.8% | fastest |
| Rou3 | 56,232 | 56,232 – 56,232 | 0.7% | 2.53x slower |
| Hono (RegExpRouter) | 50,887 | 50,887 – 50,887 | 0.2% | 2.80x slower |
| ProstoRouter | 41,838 | 41,838 – 41,838 | 2.8% | 3.40x slower |
| FindMyWay | 34,643 | 34,643 – 34,643 | 6.7% | 4.11x slower |
| Express | 2,295 | 2,295 – 2,295 | 2.3% | 62.04x slower |

---

## Long Routes (deep enterprise API)

Deep paths like `/api/v1/organizations/:orgId/workspaces/:wsId/projects/:projectId`.

![Long Routes (deep enterprise API)](results/results-long-chart.svg)

| Router | op/ms (median) | round min – max | sample CV | speed |
| --- | ---: | ---: | ---: | --- |
| Rou3 (compiled) | 38,823 | 38,823 – 38,823 | 0.2% | fastest |
| FindMyWay | 11,262 | 11,262 – 11,262 | 1.6% | 3.45x slower |
| ProstoRouter | 9,446 | 9,446 – 9,446 | 4.8% | 4.11x slower |
| Hono (RegExpRouter) | 9,157 | 9,157 – 9,157 | 0.7% | 4.24x slower |
| Rou3 | 6,555 | 6,555 – 6,555 | 1.1% | 5.92x slower |
| Express | 1,107 | 1,107 – 1,107 | 1.5% | 35.08x slower |

### Per-Test Results (op/ms, median)

| Test | Rou3 (compiled) | FindMyWay | ProstoRouter | Hono (RegExpRouter) | Rou3 | Express |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Short static | 153,256 | 41,564 | 60,102 | 56,801 | 250,813 | 4,113 |
| Long static | 146,620 | 13,970 | 44,433 | 57,156 | 96,301 | 1,978 |
| Wildcard | 30,277 | 22,135 | 10,059 | 12,996 | 6,204 | 1,325 |
| Single param | 35,944 | 14,704 | 11,313 | 8,515 | 9,563 | 1,902 |
| Param + suffix | 35,318 | 12,170 | 9,893 | 8,534 | 8,413 | 1,749 |
| Param + tasks | 34,696 | 11,508 | 9,112 | 8,365 | 8,645 | 1,423 |
| Two params | 32,441 | 9,437 | 8,958 | 6,959 | 7,684 | 1,138 |
| Two params + suffix | 32,160 | 8,241 | 7,670 | 6,897 | 6,941 | 1,040 |
| Four params | 29,057 | 7,069 | 6,381 | 5,280 | 4,503 | 781 |
| POST with params | 31,757 | 8,542 | 7,877 | 7,998 | 5,691 | 741 |
| PUT with params | 32,724 | 11,434 | 8,741 | 8,113 | 6,179 | 841 |
| DELETE with params | 32,829 | 11,352 | 8,941 | 8,219 | 6,184 | 673 |
| 404 not found | 44,931 | 30,177 | 13,409 | 43,250 | 10,112 | 1,756 |
| All together | 38,823 | 11,262 | 9,446 | 9,157 | 6,555 | 1,107 |

---

## Mixed Routes (short + long)

Half short (2–5 segments) + half long (deep enterprise API) routes.

![Mixed Routes (short + long)](results/results-mixed-chart.svg)

| Router | op/ms (median) | round min – max | sample CV | speed |
| --- | ---: | ---: | ---: | --- |
| Rou3 (compiled) | 56,319 | 56,319 – 56,319 | 2.0% | fastest |
| Hono (RegExpRouter) | 53,178 | 53,178 – 53,178 | 0.2% | 1.06x slower |
| Rou3 | 30,250 | 30,250 – 30,250 | 0.7% | 1.86x slower |
| ProstoRouter | 29,905 | 29,905 – 29,905 | 0.7% | 1.88x slower |
| FindMyWay | 27,079 | 27,079 – 27,079 | 0.9% | 2.08x slower |
| Express | 2,243 | 2,243 – 2,243 | 1.2% | 25.11x slower |

---

## Environment

|  |  |
| --- | --- |
| Date | 2026-10-19T19:36:37.506Z |
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

