// atscript compiled engine: the same validator, call and options as ./atscript.js, over the
// same order.as built by atscript.compiled.config.mts (`tsPlugin({ compileValidators: true })`)
// into src/model-compiled/. The generated module registers a compiled check per type, which
// `validate()` runs first; when it fails, the regular walk builds the error report.
// Imports only atscript.
import * as model from '../model-compiled/order.as.js'
import { Validator } from '@atscript/typescript/utils'
import { atscriptEngine } from './atscript-shared.js'

export const { createRunner, inspect } = atscriptEngine(model, Validator)
