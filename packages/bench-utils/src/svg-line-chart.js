/**
 * Generate an SVG line chart.
 *
 * @param {Array<{ name: string, points: Record<number, { value: number, label?: string }> }>} series
 *   one line per series; a point's optional `label` (e.g. the implementation a router picked)
 *   is printed under the point wherever it differs from the previous point's label
 * @param {number[]} xValues  sorted array of x-axis values
 * @param {object} [opts]
 * @param {string} [opts.title]
 * @param {string} [opts.xLabel]
 * @param {string} [opts.yLabel]
 * @param {Record<string,string>} [opts.colors]  series name -> hex color
 * @returns {string} SVG markup
 */
export function generateLineChart(series, xValues, opts = {}) {
  const {
    title = 'Performance',
    xLabel = '',
    yLabel = 'op/ms',
    colors: colorMap = {},
  } = opts

  const W = 800, H = 480
  const margin = { top: 44, right: 180, bottom: 60, left: 80 }
  const plotW = W - margin.left - margin.right
  const plotH = H - margin.top - margin.bottom

  const fallbackColors = ['#e74c3c', '#5dade2', '#58d68d', '#f4d03f', '#bb8fce', '#48c9b0', '#eb984e']
  const color = (name, i) => colorMap[name] || fallbackColors[i % fallbackColors.length]

  // Data range
  const maxVal = Math.max(...series.flatMap((s) => Object.values(s.points).map((p) => p.value)))
  const step = niceStep(maxVal, 6)
  const yMax = Math.ceil(maxVal / step) * step

  // Scales
  const xScale = (v) => margin.left + ((v - xValues[0]) / (xValues[xValues.length - 1] - xValues[0])) * plotW
  const yScale = (v) => margin.top + plotH - (v / yMax) * plotH

  let svg = ''
  svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="system-ui,-apple-system,sans-serif" font-size="12">\n`
  svg += `<rect width="${W}" height="${H}" fill="#2b2d30" rx="8"/>\n`

  // Title
  svg += `<text x="${W / 2}" y="28" text-anchor="middle" font-size="15" font-weight="600" fill="#e0e0e0">${esc(title)}</text>\n`

  // Grid + Y labels
  const yTicks = niceYTicks(yMax, 6)
  for (const tick of yTicks) {
    const y = yScale(tick)
    svg += `<line x1="${margin.left}" y1="${y}" x2="${margin.left + plotW}" y2="${y}" stroke="#404040" stroke-width="1"/>\n`
    svg += `<text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" fill="#999" font-size="11">${fmtK(tick)}</text>\n`
  }

  // X grid + labels
  for (const v of xValues) {
    const x = xScale(v)
    svg += `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + plotH}" stroke="#363636" stroke-width="1"/>\n`
    svg += `<text x="${x}" y="${margin.top + plotH + 20}" text-anchor="middle" fill="#999">${v}</text>\n`
  }

  // Axis labels
  if (xLabel) svg += `<text x="${margin.left + plotW / 2}" y="${H - 10}" text-anchor="middle" fill="#888" font-size="13">${esc(xLabel)}</text>\n`
  if (yLabel) svg += `<text x="16" y="${margin.top + plotH / 2}" text-anchor="middle" fill="#888" font-size="13" transform="rotate(-90,16,${margin.top + plotH / 2})">${esc(yLabel)}</text>\n`

  // Axis lines
  svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}" stroke="#555" stroke-width="1.5"/>\n`
  svg += `<line x1="${margin.left}" y1="${margin.top + plotH}" x2="${margin.left + plotW}" y2="${margin.top + plotH}" stroke="#555" stroke-width="1.5"/>\n`

  // Lines + points
  let hasPartial = false
  series.forEach(({ name, points: data }, i) => {
    const c = color(name, i)
    const validX = xValues.filter((x) => data[x] != null)
    const points = validX.map((x) => [xScale(x), yScale(data[x].value)])
    if (points.length === 0) return

    if (points.length >= 2) {
      const pathD = points.map((p, j) => `${j === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
      svg += `<path d="${pathD}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>\n`
    }

    // Series ends early (unsupported route patterns): dashed drop-off + "N/A"
    if (validX.length < xValues.length) {
      hasPartial = true
      const lastPt = points[points.length - 1]
      const dropX = xScale(xValues[validX.length])
      svg += `<line x1="${lastPt[0].toFixed(1)}" y1="${lastPt[1].toFixed(1)}" x2="${dropX.toFixed(1)}" y2="${(margin.top + plotH).toFixed(1)}" stroke="${c}" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.5"/>\n`
      svg += `<text x="${dropX.toFixed(1)}" y="${margin.top + plotH - 6}" text-anchor="middle" fill="${c}" font-size="9" opacity="0.7">N/A</text>\n`
    }

    let prevLabel
    points.forEach(([px, py], j) => {
      const { value, label } = data[validX[j]]
      svg += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="${c}" stroke="#2b2d30" stroke-width="1.5"/>\n`
      const labelY = py > margin.top + 14 ? py - 10 : py + 18
      svg += `<text x="${px.toFixed(1)}" y="${labelY}" text-anchor="middle" fill="${c}" font-size="10" font-weight="600">${fmtK(value)}</text>\n`
      if (label && label !== prevLabel) {
        // under the point, below the value label when that one is also drawn underneath
        svg += `<text x="${px.toFixed(1)}" y="${(py + (labelY > py ? 30 : 18)).toFixed(1)}" text-anchor="middle" fill="${c}" font-size="9" opacity="0.8">${esc(label)}</text>\n`
      }
      prevLabel = label
    })
  })

  // Legend
  const legendX = margin.left + plotW + 16
  let legendY = margin.top + 10
  series.forEach(({ name, points: data }, i) => {
    const c = color(name, i)
    const partial = xValues.some((x) => data[x] == null)
    svg += `<line x1="${legendX}" y1="${legendY + 6}" x2="${legendX + 20}" y2="${legendY + 6}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"${partial ? ' stroke-dasharray="4,4" opacity="0.7"' : ''}/>\n`
    svg += `<circle cx="${legendX + 10}" cy="${legendY + 6}" r="3.5" fill="${c}" stroke="#2b2d30" stroke-width="1"/>\n`
    svg += `<text x="${legendX + 28}" y="${legendY + 10}" fill="#ccc" font-size="12">${esc(partial ? `${name} *` : name)}</text>\n`
    legendY += 24
  })
  if (hasPartial) {
    svg += `<text x="${legendX}" y="${legendY + 10}" fill="#888" font-size="10">* unsupported route patterns</text>\n`
  }

  svg += `</svg>\n`
  return svg
}

function niceStep(range, targetTicks) {
  const rawStep = range / targetTicks
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const norm = rawStep / mag
  if (norm <= 1.5) return mag
  if (norm <= 3) return 2 * mag
  if (norm <= 7) return 5 * mag
  return 10 * mag
}

function niceYTicks(max, count) {
  const step = niceStep(max, count)
  const ticks = []
  for (let v = 0; v <= max; v += step) ticks.push(v)
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step)
  return ticks
}

function fmtK(val) {
  if (val >= 1000) return (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1) + 'k'
  return String(val)
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
