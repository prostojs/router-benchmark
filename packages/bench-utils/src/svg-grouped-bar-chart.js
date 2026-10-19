import { esc, fmtCompact } from './format.js'

/**
 * Generate an SVG grouped horizontal bar chart (same visual style as generateBarChart).
 * One group per category; bars within a group are scaled to the group's fastest value
 * (100%), so categories with very different magnitudes stay readable.
 * The absolute value is printed next to every bar.
 *
 * @param {Array<{category: string, bars: Array<{name: string, value: number, low?: number, high?: number}>}>} groups
 * @param {object} [opts]
 * @param {string} [opts.title]
 * @param {string} [opts.subtitle]
 * @param {string} [opts.unit]  value unit label (e.g. "ops/s")
 * @param {Record<string,string>} [opts.colors]  bar name -> hex color (fixed per series)
 * @param {Record<string,string>} [opts.labels]  bar name -> legend label
 * @returns {string} SVG markup
 */
export function generateGroupedBarChart(groups, opts = {}) {
  const { title = 'Benchmark Results', subtitle = '', unit = 'ops/s', colors = {}, labels = {} } = opts
  const fallback = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
  const seriesNames = [...new Set(groups.flatMap((g) => g.bars.map((b) => b.name)))]
  const color = (name) => colors[name] || fallback[seriesNames.indexOf(name) % fallback.length]

  const W = 860
  const labelW = 200
  const valueW = 170
  const barH = 14
  const barGap = 2 // surface gap between adjacent bars
  const groupGap = 18
  const legendRowH = 20
  const margin = { top: subtitle ? 66 : 50, left: labelW + 16, right: 20 }
  const plotW = W - margin.left - margin.right - valueW
  const legendH = seriesNames.length * legendRowH + 10
  const groupsH = groups.reduce((h, g) => h + g.bars.length * (barH + barGap) - barGap + groupGap, 0)
  const H = margin.top + legendH + groupsH + 30

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="system-ui,-apple-system,sans-serif" font-size="12">\n`
  svg += `<rect width="${W}" height="${H}" fill="#2b2d30" rx="8"/>\n`
  svg += `<text x="${W / 2}" y="30" text-anchor="middle" font-size="15" font-weight="600" fill="#e0e0e0">${esc(title)}</text>\n`
  if (subtitle) svg += `<text x="${W / 2}" y="50" text-anchor="middle" font-size="11" fill="#999">${esc(subtitle)}</text>\n`

  // Legend
  let y = margin.top
  for (const name of seriesNames) {
    svg += `<rect x="${margin.left}" y="${y}" width="14" height="12" rx="3" fill="${color(name)}"/>\n`
    svg += `<text x="${margin.left + 22}" y="${y + 10}" fill="#ccc">${esc(labels[name] || name)}</text>\n`
    y += legendRowH
  }
  y += 10

  // 100% reference line
  const x100 = margin.left + plotW
  svg += `<line x1="${x100}" y1="${y - 4}" x2="${x100}" y2="${H - 26}" stroke="#555" stroke-dasharray="3,3"/>\n`
  svg += `<text x="${x100}" y="${H - 12}" text-anchor="middle" fill="#888" font-size="10">fastest in group = 100%</text>\n`

  for (const g of groups) {
    const max = Math.max(...g.bars.map((b) => b.value))
    const gH = g.bars.length * (barH + barGap) - barGap
    svg += `<text x="${margin.left - 12}" y="${y + gH / 2 + 4}" text-anchor="end" fill="#ccc" font-size="12">${esc(g.category)}</text>\n`
    for (const b of g.bars) {
      const w = Math.max(2, (b.value / max) * plotW)
      const pct = Math.round((b.value / max) * 100)
      const spread = b.low != null && b.high != null ? ` (p25–p75 ${fmtCompact(b.low)}–${fmtCompact(b.high)})` : ''
      svg += `<g><title>${esc(`${g.category} · ${labels[b.name] || b.name}: ${fmtCompact(b.value)} ${unit}${spread}`)}</title>`
      svg += `<rect x="${margin.left}" y="${y}" width="${w.toFixed(1)}" height="${barH}" fill="${color(b.name)}" rx="4"/>`
      svg += `<text x="${(margin.left + w + 6).toFixed(1)}" y="${y + barH - 3}" fill="#ccc" font-size="11">${fmtCompact(b.value)} ${esc(unit)}${pct < 100 ? `  <tspan fill="#888">${pct}%</tspan>` : ''}</text></g>\n`
      y += barH + barGap
    }
    y += groupGap - barGap
  }

  svg += `</svg>\n`
  return svg
}
