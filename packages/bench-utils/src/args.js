/**
 * Minimal CLI tokenizer shared by the benchmark runners.
 * Accepts `--flag value`, `--flag=value`, boolean `--flag` (names listed in `booleans`)
 * and positional arguments; a bare `--` is ignored.
 *
 * @returns {{ flags: Record<string, string | true>, positional: string[] }}
 */
export function parseFlags(argv, booleans = []) {
  const flags = {}
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--') continue
    if (a.startsWith('--')) {
      const [k, inline] = a.slice(2).split('=')
      flags[k] = booleans.includes(k) ? true : inline ?? argv[++i]
    } else positional.push(a)
  }
  return { flags, positional }
}

/** `--only a,b` → ['a', 'b'] (or null when absent). */
export function parseOnly(flags) {
  return flags.only ? String(flags.only).split(',') : null
}
