import * as fx from './fixtures.js'

/**
 * Unknown-property modes, with each library's way of expressing the policy. Every library is
 * configured so that it accepts and rejects the same inputs as atscript `unknownProps`.
 */
export const MODES = {
  strip: {
    unknownProps: 'strip',
    libs: {
      atscript: "unknownProps: 'strip'",
      zod: 'z.object()',
      valibot: 'v.object()',
      yup: 'stripUnknown: true',
      joi: 'stripUnknown: true',
      ajv: 'additionalProperties: false + removeAdditional: true',
      arktype: "'+': 'delete'",
      'class-validator': 'whitelist: true',
      typebox: 'open objects + Clean() after Check()',
    },
  },
  passthrough: {
    unknownProps: 'ignore',
    libs: {
      atscript: "unknownProps: 'ignore'",
      zod: 'z.looseObject()',
      valibot: 'v.looseObject()',
      yup: 'default',
      joi: 'allowUnknown: true',
      ajv: 'open objects',
      arktype: "'+': 'ignore' (default)",
      'class-validator': 'default',
      typebox: 'open objects (default)',
    },
  },
  strict: {
    unknownProps: 'error',
    libs: {
      atscript: "unknownProps: 'error'",
      zod: 'z.strictObject()',
      valibot: 'v.strictObject()',
      yup: '.exact()',
      joi: 'default',
      ajv: 'additionalProperties: false',
      arktype: "'+': 'reject'",
      'class-validator': 'whitelist + forbidNonWhitelisted',
      typebox: 'additionalProperties: false',
    },
  },
}

/**
 * Scenarios.
 * - target: which root type is validated
 * - errors: 'all' (collect every error) | 'first' (stop at first error)
 * - fresh: every call gets its own freshly built input (needed when a library mutates its
 *   input: atscript and TypeBox 'strip' delete unknown keys in place); built outside the timed region
 * - valid(mode): expected outcome
 */
export const SCENARIOS = {
  'valid-order': { target: 'order', make: fx.makeValidOrder, errors: 'all', valid: () => true },
  'valid-order-paypal': { target: 'order', make: fx.makePaypalOrder, errors: 'all', valid: () => true },
  'large-order-50-items': { target: 'order', make: fx.makeLargeOrder, errors: 'all', valid: () => true },
  'unknown-props-order': {
    target: 'order',
    make: fx.makeUnknownPropsOrder,
    errors: 'all',
    fresh: true,
    valid: (mode) => mode !== 'strict',
  },
  'invalid-order-all-errors': { target: 'order', make: fx.makeInvalidOrder, errors: 'all', valid: () => false },
  'invalid-order-first-error': { target: 'order', make: fx.makeInvalidOrder, errors: 'first', valid: () => false },
  'union-card': { target: 'payment', make: fx.makeCardPayment, errors: 'all', valid: () => true },
  'union-paypal': { target: 'payment', make: fx.makePaypalPayment, errors: 'all', valid: () => true },
  'union-invalid': { target: 'payment', make: fx.makeInvalidPayment, errors: 'all', valid: () => false },
}

const NO_SAFEPARSE_FIRST_ERROR = 'no public stop-at-first-error option for safeParse'
const AJV_STRIP =
  'strip: with `allErrors: true` (all-errors and valid cells), `removeAdditional` deletes keys while ajv tries the `anyOf` branches (the card branch strips the PayPal `email`)'
const ARK_STRIP = 'strip: ArkType rejects a union of objects that delete undeclared keys'
const BOOLEAN_ONLY = 'boolean only: no error report to compare'
/** TypeBox strip on invalid input runs exactly the passthrough code (`Clean()` follows only a successful check) */
const typeboxStripInvalid = (s, mode) =>
  mode === 'strip' && !s.valid(mode) ? 'identical to passthrough (Clean() runs only on valid input)' : null

