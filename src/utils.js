export const operations = 100000

export function now () {
  var ts = process.hrtime()
  return (ts[0] * 1e3) + (ts[1] / 1e6)
}

export function getOpsSec (ms) {
  return Number(((operations * 1000) / ms).toFixed())
}

