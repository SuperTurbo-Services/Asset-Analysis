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
import { localizeTemplate, type Lang } from "../lib/macro/i18n";
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

const zhJudgment: Judgment = {
  ...judgment,
  regime: "限制性漂移",
  banner: `自检用的占位文字，10 年期名义利率在 **${m.nom10.fmt}**。`,
  assets: judgment.assets.map((a) => ({
    ...a,
    one: "自检占位文字，不是真实判断。",
    qual: "自检占位",
    factors: a.factors.map((f, i) => ({
      ...f,
      h: ["信用平稳", "波动率受控", "实际利率仍偏紧（反向）"][i],
      b: f.b,
    })),
  })),
  reads: Object.fromEntries(Object.keys(judgment.reads).map((k) => [k, "自检占位读数。"])),
};

const { css: cssEn, body: bodyEn, script: scriptEn } = await templateParts();
await mkdir(".cache", { recursive: true });

let failures = 0;
for (const [lang, j] of [["en", judgment], ["zh", zhJudgment]] as [Lang, Judgment][]) {
  const dashboard = assemble(facts, j, "selftest", lang);
  const { errors, warnings } = validate(dashboard, facts);
  for (const w of warnings) console.log(`  WARN  ${lang} ${w}`);
  for (const e of errors) console.log(`  ERROR ${lang} ${e}`);
  failures += errors.length;

  const parts = localizeTemplate({ css: cssEn, body: bodyEn, script: scriptEn }, lang);
  const file = lang === "en" ? ".cache/macro-selftest.html" : ".cache/macro-selftest-zh.html";
  await writeFile(file, `<!DOCTYPE html>
<html lang="${lang === "zh" ? "zh-CN" : "en"}" data-theme="light">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${dashboard.title}</title>
<style>${parts.css}</style></head>
<body>${parts.body}
<script id="payload" type="application/json">${embedPayload(dashboard)}</script>
<script>${parts.script}</script>
</body></html>`);

  console.log(`  ..    ${lang}: ${dashboard.tiles.length} tiles, ${dashboard.calcs.length} calcs, ${dashboard.matrix.length} matrix rows, ${dashboard.sources.length} sources, charts ${dashboard.barChart ? "bar" : "no bar"} and ${dashboard.lineChart ? "line" : "no line"}`);
  console.log(`  wrote ${file}`);
}

console.log(failures ? `  FAIL  ${failures} error(s)` : "  OK    both languages pass validation");
process.exit(failures ? 1 : 0);
