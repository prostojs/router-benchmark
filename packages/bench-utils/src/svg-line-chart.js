/**
 * Generate an SVG line chart.
 *
 * @param {Record<string, Record<number, number>>} results  seriesName -> { xValue -> yValue }
 * @param {number[]} xValues  sorted array of x-axis values
 * @param {object} [opts]
 * @param {string} [opts.title]
 * @param {string} [opts.xLabel]
 * @param {string} [opts.yLabel]
 * @param {Record<string,string>} [opts.colors]  seriesName -> hex color
 * @param {Record<string,{continuesFrom:string}>} [opts.series]  per-series config
 * @returns {string} SVG markup
 */
export function generateLineChart(results, xValues, opts = {}) {
  const {
    title = 'Performance',
    xLabel = '',
    yLabel = 'op/ms',
    colors: colorMap = {},
    series: seriesConfig = {},
  } = opts

  // Build set of series that are continuations (drawn dashed, connected to parent)
  const continuationOf = {}   // childName -> parentName
  const continuedBy = {}      // parentName -> childName
  for (const [name, cfg] of Object.entries(seriesConfig)) {
    if (cfg.continuesFrom) {
      continuationOf[name] = cfg.continuesFrom
      continuedBy[cfg.continuesFrom] = name
    }
  }

  const W = 800, H = 480
  const margin = { top: 44, right: 180, bottom: 60, left: 80 }
  const plotW = W - margin.left - margin.right
  const plotH = H - margin.top - margin.bottom

  const names = Object.keys(results)
  const fallbackColors = ['#e74c3c', '#5dade2', '#58d68d', '#f4d03f', '#bb8fce', '#48c9b0', '#eb984e']
  const color = (name, i) => colorMap[name] || fallbackColors[i % fallbackColors.length]

  // Data range
  const allVals = names.flatMap(n => xValues.map(c => results[n]?.[c] ?? 0))
  const maxVal = Math.max(...allVals)
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

  // Pre-compute points for each series (needed for continuation links)
  const seriesPoints = {}
  const seriesValidX = {}
  for (const name of names) {
    const data = results[name]
    const validX = xValues.filter(x => data[x] != null)
    seriesValidX[name] = validX
    seriesPoints[name] = validX.map(x => [xScale(x), yScale(data[x])])
  }

  // Lines + points
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const c = color(name, i)
    const data = results[name]
    const validX = seriesValidX[name]
    const points = seriesPoints[name]
    const isContinuation = !!continuationOf[name]
    const hasContinuation = !!continuedBy[name]

    if (points.length === 0) continue

    // If this is a continuation series, draw dashed connector from parent's last point
    if (isContinuation) {
      const parentName = continuationOf[name]
      const parentPoints = seriesPoints[parentName]
      if (parentPoints && parentPoints.length > 0) {
        const parentLast = parentPoints[parentPoints.length - 1]
        const myFirst = points[0]
        svg += `<line x1="${parentLast[0].toFixed(1)}" y1="${parentLast[1].toFixed(1)}" x2="${myFirst[0].toFixed(1)}" y2="${myFirst[1].toFixed(1)}" stroke="${c}" stroke-width="2" stroke-dasharray="6,4" opacity="0.6"/>\n`
      }
    }

    // Draw line through data points (dashed for continuation series, solid otherwise)
    if (points.length >= 2) {
      const pathD = points.map((p, j) => `${j === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
      if (isContinuation) {
        svg += `<path d="${pathD}" fill="none" stroke="${c}" stroke-width="2.5" stroke-dasharray="6,4" stroke-linejoin="round" stroke-linecap="round"/>\n`
      } else {
        svg += `<path d="${pathD}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>\n`
      }
    } else if (points.length === 1 && isContinuation) {
      // Single-point continuation — line already drawn from parent
    }

    // If the series ends early and is NOT part of a continuation chain, draw dashed drop-off + "N/A"
    if (validX.length < xValues.length && points.length > 0 && !hasContinuation && !isContinuation) {
      const lastPt = points[points.length - 1]
      const nextMissingX = xValues[validX.length]
      const dropX = xScale(nextMissingX)
      svg += `<line x1="${lastPt[0].toFixed(1)}" y1="${lastPt[1].toFixed(1)}" x2="${dropX.toFixed(1)}" y2="${(margin.top + plotH).toFixed(1)}" stroke="${c}" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.5"/>\n`
      svg += `<text x="${dropX.toFixed(1)}" y="${margin.top + plotH - 6}" text-anchor="middle" fill="${c}" font-size="9" opacity="0.7">N/A</text>\n`
    }

    const vals = validX.map(x => data[x])
    for (let j = 0; j < points.length; j++) {
      const [px, py] = points[j]
      svg += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="${c}" stroke="#2b2d30" stroke-width="1.5"/>\n`
      const labelY = py > margin.top + 14 ? py - 10 : py + 18
      svg += `<text x="${px.toFixed(1)}" y="${labelY}" text-anchor="middle" fill="${c}" font-size="10" font-weight="600">${fmtK(vals[j])}</text>\n`
    }
  }

  // Legend
  const legendX = margin.left + plotW + 16
  let legendY = margin.top + 10
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const isContinuation = !!continuationOf[name]

    // Skip continuation series in main legend — they'll be shown with their parent
    if (isContinuation) continue

    const c = color(name, i)
    const data = results[name]
    const validCount = xValues.filter(x => data[x] != null).length
    const hasCont = !!continuedBy[name]
    const partial = validCount < xValues.length && !hasCont

    // Solid line + dot for the main series
    svg += `<line x1="${legendX}" y1="${legendY + 6}" x2="${legendX + 20}" y2="${legendY + 6}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"${partial ? ' stroke-dasharray="4,4" opacity="0.7"' : ''}/>\n`
    svg += `<circle cx="${legendX + 10}" cy="${legendY + 6}" r="3.5" fill="${c}" stroke="#2b2d30" stroke-width="1"/>\n`
    const label = partial ? `${name} *` : name
    svg += `<text x="${legendX + 28}" y="${legendY + 10}" fill="#ccc" font-size="12">${esc(label)}</text>\n`
    legendY += 24

    // If this series has a continuation, add a sub-entry with dashed line
    if (hasCont) {
      const contName = continuedBy[name]
      const contIdx = names.indexOf(contName)
      const contColor = color(contName, contIdx)
      svg += `<line x1="${legendX}" y1="${legendY + 6}" x2="${legendX + 20}" y2="${legendY + 6}" stroke="${contColor}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="6,4"/>\n`
      svg += `<circle cx="${legendX + 10}" cy="${legendY + 6}" r="3.5" fill="${contColor}" stroke="#2b2d30" stroke-width="1"/>\n`
      svg += `<text x="${legendX + 28}" y="${legendY + 10}" fill="#ccc" font-size="12">${esc(contName)}</text>\n`
      legendY += 24
    }
  }
  // Footnote for partial series (excluding those with continuations)
  const hasPartial = names.some(n => {
    if (continuationOf[n] || continuedBy[n]) return false
    return xValues.filter(x => results[n]?.[x] != null).length < xValues.length
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
