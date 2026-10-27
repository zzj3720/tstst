// The chart of a checker_bench.sh run: node chart.mjs <run.tsv> writes <run>.html
// (median wall time per project and checker) and, with Chrome at CHROME, <run>.png.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const tsv = process.argv[2];
const rows = fs.readFileSync(tsv, "utf8").trim().split("\n").slice(1).map(l => l.split("\t"));
const median = a => { a = [...a].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const P = [["type-fest", "type-fest"], ["outline", "Outline"], ["vscode", "VS Code"]];
const C = [["tsrs", "tsrs (Rust)"], ["tsc-rs", "tsc-rs (Rust)"], ["bun", "bun check"], ["tsc-ts", "tsc-ts (TS → native)"],
  ["tsgo-7.0.2", "tsgo 7.0.2 (Go, npm)"], ["tsgo", "tsgo 7.1-dev (Go, same source)"], ["tsc6", "tsc 6 (JavaScript)"], ["tstst", "tsgo in types"]];
const t = {};
for (const [p, c, , w] of rows) ((t[p] ??= {})[c] ??= []).push(+w);
const max = Math.max(...rows.map(r => +r[3]));
let body = "";
for (const [p, title] of P) {
  if (!t[p]) continue;
  const ref = median(t[p].tsgo);
  body += `<div class="proj"><div class="name">${title}</div>`;
  for (const [c, label] of C) {
    if (!t[p][c]) continue;
    const s = median(t[p][c]), r = s / ref;
    const rel = c === "tsgo" ? "" : Math.abs(r - 1) < 0.05 ? "same as tsgo" : r > 1 ? `${r.toFixed(1)}× slower` : `${(1 / r).toFixed(1)}× faster`;
    body += `<div class="row ${c}"><div class="lab">${label}</div><div class="bar" style="width:${Math.max(3, (s / median(t.vscode?.tstst ?? [max])) * 900)}px"></div><div class="v">${s.toFixed(1)} s<span>${rel}</span></div></div>`;
  }
  body += "</div>";
}
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1600px;height:1290px;background:#0d1117;color:#e6edf3;font-family:-apple-system,Helvetica,sans-serif;padding:56px 80px;position:relative}
h1{font-size:42px;font-weight:700;letter-spacing:-.5px} h1 em{font-style:normal;color:#58a6ff}
.sub{font-size:22px;line-height:1.45;color:#8b949e;margin-top:12px}
.proj{margin-top:22px}.proj:first-of-type{margin-top:30px}
.name{font-size:25px;font-weight:600;margin-bottom:6px}
.row{display:flex;align-items:center;height:30px;margin-bottom:3px}
.lab{width:330px;font-size:19px;color:#8b949e}
.bar{height:22px;border-radius:4px;background:#6e7681}
.tstst .bar{background:#58a6ff}.tstst .lab{color:#58a6ff;font-weight:600}
.v{font-size:19px;margin-left:12px;font-variant-numeric:tabular-nums;white-space:nowrap}
.v span{color:#8b949e;margin-left:10px;font-size:17px}
.foot{position:absolute;left:80px;bottom:40px;font-size:19px;color:#8b949e;line-height:1.5}
</style></head><body>
<h1>The TypeScript compiler, running inside <em>TypeScript's type system</em></h1>
<div class="sub">tsgo compiled to type-level TypeScript (nothing but type aliases), then to native code with tstc,<br>next to the other TypeScript checkers on ts-checker-bench's projects. Its output is byte-identical to tsgo's. ×: vs tsgo 7.1-dev</div>
${body}
<div class="foot">Wall time, median of 3, all single-threaded, Apple M2 Max (64 GB). tsc 6: 16 GB Node heap (it runs out of the default 4 GB); on VS Code it reports 7 errors tsgo does not.<br>Projects and checker versions from github.com/danfry1/ts-checker-bench · github.com/zzj3720/tstst</div>
</body></html>`;
const base = tsv.replace(/\.tsv$/, "");
fs.writeFileSync(base + ".html", html);
if (process.env.CHROME) execFileSync(process.env.CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1600,1290", `--screenshot=${base}.png`, "file://" + fs.realpathSync(base + ".html")], { stdio: "ignore" });
