import * as fx from './fixtures.js'

/**
 * Unknown-property modes: each maps a zod 4 object constructor to the atscript
 * `unknownProps` option with the same accept/reject behavior.
 */
export const MODES = {
  strip: { zod: 'z.object()', unknownProps: 'strip' },
  passthrough: { zod: 'z.looseObject()', unknownProps: 'ignore' },
  strict: { zod: 'z.strictObject()', unknownProps: 'error' },
}

/** Display text of a mode's atscript option, e.g. `unknownProps: 'strip'`. */
export const atscriptOption = (mode) => `unknownProps: '${MODES[mode].unknownProps}'`

/**
 * Scenarios.
 * - target: which root type is validated
 * - errors: 'all' (collect every error) | 'first' (stop at first error)
 * - fresh: every call gets its own freshly built input (needed when a library mutates
 *   its input, i.e. atscript 'strip' deletes unknown keys in place); built outside the timed region
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

/**
 * Engines (library + API). `lib` names the module in ./engines/ that builds the runner,
 * so a worker loads only its own library. `run(input)` returns a number that the harness
 * consumes: 1 when valid; for invalid input, minus the number of reported errors (so the
 * error report is materialized), or -1 for boolean-only APIs. `call`/`returns` are the
 * report's description of each engine.
 */
export const ENGINES = {
  atscript: {
    label: 'atscript validate()',
    color: '#3987e5',
    lib: 'atscript',
    call: '`validator.validate(input, true)`',
    returns: 'boolean (+ `validator.errors`); validates in place, no copy',
    supports: () => true,
  },
  zod: {
    label: 'zod safeParse()',
    color: '#d95926',
    lib: 'zod',
    call: '`schema.safeParse(input)`',
    returns: '`{ success, data \\| error }`; `data` is a new object',
    // zod has no public "stop at first error" option for safeParse (abortEarly is internal, used by validate())
    supports: (s) => s.errors === 'all',
  },
  'zod-compiled': {
    label: 'zod z.compile() + safeParse()',
    color: '#199e70',
    lib: 'zod',
    call: '`z.compile(schema).safeParse(input)`',
    returns: 'same as above, ahead-of-time compiled fast path',
    supports: (s) => s.errors === 'all',
  },
  'zod-compiled-validate': {
    label: 'zod z.compile() + validate() [boolean only]',
    color: '#c98500',
    lib: 'zod',
    call: '`z.compile(schema).validate(input)`',
    returns: 'boolean only, no output object, no error details',
    // boolean result, no error details: only comparable where no full error report is required
    supports: (s, mode) => s.valid(mode) || s.errors === 'first',
  },
}

/** Loads the module that builds `engine`'s runner (imports only that engine's library). */
export const loadEngine = (engine) => import(`./engines/${ENGINES[engine].lib}.js`)

/** All (mode, scenario, engine) jobs, in a stable order. */
export function listJobs() {
  const jobs = []
  for (const mode of Object.keys(MODES))
    for (const [scenario, s] of Object.entries(SCENARIOS))
      for (const [engine, e] of Object.entries(ENGINES))
        if (e.supports(s, mode)) jobs.push({ mode, scenario, engine })
  return jobs
}

/** Where the model has a union, per root type ('' = the root itself). */
const UNION_PATHS = { order: ['payment'], payment: [''] }

/**
 * Which paths an error report caught, used only by the pre-flight to check both libraries
 * caught the same violations. A failed union counts as its own path on both sides
 * (atscript: one error with per-branch details; zod: the closest branch's issues).
 */
export function violations(target, paths) {
  const unions = UNION_PATHS[target]
  const collapse = (p) => unions.find((u) => u === '' || p === u || p.startsWith(`${u}.`)) ?? p
  return [...new Set(paths.map(collapse))].sort()
}
