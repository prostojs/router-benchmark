export const operations = 200000

export function now () {
  const ts = process.hrtime()
  return (ts[0] * 1e3) + (ts[1] / 1e6)
}

export function getOpsMs (ms) {
  return Number((operations / ms).toFixed())
}

