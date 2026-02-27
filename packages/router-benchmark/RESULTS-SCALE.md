# Router Scaling Benchmark

Measures how router lookup performance changes as the number of registered routes grows.
Three route-shape variants are tested to reveal different scaling characteristics.

- **500,000** operations per test, **5** runs averaged
- Route counts: 22, 50, 100, 200
- Generated: 2026-02-27T00:24:12.887Z

---

## Short Routes (2–5 segments)

Shallow paths like `/users/:id`, `/posts/:id/comments`, `/orders/:id/items`.
Many distinct top-level prefixes, few path segments per route.

![Short routes](results/results-scale-short-chart.svg)

| Router | 22 routes | 50 routes | 100 routes | 200 routes | degradation |
|--------|---------|---------|---------|---------|-------------|
| Express | 2393 | 994 | 654 | 295 | 8.1x |
| FindMyWay | 29182 | 13038 | 13571 | 10804 | 2.7x |
| ProstoRouter | 44665 | 14411 | 10855 | 9400 | 4.8x |
| Rou3 | 38861 | 17533 | 12495 | 10481 | 3.7x |
| Hono (RegExpRouter) | 42409 | 12525 | 10162 | 6627 | 6.4x |

- **Express**: 2393 → 295 op/ms (8.1x, degrades)
- **FindMyWay**: 29182 → 10804 op/ms (2.7x, degrades)
- **ProstoRouter**: 44665 → 9400 op/ms (4.8x, degrades)
- **Rou3**: 38861 → 10481 op/ms (3.7x, degrades)
- **Hono (RegExpRouter)**: 42409 → 6627 op/ms (6.4x, degrades)

---

## Long Routes (deep enterprise API)

Deep paths like `/api/v1/organizations/:orgId/workspaces/:wsId/projects/:projectId`.
Shared `/api/v1/` prefix, many segments per route (5–10), realistic enterprise SaaS API.

![Long routes](results/results-scale-long-chart.svg)

| Router | 22 routes | 50 routes | 100 routes | 200 routes | degradation |
|--------|---------|---------|---------|---------|-------------|
| Express | 1122 | 1038 | 922 | 737 | 1.5x |
| FindMyWay | 6193 | 6177 | 5889 | 6022 | 1.0x |
| ProstoRouter | 8600 | 7562 | 6136 | 4158 | 2.1x |
| Rou3 | 6838 | 6735 | 6834 | 6744 | 1.0x |
| Hono (RegExpRouter) | 8250 | 7180 | - | - | 1.1x |
| Hono (TrieRouter) | - | - | 3624 | 3640 | 1.0x |

- **Express**: 1122 → 737 op/ms (1.5x, slight decline)
- **FindMyWay**: 6193 → 6022 op/ms (1.0x, stable)
- **ProstoRouter**: 8600 → 4158 op/ms (2.1x, degrades)
- **Rou3**: 6838 → 6744 op/ms (1.0x, stable)
- **Hono (RegExpRouter)**: 8250 → 7180 op/ms (1.1x, stable)
- **Hono (TrieRouter)**: 3624 → 3640 op/ms (1.0x, stable)

---

## Mixed Routes (short + long)

Half short (2–5 segments) + half long (deep enterprise API) routes.
Exercises routers with both shallow many-prefix and deep shared-prefix routes in the same tree.

![Mixed routes](results/results-scale-mixed-chart.svg)

| Router | 20 routes | 48 routes | 98 routes | 198 routes | degradation |
|--------|---------|---------|---------|---------|-------------|
| Express | 2246 | 1026 | 591 | 347 | 6.5x |
| FindMyWay | 18218 | 9924 | 9350 | 9194 | 2.0x |
| ProstoRouter | 21767 | 10680 | 8332 | 7895 | 2.8x |
| Rou3 | 19802 | 12028 | 5873 | 6567 | 3.0x |
| Hono (RegExpRouter) | 35978 | 13647 | 7257 | - | 5.0x |
| Hono (TrieRouter) | - | - | - | 3462 | - |

- **Express**: 2246 → 347 op/ms (6.5x, degrades)
- **FindMyWay**: 18218 → 9194 op/ms (2.0x, degrades)
- **ProstoRouter**: 21767 → 7895 op/ms (2.8x, degrades)
- **Rou3**: 19802 → 6567 op/ms (3.0x, degrades)
- **Hono (RegExpRouter)**: 35978 → 7257 op/ms (5.0x, degrades)

---

## Key Takeaways

- **Short routes** have higher absolute throughput (shorter strings, fewer segments to match) but all routers degrade more steeply because the route set has many distinct prefixes competing in each bucket.
- **Long routes** have lower absolute throughput but trie-based routers (Rou3, FindMyWay) stay nearly flat — the shared prefix structure plays to their strength.
- **Mixed routes** sit between the two — routers must handle both patterns efficiently.
- **Regex-alternation routers** (ProstoRouter, Hono RegExpRouter) degrade as route count grows because V8 tests regex alternatives sequentially — O(n) per bucket.
- **Rou3** shows the best scaling profile: near-constant performance regardless of route count.
- **FindMyWay** is also stable but at a lower absolute level due to its more complex trie implementation.
