// Sanity pre-flight: proves the atscript model and every other library's schema accept/reject
// the same inputs in every mode before anything is measured. Any disagreement aborts the run.
import { pathToFileURL } from 'node:url'
import { MODES, SCENARIOS, ENGINES, listJobs, loadEngine, skipReason, violations } from './setup.js'
import { makeValidOrder, makeInvalidOrder, makeUnknownPropsOrder } from './fixtures.js'

const item = (i) => ({ sku: `S${i}`, name: `N${i}`, quantity: 1, unitPrice: 1 })
const str = (n) => 'x'.repeat(n)

/** Edge-case mutations of a valid order: [label, mutate(order), expected(mode)] */
const EDGE_CASES = [
  ['optional string = null', (o) => (o.customer.billingAddress.country = null), true],
  ['optional object = null', (o) => (o.customer.billingAddress = null), true],
  ['optional nested object = null', (o) => (o.items[0].metadata = null), true],
  ['optional prop = explicit undefined', (o) => (o.customer.phone = undefined), true],
  ['optional props absent', (o) => { delete o.notes; delete o.couponCodes; delete o.updatedAt }, true],
  ['required string missing', (o) => delete o.createdAt, false],
  ['required string = null', (o) => (o.createdAt = null), false],
  ['required string = number', (o) => (o.orderId = 10000000), false],
  ['int: 1.5', (o) => (o.items[0].quantity = 1.5), false],
  ['int min: 0', (o) => (o.items[0].quantity = 0), false],
  ['int max: 10000', (o) => (o.items[0].quantity = 10000), true],
  ['int max: 10001', (o) => (o.items[0].quantity = 10001), false],
  ['min 0.01 inclusive', (o) => (o.items[0].unitPrice = 0.01), true],
  ['min 0.01: 0.009', (o) => (o.items[0].unitPrice = 0.009), false],
  ['max 999999.99 inclusive', (o) => (o.items[0].unitPrice = 999999.99), true],
  ['number = NaN', (o) => (o.items[0].unitPrice = NaN), false],
  ['number = Infinity', (o) => (o.subtotal = Infinity), false],
  ['number = numeric string', (o) => (o.tax = '1'), false],
  ['min 0 inclusive', (o) => (o.subtotal = 0), true],
  ['min 0: -0.01', (o) => (o.subtotal = -0.01), false],
  ['unconstrained number negative', (o) => (o.items[0].discount = -5), true],
  ['unconstrained number 1e20', (o) => (o.items[0].discount = 1e20), true],
  ['min-only number 1e20', (o) => (o.subtotal = 1e20), true],
  ['optional number = NaN', (o) => (o.items[0].discount = NaN), false],
  ['optional nested number = NaN', (o) => (o.items[0].metadata.weight = NaN), false],
  ['optional number = string', (o) => (o.items[0].metadata.weight = '1'), false],
  ['array minLength: []', (o) => (o.items = []), false],
  ['array maxLength: 100', (o) => (o.items = Array.from({ length: 100 }, (_, i) => item(i))), true],
  ['array maxLength: 101', (o) => (o.items = Array.from({ length: 101 }, (_, i) => item(i))), false],
  ['array of string with number', (o) => (o.items[0].tags = ['a', 1]), false],
  ['array instead of object', (o) => (o.customer.shippingAddress = []), false],
  ['object instead of array', (o) => (o.couponCodes = {}), false],
  ['nested array item missing prop', (o) => (o.items[0].metadata.customFields = [{ key: 'a' }]), false],
  ['string minLength 1: ""', (o) => (o.items[0].sku = ''), false],
  ['string maxLength 64: 64', (o) => (o.items[0].sku = str(64)), true],
  ['string maxLength 64: 65', (o) => (o.items[0].sku = str(65)), false],
  ['string minLength: whitespace only', (o) => (o.customer.firstName = ' '), true],
  ['unconstrained string: ""', (o) => (o.notes = ''), true],
  ['pattern: lowercase state', (o) => (o.customer.shippingAddress.state = 'il'), false],
  ['pattern: zip+4', (o) => (o.customer.shippingAddress.zip = '12345-6789'), true],
  ['pattern: zip trailing dash', (o) => (o.customer.shippingAddress.zip = '12345-'), false],
  ['pattern: short email', (o) => (o.customer.email = 'a@b.c'), true],
  ['pattern: email without dot', (o) => (o.customer.email = 'a@b'), false],
  ['pattern: email double @', (o) => (o.customer.email = 'a@@b.c'), false],
  ['pattern: phone leading 0', (o) => (o.customer.phone = '0123456789'), false],
  ['union: paypal branch', (o) => (o.payment = { email: 'p@example.com' }), true],
  ['union: invalid paypal email', (o) => (o.payment = { email: 'nope' }), false],
  ['union: empty object', (o) => (o.payment = {}), false],
  ['union: null', (o) => (o.payment = null), false],
  ['union: card with bad cvv', (o) => (o.payment.cvv = '1'), false],
  // card fields + paypal email: strict mode rejects both branches (each sees an unknown key)
  ['union: card + email keys', (o) => (o.payment.email = 'p@example.com'), (m) => m !== 'strict'],
  ['unknown top-level prop', (o) => (o.extra = 1), (m) => m !== 'strict'],
  ['unknown nested prop', (o) => (o.items[2].extra = 1), (m) => m !== 'strict'],
  ['unknown prop value undefined', (o) => (o.extra = undefined), (m) => m !== 'strict'],
]

