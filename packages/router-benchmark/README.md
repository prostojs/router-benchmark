# Router Benchmark

A benchmark comparing URI router performance for Node.js, focused on **route matching + parameter extraction**.

## Routers Tested

| Router | Version | Description |
|--------|---------|-------------|
| [@prostojs/router](https://github.com/prostojs/router) | see results | Regex-based, feature-rich router (used by Wooks/Moost) |
| [find-my-way](https://github.com/delvedor/find-my-way) | see results | Radix trie router (Fastify's default) |
| [rou3](https://github.com/h3js/rou3) | see results | Radix trie router (h3) — `findRoute()` |
| rou3 (compiled) | see results | rou3's JIT compiler `compileRouter()` from `rou3/compiler` |
| [hono](https://github.com/honojs/hono) | see results | Hono's default `SmartRouter` (RegExpRouter with TrieRouter fallback) |
| [express](https://github.com/expressjs/express) | see results | Layer-based linear matching (baseline) |

Exact versions of every run are recorded in the results files. h3 is not listed separately: its router *is* rou3.

## Approach

### Apples-to-apples comparison

Router benchmarks are tricky because some routers parse route parameters eagerly (during matching), while others return lazy structures that defer param extraction. To keep the comparison fair, **every router in this benchmark performs full route matching AND parameter extraction** in its `lookup()` call. For routers that return lazy results (like Hono's `RegExpRouter` stash-based param indices), the benchmark interface explicitly extracts all param values before returning.

This means we measure the real cost of routing — what actually happens on every incoming request.

### Route shapes

Rather than testing one artificial route set, the benchmark uses three realistic route shapes:

- **Short routes** (2–5 segments): `/users/:id`, `/posts/:id/comments`, `/orders/:id/items` — typical lightweight REST APIs with many distinct top-level prefixes
- **Long routes** (5–10 segments): `/api/v1/organizations/:orgId/workspaces/:wsId/projects/:projectId` — deep enterprise SaaS APIs with shared `/api/v1/` prefix
- **Mixed routes**: half short + half long — realistic servers that serve both patterns

### Why these routes?

Short routes with many distinct prefixes stress routers differently than deep routes with shared prefixes. A trie-based router excels at shared prefixes but wastes memory on many shallow branches. A regex-based router handles both shapes well at small scale but degrades with route count as V8 tests regex alternatives sequentially. Testing all three shapes reveals the full picture.

### Test workloads

Each variant generates a workload that exercises statics, parametric routes with 1–4 params, wildcards, different HTTP methods, and 404 misses — spread across different route branches to avoid always hitting the same trie node.

## Methodology

- **Equivalence pre-flight:** before measuring, every router is run on every workload URL in-process and must return the same match / no-match outcome and the same named params as all other routers (wildcard captures are exposed under router-specific keys and are not compared). Any disagreement aborts the run.
- **Process isolation:** each router × workload × round runs in a **fresh Node.js process** (`node --expose-gc`, `NODE_ENV=production`) that loads only the router it measures, so JIT state, inline caches and heap are never shared between routers.
- **Expected outcomes:** every workload URL carries an explicit `expectMatch` flag (set by the workload generators); the pre-flight checks each router against it, and each worker verifies its hit count against it.
- **Warmup + calibration:** time-based warmup (500 ms per test) that also calibrates the batch size; `gc()` before sampling.
- **Sampling:** 10 timed samples (default) of ~100 ms per test (`process.hrtime.bigint()`), yielding to the event loop between samples (outside the timed region) so deferred work such as Express' `setImmediate` callbacks never leaks into another sample.
- **No dead-code elimination:** every lookup result is consumed (hit counter, verified against the expected number of matches) and the returned params object is stored in a module-level sink, so params extraction cannot be optimized away.
- **Rounds:** 5 rounds (default) with router order rotated; reported value = median of per-round medians (op/ms), plus min–max round medians and the coefficient of variation of all samples.
- Options: `--rounds n --warmup ms --samples n --sample-ms ms --only prosto,rou3 --quick` (or `BENCH_ROUNDS`, `BENCH_WARMUP_MS`, `BENCH_SAMPLES`, `BENCH_SAMPLE_MS`). `--quick` is a smoke test; its numbers are not meaningful. Smoke and `--only` runs are written to the git-ignored `.quick/` directory.
- **Scaling series** are keyed by router; when a router switches implementation with the route count (Hono's SmartRouter: RegExpRouter → TrieRouter), it stays one series and the active backend is labelled per point.

## Two benchmarks

### Basic benchmark (`pnpm bench:router`, ~12 min)

All three route shapes at 22 routes each; per-test breakdown for the long (enterprise API) shape. See [RESULTS.md](RESULTS.md).

### Scaling benchmark (`pnpm bench:router:scale`, ~10 min)

How performance changes as route count grows: **22 → 50 → 100 → 200** routes, for each shape. Produces line charts. See [RESULTS-SCALE.md](RESULTS-SCALE.md).

## Results at a Glance

Indicative estimate, single round on a laptop: the published results were produced with 1 round × 5 samples per test (instead of the 5 × 10 default) on an Apple M4 MacBook Air (fanless), Node.js 24.22. [RESULTS.md](RESULTS.md) and [RESULTS-SCALE.md](RESULTS-SCALE.md) record the environment, versions and settings. Treat differences of a few percent as noise.

### At 22 routes (basic bench)

![Long Routes — 22 routes](results/results-long-chart.svg)

| Variant | Rou3 (compiled) | Hono RegExpRouter | Rou3 | ProstoRouter | FindMyWay | Express |
|---------|---:|---:|---:|---:|---:|---:|
| Short routes | **142,365** | 50,887 | 56,232 | 41,838 | 34,643 | 2,295 |
| Long routes | **38,823** | 9,157 | 6,555 | 9,446 | 11,262 | 1,107 |
| Mixed routes | **56,319** | 53,178 | 30,250 | 29,905 | 27,079 | 2,243 |

op/ms, higher is better.

- **Rou3 (compiled)** is the fastest on every shape, by 2.5x (short), 3.4x (long) and 1.06x (mixed) over the runner-up, and in every per-test row of the long-route breakdown except short static paths, where plain rou3 is faster.
- **ProstoRouter** is mid-pack: 4th on short routes (3.4x behind the leader), 3rd on long routes (4.1x behind; find-my-way is 19% ahead of it) and 4th on mixed routes (1.9x behind, level with plain rou3 and 10% ahead of find-my-way).
- On the long-route parametric tests (1–4 params), find-my-way is ahead of ProstoRouter in every row; ProstoRouter is ahead of Hono and plain rou3 in most of them. ProstoRouter's static lookups (44–60k op/ms) are much faster than its parametric ones (6–11k op/ms).
- **Express** is 25–62x behind the leader.

### Scaling (22 → 200 routes)

![Long Routes — scaling](results/results-scale-long-chart.svg)

| Router | Short 22→200 | Long 22→200 | Mixed 20→198 |
|--------|-------------|------------|--------------|
| Rou3 (compiled) | 141k → 38k (3.7x) | 37k → 31k (1.2x) | 57k → 37k (1.5x) |
| FindMyWay | 35k → 15k (2.3x) | 10.9k → 10.5k (1.0x) | 28k → 14k (2.0x) |
| Rou3 | 55k → 15k (3.7x) | 6.9k → 6.7k (1.0x) | 30k → 10k (3.0x) |
| ProstoRouter | 43k → 12k (3.5x) | 9.3k → 5.0k (1.8x) | 29k → 9k (3.1x) |
| Hono | 55k → 7k (7.8x) | 8.7k → 4.5k* (1.9x) | 54k → 4k* (13x) |
| Express | 2.3k → 0.3k (8.3x) | 1.1k → 0.7k (1.6x) | 2.3k → 0.3k (7.9x) |

\* Hono's SmartRouter uses RegExpRouter while it can compile the route set, and TrieRouter otherwise; here it switched to TrieRouter from 100 long routes and at 198 mixed routes. The backend is labelled per point in [RESULTS-SCALE.md](RESULTS-SCALE.md).

- ProstoRouter's short-route throughput drops most between 22 and 50 routes (43k → 14k op/ms) and stays about flat after that; the other routers show a similar step on short and mixed routes.
- On long routes, find-my-way and both rou3 variants change little as routes are added; ProstoRouter loses 1.8x from 22 to 200 routes.
- Hono and Express lose the most as routes are added (Hono 7.8x on short and 13x on mixed routes, Express 8.3x and 7.9x). Express is far behind at every size.
- At 200 routes ProstoRouter is behind find-my-way and both rou3 variants on all three shapes, and ahead of Hono and Express.

## Conclusion

For raw lookup speed, the compiled rou3 router leads this benchmark at every size, and find-my-way and compiled rou3 lose the least throughput as routes are added. ProstoRouter sits in the middle of the field: well ahead of Express at every size, ahead of Hono from 100 routes on, and behind find-my-way and rou3 on deep parametric routes and at larger route counts.

Whether that matters depends on the rest of the request: in the [full HTTP benchmark](../wooks-benchmark/), routing is a small part of the per-request cost.

### Feature set

ProstoRouter's design favours matching features over raw lookup speed:

- Parametric routes with `:param` syntax
- Regex-constrained params (`:id(\\d+)`)
- Multiple wildcards (`*`) anywhere in the path — beginning, middle, end
- Regex-constrained wildcards (`*(\\d+)`)
- Optional parameters and wildcards (`:param?`, `*?`)
- Same-name params collected into arrays
- Case-insensitive matching
- Trailing slash normalization
- URL-encoded character handling
- Path builder functions from registered routes
- Full TypeScript support

Not every router in this comparison supports all of these.

## Running

```bash
pnpm install
pnpm bench:router         # basic benchmark (~12 min)
pnpm bench:router:scale   # scaling benchmark (~10 min)
pnpm --filter router-benchmark quick   # smoke test of both (numbers not meaningful)
```
