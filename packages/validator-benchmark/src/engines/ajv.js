// ajv engine: JSON Schema compiled once per (mode, scenario) with `ajv.compile()`. Imports only ajv.
import { Ajv } from 'ajv'
import { buildJsonSchemas } from '../schemas/json-schema.js'
import { jsonPointerPaths } from '../setup.js'

/**
 * One Ajv instance per mode and error collection:
 * - `allErrors: true` collects every error; ajv's default (`false`) returns at the first;
 * - strip would be `removeAdditional: true`, but with `allErrors: true` it deletes keys while
 *   ajv tries the `anyOf` branches (the card branch strips the PayPal `email`), so the strip
 *   mode is not run (see ENGINES.ajv.unsupportedModes); the option stays so the failure can be
 *   reproduced;
 * - `unicodeRegExp: false` compiles patterns without the `u` flag, like every other engine;
 * - `allowUnionTypes`/`strict` stay at their defaults (`nullable: true` is ajv's own keyword).
 */
const cache = {}
function ajvValidator(mode, s) {
  return (cache[`${mode}:${s.target}:${s.errors}`] ??= new Ajv({
    allErrors: s.errors === 'all',
    removeAdditional: mode === 'strip',
    unicodeRegExp: false,
  }).compile(buildJsonSchemas(mode)[s.target]))
}

export function createRunner(engine, mode, s) {
  const validate = ajvValidator(mode, s)
  return (input) => (validate(input) ? 1 : -validate.errors.length)
}

export function inspect(engine, mode, s, input) {
  const validate = ajvValidator(mode, s)
  if (validate(input)) return { valid: true, output: input }
  return { valid: false, raw: validate.errors.length, paths: validate.errors.flatMap(jsonPointerPaths) }
}
