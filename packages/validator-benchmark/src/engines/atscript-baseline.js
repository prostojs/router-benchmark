// atscript baseline engine: atscript 0.1.109 — the last release before compiled validators —
// with the same validator, call and options as ./atscript.js, over the same order.as built by
// 0.1.109 (the `atscript-baseline` workspace package pins both its packages to 0.1.109).
// Imports only atscript 0.1.109.
import { Validator, model } from 'atscript-baseline'
import { atscriptEngine } from './atscript-shared.js'

export const { createRunner, inspect } = atscriptEngine(model, Validator)
