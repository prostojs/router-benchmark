/**
 * Markdown table.
 * @param {string[]} header
 * @param {Array<Array<string | number>>} rows
 * @param {string} [align]  one char per column: 'l' (default) or 'r'
 */
export function mdTable(header, rows, align = '') {
  const sep = header.map((_, i) => (align[i] === 'r' ? '---:' : '---'))
  return [header, sep, ...rows].map((r) => `| ${r.join(' | ')} |`).join('\n') + '\n'
}