const ROOT_CASES = [
  ['root = null', () => null, false],
  ['root = array', () => [], false],
  ['root = string', () => 'x', false],
]

const LIBS = Object.fromEntries(await Promise.all(Object.keys(ENGINES).map(async (e) => [e, await loadEngine(e)])))
const createRunner = (engine, mode, scenario) => LIBS[engine].createRunner(engine, mode, SCENARIOS[scenario])
const runs = (engine, mode, scenario) => !skipReason(engine, scenario, mode)
/** Engines that run in `mode` at all. */
const enginesIn = (mode) => Object.keys(ENGINES).filter((e) => !ENGINES[e].unsupportedModes?.[mode])
/** Engines that report errors (not boolean-only). */
const reporting = (engine) => !ENGINES[engine].booleanOnly

/** Undeclared keys of `makeUnknownPropsOrder()` (root, union branch, nested array item) still present in `o`. */
const unknownKeys = (o) =>
  [
    ['trackingRef', o],
    ['brand', o?.payment],
    ['note', o?.items?.[0]?.metadata?.customFields?.[0]],
  ].filter(([k, obj]) => obj && k in obj).length

/** `{ raw: { engine: errors reported | null when it accepted } }` -> "atscript 15, zod 18, ..." */
export const formatErrorCounts = (rep) =>
  Object.entries(rep.raw)
    .map(([engine, n]) => `${engine} ${n ?? 'accepted (unexpected)'}`)
    .join(', ')

/**
 * One validation with the library's default reporting: validity, the output the library
 * hands back, and when invalid `raw` = number of errors/issues as reported and
 * `violations` = which paths were caught.
 */
function inspect(engine, mode, scenario, input) {
  const s = SCENARIOS[scenario]
  const r = LIBS[engine].inspect(engine, mode, s, input)
  return r.valid ? r : { ...r, violations: violations(s.target, r.paths) }
}

const expectedOf = (exp, mode) => (typeof exp === 'function' ? exp(mode) : exp)
const sign = (r) => r > 0

