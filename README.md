# tstst

**The TypeScript compiler, running inside TypeScript's type system.**

tstst compiles tsgo — the Go port of the TypeScript compiler
(`microsoft/TypeScript`'s `tsc/` directory) — to *type-level* TypeScript:
programs made only of type aliases, whose meaning is what a type checker
computes for them. The compiler, its test harness and its tests then run that
way. tsgo's own test suites pass byte for byte, and on real projects the
type-level `tsc` prints exactly what tsgo prints.

![tsgo in the type system next to the other TypeScript checkers on type-fest, Outline and VS Code](tstst/bench/real/2026-10-27-apple-m2-max.png)

## Real projects

tsgo's own `tsc` command line, compiled to types, checking the projects of
[ts-checker-bench](https://github.com/danfry1/ts-checker-bench) at their pinned
commits, next to every checker ts-checker-bench times and the JavaScript
`tsc` 6. All single-threaded, wall time, median of 3 rounds on one Apple M2
Max (64 GB), 2026-10-27:

| checker | type-fest | Outline | VS Code |
|---|---|---|---|
| tsrs 0.16 (Rust) | 6.0 s | 3.4 s | 9.2 s |
| tsc-rs 0.7 (Rust) | 5.6 s | 5.4 s | 14.9 s |
| bun check 1.4.3 | 5.7 s | 4.5 s | 16.9 s |
| tsc-ts 0.0.3 (TypeScript → native) | 11.4 s | 6.9 s | 23.7 s |
| tsgo 7.0.2 (npm) | 18.0 s | 12.9 s | 30.8 s |
| tsgo 7.1-dev `fed0bf24` (the source tstst compiles) | 11.9 s | 12.3 s | 21.7 s |
| tsc 6.0.3 (JavaScript) | 28.4 s | 29.6 s | 101.8 s |
| **tsgo in the type system** | **82.0 s** | **100.3 s** | **174.3 s** |
| — vs the same tsgo | 6.9× | 8.2× | 8.0× |
| — peak memory (tsgo → type-level) | 6.3 → 21.9 GB | 2.0 → 10.8 GB | 7.3 → 26.0 GB |

- The type-level `tsc`'s output is byte for byte that of tsgo built from the
  same commit on all three projects (`scripts/tsc_bench.sh` checks it before
  timing). That tsgo, tsc-rs and tsrs port TypeScript 7.1-dev and report 1
  error on Outline and 10 on VS Code that tsgo 7.0.2 does not.
- tsc 6 runs with a 16 GB Node heap: with the default 4 GB it crashes on
  type-fest and VS Code. On VS Code it reports 7 errors (implicit `any` in
  tests) that tsgo does not.
- Every measurement, with its CPU time, peak memory, error count and machine
  load, is in [`2026-10-27-apple-m2-max.tsv`](tstst/bench/real/2026-10-27-apple-m2-max.tsv);
  [`tstst/scripts/checker_bench.sh`](tstst/scripts/checker_bench.sh) reruns it
  and [`chart.mjs`](tstst/bench/real/chart.mjs) draws the chart.

## Test suites

Against `microsoft/TypeScript` at `fed0bf24149f`:

| suite | result |
|---|---|
| compiler baselines | 6890 tests, 34499 / 34499 baselines identical |
| conformance baselines | 5934 tests, 32206 / 32206 baselines identical |
| transpile baselines | 25 tests, 41 / 41 baselines identical |
| fourslash (`internal/fourslash/tests`) | 4143 passed, 415 skipped (as `go test`), 1761 / 1761 baselines |
| `go test` of 64 packages | 1286 passed, 3 failed (tests that start real processes or read files outside the harness) |

## How it works

```
Go program ──go2types──▶ type-level TS (+ lib/pure) ──tstc──▶ native executable
```

- **go2types** reads a Go program through `go/ssa` and writes one file of
  type aliases: functions become aliases over a heap threaded through every
  call, goroutines and channels are scheduled in the program itself, the
  operating system is a small in-memory kernel.
- **lib/pure** is the runtime those aliases call, itself pure type-level
  TypeScript: 64-bit integers, strings, IEEE floats from bits, a store of cells
  for the Go heap, maps, panics. It is the semantics: any TypeScript checker
  evaluates it the same way.
- **tstc** compiles type-level programs to native code through LLVM. It
  recognizes lib/pure's files by their hashes and implements their
  definitions natively, checked against those definitions by random
  differential tests, and a conformance fuzzer holds it to tsgo: a program
  tstc runs must give tsgo's result, and one tsgo rejects tstc rejects.

| directory | what |
|---|---|
| [`tstst/`](tstst) | go2types, lib/pure, drivers and runners for tsgo's suites, the benchmark |
| [`tstc/`](tstc) | the type-level TypeScript compiler (MoonBit, LLVM) and its runtime (C) |

## Quick start

macOS arm64; Go 1.26+, [MoonBit](https://www.moonbitlang.com/), LLVM 22,
clang, Node.js, Python 3.

```sh
(cd tstc && sh scripts/ci.sh)              # builds tstc and its runtime
cd tstst
sh scripts/setup_ts.sh                     # fetches ../TypeScript at the pinned commit
sh scripts/bl_native.sh compiler all -j 6 -q
```

See [`tstst/README.md`](tstst/README.md) and [`tstc/README.md`](tstc/README.md).

## License

MIT (`LICENSE`). Files derived from Go's sources keep Go's BSD-style license
(`tstst/LICENSE-GO`).
