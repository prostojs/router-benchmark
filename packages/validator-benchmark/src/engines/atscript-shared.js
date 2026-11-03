// Shared by the atscript engines (not an engine itself): the same validator, call and options
// over a given generated model. Each engine module imports only its own model and runtime.
import { MODES } from '../setup.js'

/** `createRunner` / `inspect` over the model's `Order` and `Payment` types, with `Validator`. */
export function atscriptEngine({ Order, Payment }, Validator) {
  /** The validator for a mode and scenario `s` (root type + error collection). */
  function atscriptValidator(mode, s) {
    return new Validator(s.target === 'order' ? Order : Payment, {
      unknownProps: MODES[mode].unknownProps,
      errorLimit: s.errors === 'first' ? 1 : Infinity,
    })
  }

  return {
    /** Per-call function for scenario `s`; the validator is built once, here. */
    createRunner(engine, mode, s) {
      const v = atscriptValidator(mode, s)
      // errors are built eagerly by atscript (path + message), reading .length is enough
      return (input) => (v.validate(input, true) ? 1 : -v.errors.length)
    },

    /** One validation with default reporting; atscript validates (and strips) the input in place. */
    inspect(engine, mode, s, input) {
      const v = atscriptValidator(mode, s)
      if (v.validate(input, true)) return { valid: true, output: input }
      return { valid: false, raw: v.errors.length, paths: v.errors.map((e) => e.path) }
    },
  }
}
