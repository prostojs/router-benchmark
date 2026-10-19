// zod engines: build the (optionally compiled) schema for a (mode, scenario). Imports only zod.
import * as z from 'zod'
import { buildZodSchemas } from '../zod-schemas.js'

const cache = {}
/** The zod schema for a mode and root type, compiled with `z.compile()` when `compiled`. */
export function zodSchema(mode, target, compiled) {
  const key = `${mode}:${target}:${compiled}`
  if (!cache[key]) {
    const s = buildZodSchemas(mode)[target]
    // strict: true -> throw instead of silently falling back if the schema can't be compiled
    cache[key] = compiled ? z.compile(s, { strict: true }) : s
  }
  return cache[key]
}

/** Per-call function for (engine, mode, scenario `s`); the schema is built once, here. */
export function createRunner(engine, mode, s) {
  const schema = zodSchema(mode, s.target, engine !== 'zod')
  if (engine === 'zod-compiled-validate') return (input) => (schema.validate(input) ? 1 : -1)
  // zod builds the ZodError lazily on first `.error` read; reading it materializes the
  // report (paths + messages), matching what atscript produces eagerly
  return (input) => {
    const r = schema.safeParse(input)
    return r.success ? (r.data === undefined ? 0 : 1) : -r.error.issues.length
  }
}

/**
 * Default `safeParse` error report (null when valid): raw issue count and the issue paths;
 * zod's per-object `unrecognized_keys` issue names its keys, one path each.
 */
export function errorReport(engine, mode, s, input) {
  if (engine === 'zod-compiled-validate') throw new Error(`${engine} has no error report`)
  const r = zodSchema(mode, s.target, engine === 'zod-compiled').safeParse(input)
  if (r.success) return null
  const paths = r.error.issues
    .flatMap((i) => (i.code === 'unrecognized_keys' ? i.keys.map((k) => [...i.path, k]) : [i.path]))
    .map((p) => p.join('.'))
  return { raw: r.error.issues.length, paths }
}
