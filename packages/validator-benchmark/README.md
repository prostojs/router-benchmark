# Validator Benchmark: atscript vs popular validators

Measures how fast one realistic data model validates with an
[atscript](https://atscript.dev) runtime validator (`@atscript/typescript`) and with the
equivalent schema in popular JavaScript validation libraries, across three unknown-property
policies.

Results: [RESULTS.md](RESULTS.md) · raw data: [results/results.json](results/results.json) ·
chart data: [results/summary.json](results/summary.json)

## The model

[`src/model/order.as`](src/model/order.as) describes an `Order`: a customer with two
addresses, 1–100 line items (with optional nested metadata and arrays), a `Payment`
union (`PaymentCard | PaymentPaypal`), money fields and optional extras. It uses string
length limits, regex patterns, integer and numeric range checks, array length limits,
optional properties and a union. `pnpm compile` turns it into `src/model/order.as.js`
with the atscript CLI (`asc`).

The same model in every other library lives in [`src/schemas/`](src/schemas/) (one file per
library; all regexes come from [`src/schemas/patterns.js`](src/schemas/patterns.js)). Each
engine's runner is in [`src/engines/`](src/engines/).

## Engines

| Engine | Call | Setup |
|---|---|---|
| atscript `validate()` | `new Validator(Order, opts)` once, then `validator.validate(input, true)` | `unknownProps` per mode; `errorLimit: Infinity` / `1` |
| zod `safeParse()` | `schema.safeParse(input)` | object JIT on (default) |
| zod `z.compile()` + `safeParse()` | `z.compile(schema, { strict: true }).safeParse(input)` | ahead-of-time compiled |
| zod `z.compile()` + `validate()` | `z.compile(schema).validate(input)` | boolean only |
| valibot `safeParse()` | `v.safeParser(schema, { abortEarly })(input)` | `abortEarly: true` only for first-error |
| yup `validateSync()` | `schema.validateSync(input, { abortEarly, stripUnknown })` | `abortEarly: false` for all errors; leaves `.strict()` (no coercion) |
| joi `validate()` | `schema.prefs(options).validate(input)` | `abortEarly: false` for all errors, `convert: false`; options bound once with `prefs()` |
| ajv compiled `validate()` | `new Ajv(opts).compile(jsonSchema)(input)` | `allErrors: true` for all errors (default `false` for first-error), `unicodeRegExp: false` |
| ArkType `T(input)` | `T(input)` → data or `ArkErrors` | JIT (default) |
| ArkType `T.allows()` | `T.allows(input)` | boolean only, JIT (default) |
| class-validator `validateSync()` | `validateSync(plainToInstance(Order, input), options)` | decorated classes (class-transformer, reflect-metadata); `whitelist` / `forbidNonWhitelisted` per mode |
| TypeBox `Compile()` + `Check()` | `C.Check(input)`, `C.Errors(input)` when invalid; first-error: `C.Parse(input)` | `Compile(type)` (JIT); `Settings.Set({ maxErrors: Infinity })` |
| TypeBox `Value.Check()` | `Value.Check(T, input)`, `Value.Errors(T, input)` when invalid; first-error: `Value.Parse(T, input)` | dynamic (no compile) |

The exact package versions of a run are listed at the top of [RESULTS.md](RESULTS.md) (all
pinned in `package.json`).

All schemas and validators are built once, outside the timed region, with each library's
documented public API and no custom tuning. Where a library has both an interpreted and a
compiled (JIT) mode, both are separate rows (zod, TypeBox); ajv and ArkType always compile.
TypeBox moved from `@sinclair/typebox` (0.34.x, which keeps the `TypeCompiler` API) to the
`typebox` package (1.x, `Compile()` from `typebox/compile`); the benchmark uses `typebox`.

zod's object JIT is on by default in Node (`z.config().jitless` is unset, `new Function` is
allowed), so the plain `safeParse()` row already uses it. `z.compile(schema, { strict: true })`
fails loudly instead of silently falling back if a schema can't be compiled (every schema here
compiles). atscript has no ahead-of-time compile mode yet; one is planned, so the compiled rows
(zod `z.compile()`, ajv, ArkType, TypeBox `Compile()`) compare against atscript's regular
validator.

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

