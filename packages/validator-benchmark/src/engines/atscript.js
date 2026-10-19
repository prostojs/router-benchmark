// atscript engine: builds the validator for a (mode, scenario). Imports only atscript.
import { Validator } from '@atscript/typescript/utils'
import { Order, Payment } from '../model/order.as.js'
import { MODES } from '../setup.js'

/** The validator for a mode and scenario `s` (root type + error collection). */
export function atscriptValidator(mode, s) {
  return new Validator(s.target === 'order' ? Order : Payment, {
    unknownProps: MODES[mode].unknownProps,
    errorLimit: s.errors === 'first' ? 1 : Infinity,
  })
}

/** Per-call function for scenario `s`; the validator is built once, here. */
export function createRunner(engine, mode, s) {
  const v = atscriptValidator(mode, s)
  // errors are built eagerly by atscript (path + message), reading .length is enough
  return (input) => (v.validate(input, true) ? 1 : -v.errors.length)
}

/** Default error report (null when valid): raw error count and the error paths. */
export function errorReport(engine, mode, s, input) {
  const v = atscriptValidator(mode, s)
  if (v.validate(input, true)) return null
  return { raw: v.errors.length, paths: v.errors.map((e) => e.path) }
}
