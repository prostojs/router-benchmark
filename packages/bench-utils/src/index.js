// Report helpers for the benchmark orchestrators. The HTTP harness lives in
// `bench-utils/http-bench`, the server-process side in `bench-utils/server-entry`.
export { generateLineChart } from './svg-line-chart.js'
export { generateBarChart } from './svg-bar-chart.js'
export { generateGroupedBarChart } from './svg-grouped-bar-chart.js'
export { writeResultFiles } from './write-results.js'
export { describe, quantile, rotate, rankRelative, fmtInt, fmtPct } from './stats.js'
export { esc, fmtCompact } from './format.js'
export { collectEnvironment, resolveVersions, environmentMarkdown } from './env.js'
export { parseBenchOptions, quickNotes } from './args.js'
export { mdTable } from './md-table.js'
