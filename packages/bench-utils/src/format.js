/** Escapes text for SVG/XML content. */
export function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Compact number: 1.23M / 12.3M, 1.2k / 123k, or a plain integer below 1000. */
export function fmtCompact(v) {
  if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 1 : 2) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(v >= 1e5 ? 0 : 1) + 'k'
  return String(Math.round(v))
}
