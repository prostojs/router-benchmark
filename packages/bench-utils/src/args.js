/**
 * Minimal CLI tokenizer: `--flag value`, `--flag=value`, boolean `--flag` (names listed
 * in `booleans`); a bare `--` is ignored. Positional arguments are rejected.
 *
 * @returns {Record<string, string | true>}
 */
function parseFlags(argv, booleans) {
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--') continue
    if (!a.startsWith('--')) throw new Error(`Unexpected argument "${a}" (options are --name value)`)
    const [k, inline] = a.slice(2).split('=')
    if (booleans.includes(k)) { flags[k] = true; continue }
    const value = inline ?? argv[++i]
    if (value == null || value === '' || value.startsWith('--')) throw new Error(`Option --${k} requires a value`)
    flags[k] = value
  }
  return flags
}

/**
 * One option parser for every runner. Numeric options resolve as
 * `--flag` → `BENCH_*` env var → default (the `quick` value under `--quick`).
 *
 * @param {string[]} argv
 * @param {object} spec
 * @param {Record<string, { flag?: string, env: string, default: number, quick?: number, min: number, int?: boolean, allowZero?: boolean }>} spec.numbers
 *   per option: `min` is the smallest accepted value (smaller positive values are raised to it),
 *   `allowZero` additionally accepts 0 (e.g. "no warmup"), `int` rounds the value
 * @param {string[]} [spec.booleans]  extra boolean flags (`quick` is always accepted)
 * @returns {Record<string, number | boolean> & { quick: boolean, only: string[] | null, scratch: boolean }}
 *   `scratch` = smoke or partial run: its results must not overwrite the published ones
 */
export function parseBenchOptions(argv, spec) {
  const booleans = ['quick', ...(spec.booleans ?? [])]
  const flags = parseFlags(argv, booleans)
  const known = new Set([...booleans, 'only', ...Object.entries(spec.numbers).map(([k, o]) => o.flag ?? k)])
  for (const k of Object.keys(flags)) if (!known.has(k)) throw new Error(`Unknown option --${k}`)

  const opts = {}
  for (const b of booleans) opts[b] = !!flags[b]
  for (const [key, o] of Object.entries(spec.numbers)) {
    const flag = o.flag ?? key
    const raw = flags[flag] ?? process.env[o.env]
    if (raw == null || raw === '') {
      opts[key] = opts.quick && o.quick != null ? o.quick : o.default
      continue
    }
    let n = Number(raw)
    if (o.int) n = Math.round(n)
    if (!Number.isFinite(n) || n < 0 || (n === 0 && !o.allowZero)) {
      throw new Error(`Invalid --${flag} / ${o.env}: "${raw}" (must be ${o.allowZero ? '0 or ' : ''}>= ${o.min})`)
    }
    opts[key] = n === 0 ? 0 : Math.max(o.min, n)
  }
  opts.only = flags.only ? String(flags.only).split(',') : null
  opts.scratch = opts.quick || !!opts.only
  return opts
}

const QUICK_NOTE = 'smoke test only — numbers are NOT meaningful'

/**
 * Everything a report says about `--quick`, in one place: the markdown banner, the
 * settings-table row and the suffix of the console estimate line.
 * @returns {{ md: string, settings: Record<string, string>, consoleSuffix: string }}
 */
export function quickNotes(opts) {
  return opts.quick
    ? { md: `> **QUICK MODE — ${QUICK_NOTE}.**\n\n`, settings: { 'QUICK MODE': QUICK_NOTE }, consoleSuffix: `  [QUICK MODE — ${QUICK_NOTE}]` }
    : { md: '', settings: {}, consoleSuffix: '' }
}
