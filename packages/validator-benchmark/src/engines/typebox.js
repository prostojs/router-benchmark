// TypeBox engines: `Compile(type)` (JIT validator) or the dynamic `Value` functions. Imports only typebox.
import { Compile } from 'typebox/compile'
import { Value } from 'typebox/value'
import { Settings } from 'typebox/system'
import { buildTypeboxSchemas } from '../schemas/typebox.js'
import { jsonPointerPaths } from '../setup.js'

// `Errors()` stops collecting at `maxErrors` (default 8, a guard against huge error lists);
// the all-errors scenarios need the complete report, like every other engine gives.
Settings.Set({ maxErrors: Infinity })

const types = {}
const typeOf = (mode, target) => (types[mode] ??= buildTypeboxSchemas(mode))[target]
const compiled = {}
const compiledOf = (mode, target) => (compiled[`${mode}:${target}`] ??= Compile(typeOf(mode, target)))

/**
 * TypeBox's documented flows (`typebox-compiled`: the compiled validator `C`; `typebox-value`:
 * the uncompiled `Value` functions with the type):
 * - all errors: a boolean `Check()`; on failure `Errors()` builds the error list;
 * - first error: `Parse()`, which returns the value or throws a `ParseError` carrying
 *   `maxParseErrors` (default 1) errors; error collection stops there;
 * - strip: after a successful `Check()`, `Clean()` deletes undeclared keys in place. On invalid
 *   input strip runs the passthrough code, so those cells (incl. first-error) are not run.
 */
export function createRunner(engine, mode, s) {
  const T = typeOf(mode, s.target)
  const strip = mode === 'strip'
  if (engine === 'typebox-compiled') {
    const C = compiledOf(mode, s.target)
    if (s.errors === 'first')
      return (input) => {
        try {
          C.Parse(input)
        } catch (e) {
          return -e.cause.errors.length
        }
        return 1
      }
    if (strip) return (input) => (C.Check(input) ? (C.Clean(input), 1) : -C.Errors(input).length)
    return (input) => (C.Check(input) ? 1 : -C.Errors(input).length)
  }
  if (s.errors === 'first')
    return (input) => {
      try {
        Value.Parse(T, input)
      } catch (e) {
        return -e.cause.errors.length
      }
      return 1
    }
  if (strip) return (input) => (Value.Check(T, input) ? (Value.Clean(T, input), 1) : -Value.Errors(T, input).length)
  return (input) => (Value.Check(T, input) ? 1 : -Value.Errors(T, input).length)
}

/**
 * TypeBox writes an optional `T | null` as `anyOf`: when `T` fails it also reports the failed
 * `null` branch and an `anyOf` error at the same path. Those are the union's own wrapper
 * errors, not separate violations, so the path comparison leaves them out (`raw` still counts
 * every error the library reported).
 */
const isUnionWrapper = (e) => e.keyword === 'anyOf' || (e.keyword === 'type' && e.params.type === 'null')

export function inspect(engine, mode, s, input) {
  const T = typeOf(mode, s.target)
  const api = engine === 'typebox-compiled' ? compiledOf(mode, s.target) : null
  const check = (v) => (api ? api.Check(v) : Value.Check(T, v))
  if (check(input)) return { valid: true, output: mode === 'strip' ? (api ? api.Clean(input) : Value.Clean(T, input)) : input }
  let errs
  if (s.errors === 'first') {
    try {
      api ? api.Parse(input) : Value.Parse(T, input)
    } catch (e) {
      errs = e.cause.errors
    }
  } else errs = api ? api.Errors(input) : Value.Errors(T, input)
  return { valid: false, raw: errs.length, paths: errs.filter((e) => !isUnionWrapper(e)).flatMap(jsonPointerPaths) }
}
