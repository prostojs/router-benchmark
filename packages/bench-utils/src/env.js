import os from 'node:os'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/**
 * Find `<name>/package.json` the way Node resolves packages: walk up from
 * `fromDir` looking into each `node_modules`. Works with pnpm's layout.
 */
function findPackageJson(fromDir, name) {
  let dir = resolve(fromDir)
  for (;;) {
    const candidate = join(dir, 'node_modules', name, 'package.json')
    if (existsSync(candidate)) return realpathSync(candidate)
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * Resolve installed versions.
 *
 * @param {string} pkgDir  benchmark package root
 * @param {Array<string | [string, string]>} names  package name, or [parent, child] to read the
 *   version of `child` as resolved from `parent` (e.g. the express copy NestJS uses)
 */
export function resolveVersions(pkgDir, names) {
  const out = {}
  for (const entry of names) {
    if (Array.isArray(entry)) {
      const [parent, child] = entry
      const parentPj = findPackageJson(pkgDir, parent)
      const childPj = parentPj && findPackageJson(dirname(parentPj), child)
      out[`${child} (via ${parent})`] = childPj ? JSON.parse(readFileSync(childPj, 'utf8')).version : 'not installed'
    } else {
      const pj = findPackageJson(pkgDir, entry)
      out[entry] = pj ? JSON.parse(readFileSync(pj, 'utf8')).version : 'not installed'
    }
  }
  return out
}

/** Machine / runtime description recorded with every result file. */
export function collectEnvironment() {
  const cpus = os.cpus()
  return {
    date: new Date().toISOString(),
    node: process.version,
    v8: process.versions.v8,
    os: `${os.type()} ${os.release()} (${os.platform()} ${os.arch()})`,
    cpu: cpus[0]?.model?.trim() ?? 'unknown',
    cpuCount: cpus.length,
    memoryGB: Math.round(os.totalmem() / 1024 ** 3),
    nodeEnv: process.env.NODE_ENV ?? '',
  }
}

/** Markdown block describing environment + versions + settings. */
export function environmentMarkdown(env, versions, settings) {
  let md = `## Environment\n\n`
  md += `| | |\n|---|---|\n`
  md += `| Date | ${env.date} |\n`
  md += `| Node.js | ${env.node} (V8 ${env.v8}) |\n`
  md += `| OS | ${env.os} |\n`
  md += `| CPU | ${env.cpu} (${env.cpuCount} logical cores) |\n`
  md += `| Memory | ${env.memoryGB} GB |\n`
  md += `\n### Settings\n\n| Setting | Value |\n|---|---|\n`
  for (const [k, v] of Object.entries(settings)) md += `| ${k} | ${v} |\n`
  md += `\n### Package versions\n\n| Package | Version |\n|---|---|\n`
  for (const [k, v] of Object.entries(versions)) md += `| ${k} | ${v} |\n`
  return md + '\n'
}
