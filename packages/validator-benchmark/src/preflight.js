// Sanity pre-flight: proves the atscript model and the zod schemas accept/reject the same
// inputs in every mode before anything is measured. Any disagreement aborts the run.
import { pathToFileURL } from 'node:url'
import { MODES, SCENARIOS, ENGINES, listJobs, violations } from './setup.js'
import * as atscriptEngine from './engines/atscript.js'
import * as zodEngine from './engines/zod.js'
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

const LIBS = { atscript: atscriptEngine, zod: zodEngine }
const engineLib = (engine) => LIBS[ENGINES[engine].lib]
const createRunner = (engine, mode, scenario) => engineLib(engine).createRunner(engine, mode, SCENARIOS[scenario])

/**
 * Error report of one validation with the library's default reporting (null when valid):
 * `raw` = number of errors/issues as reported; `violations` = which paths were caught.
 */
function errorReport(engine, mode, scenario, input) {
  const s = SCENARIOS[scenario]
  const rep = engineLib(engine).errorReport(engine, mode, s, input)
  return rep && { raw: rep.raw, violations: violations(s.target, rep.paths) }
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
    const runners = Object.keys(ENGINES).map((e) => [e, createRunner(e, mode, 'valid-order')])
    for (const [label, make, exp] of cases) {
      const expected = expectedOf(exp, mode)
      for (const [engine, run] of runners) {
        checks++
        const got = sign(run(make()))
        if (got !== expected) failures.push(`[${mode}] edge "${label}" / ${engine}: valid=${got}, expected ${expected}`)
      }
    }
  }

  // 3) output semantics for unknown props (documented in README)
  const output = {}
  for (const mode of Object.keys(MODES)) {
    const asInput = makeUnknownPropsOrder()
    const asOk = atscriptEngine.atscriptValidator(mode, SCENARIOS['unknown-props-order']).validate(asInput, true)
    const zInput = makeUnknownPropsOrder()
    const zr = zodEngine.zodSchema(mode, 'order', false).safeParse(zInput)
    const has = (o) => !!o && 'trackingRef' in o && 'brand' in o.payment && 'note' in o.items[0].metadata.customFields[0]
    output[mode] = {
      atscript: { valid: asOk, inputKeepsUnknownProps: has(asInput), returnsCopy: false },
      zod: { valid: zr.success, outputKeepsUnknownProps: zr.success ? has(zr.data) : null, inputKeepsUnknownProps: has(zInput), returnsCopy: zr.success ? zr.data !== zInput : null },
    }
    const exp = { strip: [true, false, false], passthrough: [true, true, true], strict: [false, true, null] }[mode]
    checks++
    if (asOk !== exp[0] || has(asInput) !== exp[1] || zr.success !== exp[0] || (zr.success && has(zr.data) !== exp[1]) || !has(zInput))
      failures.push(`[${mode}] unknown-props output semantics differ: ${JSON.stringify(output[mode])}`)
  }

  // 4) same work on invalid input: in every scenario that collects all errors, both libraries
  //    (run with their default error reporting) must catch the same violations — the same
  //    non-union paths, and the union path flagged on both sides (hard check).
  const errorReports = {}
  for (const mode of Object.keys(MODES)) {
    errorReports[mode] = {}
    for (const [scenario, s] of Object.entries(SCENARIOS)) {
      if (s.valid(mode) || s.errors !== 'all') continue
      const as = errorReport('atscript', mode, scenario, s.make())
      const rep = { atscript: as.raw }
      for (const engine of ['zod', 'zod-compiled']) {
        const zr = errorReport(engine, mode, scenario, s.make())
        rep[engine] = zr.raw
        checks++
        if (JSON.stringify(zr.violations) !== JSON.stringify(as.violations))
          failures.push(`[${mode}] ${scenario}: caught violations differ — atscript ${JSON.stringify(as.violations)} vs ${engine} ${JSON.stringify(zr.violations)}`)
      }
      rep.violatedPaths = as.violations
      errorReports[mode][scenario] = rep
    }
  }

  // 5) first-error rows must really stop at the first error: atscript errorLimit 1 reports exactly
  //    one error, and both sides read no root property after the first failing one (orderId,
  //    the first declared prop). Reads are traced with a Proxy over the root object.
  const firstError = {}
  for (const mode of Object.keys(MODES)) {
    const as1 = errorReport('atscript', mode, 'invalid-order-first-error', makeInvalidOrder())
    checks++
    if (as1.raw !== 1) failures.push(`[${mode}] atscript errorLimit 1 reported ${as1.raw} errors`)
    const reads = {}
    for (const engine of ['atscript', 'zod-compiled-validate']) {
      const run = createRunner(engine, mode, 'invalid-order-first-error')
      run(makeInvalidOrder()) // warm (compiles zod's fast path) before tracing
      const seen = new Set()
      const traced = new Proxy(makeInvalidOrder(), {
        get(t, k, r) {
          if (typeof k === 'string') seen.add(k)
          return Reflect.get(t, k, r)
        },
      })
      const r = run(traced)
      reads[engine] = [...seen]
      checks++
      if (r > 0 || reads[engine].some((k) => k !== 'orderId'))
        failures.push(`[${mode}] ${engine} first-error did not stop early: read ${JSON.stringify(reads[engine])}`)
    }
    firstError[mode] = { atscriptErrors: as1.raw, rootPropsRead: reads }
  }

  console.log(`Pre-flight: ${checks} checks, ${failures.length} failures`)
  for (const [mode, rep] of Object.entries(errorReports))
    console.log(`  [${mode}] errors reported (atscript / zod / zod-compiled), same violated paths: ${Object.entries(rep).map(([k, r]) => `${k} ${r.atscript}/${r.zod}/${r['zod-compiled']}`).join(', ')}`)
  console.log(`  first-error: ${JSON.stringify(firstError)}`)
  if (failures.length) {
    for (const f of failures) console.log(`  FAIL ${f}`)
    throw new Error('Pre-flight failed: libraries disagree, refusing to benchmark')
  }
  return { checks, edgeCases: EDGE_CASES.length + ROOT_CASES.length, errorReports, firstError, unknownPropsOutput: output }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runPreflight()
}
