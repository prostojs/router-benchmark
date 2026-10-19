# HTTP Framework Benchmark

A benchmark comparing full HTTP request handling for Node.js frameworks, using a realistic enterprise SaaS API workload.

## Frameworks Tested

| Framework | Router | Description |
|-----------|--------|-------------|
| [Wooks](https://wooks.moost.org/) | @prostojs/router | Composable HTTP framework with lazy context |
| [Fastify](https://fastify.dev/) | find-my-way | Performance-focused framework with schema validation |
| [h3](https://h3.dev/) v2 | rou3 | Minimal web-standard HTTP framework, served via its own `serve()` (srvx) |
| [Hono](https://hono.dev/) | SmartRouter (RegExpRouter / TrieRouter) | Ultralight, multi-runtime framework, via `@hono/node-server` |
| [Express](https://expressjs.com/) | path-to-regexp | The original Node.js framework (baseline) |

## What This Measures

Unlike the [router benchmark](../router-benchmark/), which isolates pure route matching, this benchmark tests **the full request lifecycle**:

- HTTP parsing and routing
- Header inspection (Bearer token, cookies)
- Auth guard checks (reject before body parse)
- Cookie parsing (~20-cookie jar, typical for a SaaS browser session)
- JSON body parsing (small and large payloads)
- Response serialization with cache headers

Each framework implements the same 22-route project management API with identical behavior — same status codes, response bodies, `Cache-Control`/`Set-Cookie` headers, auth checks, cookie parsing and JSON body parsing + validation (non-object or malformed bodies → 400). An automated pre-flight check verifies this for every server before it is measured.

Each server is written the way a competent user of that framework would write it:

| Framework | Auth | Body parsing / validation |
|-----------|------|---------------------------|
| Wooks | composable called first in the handler | `useBody().parseBody()` after auth |
| Fastify | per-route `onRequest` hook (runs before the content-type parser) | built-in parser + JSON schema `{ type: 'object' }` |
| h3 | per-route middleware | `readBody()` in the handler |
| Hono | per-route middleware | built-in `validator('json')` after the auth middleware |
| Express | per-route middleware | `express.json()` placed after the auth middleware |

So every framework rejects unauthorized requests **without parsing the body**.

## Routing Is a Small Part of the Cost

The [router benchmark](../router-benchmark/) shows differences of up to 62x between the fastest and slowest routers (compiled rou3 142k vs Express 2.3k op/ms on short routes). In this full framework benchmark the fastest-to-slowest ratio is **1.97x** (Fastify vs Express traffic-mix throughput).

Routing is a small fraction of what an HTTP server does per request. TCP handling, HTTP parsing, header inspection, cookie parsing, body deserialization and response building make up most of the cost. A lookup takes tens of nanoseconds in most of the routers tested (ProstoRouter: about 24 ns on short routes, compiled rou3: about 7 ns), and under a microsecond even in Express. A request served at 100k req/s takes about 10 µs. A router that is 3x faster than another saves tens of nanoseconds per request.

So framework architecture matters more than raw router speed. For example, Wooks' router (ProstoRouter) is 3.4x behind compiled rou3 on short routes, yet Wooks has higher traffic-mix throughput than h3, which uses rou3.

## Results

See [RESULTS.md](RESULTS.md) for the full results, including per-test numbers and p99 latency. Indicative estimate, single round on a laptop: Apple M4 MacBook Air (fanless), Node.js 24.22, 1 round of 1 s warmup + 2 s measured per test. Treat differences of a few percent as noise.

![Summary](results/results-chart.svg)

| Framework | traffic-mix req/s | relative |
|-----------|----------:|-------|
| Fastify | 116,447 | fastest |
| Wooks | 113,670 | 1.02x slower |
| Hono | 95,579 | 1.22x slower |
| h3 | 84,600 | 1.38x slower |
| Express | 59,065 | 1.97x slower |

Fastify and Wooks are 2% apart, within the noise of a single-round run.

### Where Wooks Leads

**Cookie-auth reads (42% of traffic)** — the dominant workload in a browser-facing SaaS app. Wooks handles the three cookie-authenticated GET tests at 154–162k req/s, 6–12% ahead of Fastify (144–147k) and well ahead of Hono (112–115k), h3 (99–102k) and Express (57–61k). Wooks parses cookies lazily: the cookie header is only parsed when a handler reads a cookie.

### Close to Even

**Large JSON body** — on the 100-item (~25 KB) POST all five are close (12,500–14,200 req/s): Hono 14,177, h3 13,902, Wooks 13,255, Fastify 12,588, Express 12,541. Wooks 0.7.30 was the slowest here (9,380 req/s in the previous run); 0.7.31 made its JSON body path faster.

### Where Wooks Trails

**Auth failures (401)** — Fastify (200–204k) and Hono (160–163k) are faster than Wooks (141–148k). Wooks is ahead of Express (93–97k) and h3 (~80k).

**404s** — Fastify (192–196k) is ahead of Wooks (167–173k); Hono is level with Wooks on both. h3 (81–83k) and Express (97–99k) are behind.

**Login (set-cookie)** — Fastify 111,213 vs Wooks 96,567; Wooks is ahead of h3, Hono and Express.

**Small JSON bodies, static and header-auth routes** — Fastify is ahead of Wooks by 4–7% on the short static, header-auth static and long static routes and on the cookie-auth small POST/PUT, by 12–13% on the cached wildcard and header-auth param routes, and by 18% on the deep wildcard route and the header-auth small POST.

### Early auth rejection

Every server here checks auth before parsing the body, so large POST bodies with bad credentials are rejected without parsing. On those two tests Fastify is the fastest (86–87k req/s), followed by Wooks and Hono (65–70k), Express (53–58k) and h3 (47–49k).

## With Simulated DB (Redis)

What happens when handlers do real work? In production, every authenticated request hits a database. The DB mode adds a Redis GET/SET/DEL call to every authenticated handler — each request makes a real network round-trip to a local Redis server. (3 rounds, 1 s warmup + 1 s measured per test.)

See [RESULTS-DB.md](RESULTS-DB.md) for the full breakdown.

![Summary (with DB)](results/results-db-chart.svg)

| Framework | traffic-mix req/s | relative |
|-----------|----------:|-------|
| Fastify | 87,791 | fastest |
| Wooks | 82,779 | 1.06x slower |
| Hono | 69,204 | 1.27x slower |
| h3 | 67,771 | 1.30x slower |
| Express | 51,933 | 1.69x slower |

### The Gap Narrows

Without DB calls, the fastest-to-slowest ratio is **1.97x**; with one Redis call per authenticated request it is **1.69x**. Wooks stays second, 6% behind Fastify (2% without DB calls). With the DB call, Fastify is 3–6% ahead of Wooks on the cookie-auth reads (98–99k vs 93–95k req/s), 17–23% ahead on the header-auth GETs and 10–13% on the wildcard routes; the short static route and the 404s are within 5%. Wooks is ahead of Hono, h3 and Express on the cookie-auth reads, and third of five on the large-body POST. Fastify's DB numbers vary the most between rounds (traffic mix 80.6–89.0k req/s).

The more real work each request does — database queries, cache lookups, business logic, external API calls — the smaller the share of time spent in the framework. Measure your own workload before choosing a framework for speed.

## Methodology

- Every framework server runs in its **own child process** — plain `node <entry>` with identical flags for all frameworks (`NODE_ENV=production`, logging disabled, bound to 127.0.0.1) — started fresh for each round and killed afterwards — one server at a time.
- Handlers are synchronous in pure mode (no per-request Promise/microtask that is not the framework's own cost); only `--db` mode returns a promise for the Redis round-trip. Handlers that read the body themselves (Wooks, h3) stay `async`.
- The load generator ([autocannon](https://github.com/mcollina/autocannon), 100 connections, pipelining 10) runs in the orchestrator process, which does nothing else during a measurement.
- **Pre-flight equivalence check** on every server start: each test (plus two invalid-body checks) is sent once and status, body and relevant headers are compared with the expected values; any mismatch aborts the run.
- Per test (defaults): **2 s warmup** (discarded) + **5 s measured**; **3 rounds** with the framework order rotated (the published results used a reduced run: 1 s warmup + 2 s measured, 1 round; DB mode 1 s measured, 3 rounds); the per-test value is the **median** over rounds (min–max and CV are reported).
- **Drain between runs:** autocannon stops by destroying its sockets, possibly mid-request. After every run the orchestrator asks the server process (over its IPC channel, never during a measurement) to report once all client connections are closed; if any are still open after 5 s the run aborts.
- Any measured run with more than 0.1% unexpected status codes / socket errors is marked **INVALID** and flagged in the results.
- The headline number is the **traffic-mix throughput**: the weighted *harmonic* mean of the per-test medians using the traffic weights in the [root README](../../README.md#traffic-distribution) — i.e. the req/s of a server receiving that request mix. (A weighted arithmetic mean of rates would over-weight cheap requests; it is still shown for reference.)
- Results files record Node.js version, CPU, OS, the exact package versions and all run settings.

All settings are configurable: `--warmup <s> --duration <s> --rounds <n> --connections <n> --pipelining <n> --workers <n> --only wooks,fastify --quick` (or `BENCH_*` env vars; invalid values and unknown options are rejected). `--quick` is a smoke test (1 s per test, 1 round) — its numbers are not meaningful; smoke and `--only` runs are written to the git-ignored `.quick/` directory.

## Running

```bash
pnpm install
pnpm bench:wooks        # pure framework overhead (~40 min)
pnpm bench:wooks:db     # with simulated Redis DB calls (requires Redis on 127.0.0.1:6379; ~40 min)
pnpm --filter wooks-benchmark quick   # smoke test (~3 min, numbers not meaningful)
```
