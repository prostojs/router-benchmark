/**
 * Analyze a V8 CPU profile and show top functions by self time.
 *
 * Usage: tsx ./src/analyze-profile.ts <path-to-cpuprofile>
 */
import { readFileSync } from 'node:fs'

interface CPUProfileNode {
  id: number
  callFrame: {
    functionName: string
    scriptId: string
    url: string
    lineNumber: number
    columnNumber: number
  }
  hitCount: number
  children?: number[]
}

interface CPUProfile {
  nodes: CPUProfileNode[]
  startTime: number
  endTime: number
  samples: number[]
  timeDeltas: number[]
}

const file = process.argv[2]
if (!file) {
  console.error('Usage: tsx analyze-profile.ts <path-to-cpuprofile>')
  process.exit(1)
}

const profile: CPUProfile = JSON.parse(readFileSync(file, 'utf-8'))

// Calculate self time for each node
const selfTimes = new Map<number, number>()
for (let i = 0; i < profile.samples.length; i++) {
  const nodeId = profile.samples[i]
  const delta = profile.timeDeltas[i]
  selfTimes.set(nodeId, (selfTimes.get(nodeId) || 0) + delta)
}

// Build node map
const nodeMap = new Map(profile.nodes.map((n) => [n.id, n]))

// Aggregate by function name + url
const funcTimes = new Map<string, { selfTime: number; hitCount: number; url: string; line: number }>()
for (const [nodeId, selfTime] of selfTimes) {
  const node = nodeMap.get(nodeId)
  if (!node) continue
  const { functionName, url, lineNumber } = node.callFrame
  const name = functionName || '(anonymous)'
  const key = `${name}@${url}:${lineNumber}`
  const existing = funcTimes.get(key)
  if (existing) {
    existing.selfTime += selfTime
    existing.hitCount += node.hitCount
  } else {
    funcTimes.set(key, { selfTime, hitCount: node.hitCount, url, line: lineNumber })
  }
}

// Sort by self time descending
const sorted = [...funcTimes.entries()].sort((a, b) => b[1].selfTime - a[1].selfTime)

const totalTime = profile.endTime - profile.startTime
console.log(`Total profile time: ${(totalTime / 1e6).toFixed(2)}s`)
console.log(`Total samples: ${profile.samples.length}`)
console.log()

// Show top 50 functions
console.log('Top 50 functions by self time:')
console.log('─'.repeat(120))
for (const [key, data] of sorted.slice(0, 50)) {
  const pct = ((data.selfTime / totalTime) * 100).toFixed(2)
  const ms = (data.selfTime / 1000).toFixed(1)
  const shortUrl = data.url.replace(/.*node_modules\//, 'node_modules/').replace(/.*packages\//, 'packages/')
  console.log(`${pct.padStart(6)}%  ${ms.padStart(8)}ms  ${key.split('@')[0].padEnd(40)} ${shortUrl}:${data.line}`)
}

// Also group by file
console.log()
console.log('Top 20 files by aggregate self time:')
console.log('─'.repeat(100))
const fileTimes = new Map<string, number>()
for (const [, data] of funcTimes) {
  const shortUrl = data.url.replace(/.*node_modules\//, 'node_modules/').replace(/.*packages\//, 'packages/')
  fileTimes.set(shortUrl, (fileTimes.get(shortUrl) || 0) + data.selfTime)
}
const sortedFiles = [...fileTimes.entries()].sort((a, b) => b[1] - a[1])
for (const [file, time] of sortedFiles.slice(0, 20)) {
  const pct = ((time / totalTime) * 100).toFixed(2)
  const ms = (time / 1000).toFixed(1)
  console.log(`${pct.padStart(6)}%  ${ms.padStart(8)}ms  ${file}`)
}
