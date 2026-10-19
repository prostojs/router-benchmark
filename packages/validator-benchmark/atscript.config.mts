import { defineConfig } from '@atscript/core'
import tsPlugin from '@atscript/typescript'

export default defineConfig({
  entries: ['src/model/order.as'],
  plugins: [tsPlugin()],
})