/**
 * Engines (library + API). `lib` names the module in ./engines/ that builds the runner (so a
 * worker loads only its own library) and the MODES entry; `pkg` (default `lib`) is the npm
 * package, `pkgs` lists every package the engine loads. `run(input)` returns a number the
 * harness consumes: 1 when valid; for invalid input, minus the number of reported errors (so
 * the error report is materialized), or -1 for boolean-only APIs. `call`/`returns`/`setup`
 * describe the engine in the report. Capabilities decide which cells run (see skipReason):
 * - `booleanOnly`: no error report, so it runs only on valid inputs and first-error;
 * - `noFirstError`: why it has no stop-at-first-error option;
 * - `unsupportedModes`: `{ mode: reason }` for unknown-prop modes it can't express;
 * - `skip(s, mode)`: any other cell it doesn't run, with the reason (null otherwise).
 */
export const ENGINES = {
  atscript: {
    label: 'atscript validate()',
    color: '#3987e5',
    lib: 'atscript',
    pkg: '@atscript/typescript',
    pkgs: ['@atscript/typescript', '@atscript/core'],
    call: '`validator.validate(input, true)`',
    returns: 'boolean (+ `validator.errors`); validates in place, no copy',
    setup: '`new Validator(type, { unknownProps, errorLimit })`',
  },
  zod: {
    label: 'zod safeParse()',
    color: '#d95926',
    lib: 'zod',
    call: '`schema.safeParse(input)`',
    returns: '`{ success, data \\| error }`; `data` is a new object',
    setup: 'object JIT on (default)',
    noFirstError: NO_SAFEPARSE_FIRST_ERROR,
  },
  'zod-compiled': {
    label: 'zod z.compile() + safeParse()',
    color: '#ec8a52',
    lib: 'zod',
    call: '`z.compile(schema).safeParse(input)`',
    returns: 'same as above, ahead-of-time compiled fast path',
    setup: '`z.compile(schema, { strict: true })`',
    noFirstError: NO_SAFEPARSE_FIRST_ERROR,
  },
  'zod-compiled-validate': {
    label: 'zod z.compile() + validate() [boolean only]',
    color: '#f5b98c',
    lib: 'zod',
    call: '`z.compile(schema).validate(input)`',
    returns: 'boolean only, no output object, no error details',
    setup: '`z.compile(schema, { strict: true })`',
    booleanOnly: true,
  },
  valibot: {
    label: 'valibot safeParse()',
    color: '#9b7bea',
    lib: 'valibot',
    call: '`v.safeParser(schema, config)(input)`',
    returns: '`{ success, output \\| issues }`; `output` is a new object',
    setup: '`abortEarly: true` for first-error, all issues otherwise',
  },
  yup: {
    label: 'yup validateSync()',
    color: '#d55181',
    lib: 'yup',
    call: '`schema.validateSync(input, options)`',
    returns: 'the cast value (a new object only when something changed); throws `ValidationError`',
    setup: '`abortEarly: false` for all errors (`true` for first-error), leaves `.strict()`',
  },
  joi: {
    label: 'joi validate()',
    color: '#45b8c9',
    lib: 'joi',
    call: '`schema.prefs(options).validate(input)`',
    returns: '`{ value, error }`; `value` is always a new object',
    setup: '`abortEarly: false` for all errors (`true` for first-error), `convert: false`',
  },
  ajv: {
    label: 'ajv compiled validate()',
    color: '#2e9d5b',
    lib: 'ajv',
    call: '`ajv.compile(jsonSchema)(input)`',
    returns: 'boolean (+ `validate.errors`); validates in place, no copy',
    setup: '`allErrors: true` for all errors (default `false` for first-error), `unicodeRegExp: false`',
    unsupportedModes: { strip: AJV_STRIP },
  },
  arktype: {
    label: 'arktype T(input)',
    color: '#c9a227',
    lib: 'arktype',
    call: '`T(input)`',
    returns: 'the data, or an `ArkErrors` array',
    setup: 'JIT (default)',
    noFirstError: 'no stop-at-first-error option',
    unsupportedModes: { strip: ARK_STRIP },
  },
  'arktype-allows': {
    label: 'arktype T.allows() [boolean only]',
    color: '#e3cc6e',
    lib: 'arktype',
    call: '`T.allows(input)`',
    returns: 'boolean only, no error details',
    setup: 'JIT (default)',
    booleanOnly: true,
    unsupportedModes: { strip: ARK_STRIP },
  },
  'class-validator': {
    label: 'class-validator validateSync()',
    color: '#a8744f',
    lib: 'class-validator',
    pkgs: ['class-validator', 'class-transformer', 'reflect-metadata'],
    call: '`validateSync(plainToInstance(Order, input), options)`',
    returns: '`ValidationError[]`; the instance is a new object',
    setup: 'decorated classes, class-transformer `plainToInstance`',
    noFirstError: '`stopAtFirstError` stops per property only',
  },
  'typebox-compiled': {
    label: 'typebox Compile() + Check()',
    color: '#8fb339',
    lib: 'typebox',
    call: '`C.Check(input)`, then `C.Errors(input)` when invalid (first-error: `C.Parse(input)`)',
    returns: 'boolean; errors array from `Errors()`; validates (and cleans) in place',
    setup: '`Compile(type)` (JIT); `maxErrors: Infinity`; first-error via `C.Parse()`',
    skip: typeboxStripInvalid,
  },
  'typebox-value': {
    label: 'typebox Value.Check()',
    color: '#b9d27a',
    lib: 'typebox',
    call: '`Value.Check(T, input)`, then `Value.Errors(T, input)` when invalid',
    returns: 'same as above, without compiling',
    setup: 'dynamic (no compile); `maxErrors: Infinity`; first-error via `Value.Parse()`',
    skip: typeboxStripInvalid,
  },
}

