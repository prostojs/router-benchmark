import { defineConfig } from '@atscript/core'
import tsPlugin from '@atscript/typescript'

// Same model as atscript.config.mts, built with compiled validators into src/model-compiled/
// (the "atscript validate() [compiled]" engine); src/model/ stays interpreted.
export default defineConfig({
  rootDir: 'src/model',
  entries: ['order.as'],
  outDir: '../model-compiled',
  plugins: [tsPlugin({ compileValidators: true })],
})
