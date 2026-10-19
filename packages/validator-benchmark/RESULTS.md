# Validator Benchmark Results

Throughput of validating the same `Order` model with an [atscript](https://atscript.dev) validator and equivalent [zod](https://zod.dev) schemas. See [README.md](README.md) for what is measured and how the two sides were made equivalent.

- zod **4.6.7**, @atscript/typescript **0.1.108**, @atscript/core **0.1.108**
- 1 round(s) × 10 samples of ~40 ms per job, 1000 ms warmup, one child process per job; total 2 min
- Pre-flight: 757 equivalence checks passed (every benchmark job, 53 edge cases × 3 modes × 4 engines, same-violation and first-error checks)
- Generated: 2026-10-19T11:49:13.856Z

Values are the **median ops/s** over all samples; the bracket is the p25–p75 range. "Relative" is versus the fastest engine in the same row group.

## Engines

| Engine | Call | Returns |
| --- | --- | --- |
| atscript validate() | `validator.validate(input, true)` | boolean (+ `validator.errors`); validates in place, no copy |
| zod safeParse() | `schema.safeParse(input)` | `{ success, data \| error }`; `data` is a new object |
| zod z.compile() + safeParse() | `z.compile(schema).safeParse(input)` | same as above, ahead-of-time compiled fast path |
| zod z.compile() + validate() [boolean only] | `z.compile(schema).validate(input)` | boolean only, no output object, no error details |

## Unknown props: strip

zod `z.object()` ↔ atscript `unknownProps: 'strip'`

![strip](results/strip-chart.svg)

| Scenario | Engine | ops/s (median) | p25–p75 | ns/op | Relative |
| --- | --- | ---: | ---: | ---: | ---: |
| valid-order | zod z.compile() + validate() [boolean only] | 3,892,838 | 3,428,153–3,912,001 | 257 | fastest |
|  | zod z.compile() + safeParse() | 3,573,528 | 3,100,617–3,641,671 | 280 | 1.09x slower |
|  | atscript validate() | 424,198 | 422,180–424,588 | 2,357 | 9.18x slower |
|  | zod safeParse() | 407,451 | 340,039–443,313 | 2,454 | 9.55x slower |
| valid-order-paypal | zod z.compile() + validate() [boolean only] | 4,103,998 | 3,638,009–4,169,746 | 244 | fastest |
|  | zod z.compile() + safeParse() | 3,771,497 | 3,246,109–3,798,119 | 265 | 1.09x slower |
|  | zod safeParse() | 441,396 | 339,632–448,230 | 2,266 | 9.30x slower |
|  | atscript validate() | 439,700 | 434,285–441,683 | 2,274 | 9.33x slower |
| large-order-50-items | zod z.compile() + validate() [boolean only] | 648,815 | 562,569–653,280 | 1,541 | fastest |
|  | zod z.compile() + safeParse() | 644,417 | 541,785–650,063 | 1,552 | 1.01x slower |
|  | atscript validate() | 70,053 | 69,959–70,254 | 14,275 | 9.26x slower |
|  | zod safeParse() | 49,721 | 45,095–50,482 | 20,112 | 13.05x slower |
| unknown-props-order | zod z.compile() + validate() [boolean only] | 3,019,502 | 2,782,291–3,131,685 | 331 | fastest |
|  | zod z.compile() + safeParse() | 2,991,214 | 2,601,237–3,024,529 | 334 | 1.01x slower |
|  | zod safeParse() | 453,789 | 362,357–456,394 | 2,204 | 6.65x slower |
|  | atscript validate() | 185,189 | 183,328–185,663 | 5,400 | 16.30x slower |
| invalid-order-all-errors | atscript validate() | 329,558 | 328,783–330,128 | 3,034 | fastest |
|  | zod safeParse() | 137,199 | 105,449–143,045 | 7,289 | 2.40x slower |
|  | zod z.compile() + safeParse() | 126,958 | 126,222–142,280 | 7,877 | 2.60x slower |
| invalid-order-first-error | zod z.compile() + validate() [boolean only] | 103,495,165 | 102,743,145–103,988,360 | 10 | fastest |
|  | atscript validate() | 5,024,695 | 5,017,581–5,048,848 | 199 | 20.60x slower |
| union-card | zod z.compile() + safeParse() | 23,647,607 | 23,489,776–23,779,065 | 42 | fastest |
|  | zod z.compile() + validate() [boolean only] | 23,400,732 | 23,320,811–23,479,061 | 43 | 1.01x slower |
|  | zod safeParse() | 8,862,742 | 8,826,298–8,900,386 | 113 | 2.67x slower |
|  | atscript validate() | 4,090,524 | 4,051,545–4,131,544 | 244 | 5.78x slower |
| union-paypal | zod z.compile() + validate() [boolean only] | 46,196,292 | 45,908,312–46,428,024 | 22 | fastest |
|  | zod z.compile() + safeParse() | 45,577,510 | 45,333,658–45,636,119 | 22 | 1.01x slower |
|  | atscript validate() | 6,081,490 | 6,068,052–6,112,155 | 164 | 7.60x slower |
|  | zod safeParse() | 5,828,489 | 5,341,166–5,869,188 | 172 | 7.93x slower |
| union-invalid | atscript validate() | 1,677,564 | 1,669,770–1,682,335 | 596 | fastest |
|  | zod z.compile() + safeParse() | 619,952 | 554,239–627,616 | 1,613 | 2.71x slower |
|  | zod safeParse() | 603,115 | 553,800–615,333 | 1,658 | 2.78x slower |

## Unknown props: passthrough

zod `z.looseObject()` ↔ atscript `unknownProps: 'ignore'`

![passthrough](results/passthrough-chart.svg)

| Scenario | Engine | ops/s (median) | p25–p75 | ns/op | Relative |
| --- | --- | ---: | ---: | ---: | ---: |
| valid-order | zod z.compile() + validate() [boolean only] | 2,404,060 | 2,180,068–2,434,241 | 416 | fastest |
|  | zod z.compile() + safeParse() | 1,901,033 | 1,612,865–1,905,545 | 526 | 1.26x slower |
|  | atscript validate() | 492,165 | 488,915–494,289 | 2,032 | 4.88x slower |
|  | zod safeParse() | 391,326 | 315,550–398,296 | 2,555 | 6.14x slower |
| valid-order-paypal | zod z.compile() + validate() [boolean only] | 2,563,222 | 2,273,590–2,573,113 | 390 | fastest |
|  | zod z.compile() + safeParse() | 2,009,723 | 1,719,811–2,024,469 | 498 | 1.28x slower |
|  | atscript validate() | 519,659 | 517,005–521,194 | 1,924 | 4.93x slower |
|  | zod safeParse() | 374,691 | 362,915–374,894 | 2,669 | 6.84x slower |
| large-order-50-items | zod z.compile() + validate() [boolean only] | 248,460 | 221,391–250,678 | 4,025 | fastest |
|  | zod z.compile() + safeParse() | 243,014 | 209,177–246,344 | 4,115 | 1.02x slower |
|  | atscript validate() | 94,589 | 94,250–94,812 | 10,572 | 2.63x slower |
|  | zod safeParse() | 38,592 | 37,602–42,451 | 25,912 | 6.44x slower |
| unknown-props-order | zod z.compile() + validate() [boolean only] | 2,015,004 | 1,842,549–2,043,541 | 496 | fastest |
|  | zod z.compile() + safeParse() | 1,680,538 | 1,475,504–1,705,217 | 595 | 1.20x slower |
|  | atscript validate() | 492,587 | 487,635–493,972 | 2,030 | 4.09x slower |
|  | zod safeParse() | 360,049 | 295,590–365,296 | 2,777 | 5.60x slower |
| invalid-order-all-errors | atscript validate() | 359,055 | 355,348–362,394 | 2,785 | fastest |
|  | zod z.compile() + safeParse() | 128,088 | 103,207–134,624 | 7,807 | 2.80x slower |
|  | zod safeParse() | 119,887 | 95,525–125,330 | 8,341 | 2.99x slower |
| invalid-order-first-error | zod z.compile() + validate() [boolean only] | 102,534,184 | 102,066,347–102,758,270 | 10 | fastest |
|  | atscript validate() | 4,996,240 | 4,977,193–5,005,499 | 200 | 20.52x slower |
| union-card | zod z.compile() + safeParse() | 16,973,368 | 16,915,424–17,005,886 | 59 | fastest |
|  | zod z.compile() + validate() [boolean only] | 16,749,036 | 16,722,405–16,813,059 | 60 | 1.01x slower |
|  | zod safeParse() | 7,446,269 | 7,413,133–7,473,788 | 134 | 2.28x slower |
|  | atscript validate() | 4,618,693 | 4,609,100–4,628,343 | 217 | 3.67x slower |
| union-paypal | zod z.compile() + safeParse() | 36,979,173 | 36,004,846–37,140,485 | 27 | fastest |
|  | zod z.compile() + validate() [boolean only] | 36,531,684 | 36,213,151–36,726,881 | 27 | 1.01x slower |
|  | atscript validate() | 6,571,661 | 6,555,564–6,591,492 | 152 | 5.63x slower |
|  | zod safeParse() | 4,937,220 | 4,700,165–5,012,987 | 203 | 7.49x slower |
| union-invalid | atscript validate() | 1,686,832 | 1,659,116–1,706,014 | 593 | fastest |
|  | zod safeParse() | 591,681 | 536,012–596,234 | 1,690 | 2.85x slower |
|  | zod z.compile() + safeParse() | 589,647 | 523,418–601,348 | 1,696 | 2.86x slower |

## Unknown props: strict

zod `z.strictObject()` ↔ atscript `unknownProps: 'error'`

![strict](results/strict-chart.svg)

| Scenario | Engine | ops/s (median) | p25–p75 | ns/op | Relative |
| --- | --- | ---: | ---: | ---: | ---: |
| valid-order | zod z.compile() + validate() [boolean only] | 2,879,785 | 2,600,095–2,940,627 | 347 | fastest |
|  | zod z.compile() + safeParse() | 2,786,019 | 2,398,638–2,808,580 | 359 | 1.03x slower |
|  | atscript validate() | 423,495 | 422,626–425,733 | 2,361 | 6.80x slower |
|  | zod safeParse() | 390,339 | 310,396–398,893 | 2,562 | 7.38x slower |
| valid-order-paypal | zod z.compile() + validate() [boolean only] | 3,086,417 | 2,750,432–3,100,807 | 324 | fastest |
|  | zod z.compile() + safeParse() | 2,928,421 | 2,562,510–2,950,554 | 341 | 1.05x slower |
|  | atscript validate() | 430,386 | 429,456–436,380 | 2,323 | 7.17x slower |
|  | zod safeParse() | 381,724 | 372,752–383,902 | 2,620 | 8.09x slower |
| large-order-50-items | zod z.compile() + validate() [boolean only] | 407,840 | 356,988–411,414 | 2,452 | fastest |
|  | zod z.compile() + safeParse() | 405,059 | 346,912–410,339 | 2,469 | 1.01x slower |
|  | atscript validate() | 71,408 | 71,227–71,694 | 14,004 | 5.71x slower |
|  | zod safeParse() | 43,441 | 39,659–44,763 | 23,020 | 9.39x slower |
| unknown-props-order | atscript validate() | 184,309 | 182,639–186,088 | 5,426 | fastest |
|  | zod safeParse() | 174,389 | 160,883–178,015 | 5,734 | 1.06x slower |
|  | zod z.compile() + safeParse() | 173,596 | 163,914–176,879 | 5,760 | 1.06x slower |
| invalid-order-all-errors | atscript validate() | 313,968 | 313,796–316,942 | 3,185 | fastest |
|  | zod safeParse() | 137,632 | 105,292–140,631 | 7,266 | 2.28x slower |
|  | zod z.compile() + safeParse() | 133,571 | 113,127–140,342 | 7,487 | 2.35x slower |
| invalid-order-first-error | zod z.compile() + validate() [boolean only] | 102,660,065 | 102,223,691–103,136,481 | 10 | fastest |
|  | atscript validate() | 5,158,798 | 5,153,063–5,170,688 | 194 | 19.90x slower |
| union-card | zod z.compile() + validate() [boolean only] | 21,172,021 | 21,135,143–21,256,141 | 47 | fastest |
|  | zod z.compile() + safeParse() | 20,862,539 | 20,285,536–21,352,790 | 48 | 1.01x slower |
|  | zod safeParse() | 7,390,963 | 7,382,470–7,396,200 | 135 | 2.86x slower |
|  | atscript validate() | 4,187,659 | 4,183,104–4,201,234 | 239 | 5.06x slower |
| union-paypal | zod z.compile() + safeParse() | 39,507,516 | 39,190,955–39,879,197 | 25 | fastest |
|  | zod z.compile() + validate() [boolean only] | 38,252,028 | 37,696,417–38,691,610 | 26 | 1.03x slower |
|  | atscript validate() | 6,161,034 | 6,102,297–6,189,078 | 162 | 6.41x slower |
|  | zod safeParse() | 5,009,712 | 4,716,103–5,046,891 | 200 | 7.89x slower |
| union-invalid | atscript validate() | 1,533,736 | 1,520,917–1,545,642 | 652 | fastest |
|  | zod safeParse() | 470,843 | 412,962–476,046 | 2,124 | 3.26x slower |
|  | zod z.compile() + safeParse() | 461,419 | 416,384–466,787 | 2,167 | 3.32x slower |

## Notes

- Invalid-input scenarios: both libraries run with their default error reporting, and the pre-flight confirmed they catch the same violations (same paths, and the failed `payment` union on both sides). Raw counts for the invalid order: atscript 15 errors, zod 18 issues. The two libraries report a failed union differently: atscript as one error with per-branch details, zod as the closest branch's individual issues.
- `invalid-order-first-error`: atscript with `errorLimit: 1` (still returns that one error with path + message) vs zod `validate()` (boolean, aborts early, no error details). zod has no public stop-at-first-error option for `safeParse`, so the safeParse engines do not run this scenario.
- `zod z.compile() + validate()` only runs where a boolean answer is comparable: valid inputs and the first-error scenario.
- `unknown-props-order` gets a freshly built input for every call (built outside the timed region) because atscript `strip` deletes unknown keys from the input in place; all engines use the same fresh inputs in all modes.

## Environment

|  |  |
| --- | --- |
| Date | 2026-10-19T11:49:13.856Z |
| Node.js | v24.22.0 (V8 13.6.233.17-node.57) |
| OS | Darwin 27.0.0 (darwin arm64) |
| CPU | Apple M4 (10 logical cores) |
| Memory | 24 GB |

### Settings

| Setting | Value |
| --- | --- |
| Rounds | 1 (forward, reversed, then seeded shuffle; fresh process per job × round) |
| Warmup | 1000 ms per job (time-based; also calibrates batch size) |
| Samples | 10 per job per round, ~40 ms each (process.hrtime.bigint) |
| Reported value | median ops/s over all pooled samples; p25–p75 range |
| Node flags | --expose-gc (untimed gc() before every sample) |

### Package versions

| Package | Version |
| --- | --- |
| zod | 4.6.7 |
| @atscript/typescript | 0.1.108 |
| @atscript/core | 0.1.108 |

