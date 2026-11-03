// atscript engine: the interpreted validator, over the model built by atscript.config.mts.
// Imports only atscript.
import * as model from '../model/order.as.js'
import { Validator } from '@atscript/typescript/utils'
import { atscriptEngine } from './atscript-shared.js'

export const { createRunner, inspect } = atscriptEngine(model, Validator)