Each scenario runs in three unknown-property modes:

| Library | strip | passthrough | strict |
|---|---|---|---|
| atscript | `unknownProps: 'strip'` | `unknownProps: 'ignore'` | `unknownProps: 'error'` |
| zod | `z.object()` | `z.looseObject()` | `z.strictObject()` |
| valibot | `v.object()` | `v.looseObject()` | `v.strictObject()` |
| yup | `stripUnknown: true` | default | `.exact()` on every object |
| joi | `stripUnknown: true` | `allowUnknown: true` | default |
| ajv | not run (see below) | open objects | `additionalProperties: false` |
| ArkType | not run (see below) | `'+': 'ignore'` (default) | `'+': 'reject'` |
| class-validator | `whitelist: true` | default | `whitelist: true, forbidNonWhitelisted: true` |
| TypeBox | open objects, `Clean()` after a successful `Check()` | open objects (default) | `additionalProperties: false` |

The policy applies to every nested object, including the union branches.

### Cells that are not run

The generated "Not run" table in [RESULTS.md](RESULTS.md#not-run) lists every skipped cell and
its reason (no stop-at-first-error option, boolean-only engines on all-errors scenarios, TypeBox
strip on invalid input, which runs exactly the passthrough code because `Clean()` follows only a
successful `Check()`). Two need a longer explanation:

- **ajv, strip mode.** With `allErrors: true`, `removeAdditional` deletes keys while ajv tries
  the `anyOf` branches: the card branch strips the PayPal `email` before the PayPal branch sees
  it, so a valid PayPal payment fails (a documented ajv caveat). With ajv's default
  `allErrors: false` the card branch stops at its first missing required key before removing
  anything, but the valid and all-errors strip cells need `allErrors: true`, and running only the
  first-error strip cell would depend on that check order and leave the strip mode inconsistent,
  so the whole strip mode is skipped. There is no other ajv option that strips.
- **ArkType, strip mode.** ArkType refuses to build a union of two objects that both delete
  undeclared keys (`'+': 'delete'`): "an unordered union of a type including a morph and a type
  with overlapping input is indeterminate".

## Semantic equivalence

Every engine must accept and reject exactly the same inputs as the atscript model:

| atscript (`order.as`) | zod 4 | Notes |
|---|---|---|
| `prop: string` / `number` / `T[]` / object | `z.string()` / `z.number()` / `z.array()` / object | Required: a missing key, `undefined` or `null` is rejected by both |
| `prop?: T` | `.nullish()` | An atscript optional property accepts `undefined` **and `null`**, so `.optional()` would not be equivalent |
| `@expect.minLength n` / `maxLength n` (string) | `.min(n)` / `.max(n)` | atscript counts UTF-16 code units, zod counts code points (see below). Whitespace-only strings pass both (no `@meta.required`) |
| `@expect.minLength` / `maxLength` (array) | `z.array(...).min()` / `.max()` | |
| `@expect.pattern "..."` | `.regex(/.../)` with the same pattern and no flags | `z.email()` is not used: its built-in regex is stricter than the model's pattern |
| `@expect.int` | `.int()` | zod also requires a safe integer; the model caps the value at 10000, so the accepted sets match |
| `@expect.min` / `@expect.max` | `.min()` / `.max()` | Inclusive on both sides |
| `number` | `z.number()` | Both reject `NaN` and `±Infinity` |
| `A \| B` | `z.union([A, B])` | Both try the branches in declared order; the first match wins |
| `partial: false` (default) | n/a | No partial validation |
| `errorLimit: Infinity` / `1` | full `safeParse` / `validate()` | See "Error reporting" below |

What differs in the other libraries (each file in [`src/schemas/`](src/schemas/) documents its mapping):

- **valibot** ([valibot.js](src/schemas/valibot.js)): same shape as zod; `v.number()` accepts ±Infinity, so every number also gets `v.finite()`.
- **yup** ([yup.js](src/schemas/yup.js)): leaves are `.strict()` (no coercion), required is `.defined()`, numbers get a `finite` test, and the union is a first-match `yup.lazy()` over the card and PayPal schemas.
- **joi** ([joi.js](src/schemas/joi.js)): optional is `.allow(null)`, strings without a minimum get `.allow('')`, numbers without a bound inside the safe-integer range get `.unsafe()` (joi otherwise rejects values beyond ±`Number.MAX_SAFE_INTEGER`, the model doesn't), and `convert: false` turns off coercion.
- **ajv** ([json-schema.js](src/schemas/json-schema.js)): plain JSON Schema; optional is "not in `required`" plus ajv's `nullable: true`; the union is `anyOf`.
- **ArkType** ([arktype.js](src/schemas/arktype.js)): optional keys are `T | null | undefined`; required unbounded numbers get a ±`Number.MAX_VALUE` range (finite), optional ones `.narrow(Number.isFinite)`, because ArkType 2.2.8 drops the NaN check of `number` inside a union discriminated by `typeof` (`type('number | null')(NaN)` passes); the union is unordered, which gives the same result here because neither branch transforms.
- **class-validator** ([class-validator.js](src/schemas/class-validator.js)): plain-JS classes decorated the way TypeScript's legacy decorator output does; the union is a `@Transform()` that instantiates the card class if it validates, else the PayPal class; non-object roots are rejected before `plainToInstance` (`validateSync(null)` throws).
- **TypeBox** ([typebox.js](src/schemas/typebox.js)): optional is `Type.Optional(Type.Union([T, Type.Null()]))`; the engine raises `maxErrors` (default 8) to `Infinity` so the all-errors scenarios get the full report.

**String length.** With 100 emoji (200 UTF-16 code units) against a maximum of 128, zod, ajv,
class-validator and TypeBox count code points and accept, while atscript, valibot, yup, joi and
ArkType count UTF-16 code units and reject. Every fixture is ASCII, so this never changes a
result or a timing here.

**Pre-flight (`src/preflight.js`) runs before every benchmark and aborts on any
disagreement.** It checks:
1. every benchmark job against its expected valid/invalid outcome;
2. 57 edge cases (boundaries of each limit, `null` / `undefined` for optional and required
   props, NaN / Infinity (also on nullable numbers), numbers beyond the safe-integer range, wrong types, union edge cases, unknown props at several depths,
   non-object roots) × 3 modes × every engine that runs in that mode, where every engine must
   agree with the expected result;
3. **unknown-property output**: in strip mode the value each library hands back has no
   unknown keys, in passthrough it keeps them, in strict the input is rejected. Whether each
   library changed its input is recorded (`preflight.unknownPropsOutput`);
4. **the same work on invalid input.** In every scenario that collects all errors
   (`invalid-order-all-errors`, `union-invalid`, and `unknown-props-order` in strict mode),
   every engine with an error report runs with its library's default error reporting and must
   catch the same violations as atscript. Errors are **compared, never reshaped**: paths
   inside the payment union collapse to the union's own path (a failed union counts as one
   violation, whatever way the library reports it); TypeBox's engine leaves out the wrapper
   errors of its `T | null` unions (the `anyOf` error and the failed `null` branch) when it
   lists paths. The raw error counts are recorded in `results.json`
   (`preflight.errorReports`);
5. **first-error rows stop at the first error.** Every engine with error details reports
   exactly 1 error. Boolean-only engines must return before reading every root property
   (traced through a Proxy). The root properties each engine read are recorded in
   `preflight.firstError`.

Run it alone with `pnpm preflight`.

## Fairness notes

- **Copy vs in place.** zod, valibot, joi (always, even when nothing changed) and
  class-validator (an instance) return a new object; yup returns a new object only when casting
  changed something. atscript, ajv and TypeBox validate in place and return a boolean.
  Boolean-only rows (zod `validate()`, ArkType `allows()`) are included where a yes/no answer is
  the job.
- **What `strip` does.**
  - zod, valibot, yup, joi: the output has no unknown keys; the input is left alone.
  - class-validator: `whitelist` deletes undecorated keys from the new instance.
  - atscript: unknown keys are **deleted from the input in place**, but only on objects
    that passed validation.
  - TypeBox: `Clean()` deletes them from the input in place after a successful `Check()`.
    `Clean()` is not compiled: it re-checks union variants (including every `T | null`)
    dynamically, which is why TypeBox strip rows are much slower than its other rows.

  Pre-flight checks these behaviors. Because some libraries change their input in `strip`
  mode, `unknown-props-order` gives each call a freshly built input (prepared before the
  timed region). All engines get these fresh inputs in all modes, so the cache conditions are
  the same for everyone.
- **Error reporting.** Every library runs with its default, unmodified error reporting, and
  the runner reads the error list's length so lazily built reports (zod builds its `ZodError`
  on the first read of `result.error`) are materialized. Libraries report a failed union
  differently: atscript returns one error with per-branch details, zod and valibot the
  closest branch's issues, ajv and TypeBox every branch's errors, yup and class-validator
  (first-match unions built from the library's own tools) the last branch's errors. That is
  why the raw counts differ for the same 15 violations of the invalid order.
- **TypeBox all-errors is two passes.** TypeBox's documented flow is a boolean `Check()` and,
  only when it fails, `Errors()`, which walks the value again to build the report.
- **Emulated unions cost extra probes.** yup and class-validator have no union type, so the
  payment union is built from their own tools. yup's `lazy()` resolver probes the card schema
  with `isValidSync()` and is resolved more than once per validation, so the card branch is
  validated up to 3× for a card payment. class-validator's `@Transform()` validates the card
  instance to pick the branch, and `@ValidateNested()` validates the chosen instance again, so
  the matched branch is validated 2×.
- **First error only.** atscript supports this with `errorLimit: 1` and still returns that
  one error with its path and message; valibot, yup, joi, ajv and TypeBox (`Parse()`) also
  return one error with details. zod `validate()` and ArkType `allows()` return a boolean.
  The ratio on that row can be very large because a boolean-only check returns after a
  single regex test. Stopping early is not equally early everywhere: yup and joi copy / cast
  the root object before validating, so they read every field even in first-error mode; ajv
  checks all required keys of an object up front; TypeBox `Parse()` runs a full `Check()`
  before it collects the one error.
- **Boolean-only engines** run only where a yes/no answer is comparable: valid inputs and the
  first-error scenario.
- **Equal setup.** Every library comes from npm at a pinned version. None gets custom tuning
  beyond its documented public API.

## Measurement method

- **One child process per job** (`engine × mode × scenario`, 295 jobs). No two libraries,
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
pnpm --filter validator-benchmark quick           # smoke test (~2 min), numbers not meaningful
pnpm --filter validator-benchmark preflight       # equivalence checks only
```

Or inside this package:

```bash
pnpm start          # compiles order.as, runs the pre-flight, then the full benchmark
                    # → results/results.json, results/summary.json,
                    #   results/{strip,passthrough,strict}-chart.svg, RESULTS.md
pnpm quick          # smoke test (~2 min)
pnpm preflight      # equivalence checks only
```

Options (after `pnpm start --`), each also settable by env var: `--rounds N`
(`BENCH_ROUNDS`, default 3), `--samples N` (`BENCH_SAMPLES`, default 25), `--sample-ms N`
(`BENCH_SAMPLE_MS`, default 40), `--warmup N` (`BENCH_WARMUP_MS`, default 1000), and
`--only a,b` to keep only jobs whose `mode/scenario/engine` contains one of the given
substrings, for example `--only strict/union`.

Smoke (`--quick`) and partial (`--only`) runs write the same files into the git-ignored
`.quick/` directory, never over the published results.

A full run takes about 40 minutes (295 jobs × 3 rounds × about 2.5 s). Keep the machine
otherwise idle: other CPU-heavy processes, such as concurrent benchmarks, distort the
numbers.
