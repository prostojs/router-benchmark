import { mdTable, fmtInt, quickNotes, environmentMarkdown, rankRelative } from 'bench-utils'
import { MODES, SCENARIOS, ENGINES, listSkipped } from './setup.js'
import { formatErrorCounts } from './preflight.js'

/**
 * Results grouped for every table and chart: `[{ mode, scenarios: [{ scenario, rows }] }]`
 * in MODES / SCENARIOS order, empty groups dropped. Rows are copies of the results, ranked
 * fastest first, with `value` (= opsPerSec) and the `relative` label from rankRelative.
 */
export function groupResults(results) {
  return Object.keys(MODES)
    .map((mode) => ({
      mode,
      scenarios: Object.keys(SCENARIOS)
        .map((scenario) => ({
          scenario,
          rows: rankRelative(
            results.filter((r) => r.mode === mode && r.scenario === scenario).map((r) => ({ ...r, value: r.opsPerSec })),
          ),
        }))
        .filter((g) => g.rows.length),
    }))
    .filter((m) => m.scenarios.length)
}

export function renderMarkdown(report, groups, opts) {
  const { versions: v, settings: s, environment: env, preflight } = report
  const engines = Object.entries(ENGINES)
  let md = `# Validator Benchmark Results\n\n` + quickNotes(opts).md
  md += `Throughput of validating the same \`Order\` model with an [atscript](https://atscript.dev) validator and the equivalent schema in ${engines.length - 1} other engines of popular validation libraries. See [README.md](README.md) for what is measured and how the schemas were made equivalent.\n\n`
  md += `- ${Object.entries(v).map(([p, ver]) => `${p} **${ver}**`).join(', ')}\n`
  md += `- ${s.rounds} round(s) × ${s.samples} samples of ~${s.sampleMs} ms per job, ${s.warmupMs} ms warmup, one child process per job; total ${report.elapsedSec < 120 ? `${report.elapsedSec} s` : `${Math.round(report.elapsedSec / 60)} min`}\n`
  md += `- Pre-flight: ${preflight.checks} equivalence checks passed (every benchmark job, ${preflight.edgeCases} edge cases × every engine × every mode it supports, unknown-props output, same-violation and first-error checks)\n`
  md += `- Generated: ${env.date}\n`
  md += `- Chart data: [results/summary.json](results/summary.json) (\`results[mode][scenario][engine]\` = median ops/s)\n\n`
  md += `Values are the **median ops/s** over all samples; the bracket is the p25–p75 range. "Relative" is versus the fastest engine in the same row group.\n\n`

  md += `## Engines\n\n` + mdTable(['Engine', 'Call', 'Setup', 'Returns'], engines.map(([, e]) => [e.label, e.call, e.setup, e.returns])) + `\n`

  for (const { mode, scenarios } of groups) {
    md += `## Unknown props: ${mode}\n\n`
    md += Object.entries(MODES[mode].libs).map(([lib, how]) => `${lib} \`${how}\``).join(' · ') + `\n\n`
    md += `![${mode}](results/${mode}-chart.svg)\n\n`
    const table = scenarios.flatMap(({ scenario, rows }) => rows.map((r, i) =>
      [i === 0 ? scenario : '', ENGINES[r.engine].label, fmtInt(r.opsPerSec), `${fmtInt(r.p25)}–${fmtInt(r.p75)}`, fmtInt(r.nsPerOp), r.relative]))
    md += mdTable(['Scenario', 'Engine', 'ops/s (median)', 'p25–p75', 'ns/op', 'Relative'], table, 'llrrrr') + `\n`
  }

  md += `## Not run\n\nCells an engine skips, and why (see README for details):\n\n`
  const byEngine = new Map() // engine -> reason -> mode -> scenarios
  for (const k of listSkipped()) {
    const byReason = byEngine.get(k.engine) ?? byEngine.set(k.engine, new Map()).get(k.engine)
    const cells = byReason.get(k.reason) ?? byReason.set(k.reason, {}).get(k.reason)
    ;(cells[k.mode] ??= []).push(k.scenario)
  }
  const nScenarios = Object.keys(SCENARIOS).length
  const cellsText = (cells) =>
    Object.entries(cells)
      .map(([mode, sc]) => (sc.length === nScenarios ? `${mode}: all` : `${mode}: ${sc.join(', ')}`))
      .join('; ')
  const notRun = [...byEngine].flatMap(([engine, byReason]) =>
    [...byReason].map(([reason, cells]) => [ENGINES[engine].label, reason, cellsText(cells)]))
  md += mdTable(['Engine', 'Reason', 'Cells'], notRun) + `\n`

  const labels = (keys) => keys.map((k) => ENGINES[k].label).join(', ')
  const booleanOnly = labels(Object.keys(ENGINES).filter((k) => ENGINES[k].booleanOnly))
  const strip = preflight.unknownPropsOutput.strip ?? {}
  const inPlace = labels(Object.keys(strip).filter((k) => strip[k].valid && !strip[k].inputKeepsUnknownProps))
  md += `## Notes\n\n`
  md += `- Invalid-input scenarios: every engine runs with its library's default error reporting, and the pre-flight confirmed they all catch the same violations (same paths, and the failed \`payment\` union). Raw error counts differ by how each library reports a failed union and nested failures. Errors reported for \`invalid-order-all-errors\`:\n`
  for (const mode of Object.keys(MODES)) {
    const rep = preflight.errorReports[mode]?.['invalid-order-all-errors']
    if (rep) md += `  - ${mode}: ${formatErrorCounts(rep)}\n`
  }
  md += `- \`invalid-order-first-error\`: engines with a stop-at-first-error option run it and report exactly 1 error; boolean-only engines (${booleanOnly}) return \`false\` at the first failure. Engines without such an option skip it.\n`
  md += `- Boolean-only engines run only where a yes/no answer is comparable: valid inputs and the first-error scenario.\n`
  md += `- \`unknown-props-order\` gets a freshly built input for every call (built outside the timed region) because some engines strip unknown keys from the input in place (${inPlace}); all engines use the same fresh inputs in all modes.\n\n`

  md += environmentMarkdown(env, v, {
    ...(opts.only ? { 'Selection (--only)': opts.only.join(', ') } : {}),
    'Rounds': `${s.rounds} (forward, reversed, then seeded shuffle; fresh process per job × round)`,
    'Warmup': `${s.warmupMs} ms per job (time-based; also calibrates batch size)`,
    'Samples': `${s.samples} per job per round, ~${s.sampleMs} ms each (process.hrtime.bigint)`,
    'Reported value': 'median ops/s over all pooled samples; p25–p75 range',
    'Node flags': `${s.nodeFlags.join(' ')} (untimed gc() before every sample)`,
    ...quickNotes(opts).settings,
  })
  return md
}
