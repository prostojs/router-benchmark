# Validator Benchmark: atscript vs zod

Measures how fast one realistic data model validates with an
[atscript](https://atscript.dev) runtime validator (`@atscript/typescript`) and with
equivalent [zod 4](https://zod.dev) schemas, across three unknown-property policies.

Results: [RESULTS.md](RESULTS.md) · raw data: [results/results.json](results/results.json)

## The model

[`src/model/order.as`](src/model/order.as) describes an `Order`: a customer with two
addresses, 1–100 line items (with optional nested metadata and arrays), a `Payment`
union (`PaymentCard | PaymentPaypal`), money fields and optional extras. It uses string
length limits, regex patterns, integer and numeric range checks, array length limits,
optional properties and a union. `pnpm compile` turns it into `src/model/order.as.js`
with the atscript CLI (`asc`).

[`src/zod-schemas.js`](src/zod-schemas.js) is the same model in zod 4.

## Engines

| Engine | Call | What it returns |
|---|---|---|
| atscript `validate()` | `new Validator(Order, opts)` once, then `validator.validate(input, true)` | `true`/`false`; errors (path + message) in `validator.errors`. Validates the input in place; never copies. |
| zod `safeParse()` | `schema.safeParse(input)` | `{ success, data }` where `data` is a **new** object, or `{ success: false, error }` |
| zod `z.compile()` + `safeParse()` | `z.compile(schema).safeParse(input)` | same as above; uses zod's ahead-of-time compiled fast path |
| zod `z.compile()` + `validate()` | `z.compile(schema).validate(input)` | `true`/`false` only: no output object, no error details |

All schemas and validators are built once, outside the timed region. zod's object JIT is
on by default in Node (`z.config().jitless` is unset, `new Function` is allowed), so the
plain `safeParse()` row already uses it. `z.compile(schema, { strict: true })` is used so
that a schema the compiler cannot handle fails loudly instead of silently falling back
(every schema here compiles). atscript has no ahead-of-time compile mode yet; one is
planned, so the `z.compile()` rows compare against atscript's regular validator.

## Scenarios

| Scenario | Root | Input |
|---|---|---|
| `valid-order` | Order | valid, card payment (union branch 1) |
| `valid-order-paypal` | Order | valid, PayPal payment (union branch 2, so branch 1 is tried and fails first) |
| `large-order-50-items` | Order | valid, 50 line items |
| `unknown-props-order` | Order | valid order plus one undeclared property on each of 6 objects, including the payment inside the union. Valid in `strip` / `passthrough`, invalid in `strict`. |
| `invalid-order-all-errors` | Order | breaks 14 fields plus the payment union; full error report |
| `invalid-order-first-error` | Order | same input; stop at the first error |
| `union-card` / `union-paypal` / `union-invalid` | Payment | just the union: branch 1 matches / branch 2 matches / neither matches |

Each scenario runs in three modes:

| Mode | zod | atscript |
|---|---|---|
| strip | `z.object()` | `unknownProps: 'strip'` |
| passthrough | `z.looseObject()` | `unknownProps: 'ignore'` |
| strict | `z.strictObject()` | `unknownProps: 'error'` |

## Semantic equivalence

Both sides must accept and reject exactly the same inputs:

| atscript (`order.as`) | zod 4 | Notes |
|---|---|---|
| `prop: string` / `number` / `T[]` / object | `z.string()` / `z.number()` / `z.array()` / object | Required: a missing key, `undefined` or `null` is rejected by both |
| `prop?: T` | `.nullish()` | An atscript optional property accepts `undefined` **and `null`**, so `.optional()` would not be equivalent |
| `@expect.minLength n` / `maxLength n` (string) | `.min(n)` / `.max(n)` | Both count UTF-16 code units (`.length`). Whitespace-only strings pass both (no `@meta.required`) |
| `@expect.minLength` / `maxLength` (array) | `z.array(...).min()` / `.max()` | |
| `@expect.pattern "..."` | `.regex(/.../)` with the same pattern and no flags | `z.email()` is not used: its built-in regex is stricter than the model's pattern |
| `@expect.int` | `.int()` | zod also requires a safe integer; the model caps the value at 10000, so the accepted sets match |
| `@expect.min` / `@expect.max` | `.min()` / `.max()` | Inclusive on both sides |
| `number` | `z.number()` | Both reject `NaN` and `±Infinity` |
| `A \| B` | `z.union([A, B])` | Both try the branches in declared order; the first match wins |
| unknown-props mode | `z.object` / `z.looseObject` / `z.strictObject` | Mapping in the table above. It applies to every nested object, including union branches |
| `partial: false` (default) | n/a | No partial validation on either side |
| `errorLimit: Infinity` / `1` | full `safeParse` / `validate()` | See "Error reporting" below |

**Pre-flight (`src/preflight.js`) runs before every benchmark and aborts on any
disagreement.** It checks:
1. every benchmark job against its expected valid/invalid outcome;
2. 53 edge cases (boundaries of each limit, `null` / `undefined` for optional and required
   props, NaN / Infinity, wrong types, union edge cases, unknown props at several depths,
   non-object roots) × 3 modes × 4 engines, where every engine must agree with the
   expected result;
3. **the same work on invalid input.** In every scenario that collects all errors
   (`invalid-order-all-errors`, `union-invalid`, and `unknown-props-order` in strict mode),
   both libraries run with their default error reporting and must catch the same
   violations: the same paths outside the union, and the union's own path on both sides.
   The raw error counts are recorded in `results.json` (`preflight.errorReports`);
4. **first-error rows stop at the first error.** atscript with `errorLimit: 1` reports
   exactly 1 error. With reads on the root object traced through a Proxy, both atscript and
   zod `validate()` read only `orderId`, the first declared property, which is the one
   that fails;
5. the unknown-property output behavior described below.

Run it alone with `pnpm preflight`.

## Fairness notes

- **Copy vs in place.** zod `safeParse` always returns a new object tree (the parsed
  output). atscript `validate()` returns a boolean and does not copy. The closest zod
  equivalent that skips the copy is `validate()` on a compiled schema, so it is included
  as its own row.
- **What `strip` does.**
  - zod: the output has no unknown keys; the input is left alone.
  - atscript: unknown keys are **deleted from the input in place**, but only on objects
    that passed validation. On a failed validation some nested objects may already have
    been stripped.

  In `passthrough`, zod copies unknown keys into its output and atscript leaves the input
  alone. Pre-flight checks these behaviors. Because atscript changes its input in `strip`
  mode, `unknown-props-order` gives each call a freshly built input (prepared before
  the timed region). All engines get these fresh inputs in all modes, so the cache
  conditions are the same for everyone.
- **Error reporting.** Both libraries run with their default, unmodified error reporting.
  For invalid input they catch the same violations, which the pre-flight enforces. atscript
  builds its errors eagerly. zod builds its `ZodError` lazily on the first read of
  `result.error`, so the harness reads `result.error.issues` to make zod do the same work.
  The two libraries report a failed union differently: atscript returns one error with
  per-branch details, while zod returns the closest branch's issues. That is why the
  invalid order gives 15 atscript errors and 18 zod issues for the same 15 violations.
- **First error only.** atscript supports this with `errorLimit: 1` and still returns that
  one error with its path and message. zod has no public option to stop early with
  `safeParse` (`abortEarly` is internal and used only by `validate()`). The
  `invalid-order-first-error` scenario therefore compares atscript `errorLimit: 1` with
  zod `validate()`, which gives a boolean with no error details. The two `safeParse`
  engines skip this scenario.
  The ratio on that row is very large because zod `validate()` returns a boolean after a
  single regex check, while atscript builds an error object.
- **Boolean-only engine.** zod `validate()` runs only where a yes/no answer is
  comparable: valid inputs and the first-error scenario. It is not run where a full error
  report is the job.
- **Equal setup.** Both libraries come from npm at pinned versions. Neither gets custom
  tuning beyond its documented public API.

## Measurement method

- **One child process per job** (`engine × mode × scenario`, 95 jobs). No two libraries,
  modes or scenarios share a V8 isolate, so JIT state, inline caches and heap state from
  one cannot affect another.
- **Rounds.** The whole job list runs `--rounds` times (default 3): forward, then
  reversed, then shuffled with a fixed seed, so slow drift on the machine does not always
  hit the same job.
- **Per job.** The warmup (default 1000 ms) also sets the batch size so one sample takes
  about `--sample-ms` (default 40 ms), timed from the second half of the warmup only. Then `--samples` (default 25) timed samples run,
  each preceded by an untimed `gc()` (Node runs with the fixed flag `--expose-gc`). Timing
  uses `process.hrtime.bigint()`.
- **Same loop for every job.** The timed loop walks a prepared array of inputs, which all
  point to one shared object unless the scenario needs fresh inputs. After the run the
  worker checks that the shared object is unchanged, and fails otherwise.
- **Results are consumed.** Every call's return value (1 = valid, negative error count =
  invalid) goes into a sum. After the run the worker checks that the sum equals the
  per-call result × the number of calls, and fails otherwise. This prevents dead-code
  elimination and confirms that each call gave the expected answer while it was being
  timed.
- **Reported numbers.** The median ops/s over all pooled samples (rounds × samples), the
  p25–p75 range, ns/op, and the median and sample batch size (calls per sample) of each round (in the JSON).
- **Why not mitata or tinybench?** They give good in-process statistics, but this
  benchmark needs one isolated process per job and fresh inputs per call built outside the
  timed region. A small, readable harness (`src/worker.js`, about 80 lines) fits that
  better than adapting either library.

## Running

From the workspace root (`pnpm install` first):

```bash
pnpm bench:validator                              # full benchmark
pnpm --filter validator-benchmark quick           # smoke test (~30 s), numbers not meaningful
pnpm --filter validator-benchmark preflight       # equivalence checks only
```

Or inside this package:

```bash
pnpm start          # compiles order.as, runs the pre-flight, then the full benchmark
                    # → results/results.json, results/{strip,passthrough,strict}-chart.svg, RESULTS.md
pnpm quick          # smoke test (~30 s)
pnpm preflight      # equivalence checks only
```

Options (after `pnpm start --`), each also settable by env var: `--rounds N`
(`BENCH_ROUNDS`, default 3), `--samples N` (`BENCH_SAMPLES`, default 25), `--sample-ms N`
(`BENCH_SAMPLE_MS`, default 40), `--warmup N` (`BENCH_WARMUP_MS`, default 1000), and
`--only a,b` to keep only jobs whose `mode/scenario/engine` contains one of the given
substrings, for example `--only strict/union`.

Smoke (`--quick`) and partial (`--only`) runs write the same files into the git-ignored
`.quick/` directory, never over the published results.

A full run takes about 12 minutes (95 jobs × 3 rounds × about 2.5 s). Keep the machine
otherwise idle: other CPU-heavy processes, such as concurrent benchmarks, distort the
numbers.
