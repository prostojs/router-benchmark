import { esc } from './format.js'

/**
 * Generate an SVG horizontal bar chart.
 *
 * @param {Array<{name: string, value: number, range?: [number, number], note?: string, invalid?: boolean}>} data
 *   bars in display order; `range` = min–max whisker, `note` = small caption under the value
 *   (e.g. "fastest" / "1.25x slower"), `invalid` = bar drawn grey with a red caption
 * @param {object} [opts]
 * @param {string} [opts.title]
 * @param {string} [opts.unit]  label for value axis (e.g. "op/ms")
 * @param {Record<string,string>} [opts.colors]  name -> hex color
 * @param {string} [opts.subtitle]  small second line under the title (e.g. run settings)
 * @returns {string} SVG markup
 */
export function generateBarChart(data, opts = {}) {
  const {
    title = 'Benchmark Results',
    unit = 'op/ms',
    colors: colorMap = {},
    subtitle = '',
  } = opts

  const barH = 36
  const barGap = 12
  const labelW = 180
  const valueW = 70
  const margin = { top: subtitle ? 64 : 50, right: 30, bottom: 40, left: labelW + 10 }
  const chartH = data.length * (barH + barGap) - barGap
  const W = 700
  const H = margin.top + chartH + margin.bottom
  const plotW = W - margin.left - margin.right - valueW

  const fallbackColors = ['#5dade2', '#58d68d', '#bb8fce', '#f4d03f', '#48c9b0', '#85c1e9', '#a3d977']
  const color = (name, i) => colorMap[name] || fallbackColors[i % fallbackColors.length]

  const maxVal = Math.max(...data.map(d => Math.max(d.value, d.range ? d.range[1] : 0)))

  let svg = ''
  svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="system-ui,-apple-system,sans-serif" font-size="12">\n`
  svg += `<rect width="${W}" height="${H}" fill="#2b2d30" rx="8"/>\n`

  // Title
  svg += `<text x="${W / 2}" y="30" text-anchor="middle" font-size="15" font-weight="600" fill="#e0e0e0">${esc(title)}</text>\n`
  if (subtitle) {
    svg += `<text x="${W / 2}" y="48" text-anchor="middle" font-size="10" fill="#999">${esc(subtitle)}</text>\n`
  }

  // Bars
  for (let i = 0; i < data.length; i++) {
    const { name, value, range, invalid, note } = data[i]
    const c = invalid ? '#777' : color(name, i)
    const y = margin.top + i * (barH + barGap)
    const barW = Math.max(2, (value / maxVal) * plotW)
    const labelX = margin.left + Math.max(barW, range ? (range[1] / maxVal) * plotW : 0) + 8

    // Label
    svg += `<text x="${margin.left - 12}" y="${y + barH / 2 + 5}" text-anchor="end" fill="#bbb" font-size="13">${esc(name)}</text>\n`

    // Bar
    svg += `<rect x="${margin.left}" y="${y}" width="${barW.toFixed(1)}" height="${barH}" fill="${c}" rx="4" opacity="0.85"/>\n`

    // Spread whisker (min..max across rounds)
    if (range && range[1] > range[0]) {
      const x1 = margin.left + (range[0] / maxVal) * plotW
      const x2 = margin.left + (range[1] / maxVal) * plotW
      const ym = y + barH / 2
      svg += `<line x1="${x1.toFixed(1)}" y1="${ym}" x2="${x2.toFixed(1)}" y2="${ym}" stroke="#222" stroke-width="1.5"/>\n`
      svg += `<line x1="${x1.toFixed(1)}" y1="${ym - 5}" x2="${x1.toFixed(1)}" y2="${ym + 5}" stroke="#222" stroke-width="1.5"/>\n`
      svg += `<line x1="${x2.toFixed(1)}" y1="${ym - 5}" x2="${x2.toFixed(1)}" y2="${ym + 5}" stroke="#222" stroke-width="1.5"/>\n`
    }

    // Value label
    svg += `<text x="${labelX}" y="${y + barH / 2 + 5}" fill="#ccc" font-size="12" font-weight="600">${fmtK(value)} ${esc(unit)}</text>\n`

    if (note) {
      svg += `<text x="${labelX}" y="${y + barH / 2 + 18}" fill="${invalid ? '#e74c3c' : '#777'}" font-size="10">${esc(note)}</text>\n`
    }
  }

  svg += `</svg>\n`
  return svg
}

function fmtK(val) {
  if (val >= 1000) return (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1) + 'k'
  return String(Math.round(val))
}
