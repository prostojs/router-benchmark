# DI Framework Benchmark

A benchmark measuring the overhead of decorator-based dependency injection frameworks on top of their underlying HTTP layer.

## Frameworks Tested

| Framework | Built on | DI system |
|-----------|----------|-----------|
| [Moost](https://moost.org/) | Wooks (→ @prostojs/router) | TypeScript decorators evaluated at runtime, design-type metadata via `emitDecoratorMetadata`; DI container `@prostojs/infact` |
| [NestJS + Fastify](https://nestjs.com/) | Fastify (→ find-my-way) | TypeScript decorators evaluated at runtime, design-type metadata via `emitDecoratorMetadata`; NestJS DI container |
| [NestJS + Express](https://nestjs.com/) | Express (→ path-to-regexp) | Same NestJS DI on the Express platform |

## What This Measures

This benchmark isolates the **cost of the DI/decorator layer** by comparing each framework with its underlying HTTP engine. The no-DI baselines (the Wooks, Fastify and Express servers from the [wooks benchmark](../wooks-benchmark/)) are measured in the same run (`--baselines`), so the comparison uses one consistent measurement.

Indicative estimate on a laptop: Apple M4 MacBook Air (fanless), Node.js 24.22, 3 rounds of 1 s warmup + 2 s measured per test (the round-to-round spread of each headline number is under 2%). [RESULTS.md](RESULTS.md) records the environment, versions and settings. Treat differences of a few percent as noise.

| DI framework | Base framework | Base req/s | DI req/s | DI-layer cost | Cost without the bot/scanner tests |
|--------------|---------------|-----------:|---------:|---------:|---------:|
| Moost | Wooks | 115,670 | 102,250 | **11.6%** | 11.5% |
| NestJS (Fastify) | Fastify | 115,810 | 73,569 | **36.5%** | 19.9% |
| NestJS (Express) | Express | 62,901 | 48,369 | **23.1%** | 12.7% |

req/s = traffic-mix throughput (weighted harmonic mean). Both frameworks give you decorators, dependency injection, guards and interceptors, and both evaluate their decorators at runtime using TypeScript's `emitDecoratorMetadata`.

A large part of NestJS's cost comes from the two bot/scanner tests (large POST body with bad credentials, 4% of traffic): NestJS parses the request body before its guards run, so it handles them at about 12k req/s instead of 54–86k. The last column recomputes the traffic mix without those two tests: Moost's DI-layer cost is then a little over half of NestJS's on Fastify and slightly below NestJS's on Express.

## Results

See [RESULTS.md](RESULTS.md) for the per-test numbers and p99 latency.

![Summary](results/results-chart.svg)

| Framework | traffic-mix req/s | relative |
|-----------|----------:|-------|
| Fastify (no DI) | 115,810 | fastest |
| Wooks (no DI) | 115,670 | 1.00x slower |
| Moost | 102,250 | 1.13x slower |
| NestJS (Fastify) | 73,569 | 1.57x slower |
| Express (no DI) | 62,901 | 1.84x slower |
| NestJS (Express) | 48,369 | 2.39x slower |

### Where the Overhead Goes

Not all request types are affected equally by the DI layer:

**Cookie-auth reads (42% of traffic)** — Moost costs 12–13% vs Wooks (137–144k req/s), NestJS costs 16–17% vs Fastify (about 120k req/s). Moost is 14–19% ahead of NestJS (Fastify) on these routes.

**404 handling** — Moost handles 404s at 158–163k req/s, 7% below Wooks. NestJS handles them at about 86k on Fastify (55% below plain Fastify) and about 52k on Express.

**Auth failures (401)** — the largest DI cost for Moost: about 101k req/s vs 143–151k for Wooks (30–33%). NestJS loses more: 77–80k vs about 197k for Fastify (59–61%). Moost is about 1.3x faster than NestJS (Fastify) here.

**Bot/scanner traffic (large body + bad auth)** — Moost rejects before parsing the body, at 59–61k req/s (13% below Wooks). NestJS parses the body first and handles these requests at about 12k on both platforms, about 5x slower than Moost.

**Static and header-auth GETs** — Moost costs 10–21% vs Wooks, NestJS 13–23% vs Fastify. Moost is 4% ahead of NestJS (Fastify) on the short static route and level on the header-auth static route; NestJS (Fastify) is 3–5% ahead on the header-auth param and long static routes and 8–11% ahead on the wildcard routes.

**Body parsing** — on small JSON bodies Moost costs 10–13% vs Wooks and NestJS 18–22% vs Fastify; Moost is 5% ahead of NestJS (Fastify) on the cookie-auth POST/PUT and 7% behind it on the header-auth POST. On the large (~25 KB) JSON body, Moost is the fastest of the three DI frameworks (13,345 req/s vs 12,340 for NestJS (Fastify) and 12,654 for NestJS (Express)); with Moost 0.6.52 / Wooks 0.7.30 it was the slowest (9,199).

**Login (set-cookie)** — NestJS (Fastify) 95,875 vs Moost 89,277.

### The Bottom Line

Moost gives you decorator-driven controllers, guards, interceptors and dependency injection with a DI-layer cost of 11.6% on top of Wooks, against 36.5% for NestJS on top of Fastify. On the most common production workload (cookie-authenticated reads), Moost is 14–19% ahead of NestJS on Fastify. NestJS (Fastify) is ahead of Moost on the wildcard routes, login, the header-auth param and long static routes and the header-auth small POST. The headline gap (1.39x) is widened by the bot/scanner tests, where NestJS parses the body before checking auth; without them Moost is 1.12x ahead.

## With Simulated DB (Redis)

What happens when handlers do real work? The DB mode adds a Redis GET/SET/DEL call to every authenticated handler — each request makes a real network round-trip to a local Redis server. (Single round, 1 s warmup + 1 s measured per test; no no-DI baselines in this run.)

See [RESULTS-DB.md](RESULTS-DB.md) for the full breakdown.

![Summary (with DB)](results/results-db-chart.svg)

| Framework | traffic-mix req/s | relative |
|-----------|----------:|-------|
| Moost | 73,910 | fastest |
| NestJS (Fastify) | 60,518 | 1.22x slower |
| NestJS (Express) | 42,691 | 1.73x slower |

### The Gap Narrows

Without DB calls Moost is 1.39x ahead of NestJS (Fastify); with one Redis call per authenticated request it is 1.22x ahead. That remaining lead comes from the bot/scanner tests: without them the two are about level (Moost 74,715 vs NestJS (Fastify) 73,422 req/s). Per category, with the DB call:

- **Cookie-auth reads:** Moost and NestJS (Fastify) are level (84–87k req/s).
- **Cookie-auth small POST/PUT:** Moost is 3–4% ahead (about 61k vs 59k).
- **Header-auth routes:** NestJS (Fastify) is 14–18% ahead of Moost on the GETs and 6% on the small POST.
- **Wildcard routes, login:** NestJS (Fastify) is 6–8% ahead; Moost is 6% ahead on the short static route.
- **Auth failures (401):** Moost is 22–27% faster (93–97k vs 76k).
- **404s:** Moost is about 1.9x faster (157–161k vs 84k).
- **Bot/scanner:** Moost is about 5x faster (58–60k vs 12k), because NestJS parses the body first.

The more real work each request does — database queries, cache lookups, business logic, external API calls — the smaller the share of time spent in the framework and its DI layer. Measure your own workload before choosing a DI framework for speed.

## Methodology

Same harness and workload as the [wooks benchmark](../wooks-benchmark/README.md#methodology) (shared code in `packages/bench-utils`):

- The TypeScript servers are **compiled ahead of time** (`pnpm build` = `tsc` from TypeScript 7 with `experimentalDecorators` + `emitDecoratorMetadata`) into a git-ignored `dist/`; every `start`/`quick` script builds first. No loader runs at benchmark time.
- Every framework server runs in its **own child process** as plain `node <entry>` with identical flags for all servers, baselines included (`NODE_ENV=production`, logging disabled) — this also keeps Moost's and NestJS' `reflect-metadata` usage apart. The load generator (autocannon, 100 connections, pipelining 10) runs in the orchestrator process.
- Handlers are synchronous in pure mode; only `--db` mode returns a promise for the Redis round-trip.
- **Drain between runs:** after every run the orchestrator waits until the server process reports all client connections closed (abort after 5 s), instead of a fixed sleep.
- **Pre-flight equivalence check** on every server start (status, body, headers, invalid-body → 400).
- Per test (defaults): 2 s warmup + 5 s measured; 3 rounds with rotated framework order (the published results used a reduced run: 1 s warmup + 2 s measured, 3 rounds, with baselines; DB mode 1 s measured, 1 round); median per test; runs with > 0.1% unexpected responses are flagged INVALID.
- Headline = weighted harmonic mean of per-test medians (traffic-mix throughput).
- Auth: Moost uses `defineAuthGuard` interceptors (run before argument resolution, so `@Body()` is never parsed for unauthorized requests); NestJS uses `@UseGuards` guards. NestJS registers its JSON body parser globally (platform default), so on both NestJS platforms the body is parsed *before* guards run — that is NestJS' idiomatic behaviour and is intentionally not worked around.
- One version of each HTTP engine: the root `pnpm.overrides` pins `express` and `fastify`, so NestJS' platform adapters run on exactly the same Express/Fastify versions as the no-DI baselines (NestJS otherwise bundles its own, slightly older copies).
- Body validation: the same minimal "body must be a JSON object" check in every handler (`BadRequestException` / `HttpError(400)`); no class-validator / schema library on either side.

`--warmup <s> --duration <s> --rounds <n> --only moost,nestjs-fastify --quick` (or `BENCH_*` env vars) are supported; `pnpm quick` is a smoke test whose numbers are not meaningful.

`--baselines` (or naming a baseline key in `--only`) additionally measures the underlying HTTP frameworks without DI (Wooks, Fastify, Express — the servers from `wooks-benchmark`, started the same way) in the same run, so the DI-layer cost table above is computed from one consistent measurement (~50 min instead of ~25).

## Running

```bash
pnpm install
pnpm --filter moost-benchmark build   # compile src/ → dist/ (the start/quick scripts do this automatically)
pnpm bench:moost        # pure framework overhead (~25 min)
pnpm bench:moost:db     # with simulated Redis DB calls (requires Redis on 127.0.0.1:6379; ~25 min)
pnpm --filter moost-benchmark quick   # smoke test (~2 min, numbers not meaningful)
```
