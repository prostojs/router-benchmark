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
- **Sampling:** 10 timed samples of ~100 ms per test (`process.hrtime.bigint()`), yielding to the event loop between samples (outside the timed region) so deferred work such as Express' `setImmediate` callbacks never leaks into another sample.
- **No dead-code elimination:** every lookup result is consumed (hit counter, verified against the expected number of matches) and the returned params object is stored in a module-level sink, so params extraction cannot be optimized away.
- **Rounds:** 5 rounds with router order rotated; reported value = median of per-round medians (op/ms), plus min–max round medians and the coefficient of variation of all samples.
- Options: `--rounds n --warmup ms --samples n --sample-ms ms --only prosto,rou3 --quick` (or `BENCH_ROUNDS`, `BENCH_WARMUP_MS`, `BENCH_SAMPLES`, `BENCH_SAMPLE_MS`). `--quick` is a smoke test; its numbers are not meaningful. Smoke and `--only` runs are written to the git-ignored `.quick/` directory.
- **Scaling series** are keyed by router; when a router switches implementation with the route count (Hono's SmartRouter: RegExpRouter → TrieRouter), it stays one series and the active backend is labelled per point.

## Two benchmarks

### Basic benchmark (`pnpm bench:router`, ~12 min)

All three route shapes at 22 routes each; per-test breakdown for the long (enterprise API) shape. See [RESULTS.md](RESULTS.md).

### Scaling benchmark (`pnpm bench:router:scale`, ~10 min)

How performance changes as route count grows: **22 → 50 → 100 → 200** routes, for each shape. Produces line charts. See [RESULTS-SCALE.md](RESULTS-SCALE.md).

## Results at a Glance

### At 22 routes (basic bench)

![Long Routes — 22 routes](results/results-long-chart.svg)

| Variant | Fastest | Runner-up |
|---------|---------|-----------|
| Short routes | Hono RegExpRouter (38k op/ms) | **ProstoRouter** (36k) |
| Long routes | **ProstoRouter** (9k op/ms) | Hono RegExpRouter (8.3k) |
| Mixed routes | Hono RegExpRouter (38k op/ms) | **ProstoRouter** (21k) |

ProstoRouter is the **fastest router on long (enterprise API) routes** and within 5% of the leader on short routes. On parametric routes specifically (1–4 params), ProstoRouter is consistently the fastest across all variants (see per-test results in [RESULTS.md](RESULTS.md)).

### Scaling (22 → 200 routes)

![Long Routes — scaling](results/results-scale-long-chart.svg)

| Router | Short 22→200 | Long 22→200 | Mixed 20→198 |
|--------|-------------|------------|--------------|
| ProstoRouter | 45k → 9k (4.8x) | 8.6k → 4.2k (2.1x) | 22k → 8k (2.8x) |
| FindMyWay | 29k → 11k (2.7x) | 6.2k → 6.0k (1.0x) | 18k → 9k (2.0x) |
| Rou3 | 39k → 10k (3.7x) | 6.8k → 6.7k (1.0x) | 20k → 7k (3.0x) |
| Hono | 42k → 7k (6.4x) | 8.3k → 3.6k* (2.3x) | 36k → 3k* (10x) |
| Express | 2.4k → 0.3k (8.1x) | 1.1k → 0.7k (1.5x) | 2.2k → 0.3k (6.5x) |

\* Hono's RegExpRouter fails to compile beyond ~50 long routes and falls back to TrieRouter, which is roughly 2x slower.

## Conclusion

### ProstoRouter's sweet spot

**At 22 routes, ProstoRouter is the fastest router on long enterprise API routes** and neck-and-neck with Hono on short routes. On parametric routes specifically (1–4 params), ProstoRouter consistently outperforms every other router. This covers the vast majority of real-world Node.js servers.

Up to **~50 routes, ProstoRouter remains at or near the top** across all route shapes — outperforming find-my-way (Fastify) and competitive with Rou3 and Hono.

At **100 routes**, ProstoRouter performs on par with find-my-way and Rou3 on short and mixed routes (~10–11k op/ms). On deep enterprise routes it sits at ~6k — still fast enough for any production workload.

Even at **200 routes** (rare for a Node.js server), ProstoRouter stays at ~9k op/ms on short routes and ~8k on mixed — competitive with every trie-based router. On long routes it degrades to ~4k, behind Rou3 (7k) and find-my-way (6k), but still well ahead of Hono's TrieRouter fallback (3.6k) and Express (0.7k).

Worth noting: **Hono's fast RegExpRouter fails to compile** when the route set grows beyond ~50 deep routes, falling back to the much slower TrieRouter. ProstoRouter handles any route count gracefully — it has a built-in fallback to individual matchers when the combined regex becomes too large, without a dramatic performance cliff.

### But that's just the routing speed

What makes ProstoRouter stand out isn't just raw performance — it's the **feature set** you get at that speed:

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

Most trie-based routers (find-my-way, Rou3) sacrifice some of these features for raw speed. ProstoRouter delivers both.

## Running

```bash
pnpm install
pnpm bench:router         # basic benchmark (~12 min)
pnpm bench:router:scale   # scaling benchmark (~10 min)
pnpm --filter router-benchmark quick   # smoke test of both (numbers not meaningful)
```
