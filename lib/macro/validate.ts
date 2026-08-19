import type { Facts } from "./facts";
import type { Dashboard } from "./types";

export type Report = { errors: string[]; warnings: string[] };

/** Walk every string in the payload except the ones that are never rendered. */
function* strings(node: unknown, path = "", key = ""): Generator<[string, string, string]> {
  if (node && typeof node === "object" && !Array.isArray(node)) {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "meta") continue;
      yield* strings(v, `${path}.${k}`, k);
    }
  } else if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield* strings(node[i], `${path}[${i}]`, key);
  } else if (typeof node === "string") {
    yield [path, key, node];
  }
}

/** Every number the facts bundle actually contains, in raw numeric form. */
function allowedNumbers(f: Facts): number[] {
  const out: number[] = [];
  for (const m of Object.values(f.metrics)) {
    out.push(m.value, ...m.spark);
  }
  for (const d of Object.values(f.derived)) out.push(d.value, Math.abs(d.value));
  // the rounded forms the page itself prints, e.g. a 1.08 fact shown as 1.1%
  for (const m of Object.values(f.metrics)) {
    const shown = Number(m.fmt.replace(/[^\d.]/g, ""));
    if (Number.isFinite(shown)) out.push(shown);
  }
  for (const d of Object.values(f.derived)) {
    const shown = Number(d.fmt.replace(/[^\d.]/g, ""));
    if (Number.isFinite(shown)) out.push(shown);
  }
  for (const r of Object.values(f.ranges)) out.push(r.lo, r.hi);
  for (const p of f.coreCpiSeries) out.push(p.value);
  for (const p of f.fiveDay) out.push(p.value, Math.abs(p.value));
  // differences between any two rate style facts, since the copy is allowed to
  // quote a spread the page also works out in the calculations block
  const rates = Object.values(f.metrics).filter((m) => m.value < 20).map((m) => m.value);
  for (const a of rates) for (const b of rates) out.push(Number((a - b).toFixed(2)));
  return out;
}

const NUM = /-?\$?\d[\d,]*(?:\.\d+)?/g;

/**
 * Small integers that are structural rather than factual: "10 year", "200 day",
 * "52 week", "2 percent target". Flagging these every run would bury the
 * warnings that matter.
 */
const STRUCTURAL = new Set([0, 1, 2, 3, 4, 5, 6, 10, 12, 20, 30, 50, 52, 90, 100, 200, 500]);

function parseNum(tok: string): number | null {
  const n = Number(tok.replace(/[$,]/g, "").replace(/[.,]$/, ""));
  return Number.isFinite(n) ? n : null;
}

function isKnown(n: number, allowed: number[]): boolean {
  // generous enough to accept a figure quoted at one fewer decimal place
  const tol = Math.max(0.051, Math.abs(n) * 0.0006);
  return allowed.some((a) => Math.abs(a - n) <= tol);
}

/**
 * The same gate build.py applies, plus a check that the model did not introduce
 * a number the facts bundle does not contain.
 */
export function validate(d: Dashboard, f: Facts): Report {
  const errors: string[] = [];
  const warnings: string[] = [];
  const n = d.assets.length;

  if (n !== 4) errors.push(`expected 4 assets, got ${n}`);

  const net = new Array(n).fill(0);
  d.matrix.forEach((row, i) => {
    if (row.c.length !== n) {
      errors.push(`matrix[${i}] "${row.f}" has ${row.c.length} cells, expected ${n}`);
      return;
    }
    row.c.forEach((cell, k) => {
      if (cell === "p") net[k]++;
      else if (cell === "n") net[k]--;
      else if (cell !== "z") errors.push(`matrix[${i}] cell ${k} is ${cell}`);
    });
  });

  d.assets.forEach((a, i) => {
    if ((a.verdict === "BULLISH") !== (a.dir === "bull")) {
      errors.push(`${a.name}: verdict and dir disagree`);
    }
    if (a.factors.length !== 3) {
      errors.push(`${a.name}: expected 3 factors, got ${a.factors.length}`);
    }
    if (net[i] > 0 && a.dir !== "bull") {
      errors.push(`${a.name} nets +${net[i]} on the grid but the verdict is ${a.verdict}`);
    }
    if (net[i] < 0 && a.dir !== "bear") {
      errors.push(`${a.name} nets ${net[i]} on the grid but the verdict is ${a.verdict}`);
    }
    if (net[i] === 0) {
      errors.push(`${a.name} nets 0 on the grid, so the verdict is unsupported either way`);
    }
    const offs = a.factors.filter((x) => x.s !== (a.dir === "bull" ? "up" : "down"));
    if (offs.length !== 1) {
      warnings.push(`${a.name} has ${offs.length} offsetting factors, the format expects 1`);
    }
  });

  d.tiles.forEach((t, i) => {
    if (t.lo >= t.hi) errors.push(`tiles[${i}] "${t.lab}" lo is not below hi`);
    if (t.v < t.lo || t.v > t.hi) {
      warnings.push(`tiles[${i}] "${t.lab}" value sits outside its band, the meter will clamp`);
    }
    if (!t.read.trim()) warnings.push(`tiles[${i}] "${t.lab}" has no read`);
  });

  for (const [, , s] of strings(d, "", "")) {
    if (s.startsWith("http")) continue;
    if (s.includes("-")) errors.push(`hyphen in visible text: ${JSON.stringify(s.slice(0, 90))}`);
  }

  // numbers the model wrote must trace back to the facts bundle
  const allowed = allowedNumbers(f);
  const authored: string[] = [
    d.banner, d.regime,
    ...d.assets.flatMap((a) => [a.one, a.qual, ...a.factors.flatMap((x) => [x.h, x.b])]),
    ...d.matrix.flatMap((r) => [r.f, r.r]),
    ...d.tiles.map((t) => t.read),
  ];
  for (const text of authored) {
    for (const tok of text.match(NUM) ?? []) {
      const v = parseNum(tok);
      if (v == null) continue;
      const strict = tok.includes(".") || Math.abs(v) >= 1000;
      if (isKnown(v, allowed)) continue;
      if (!strict && STRUCTURAL.has(Math.abs(v))) continue;
      if (Number.isInteger(v) && v >= 1900 && v <= 2100) continue;
      const msg = `number ${tok} is not in the facts bundle: ${JSON.stringify(text.slice(0, 90))}`;
      if (strict) errors.push(msg);
      else warnings.push(msg);
    }
  }

  return { errors, warnings };
}
