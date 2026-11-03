# atscript-baseline

The baseline engine of the [validator benchmark](../validator-benchmark/README.md): atscript
**0.1.109**, the last release before compiled validators, validating the same `Order` model as
the other atscript engines.

- `package.json` pins `@atscript/core` and `@atscript/typescript` to 0.1.109. It is a separate
  workspace package because the validator benchmark itself depends on the current atscript, and
  one package cannot depend on two versions of the same package.
- `pnpm compile` runs [`compile.mjs`](compile.mjs), which builds
  `../validator-benchmark/src/model/order.as` into `model/order.as.js` (git-ignored) with
  0.1.109's programmatic API: `build()` from `@atscript/core` and 0.1.109's `tsPlugin()`. The
  `asc` CLI is not used: in 0.1.109 it runs on moost 0.6 / wooks 0.7, which cannot load next to
  the wooks 0.8 in this workspace. The build and the validator do not need those packages.
- [`index.js`](index.js) exports 0.1.109's `Validator` and the built model (`model`). The
  benchmark's `atscript-baseline` engine imports only this package, and runs it with the same
  runner, options and call as the current atscript engines.

The validator benchmark's `compile` script runs this package's `compile`, so `pnpm start`,
`pnpm quick` and `pnpm preflight` there build the baseline model too.