export function runPreflight() {
  const failures = []
  let checks = 0

  // 1) every benchmark job: each engine agrees with the expected outcome on a fresh input
  for (const { mode, scenario, engine } of listJobs()) {
    const s = SCENARIOS[scenario]
    const r = createRunner(engine, mode, scenario)(s.make())
    checks++
    if (sign(r) !== s.valid(mode)) failures.push(`[${mode}] ${scenario} / ${engine}: got ${r}, expected valid=${s.valid(mode)}`)
  }

  // 2) edge-case equivalence: all engines (incl. ones not benchmarked on that scenario) must agree
  const cases = [
    ...EDGE_CASES.map(([l, mut, exp]) => [l, () => { const o = makeValidOrder(); mut(o); return o }, exp]),
    ...ROOT_CASES,
  ]
  for (const mode of Object.keys(MODES)) {
    const runners = enginesIn(mode).map((e) => [e, createRunner(e, mode, 'valid-order')])
    for (const [label, make, exp] of cases) {
      const expected = expectedOf(exp, mode)
      for (const [engine, run] of runners) {
        checks++
        let got
        try {
          got = sign(run(make()))
        } catch (e) {
          got = `threw ${e.message}`
        }
        if (got !== expected) failures.push(`[${mode}] edge "${label}" / ${engine}: valid=${got}, expected ${expected}`)
      }
    }
  }

  // 3) output semantics for unknown props (documented in README): strip -> the returned value
  //    has no unknown keys; passthrough -> it keeps them; strict -> invalid. Also records whether
  //    the library changed its input (those need fresh inputs, see SCENARIOS `fresh`).
  const output = {}
  for (const mode of Object.keys(MODES)) {
    output[mode] = {}
    for (const engine of enginesIn(mode).filter(reporting)) {
      const input = makeUnknownPropsOrder()
      const r = inspect(engine, mode, 'unknown-props-order', input)
      const o = {
        valid: r.valid,
        outputKeepsUnknownProps: r.valid ? unknownKeys(r.output) === 3 : null,
        returnsCopy: r.valid ? r.output !== input : null,
        inputKeepsUnknownProps: unknownKeys(input) === 3,
      }
      output[mode][engine] = o
      checks++
      const ok =
        mode === 'strict' ? !r.valid : mode === 'strip' ? r.valid && unknownKeys(r.output) === 0 : r.valid && o.outputKeepsUnknownProps
      if (!ok) failures.push(`[${mode}] ${engine}: unknown-props output semantics wrong: ${JSON.stringify(o)}`)
    }
  }

  // 4) same work on invalid input: in every scenario that collects all errors, every engine
  //    that reports errors (run with its default error reporting) must catch the same
  //    violations as atscript: the same non-union paths, and the union path flagged (hard check).
  const errorReports = {}
  for (const mode of Object.keys(MODES)) {
    errorReports[mode] = {}
    for (const [scenario, s] of Object.entries(SCENARIOS)) {
      if (s.valid(mode) || s.errors !== 'all') continue
      const as = inspect('atscript', mode, scenario, s.make())
      const rep = { raw: {}, violatedPaths: as.violations }
      for (const engine of Object.keys(ENGINES).filter((e) => reporting(e) && runs(e, mode, scenario))) {
        const r = inspect(engine, mode, scenario, s.make())
        rep.raw[engine] = r.valid ? null : r.raw
        checks++
        if (r.valid || JSON.stringify(r.violations) !== JSON.stringify(as.violations))
          failures.push(`[${mode}] ${scenario}: caught violations differ — atscript ${JSON.stringify(as.violations)} vs ${engine} ${JSON.stringify(r.violations)} (paths ${JSON.stringify(r.paths)})`)
      }
      errorReports[mode][scenario] = rep
    }
  }

  // 5) first-error rows must really stop at the first error. Engines with error details must
  //    report exactly one error. Boolean-only engines give no count, so their reads are traced
  //    with a Proxy over the root object: they must return before reading every root property.
  //    The traced reads are recorded for every engine (some libraries read every root property
  //    even though they stop collecting at the first error).
  const firstError = {}
  const rootProps = Object.keys(makeInvalidOrder())
  for (const mode of Object.keys(MODES)) {
    firstError[mode] = { errors: {}, rootPropsRead: {} }
    for (const engine of Object.keys(ENGINES).filter((e) => runs(e, mode, 'invalid-order-first-error'))) {
      if (reporting(engine)) {
        const r = inspect(engine, mode, 'invalid-order-first-error', makeInvalidOrder())
        firstError[mode].errors[engine] = r.raw
        checks++
        if (r.valid || r.raw !== 1) failures.push(`[${mode}] ${engine} first-error reported ${r.raw} errors`)
      }
      const run = createRunner(engine, mode, 'invalid-order-first-error')
      run(makeInvalidOrder()) // warm (compiles lazy fast paths) before tracing
      const seen = new Set()
      const traced = new Proxy(makeInvalidOrder(), {
        get(t, k, r) {
          if (typeof k === 'string') seen.add(k)
          return Reflect.get(t, k, r)
        },
      })
      const r = run(traced)
      const reads = rootProps.filter((k) => seen.has(k))
      firstError[mode].rootPropsRead[engine] = reads
      checks++
      if (r > 0) failures.push(`[${mode}] ${engine} first-error: traced input accepted`)
      if (!reporting(engine) && reads.length === rootProps.length)
        failures.push(`[${mode}] ${engine} first-error did not stop early: read ${JSON.stringify(reads)}`)
    }
  }

  console.log(`Pre-flight: ${checks} checks, ${failures.length} failures`)
  for (const [mode, rep] of Object.entries(errorReports))
    for (const [scenario, r] of Object.entries(rep))
      console.log(`  [${mode}] ${scenario}: errors reported, same violated paths: ${formatErrorCounts(r)}`)
  for (const [mode, f] of Object.entries(firstError))
    console.log(`  [${mode}] first-error: errors ${JSON.stringify(f.errors)}; root props read ${JSON.stringify(f.rootPropsRead)}`)
  if (failures.length) {
    for (const f of failures) console.log(`  FAIL ${f}`)
    throw new Error('Pre-flight failed: libraries disagree, refusing to benchmark')
  }
  return { checks, edgeCases: EDGE_CASES.length + ROOT_CASES.length, errorReports, firstError, unknownPropsOutput: output }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runPreflight()
}
