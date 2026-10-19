# DI Framework Benchmark

A benchmark measuring the overhead of decorator-based dependency injection frameworks on top of their underlying HTTP layer.

## Frameworks Tested

| Framework | Built on | DI system |
|-----------|----------|-----------|
| [Moost](https://moost.org/) | Wooks (→ @prostojs/router) | Compile-time decorators, lightweight DI |
| [NestJS + Fastify](https://nestjs.com/) | Fastify (→ find-my-way) | Runtime decorators, full-featured DI container |
| [NestJS + Express](https://nestjs.com/) | Express (→ path-to-regexp) | Same NestJS DI, slower HTTP base |

## What This Measures

This benchmark isolates the **cost of the DI/decorator layer** by comparing each framework against its underlying HTTP engine (tested in the [wooks benchmark](../wooks-benchmark/)):

| DI framework | Base framework | Base req/s | DI req/s | Overhead |
|--------------|---------------|-----------|---------|----------|
| Moost | Wooks | 70,332 | 66,049 | **6%** |
| NestJS (Fastify) | Fastify | 68,273 | 60,196 | **12%** |
| NestJS (Express) | Express | 47,147 | 42,359 | **10%** |

**Moost's DI costs half of what NestJS's does** — 6% overhead vs 10–12%. Both give you decorators, dependency injection, guards, and interceptors. But Moost achieves this with compile-time metadata and a lighter DI container, while NestJS uses a heavier runtime reflection system.

## Results

See [RESULTS.md](RESULTS.md) for the latest results.

![Summary](results/results-chart.svg)

| Framework | avg req/s | speed |
|-----------|----------|-------|
| Moost | 66,049 | fastest |
| NestJS (Fastify) | 60,196 | 1.1x slower |
| NestJS (Express) | 42,359 | 1.6x slower |

### Where the Overhead Goes

Not all request types are affected equally by the DI layer:

**Cookie-auth reads (42% of traffic)** — Moost loses ~6% vs Wooks (82k → 77k), NestJS loses ~8% vs Fastify (73k → 67k). Moderate impact on both.

**404 handling** — this is where NestJS hurts the most. Wooks handles 404s at ~76k, and Moost matches that at ~78k. But Fastify at ~86k drops to ~56k under NestJS — a **35% penalty** from NestJS's exception filter pipeline. Moost's 404 path has essentially zero DI overhead.

**Auth failures** — similar story. Fastify's 88k drops to 50k under NestJS (**43% penalty**), while Wooks' 69k drops to only 58k under Moost (**16%**). NestJS's guard → exception flow is expensive.

**Early auth rejection** — Moost inherits Wooks' architecture: reject bad credentials *before* parsing the body. On large-body attack traffic, Moost handles ~29k req/s. NestJS (both variants) parses the body first, dropping to ~9k. That's **3x faster** on bot/scanner traffic.

**Simple GETs** — nearly identical across all three. At ~78–82k req/s, the DI layer is invisible for basic request handling.

**Body parsing** — all three converge at ~42–51k for small bodies and ~9–10k for large bodies. `JSON.parse()` is the bottleneck, and no DI framework can optimize around it.

### The Bottom Line

Moost gives you the same decorator-driven DX as NestJS — guards, interceptors, dependency injection, class-based controllers — with roughly **half the runtime overhead**. On the most common production workload (cookie-authenticated reads), Moost on Wooks outperforms NestJS on Fastify by **14%** (77k vs 67k). On attack traffic (large body + bad auth), it's **3x faster** thanks to early rejection.

## With Simulated DB (Redis)

What happens when handlers do real work? We added a Redis GET/SET/DEL call to every authenticated handler — each request makes a real network round-trip to a local Redis server.

See [RESULTS-DB.md](RESULTS-DB.md) for the full breakdown.

![Summary (with DB)](results/results-db-chart.svg)

| Framework | avg req/s | speed |
|-----------|----------|-------|
| Moost | 49,415 | fastest |
| NestJS (Fastify) | 48,194 | 1.0x slower |
| NestJS (Express) | 37,296 | 1.3x slower |

### The Gap Compresses Further

Without DB calls, the gap between Moost and NestJS (Fastify) is **10%** (66k vs 60k). With a single Redis call per authenticated request, it drops to just **2.5%** (49k vs 48k). Even the DI overhead difference between Moost and NestJS — 6% vs 12% — becomes almost invisible once real I/O enters the picture.

The more real server-side processing you add — database queries, cache lookups, business logic, external API calls — the more framework and DI overhead differences compress until they become negligible. **Choose your DI framework for developer experience and architecture, not for benchmarks.**

## Methodology

Same harness and workload as the [wooks benchmark](../wooks-benchmark/README.md#methodology) (shared code in `packages/bench-utils`):

- The TypeScript servers are **compiled ahead of time** (`pnpm build` = `tsc` from TypeScript 7 with `experimentalDecorators` + `emitDecoratorMetadata`) into a git-ignored `dist/`; every `start`/`quick` script builds first. No loader runs at benchmark time.
- Every framework server runs in its **own child process** as plain `node <entry>` with identical flags for all servers, baselines included (`NODE_ENV=production`, logging disabled) — this also keeps Moost's and NestJS' `reflect-metadata` usage apart. The load generator (autocannon, 100 connections, pipelining 10) runs in the orchestrator process.
- Handlers are synchronous in pure mode; only `--db` mode returns a promise for the Redis round-trip.
- **Drain between runs:** after every run the orchestrator waits until the server process reports all client connections closed (abort after 5 s), instead of a fixed sleep.
- **Pre-flight equivalence check** on every server start (status, body, headers, invalid-body → 400).
- Per test: 2 s warmup + 5 s measured; 3 rounds with rotated framework order; median per test; runs with > 0.1% unexpected responses are flagged INVALID.
- Headline = weighted harmonic mean of per-test medians (traffic-mix throughput).
- Auth: Moost uses `defineAuthGuard` interceptors (run before argument resolution, so `@Body()` is never parsed for unauthorized requests); NestJS uses `@UseGuards` guards. NestJS registers its JSON body parser globally (platform default), so on both NestJS platforms the body is parsed *before* guards run — that is NestJS' idiomatic behaviour and is intentionally not worked around.
- One version of each HTTP engine: the root `pnpm.overrides` pins `express` and `fastify`, so NestJS' platform adapters run on exactly the same Express/Fastify versions as the no-DI baselines (NestJS otherwise bundles its own, slightly older copies).
- Body validation: the same minimal "body must be a JSON object" check in every handler (`BadRequestException` / `HttpError(400)`); no class-validator / schema library on either side.

`--warmup <s> --duration <s> --rounds <n> --only moost,nestjs-fastify --quick` (or `BENCH_*` env vars) are supported; `pnpm quick` is a smoke test whose numbers are not meaningful.

`--baselines` (or naming a baseline key in `--only`) additionally measures the underlying HTTP frameworks without DI (Wooks, Fastify, Express — the servers from `wooks-benchmark`, started the same way) in the same run, so the DI-layer overhead table above can be computed from one consistent measurement (~50 min instead of ~25).

## Running

```bash
pnpm install
pnpm --filter moost-benchmark build   # compile src/ → dist/ (the start/quick scripts do this automatically)
pnpm bench:moost        # pure framework overhead (~25 min)
pnpm bench:moost:db     # with simulated Redis DB calls (requires Redis on 127.0.0.1:6379; ~25 min)
pnpm --filter moost-benchmark quick   # smoke test (~2 min, numbers not meaningful)
```
