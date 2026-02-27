# HTTP Framework Benchmark

A benchmark comparing full HTTP request handling for Node.js frameworks, using a realistic enterprise SaaS API workload.

## Frameworks Tested

| Framework | Router | Description |
|-----------|--------|-------------|
| [Wooks](https://wooks.moost.org/) | @prostojs/router | Composable HTTP framework with lazy context |
| [Fastify](https://fastify.dev/) | find-my-way | Performance-focused framework with schema validation |
| [h3](https://h3.unjs.io/) | rou3 | Minimal HTTP framework (Nitro/Nuxt) |
| [Hono](https://hono.dev/) | RegExpRouter / TrieRouter | Ultralight, multi-runtime framework |
| [Express](https://expressjs.com/) | path-to-regexp | The original Node.js framework (baseline) |

## What This Measures

Unlike the [router benchmark](../router-benchmark/), which isolates pure route matching, this benchmark tests **the full request lifecycle**:

- HTTP parsing and routing
- Header inspection (Bearer token, cookies)
- Auth guard checks (reject before body parse)
- Cookie parsing (~20-cookie jar, typical for a SaaS browser session)
- JSON body parsing (small and large payloads)
- Response serialization with cache headers

Each framework implements the same 21-route project management API with identical behavior — same auth logic, same cookie parsing, same response bodies.

## Key Insight: Routing Doesn't Matter Much in Practice

The [router benchmark](../router-benchmark/) shows **up to 16x differences** between the fastest and slowest routers (ProstoRouter 38k vs Express 2k op/ms). But in this full framework benchmark, the gap compresses to just **1.5x** (Wooks 70k vs Express 47k req/s).

Why? Because routing is a tiny fraction of what a real HTTP server does. The rest — TCP handling, HTTP parsing, header inspection, cookie parsing, body deserialization, response building — dominates the total cost. A router that's 4x faster than another might save microseconds per request, but those microseconds are dwarfed by the milliseconds spent parsing a 20-cookie jar or deserializing a JSON body.

This is why **framework architecture matters more than raw router speed**.

## Results

See [RESULTS.md](RESULTS.md) for the latest results.

![Summary](results/results-chart.svg)

| Framework | avg req/s | speed |
|-----------|----------|-------|
| Wooks | 70,332 | fastest |
| Fastify | 68,273 | 1.0x slower |
| h3 | 64,860 | 1.1x slower |
| Hono | 59,466 | 1.2x slower |
| Express | 47,147 | 1.5x slower |

### Where Wooks Wins

**Cookie-auth reads (42% of traffic)** — the dominant workload in any SaaS app. Wooks handles cookie-authenticated GET requests at ~82k req/s, compared to Fastify's ~73k and h3/Hono's ~65k. This is where Wooks' lazy cookie parsing pays off — cookies are only parsed when accessed, not on every request.

**Early auth rejection** — when a request arrives with a large JSON body but invalid credentials, Wooks rejects it at ~34k req/s without ever parsing the body. Fastify and Express parse the body first and only then check auth, dropping to ~9k req/s. h3 also rejects early (~39k). This is 3–4x faster on attack traffic.

### Where Others Win

**Static routes and auth failures** — Fastify leads on simple GETs without cookies (~88k) and 404s (~86k), thanks to its highly optimized find-my-way trie and fast error handling.

**Body parsing** — h3 has the fastest JSON body parsing (~57–70k on small POSTs vs ~47–56k for Wooks/Fastify). This is likely due to h3's minimal overhead and direct body reading.

### What's Equal

**Large body parsing** — all frameworks converge at ~9–11k req/s for 100-item JSON payloads. At this point, `JSON.parse()` itself is the bottleneck, and no framework can optimize around it.

## With Simulated DB (Redis)

What happens when handlers do real work? In production, every authenticated request hits a database. We added a Redis GET/SET/DEL call to every authenticated handler to simulate this — each request makes a real network round-trip to a local Redis server.

See [RESULTS-DB.md](RESULTS-DB.md) for the full breakdown.

![Summary (with DB)](results/results-db-chart.svg)

| Framework | avg req/s | speed |
|-----------|----------|-------|
| Wooks | 50,854 | fastest |
| Fastify | 49,879 | 1.0x slower |
| h3 | 47,575 | 1.1x slower |
| Hono | 45,542 | 1.1x slower |
| Express | 37,868 | 1.3x slower |

### The Gap Compresses

Without DB calls, the fastest-to-slowest gap is **1.5x** (Wooks 70k vs Express 47k). With a single Redis call per authenticated request, it compresses to **1.3x** (Wooks 51k vs Express 38k). The top four frameworks (Wooks, Fastify, h3, Hono) are now within **12%** of each other.

The more real server-side processing you add — database queries, cache lookups, business logic, external API calls — the more these framework differences compress. In a real application with multiple DB queries, template rendering, and I/O-bound work per request, the framework overhead becomes negligible. **Choose your framework for developer experience, not for benchmarks.**

## Methodology

- Benchmark tool: [autocannon](https://github.com/mcollina/autocannon) with 100 connections, 10 pipelining
- Each test runs independently for 0.5s
- The headline "avg req/s" is a **weighted average** reflecting realistic SaaS traffic (see [root README](../../README.md#traffic-distribution) for the distribution)
- Each framework runs in a separate child process to avoid interference

## Running

```bash
pnpm install
pnpm bench:wooks        # pure framework overhead
pnpm bench:wooks:db     # with simulated Redis DB calls (requires local Redis)
```
