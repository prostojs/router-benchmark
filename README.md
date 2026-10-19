# Complex Benchmark

Benchmarks for the [Moost](https://moost.org/) stack — from the router at the foundation, through the HTTP framework, to the full decorator-driven application layer.

**Moost** is built on [Wooks](https://wooks.moost.org/), which uses [@prostojs/router](https://github.com/prostojs/router) under the hood. These benchmarks measure every layer of the stack against established alternatives.

## Benchmarks

| Benchmark | What it tests | Compares against |
|-----------|---------------|------------------|
| [router-benchmark](packages/router-benchmark/) | URI route matching + param extraction | find-my-way (Fastify), rou3 (h3; plain and compiled), Hono SmartRouter, Express |
| [wooks-benchmark](packages/wooks-benchmark/) | Full HTTP request handling | Fastify, Express, Hono, h3 |
| [moost-benchmark](packages/moost-benchmark/) | Decorator-based framework overhead | NestJS (Express and Fastify platforms) |
| [validator-benchmark](packages/validator-benchmark/) | Runtime data validation (atscript validator) | zod 4 (`safeParse()`, `z.compile()`), valibot, yup, joi, ajv, ArkType, class-validator, TypeBox (`Compile()`, `Value`) |

## Why These Routes?

Most framework benchmarks test "hello world" — a single `GET /` with no auth, no cookies, no body parsing. That tells you nothing about real-world performance where frameworks actually differ.

These benchmarks model a **real enterprise SaaS application** (project management API) with routes, payloads, and traffic patterns you'd see in production.

### Route Design

The API has 22 routes across three authentication layers, modeled after a typical project management tool:

| Layer | Routes | What it covers |
|-------|--------|----------------|
| **Public** | `GET /`, `GET /health`, `POST /auth/login`, `GET /static/*`, `GET /api/v1/docs/*` | Health checks, static assets and docs (with cache headers), login with Set-Cookie |
| **Header-auth** (API clients) | `GET /api/v1/users`, `GET /api/v1/users/:userId`, `GET /api/v1/users/:userId/profile`, `GET/POST /api/v1/projects`, `GET/DELETE /api/v1/projects/:projectId`, `GET /api/v1/organizations/settings/billing/invoices` | Bearer token validation, param extraction, deep static paths |
| **Cookie-auth** (browser users) | `GET /api/v1/projects/:projectId/members`, `GET /api/v1/projects/:projectId/tasks`, `GET/PUT/DELETE /api/v1/projects/:projectId/tasks/:taskId`, `GET/POST /api/v1/projects/:projectId/tasks/:taskId/comments`, `GET /api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId`, `GET /api/v1/organizations/settings/billing/payment-methods` | Full 20-cookie jar parsing, 1-4 URL params, small and large JSON bodies |

This exercises what actually matters in production:
- **Cookie parsing** — every browser request carries ~20 cookies (session, analytics, tracking, consent, feature flags, A/B testing). Most benchmarks skip this entirely.
- **Auth guards** — real APIs reject bad credentials before processing. A framework that parses the body before checking auth spends CPU on every unauthorized request. Every server here except NestJS rejects before parsing the body; NestJS parses it first, which is its default behaviour (see the [moost benchmark](packages/moost-benchmark/README.md#methodology)).
- **Body parsing** — small JSON (single comment) and large JSON (100-item bulk operation, ~25 KB) test different allocation patterns.
- **Route depth** — from `/health` to `/api/v1/orgs/:orgId/teams/:teamId/projects/:projectId/tasks/:taskId` (4 params, 8 segments).
- **Cache headers** — static assets and billing pages set different `Cache-Control` policies, adding response header overhead.

### Traffic Distribution

Each test case runs independently for the same duration; the headline number combines them with these traffic weights as a **weighted harmonic mean** — the throughput of a server receiving this request mix (an arithmetic mean of rates would over-weight the cheap requests):

| Category | Weight | Rationale |
|----------|--------|-----------|
| Cookie-auth reads | 42% | Browser users browsing projects, viewing tasks, navigating teams — the dominant traffic in any SaaS app |
| Cookie-auth writes | 18% | Posting comments, updating task status, occasional bulk operations |
| Header-auth (API) | 16% | Mobile apps, CI/CD integrations, third-party API consumers using Bearer tokens |
| Public/static | 10% | Health checks (monitoring), static asset cache misses, documentation pages |
| Auth failures | 5% | Expired sessions and tokens — normal operational churn |
| 404s | 5% | Old bookmarks, crawler noise, mistyped URLs |
| Bot/scanner | 4% | Large POST bodies with invalid credentials — attack traffic a framework can reject before parsing the body |

This means the headline "traffic-mix req/s" number answers: **"how fast would this framework handle a realistic mix of production traffic?"** — not "how fast can it return a string from a trivial GET".

## Results

The published results are an **indicative estimate from a single round on a laptop**: Apple M4 MacBook Air (fanless), Node.js 24.22, with reduced run settings (HTTP: 1 round, 1 s warmup + 2 s measured per test, 1 s measured in DB mode; router: 1 round, 5 samples; validator: 1 round, 10 samples). Every results file records the environment, the package versions and the settings. Treat differences of a few percent as noise.

### Router — pure route matching (22 long routes)

![Router Benchmark](packages/router-benchmark/results/results-long-chart.svg)

The compiled rou3 router (`rou3/compiler`) is the fastest on every route shape (about 135k op/ms on short routes, 39k on long, 57k on mixed). ProstoRouter (`@prostojs/router`, used by Wooks and Moost) is mid-pack: 43k op/ms on short routes, 9.6k on long and 29k on mixed; find-my-way is ahead of it on long routes. See the [router-benchmark README](packages/router-benchmark/README.md) for all shapes and the 22–200 route scaling series.

### Wooks — full HTTP framework

![Wooks Benchmark](packages/wooks-benchmark/results/results-chart.svg)

Fastify has the highest traffic-mix throughput (115,880 req/s). Wooks is 1.08x behind (107,749), followed by Hono (98,364), h3 (86,165) and Express (63,060). Wooks has the highest throughput on the cookie-authenticated GET routes, and the lowest of all five on the large (~25 KB) JSON POST. See the [wooks-benchmark README](packages/wooks-benchmark/README.md) for the per-test breakdown.

### Moost — DI framework overhead

![Moost Benchmark](packages/moost-benchmark/results/results-chart.svg)

The same run also measures the HTTP frameworks without DI. Moost costs 4.8% of traffic-mix throughput on top of Wooks (95,304 vs 100,135 req/s). NestJS costs 32.5% on top of Fastify (72,506 vs 107,403) and 25% on top of Express (47,702 vs 63,585). A large part of NestJS's cost comes from the bot/scanner tests, because NestJS parses the request body before its guards run. See the [moost-benchmark README](packages/moost-benchmark/README.md) for the per-category analysis.

### Validator — atscript vs zod

![Validator Benchmark (strip mode)](packages/validator-benchmark/results/strip-chart.svg)

Same `Order` model, same accept/reject decisions and the same violations detected on invalid input (checked by a pre-flight). Against zod's default `safeParse()`, the atscript validator is about level on a valid order, about 1.4x faster on a valid 50-item order and 2.4–2.8x faster on invalid input. zod's ahead-of-time `z.compile()` is 8–9x faster than atscript on valid input; atscript is still faster on invalid input. atscript is slower when it has to strip unknown properties (2.4x behind `safeParse()`) and on the standalone payment union when its first branch matches. atscript has no compile mode yet; one is planned. See the [validator-benchmark README](packages/validator-benchmark/README.md) and [RESULTS.md](packages/validator-benchmark/RESULTS.md).

### With simulated DB

All the benchmarks above measure pure framework overhead with no real work in handlers. Production servers hit databases, caches and external APIs on every request. To see how much the framework differences matter then, the DB mode adds a **real Redis GET/SET/DEL call** to every authenticated handler: one network round-trip to a local Redis server per request.

#### Wooks — with DB

![Wooks Benchmark (with DB)](packages/wooks-benchmark/results/results-db-chart.svg)

Fastify 78,315 req/s, Wooks 75,499 (1.04x behind), Hono 61,399, h3 60,826, Express 48,914. The fastest-to-slowest ratio narrows from 1.84x to 1.60x. See the [wooks-benchmark README](packages/wooks-benchmark/README.md#with-simulated-db-redis).

#### Moost — with DB

![Moost Benchmark (with DB)](packages/moost-benchmark/results/results-db-chart.svg)

Moost 68,346 req/s, NestJS (Fastify) 59,632, NestJS (Express) 42,168. Moost's lead over NestJS (Fastify) narrows from 1.31x to 1.15x, and it comes from the bot/scanner tests, where NestJS parses the body before its guards run. Without those two tests NestJS (Fastify) is slightly ahead (about 72k vs 69k req/s); it is faster on the header-auth routes, Moost on 404s. See the [moost-benchmark README](packages/moost-benchmark/README.md#with-simulated-db-redis).

#### The takeaway

A single Redis call per request already narrows the framework differences. A real application does more per request (several queries, rendering, business logic), so the share of time spent in the framework gets smaller still. Measure your own workload before choosing a framework for speed.

## Running

```bash
pnpm install

# Router benchmark
pnpm bench:router         # basic benchmark (22 routes x 3 variants)
pnpm bench:router:scale   # scaling benchmark (22-200 routes x 3 variants)

# Wooks benchmark
pnpm bench:wooks
pnpm bench:wooks:db    # with simulated Redis DB calls

# Moost benchmark
pnpm bench:moost
pnpm bench:moost:db    # with simulated Redis DB calls

# Validator benchmark (atscript vs zod, ~12 min)
pnpm bench:validator

# All benchmarks (router + scale + wooks + moost, ~90 min)
pnpm bench:all

# Smoke test of everything (minutes; numbers not meaningful)
pnpm smoke
```

Smoke (`--quick`) and partial (`--only`) results are written to a git-ignored `.quick/` directory inside each package, never over the published results.

The moost benchmark compiles its TypeScript servers ahead of time (`tsc` → `dist/`); its `start`/`quick` scripts run that build first, so every server — TypeScript or plain JS — is started as plain `node`.

The validator benchmark compiles its atscript model (`asc -f js` → `order.as.js`) in its `start`/`quick`/`preflight` scripts, before running.

All benchmark dependencies are pinned to exact versions from the npm registry; the versions, Node.js version, CPU, OS and run settings are written into every results file. Each package README has a **Methodology** section.
