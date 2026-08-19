/**
 * Runs everything except the model call: pulls live data, assembles a payload
 * with a stand in judgment built from those same numbers, validates it, and
 * writes a preview page. Needs no API key, so it is the fast way to check the
 * data layer and the template after a change.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { gatherFacts } from "../lib/macro/facts";
import { assemble, ASSETS } from "../lib/macro/payload";
import { TILE_KEYS } from "../lib/macro/schema";
import { embedPayload, templateParts } from "../lib/macro/template";
import type { Judgment } from "../lib/macro/schema";
import { validate } from "../lib/macro/validate";

const facts = await gatherFacts();
const m = facts.metrics;
const d = facts.derived;
const has = (k: string) => Boolean(m[k] ?? d[k]);

console.log(`  ..    ${Object.keys(m).length} metrics, ${facts.missing.length} missing`);
if (facts.missing.length) console.log(`  WARN  missing: ${facts.missing.join(", ")}`);

type Cells = ("p" | "n" | "z")[];
const row = (f: string, r: string, c: Cells) => ({ f, r, c });

/** Only score a row when the data behind it actually arrived this run. */
const rowIf = (ok: boolean, f: string, r: string | undefined, c: Cells) =>
  ok && r ? [row(f, r, c)] : [];

const judgment: Judgment = {
  regime: "restrictive drift",
  stampNote: "",
  banner: `A placeholder banner for the self test, with the 10 year at **${m.nom10.fmt}**.`,
  assets: ASSETS.map((name) => ({
    name,
    verdict: "BULLISH" as const,
    cap: "" as const,
    one: "Self test placeholder text, not a real read.",
    qual: "self test placeholder",
    factors: [
      { s: "up" as const, h: "Credit is calm", b: `High yield spreads sit at **${m.hyoas?.fmt ?? "unavailable"}**.` },
      { s: "up" as const, h: "Volatility is contained", b: `The VIX is at **${m.vix?.fmt ?? "unavailable"}**.` },
      { s: "down" as const, h: "Real yields still restrictive (offset)", b: `The 10 year real yield is **${m.real10.fmt}**.` },
    ],
  })),
  matrix: [
    ...rowIf(has("growth"), "Growth", m.growth?.fmt, ["p", "z", "z", "z"]),
    ...rowIf(has("hyoas"), "Credit spreads", m.hyoas?.fmt, ["p", "z", "z", "p"]),
    ...rowIf(has("vix"), "Volatility", m.vix?.fmt, ["p", "n", "z", "z"]),
    ...rowIf(has("real10"), "Real yields", m.real10?.fmt, ["z", "p", "n", "n"]),
    ...rowIf(Boolean(d.realCarryCore), "Real carry on cash", d.realCarryCore?.fmt, ["z", "p", "z", "z"]),
    ...rowIf(has("dxy"), "Dollar", m.dxy?.fmt, ["z", "z", "p", "p"]),
    ...rowIf(has("be10"), "Inflation expectations", m.be10?.fmt, ["z", "z", "p", "z"]),
    ...rowIf(Boolean(d.btcVs200), "Trend", d.btcVs200?.fmt, ["z", "z", "p", "p"]),
  ],
  reads: Object.fromEntries(
    TILE_KEYS.filter((k) => has(k)).map((k) => [k, "Self test placeholder read."]),
  ),
};

// a dropped source can leave a column netting zero, which the validator rejects
// by design. Top it up so the harness still exercises the rest of the checks.
const nets = [0, 0, 0, 0];
for (const r of judgment.matrix) {
  r.c.forEach((c, i) => { if (c === "p") nets[i]++; else if (c === "n") nets[i]--; });
}
nets.forEach((n, i) => {
  if (n !== 0) return;
  const c: Cells = ["z", "z", "z", "z"];
  c[i] = "p";
  judgment.matrix.push(row("Self test balancing row", m.real10.fmt, c));
});

const dashboard = assemble(facts, judgment, "selftest");
const { errors, warnings } = validate(dashboard, facts);

for (const w of warnings) console.log(`  WARN  ${w}`);
for (const e of errors) console.log(`  ERROR ${e}`);

const { css, body, script } = await templateParts();
await mkdir(".cache", { recursive: true });
await writeFile(".cache/macro-selftest.html", `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${dashboard.title}</title>
<style>${css}</style></head>
<body>${body}
<script id="payload" type="application/json">${embedPayload(dashboard)}</script>
<script>${script}</script>
</body></html>`);

console.log(`  ..    ${dashboard.tiles.length} tiles, ${dashboard.calcs.length} calcs, ${dashboard.matrix.length} matrix rows, ${dashboard.sources.length} sources`);
console.log(`  ..    charts: ${dashboard.barChart ? "bar" : "no bar"}, ${dashboard.lineChart ? "line" : "no line"}`);
console.log(errors.length ? `  FAIL  ${errors.length} error(s)` : "  OK    payload passes validation");
console.log("  wrote .cache/macro-selftest.html");
process.exit(errors.length ? 1 : 0);
