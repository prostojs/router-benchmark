import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Write benchmark result files (JSON, Markdown, optional SVG charts).
 *
 * @param {string} pkgDir  absolute path to the package root
 * @param {object} jsonData  data for the JSON file
 * @param {string} markdown  markdown content
 * @param {object} [opts]
 * @param {string} [opts.prefix]  file prefix (e.g. "scale" -> results-scale.json, RESULTS-SCALE.md)
 * @param {string} [opts.resultsDir]  subdirectory for JSON + SVG (e.g. "results"); markdown stays at pkgDir
 * @param {Record<string,string>} [opts.svgCharts]  filename -> SVG content (e.g. { 'results-chart.svg': svgString })
 * @param {boolean} [opts.scratch]  smoke (--quick) or partial (--only) run: written into the git-ignored
 *   `.quick/` directory (same layout) so it never overwrites the published results
 */
export function writeResultFiles(pkgDir, jsonData, markdown, opts = {}) {
  const { prefix = '', resultsDir = '', svgCharts = {}, scratch = false } = opts
  if (scratch) pkgDir = resolve(pkgDir, '.quick')
  mkdirSync(pkgDir, { recursive: true })

  const artifactDir = resultsDir ? resolve(pkgDir, resultsDir) : pkgDir
  if (resultsDir) {
    mkdirSync(artifactDir, { recursive: true })
  }

  const jsonPath = resolve(artifactDir, prefix ? `results-${prefix}.json` : 'results.json')
  const mdPath = resolve(pkgDir, prefix ? `RESULTS-${prefix.toUpperCase()}.md` : 'RESULTS.md')

  writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + '\n')
  writeFileSync(mdPath, markdown)

  console.log(`\nResults written to:`)
  console.log(`  ${jsonPath}`)
  console.log(`  ${mdPath}`)

  for (const [filename, svgContent] of Object.entries(svgCharts)) {
    const svgPath = resolve(artifactDir, filename)
    writeFileSync(svgPath, svgContent)
    console.log(`  ${svgPath}`)
  }
}
