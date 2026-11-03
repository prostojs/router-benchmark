// Builds the validator benchmark's order.as with atscript 0.1.109 into ./model/, through the
// programmatic API (0.1.109's `asc` CLI runs on moost 0.6 / wooks 0.7, which cannot load next
// to the wooks 0.8 in this workspace; the build and the validator do not use them).
import { build } from '@atscript/core'
import tsPlugin from '@atscript/typescript'

const config = {
  rootDir: new URL('../validator-benchmark/src/model/', import.meta.url).pathname,
  entries: ['order.as'],
  outDir: '../../../atscript-baseline/model', // relative to rootDir
  plugins: [tsPlugin()],
  format: 'js',
}
const builder = await build(config)
for (const { target } of await builder.write(config)) console.log(`atscript-baseline: built ${target}`)
