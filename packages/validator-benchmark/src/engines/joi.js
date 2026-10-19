// joi engine: `schema.prefs(options).validate(input)`, schemas built once. Imports only joi.
import { buildJoiSchemas } from '../schemas/joi.js'

/**
 * Validate options per mode and scenario. Unknown keys: joi rejects them by default (strict);
 * `stripUnknown: true` removes them (strip); `allowUnknown: true` keeps them (passthrough).
 * `abortEarly: false` collects every error, `true` (joi's default) stops at the first.
 * `convert: false` turns off joi's type coercion (the model never coerces).
 */
const optionsOf = (mode, s) => ({
  abortEarly: s.errors === 'first',
  convert: false,
  ...(mode === 'strip' ? { stripUnknown: true } : mode === 'passthrough' ? { allowUnknown: true } : {}),
})

let base
/** The options are bound once with `schema.prefs()` instead of being merged on every call. */
const cache = {}
const schemaOf = (mode, s) =>
  (cache[`${mode}:${s.target}:${s.errors}`] ??= (base ??= buildJoiSchemas())[s.target].prefs(optionsOf(mode, s)))

/** joi's `object.unknown` error already points at the unknown key itself. */
const pathOf = (d) => d.path.join('.')

export function createRunner(engine, mode, s) {
  const schema = schemaOf(mode, s)
  return (input) => {
    const r = schema.validate(input)
    return r.error ? -r.error.details.length : r.value === undefined ? 0 : 1
  }
}

export function inspect(engine, mode, s, input) {
  const r = schemaOf(mode, s).validate(input)
  if (!r.error) return { valid: true, output: r.value }
  return { valid: false, raw: r.error.details.length, paths: r.error.details.map(pathOf) }
}
