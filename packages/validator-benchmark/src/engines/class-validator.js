// class-validator engine: `plainToInstance()` (class-transformer) + `validateSync()`.
// Imports only class-validator / class-transformer.
import { validateSync } from 'class-validator'
import { buildClassValidatorModel, isObj } from '../schemas/class-validator.js'

/**
 * validateSync options per mode: strip -> `whitelist` (deletes undecorated keys from the
 * instance), strict -> `whitelist` + `forbidNonWhitelisted`, passthrough -> defaults. Every
 * error is collected (class-validator's `stopAtFirstError` only stops within one property, so
 * the first-error scenario is not run).
 */
const optionsOf = (mode) =>
  mode === 'strip' ? { whitelist: true } : mode === 'strict' ? { whitelist: true, forbidNonWhitelisted: true } : {}

const models = {}
const toInstanceOf = (mode, target) => (models[mode] ??= buildClassValidatorModel(optionsOf(mode)))[target]

/** Leaf errors (one per failed constraint), with dotted paths. */
function flatten(errors, parent = '', out = []) {
  for (const e of errors) {
    const path = parent ? `${parent}.${e.property}` : String(e.property ?? '')
    for (const _ of Object.keys(e.constraints ?? {})) out.push(path)
    if (e.children?.length) flatten(e.children, path, out)
  }
  return out
}

/**
 * Non-objects can't be instantiated or validated as a class (validateSync throws on `null`),
 * so they are rejected before transforming, as a validation pipe does.
 */
export function createRunner(engine, mode, s) {
  const toInstance = toInstanceOf(mode, s.target)
  const opts = optionsOf(mode)
  return (input) => {
    if (!isObj(input)) return -1
    const errors = validateSync(toInstance(input), opts) // the error tree is the report
    return errors.length ? -errors.length : 1
  }
}

export function inspect(engine, mode, s, input) {
  if (!isObj(input)) return { valid: false, raw: 1, paths: [''] }
  const instance = toInstanceOf(mode, s.target)(input)
  const errors = validateSync(instance, optionsOf(mode))
  if (!errors.length) return { valid: true, output: instance }
  const paths = flatten(errors)
  return { valid: false, raw: paths.length, paths }
}
