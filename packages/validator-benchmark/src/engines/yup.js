// yup engine: `schema.validateSync(input, options)`, schemas built once per mode. Imports only yup.
import { buildYupSchemas } from '../schemas/yup.js'

/**
 * Validate options per mode and scenario: `abortEarly: false` collects every error,
 * `abortEarly: true` (yup's default) stops at the first; `stripUnknown` implements strip.
 */
const optionsOf = (mode, s) => ({ abortEarly: s.errors === 'first', stripUnknown: mode === 'strip' })

const schemas = {}
const schemaOf = (mode, s) => {
  const opts = optionsOf(mode, s)
  return (schemas[`${mode}:${s.errors}`] ??= buildYupSchemas(mode, opts))[s.target]
}

/** yup paths look like `items[0].sku`; normalized to `items.0.sku`. */
const norm = (p) => (p ?? '').replace(/\[(\d+)\]/g, '.$1').replace(/^\./, '')

export function createRunner(engine, mode, s) {
  const schema = schemaOf(mode, s)
  const opts = optionsOf(mode, s)
  return (input) => {
    try {
      return schema.validateSync(input, opts) === undefined ? 0 : 1
    } catch (e) {
      return -e.errors.length // ValidationError: one message per failed test
    }
  }
}

/** One validation with default reporting; `exact()` errors name the unknown keys, one path each. */
export function inspect(engine, mode, s, input) {
  try {
    return { valid: true, output: schemaOf(mode, s).validateSync(input, optionsOf(mode, s)) }
  } catch (e) {
    if (!e.inner) throw e
    const errs = e.inner.length ? e.inner : [e]
    const paths = errs.flatMap((x) =>
      x.type === 'exact' ? x.params.properties.split(', ').map((k) => norm(x.path ? `${x.path}.${k}` : k)) : [norm(x.path)],
    )
    return { valid: false, raw: e.errors.length, paths }
  }
}
