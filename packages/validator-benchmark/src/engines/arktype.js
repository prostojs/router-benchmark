// ArkType engines: `T(input)` (full result) or `T.allows(input)` (boolean). Imports only arktype.
import { type } from 'arktype'
import { buildArktypeSchemas } from '../schemas/arktype.js'

const types = {}
const arktypeOf = (mode, target) => (types[mode] ??= buildArktypeSchemas(mode))[target]

/**
 * `arktype`: calling the type returns the data or an `ArkErrors` array (every error; ArkType has
 * no stop-at-first-error option, so it skips the first-error scenario).
 * `arktype-allows`: `T.allows(input)` returns a boolean and stops at the first failure.
 */
export function createRunner(engine, mode, s) {
  const T = arktypeOf(mode, s.target)
  if (engine === 'arktype-allows') return (input) => (T.allows(input) ? 1 : -1)
  return (input) => {
    const out = T(input)
    return out instanceof type.errors ? -out.length : out === undefined ? 0 : 1
  }
}

export function inspect(engine, mode, s, input) {
  const out = arktypeOf(mode, s.target)(input)
  if (!(out instanceof type.errors)) return { valid: true, output: out }
  // a rejected undeclared key is reported at the key's own path
  return { valid: false, raw: out.length, paths: out.map((e) => e.path.join('.')) }
}
