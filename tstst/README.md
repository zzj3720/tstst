# tstst

**tsgo's own test suites, run inside TypeScript's type system.**

tstst compiles Go programs to type-level TypeScript — programs made only of
type aliases, evaluated by a type checker — and runs tsgo (the Go port of the
TypeScript compiler, `microsoft/TypeScript`'s `tsc/` directory) that way: the
compiler, its test harness and its tests. A test passes when the baselines the
type-level tsgo produces are byte for byte the reference baselines.

```
Go program ──go2types──▶ type-level TS (+ lib/pure) ──tstc──▶ native executable
```

- **go2types** (`go2types/`) reads a Go program through `go/ssa` and writes
  one TypeScript file of type aliases: functions become aliases over a heap
  value threaded through every call, goroutines and channels are scheduled in
  the program itself, the operating system is a small in-memory kernel.
- **lib/pure** (`lib/pure/`) is the runtime those aliases call, in pure
  TypeScript types: 64-bit integers, strings, IEEE floats (from bits), a store
  of cells for the Go heap, maps, panics. It is the semantics: any TypeScript
  checker evaluates it the same way.
- **tstc** ([`../tstc`](../tstc))
  compiles type-level programs to native code. It recognizes the files of
  lib/pure by their hashes and implements their definitions natively; those
  definitions stay the meaning (they are checked against them by random
  differential tests).

## Status

Against `microsoft/TypeScript` at `fed0bf24149f` (`tsc/`):

| suite | result |
|---|---|
| compiler baselines | 6890 tests, 34499 / 34499 baselines identical |
| conformance baselines | 5934 tests, 32206 / 32206 baselines identical |
| transpile baselines | 25 tests, 41 / 41 baselines identical |
| fourslash (`internal/fourslash/tests`) | 4143 passed, 415 skipped (as `go test`), 1761 / 1761 baselines |
| `go test` of 64 packages | 1286 passed, 3 failed (tests that start real processes or read files outside the harness: `cmd/tsc`, `internal/diagnostics`, `internal/testutil/contentmappertest`) |

The two baseline suites take about 2.5–3× the CPU time of tsgo's native Go
test runner (Apple M-series, 6 tests at a time).

## Requirements

Go 1.26+, Node.js (for TypeScript 5.9 used by the checks), Python 3, and a
built tstc (MoonBit, LLVM 22, clang): `../tstc` (`sh scripts/ci.sh` there),
or set `TSTC` and `TSTC_RT`. Developed on macOS arm64.

## Running

```sh
sh scripts/setup_ts.sh                       # ../TypeScript at the pinned commit
sh scripts/bl_native.sh compiler all -j 6 -q # translate the baseline driver, build it, run the compiler suite
NOBUILD=1 sh scripts/bl_native.sh conformance all -j 6 -q
python3 scripts/gotest.py internal/parser    # one package's go test, inside the type system
sh scripts/gate.sh                           # everything checked before main moves
BENCH=<ts-checker-bench> zsh scripts/checker_bench.sh  # real projects, next to the other checkers
```

`scripts/baseline.py` runs a suite with an already built driver
(`TSTST_BIN`); results and diffs of failing baselines go to `go2types/out/bl/`.

## Layout

- `go2types/` — the Go to type-level TypeScript compiler. `natives/` are
  replacement packages (`sync`, `reflect`, `testing`, …) for the type-level
  runtime, `extra/` adds files to packages (the in-memory kernel is
  `extra/syscall/zz_tstst_kernel.go`), `softfloat/` is the float arithmetic
  lib/pure's `softfloat.ts` is generated from.
- `lib/pure/` — the type-level runtime.
- `drivers/` — programs built from tsgo: `baseline` (the compiler and
  conformance suites), `scan`, `parse`.
- `scripts/` — suite runners, the gate, checks of lib/pure against `tsc`, the
  real-project benchmark (`tsc_bench.sh`, `checker_bench.sh`).
- `bench/real/` — benchmark runs on real projects and their chart.
- `tests/` — lib/pure's tests (`pure/`), package lists for `go test`.

## License

MIT (see `../LICENSE`). `go2types/softfloat/softfloat.go` (and so
`lib/pure/softfloat.ts`) and `go2types/natives/reflect/{fields,visiblefields}.go`
are derived from Go's sources, under Go's BSD-style license (`LICENSE-GO`).
tsgo itself is not included: `scripts/setup_ts.sh` fetches it.
