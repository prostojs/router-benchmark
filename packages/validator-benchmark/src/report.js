import { mdTable, fmtInt, quickNotes, environmentMarkdown, rankRelative } from 'bench-utils'
import { MODES, SCENARIOS, ENGINES, atscriptOption } from './setup.js'

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
  let md = `# Validator Benchmark Results\n\n` + quickNotes(opts).md
  md += `Throughput of validating the same \`Order\` model with an [atscript](https://atscript.dev) validator and equivalent [zod](https://zod.dev) schemas. See [README.md](README.md) for what is measured and how the two sides were made equivalent.\n\n`
  md += `- zod **${v.zod}**, @atscript/typescript **${v['@atscript/typescript']}**, @atscript/core **${v['@atscript/core']}**\n`
  md += `- ${s.rounds} round(s) × ${s.samples} samples of ~${s.sampleMs} ms per job, ${s.warmupMs} ms warmup, one child process per job; total ${report.elapsedSec < 120 ? `${report.elapsedSec} s` : `${Math.round(report.elapsedSec / 60)} min`}\n`
  md += `- Pre-flight: ${preflight.checks} equivalence checks passed (every benchmark job, ${preflight.edgeCases} edge cases × ${Object.keys(MODES).length} modes × ${Object.keys(ENGINES).length} engines, same-violation and first-error checks)\n`
  md += `- Generated: ${env.date}\n\n`
  md += `Values are the **median ops/s** over all samples; the bracket is the p25–p75 range. "Relative" is versus the fastest engine in the same row group.\n\n`

  md += `## Engines\n\n` + mdTable(['Engine', 'Call', 'Returns'], Object.values(ENGINES).map((e) => [e.label, e.call, e.returns])) + `\n`

  for (const { mode, scenarios } of groups) {
    md += `## Unknown props: ${mode}\n\nzod \`${MODES[mode].zod}\` ↔ atscript \`${atscriptOption(mode)}\`\n\n`
    md += `![${mode}](results/${mode}-chart.svg)\n\n`
    const table = scenarios.flatMap(({ scenario, rows }) => rows.map((r, i) =>
      [i === 0 ? scenario : '', ENGINES[r.engine].label, fmtInt(r.opsPerSec), `${fmtInt(r.p25)}–${fmtInt(r.p75)}`, fmtInt(r.nsPerOp), r.relative]))
    md += mdTable(['Scenario', 'Engine', 'ops/s (median)', 'p25–p75', 'ns/op', 'Relative'], table, 'llrrrr') + `\n`
  }

  const er = preflight.errorReports.strip['invalid-order-all-errors']
  md += `## Notes\n\n`
  md += `- Invalid-input scenarios: both libraries run with their default error reporting, and the pre-flight confirmed they catch the same violations (same paths, and the failed \`payment\` union on both sides). Raw counts for the invalid order: atscript ${er.atscript} errors, zod ${er.zod} issues. The two libraries report a failed union differently: atscript as one error with per-branch details, zod as the closest branch's individual issues.\n`
  md += `- \`invalid-order-first-error\`: atscript with \`errorLimit: 1\` (still returns that one error with path + message) vs zod \`validate()\` (boolean, aborts early, no error details). zod has no public stop-at-first-error option for \`safeParse\`, so the safeParse engines do not run this scenario.\n`
  md += `- \`zod z.compile() + validate()\` only runs where a boolean answer is comparable: valid inputs and the first-error scenario.\n`
  md += `- \`unknown-props-order\` gets a freshly built input for every call (built outside the timed region) because atscript \`strip\` deletes unknown keys from the input in place; all engines use the same fresh inputs in all modes.\n\n`

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