/** npm package of an engine, and every package it loads. */
export const pkgOf = (engine) => ENGINES[engine].pkg ?? ENGINES[engine].lib
export const pkgsOf = (engine) => ENGINES[engine].pkgs ?? [pkgOf(engine)]

/** Why `engine` does not run (scenario, mode), or null when it runs. */
export function skipReason(engine, scenario, mode) {
  const e = ENGINES[engine]
  const s = SCENARIOS[scenario]
  if (e.unsupportedModes?.[mode]) return e.unsupportedModes[mode]
  if (s.errors === 'first' && e.noFirstError) return e.noFirstError
  if (e.booleanOnly && s.errors === 'all' && !s.valid(mode)) return BOOLEAN_ONLY
  return e.skip?.(s, mode) ?? null
}

/** Loads the module that builds `engine`'s runner (imports only that engine's library). */
export const loadEngine = (engine) => import(`./engines/${ENGINES[engine].lib}.js`)

/** Every (mode, scenario, engine) cell in a stable order, with `reason` set when it is not run. */
export function listCells() {
  const out = []
  for (const mode of Object.keys(MODES))
    for (const scenario of Object.keys(SCENARIOS))
      for (const engine of Object.keys(ENGINES)) out.push({ mode, scenario, engine, reason: skipReason(engine, scenario, mode) })
  return out
}
export const listSkipped = () => listCells().filter((c) => c.reason)
export const listJobs = () => listCells().filter((c) => !c.reason).map(({ mode, scenario, engine }) => ({ mode, scenario, engine }))

/** Where the model has a union, per root type ('' = the root itself). */
const UNION_PATHS = { order: ['payment'], payment: [''] }

/**
 * Which paths an error report caught, used only by the pre-flight to check that every library
 * caught the same violations. The report itself is never changed; this only compares paths:
 * a failed union counts as its own path for everyone (atscript: one error with per-branch
 * details; zod: the closest branch's issues; JSON Schema libraries: every branch's errors).
 */
export function violations(target, paths) {
  const unions = UNION_PATHS[target]
  const collapse = (p) => unions.find((u) => u === '' || p === u || p.startsWith(`${u}.`)) ?? p
  return [...new Set(paths.map(collapse))].sort()
}

/**
 * Dotted paths of a JSON Schema error (ajv, TypeBox): `instancePath` is a JSON pointer
 * (`/items/0/sku`); an `additionalProperties` error names the undeclared key(s) (ajv one in
 * `additionalProperty`, TypeBox all of them in `additionalProperties`), one path each.
 */
export function jsonPointerPaths(e) {
  const p = e.instancePath.split('/').slice(1)
  if (e.keyword !== 'additionalProperties') return [p.join('.')]
  return (e.params.additionalProperties ?? [e.params.additionalProperty]).map((k) => [...p, k].join('.'))
}
