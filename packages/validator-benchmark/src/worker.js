// Measures ONE (engine, mode, scenario) job in a dedicated Node process, so no other
// library or scenario shares this isolate's JIT/IC state. Prints one JSON line.
import { SCENARIOS, loadEngine } from './setup.js'

const { engine, mode, scenario, warmupMs, samples, sampleMs } = JSON.parse(process.argv[2])
const s = SCENARIOS[scenario]
const { createRunner } = await loadEngine(engine) // imports only this engine's library
const run = createRunner(engine, mode, s) // schema / validator built once, outside timing
const gc = globalThis.gc ?? (() => {})
const now = () => Number(process.hrtime.bigint()) / 1e6 // ms

// Inputs live in an array so the timed loop has the same shape for every job. For
// `fresh` scenarios each slot is a distinct, newly built object (atscript 'strip'
// deletes unknown keys in place, so an input can't be reused); otherwise every slot
// references the same object, and one array (grown only when a larger batch needs it)
// is reused for every batch.
const shared = s.fresh ? null : s.make()
let inputs = []
function prepare(n) {
  if (!s.fresh && inputs.length >= n) return inputs
  const a = new Array(n)
  for (let i = 0; i < n; i++) a[i] = shared ?? s.make()
  return (inputs = a)
}

let sink = 0
function timed(batch, n) {
  let acc = 0
  const t0 = now()
  for (let i = 0; i < n; i++) acc += run(batch[i])
  const dt = now() - t0
  sink += acc // consume every result (prevents dead-code elimination; checked below)
  return dt
}

const expected = run(s.make()) // per-call result for this input (1 valid, <0 invalid)
let calls = 1
sink += expected

// Warmup (also calibrates the batch size so that one sample takes ~sampleMs). Per-call
// time is estimated only from batches that end in the second half of the warmup, so cold
// first batches don't shorten the samples (the last batch always ends there).
let batchSize = 64
const warmStart = now()
let elapsed = 0
let lateCalls = 0
let lateTime = 0
while (elapsed < warmupMs) {
  const dt = timed(prepare(batchSize), batchSize)
  calls += batchSize
  elapsed = now() - warmStart
  if (elapsed >= warmupMs / 2) {
    lateCalls += batchSize
    lateTime += dt
  }
  if (dt < 2) batchSize *= 2
}
const n = Math.max(16, Math.round(sampleMs / (lateTime / lateCalls)))

const opsPerSec = []
for (let k = 0; k < samples; k++) {
  const batch = prepare(n) // untimed
  gc() // untimed; start every sample from the same heap state
  const dt = timed(batch, n)
  calls += n
  opsPerSec.push((n / dt) * 1000)
}

if (sink !== expected * calls) {
  console.error(`result check failed: sink=${sink}, expected ${expected}*${calls}`)
  process.exit(2)
}
// a non-fresh scenario reuses one input object: it must come out of the run unchanged
if (!s.fresh && JSON.stringify(shared) !== JSON.stringify(s.make())) {
  console.error(`${scenario} (${mode}, ${engine}): the shared input changed during the run; the scenario must be marked fresh`)
  process.exit(3)
}
process.stdout.write(JSON.stringify({ opsPerSec, batch: n }) + '\n')
