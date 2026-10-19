// valibot engine: `v.safeParser(schema, config)` built once per (mode, scenario). Imports only valibot.
import * as v from 'valibot'
import { buildValibotSchemas } from '../schemas/valibot.js'

const schemas = {}
const schemaOf = (mode, target) => (schemas[mode] ??= buildValibotSchemas(mode))[target]

/** `abortEarly: true` stops at the first issue (valibot's documented option); otherwise all issues. */
const parserOf = (mode, s) => v.safeParser(schemaOf(mode, s.target), { abortEarly: s.errors === 'first' })

export function createRunner(engine, mode, s) {
  const parse = parserOf(mode, s)
  return (input) => {
    const r = parse(input)
    return r.success ? (r.output === undefined ? 0 : 1) : -r.issues.length
  }
}

/** One validation with default reporting: validity, the returned output, raw issue count, issue paths. */
export function inspect(engine, mode, s, input) {
  const r = parserOf(mode, s)(input)
  if (r.success) return { valid: true, output: r.output }
  // a strictObject's unknown-key issue already points at the key itself
  return { valid: false, raw: r.issues.length, paths: r.issues.map((i) => (i.path ?? []).map((p) => p.key).join('.')) }
}
