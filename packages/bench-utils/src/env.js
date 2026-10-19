import os from 'node:os'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { mdTable } from './md-table.js'

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

function versionOf(pj) {
  return pj ? JSON.parse(readFileSync(pj, 'utf8')).version : 'not installed'
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
      out[`${child} (via ${parent})`] = versionOf(parentPj && findPackageJson(dirname(parentPj), child))
    } else {
      out[entry] = versionOf(findPackageJson(pkgDir, entry))
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
  return `## Environment\n\n` + mdTable(['', ''], [
    ['Date', env.date],
    ['Node.js', `${env.node} (V8 ${env.v8})`],
    ['OS', env.os],
    ['CPU', `${env.cpu} (${env.cpuCount} logical cores)`],
    ['Memory', `${env.memoryGB} GB`],
  ]) +
    `\n### Settings\n\n` + mdTable(['Setting', 'Value'], Object.entries(settings)) +
    `\n### Package versions\n\n` + mdTable(['Package', 'Version'], Object.entries(versions)) + '\n'
}
