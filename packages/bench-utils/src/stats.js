/** Basic descriptive statistics over a list of numbers. */
export function describe(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  const n = v.length
  if (n === 0) return { n: 0, median: null, mean: null, stddev: null, cv: null, min: null, max: null }
  const mean = v.reduce((a, b) => a + b, 0) / n
  const variance = n > 1 ? v.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0
  const stddev = Math.sqrt(variance)
  const median = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2
  return {
    n,
    median,
    mean,
    stddev,
    cv: mean ? stddev / mean : 0,
    min: v[0],
    max: v[n - 1],
  }
}

/**
 * Weighted harmonic mean of throughputs.
 *
 * For a traffic mix where a fraction w_i of requests goes to a test with
 * throughput r_i, the time per request is sum(w_i / r_i) / sum(w_i), so the
 * mix throughput is sum(w_i) / sum(w_i / r_i). An arithmetic mean of rates
 * would overweight the fast (cheap) requests.
 */
export function weightedHarmonicMean(items) {
  let wSum = 0
  let tSum = 0
  for (const { value, weight } of items) {
    if (!(value > 0)) return null
    wSum += weight
    tSum += weight / value
  }
  return wSum > 0 ? wSum / tSum : null
}

export function weightedArithmeticMean(items) {
  let wSum = 0
  let vSum = 0
  for (const { value, weight } of items) {
    if (!Number.isFinite(value)) return null
    wSum += weight
    vSum += weight * value
  }
  return wSum > 0 ? vSum / wSum : null
}

/** Rotate an array by `k` positions (used to vary execution order between rounds). */
export function rotate(arr, k) {
  const n = arr.length
  if (!n) return arr.slice()
  const s = ((k % n) + n) % n
  return arr.slice(s).concat(arr.slice(0, s))
}

export function fmtInt(n) {
  return n == null ? '-' : Math.round(n).toLocaleString('en-US')
}

export function fmtPct(x, digits = 1) {
  return x == null ? '-' : `${(x * 100).toFixed(digits)}%`
}

/**
 * Sort summary rows (valid first, then by `value` descending) and give each one its
 * `relative` label: 'fastest', 'N.NNx slower' or 'INVALID'. Computed once per row and
 * reused by every table and chart.
 *
 * @template {{ value: number | null, valid?: boolean }} T
 * @param {T[]} rows
 * @returns {Array<T & { relative: string }>}
 */
export function rankRelative(rows) {
  const isValid = (r) => r.valid !== false
  rows.sort((a, b) => (isValid(b) - isValid(a)) || ((b.value ?? 0) - (a.value ?? 0)))
  const best = rows.find(isValid)
  for (const r of rows) {
    r.relative = !isValid(r) ? 'INVALID' : r === best ? 'fastest' : `${(best.value / r.value).toFixed(2)}x slower`
  }
  return rows
}
