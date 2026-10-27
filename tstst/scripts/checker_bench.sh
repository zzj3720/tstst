#!/bin/zsh
# The type-level tsc next to the other TypeScript checkers, on the projects of
# ts-checker-bench (https://github.com/danfry1/ts-checker-bench), all single-threaded:
#   BENCH=<ts-checker-bench checkout, after `node bench setup`> zsh scripts/checker_bench.sh [out.tsv]
# Checkers: ts-checker-bench's (tsgo 7.0.2, tsc-ts, tsc-rs, tsrs, bun), tsgo
# built from ../TypeScript (the source the type-level tsc is compiled from),
# tsc 6 (JavaScript, typescript@6.0.3 with a 16 GB heap: it runs out of the
# default 4 GB on type-fest and VS Code) and the type-level tsc (built and
# checked against that tsgo by scripts/tsc_bench.sh). RUNS rounds (default 3),
# each checker in turn, so a busy moment hits every checker alike; before each
# measurement it waits up to 3 minutes for the 1-minute load to fall under
# QUIET (default 6). Writes project, checker, run, wall s, user+sys s, peak MB,
# errors and load, one line per measurement.
set -e
cd "$(dirname "$0")/.."
ROOT=$PWD B=${BENCH:?ts-checker-bench checkout} OUT=${1:-$ROOT/bench/real/out.tsv}
B=$(cd $B && pwd) T=$B/tools O=$ROOT/go2types/out/tsc W=$ROOT/go2types/out/checkers
mkdir -p $W
[ -x $W/tsgo ] || (cd ../TypeScript/tsc && GOWORK=off go build -o $W/tsgo ./cmd/tsc)
[ -f $W/tsc6/node_modules/typescript/lib/tsc.js ] || (mkdir -p $W/tsc6 && cd $W/tsc6 && echo '{}' > package.json && npm i -s --no-audit --no-fund typescript@6.0.3)
typeset -A ARGS CMD
ARGS[type-fest]="-p . --noEmit"
ARGS[outline]="-p . --incremental false"
ARGS[vscode]="-p ./src/tsconfig.json --noEmit --skipLibCheck"
first() { for f in "$@"; do [ -e $f ] && { echo $f; return; }; done; echo "missing: $1" >&2; exit 1; }
CMD[tsgo-7.0.2]="$(first $T/tsgo/node_modules/@typescript/typescript-darwin-arm64/lib/tsc) --singleThreaded --pretty false"
CMD[tsgo]="$W/tsgo --singleThreaded --pretty false"
CMD[tsc-ts]="$(first $T/tsc-ts/node_modules/@tsc-ts/darwin-arm64/lib/tsc-ts) --singleThreaded --pretty false"
CMD[tsc-rs]="$(first $T/tsc-rs/node_modules/@tsc-rs/darwin-arm64/lib/tsc) --singleThreaded --pretty false"
CMD[tsrs]="$(first $T/tsrs/node_modules/@tsrs/darwin-arm64/tsrs) --singleThreaded --pretty false"
CMD[bun]="$(first $T/bun/node_modules/@oven/bun-darwin-aarch64/bin/bun $T/bun/node_modules/bun/bin/bun.exe) check --threads=1 --no-pretty --all"
CMD[tsc6]="node --max-old-space-size=16384 $W/tsc6/node_modules/typescript/lib/tsc.js --pretty false"
CMD[tstst]="$O/tsc run --bytes --arg-file"
NB=$NOBUILD
for p in type-fest outline vscode; do
  echo "== $p"; TSGO=$W/tsgo NOBUILD=$NB sh scripts/tsc_bench.sh $B/projects/$p ${=ARGS[$p]} | tail -6
  NB=1
done
quiet() { local n=0; while :; do L=$(sysctl -n vm.loadavg | awk '{print $2}'); (( L < ${QUIET:-6} || n >= 18 )) && break; sleep 10; n=$((n+1)); done; }
print "project\tchecker\trun\twall_s\tcpu_s\tpeak_mb\terrors\tload1" > $OUT
for p in type-fest outline vscode; do
  for i in $(seq 1 ${RUNS:-3}); do
    for c in tsgo-7.0.2 tsgo tsc-ts tsc-rs tsrs bun tsc6 tstst; do
      quiet
      out=$W/$p.$c.out tf=$W/$p.$c.time
      if [ $c = tstst ]; then /usr/bin/time -l ${=CMD[$c]} $O/$p.in > $out 2> $tf || true
      else (cd $B/projects/$p && /usr/bin/time -l ${=CMD[$c]} ${=ARGS[$p]} > $out 2> $tf) || true; fi
      print "$p\t$c\t$i\t$(awk '/ real /{print $1 "\t" $3+$5}' $tf)\t$(awk '/maximum resident/{print int($1/1048576)}' $tf)\t$(grep -c 'error TS' $out || true)\t$L" | tee -a $OUT
    done
  done
done
