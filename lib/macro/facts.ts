import {
  coingeckoBtc, fred, fredAsQuote, goldFallback, pct, quote, sma,
  type Obs, type Quote,
} from "./sources";

export type Metric = {
  label: string;
  value: number;
  /** Preformatted for display, e.g. "4.71%", "275 bp", "$69,608" */
  fmt: string;
  /** Raw observation date, formatted per language at render time. Never put an
   *  ISO string on the page, the dashboard forbids hyphens in visible text. */
  iso: string;
  /** Monthly releases are stamped by month, daily ones by month and day. */
  monthly: boolean;
  source: string;
  /** Recent observations, oldest first, for the sparkline */
  spark: number[];
};

export type Facts = {
  generatedAt: string;
  /** The run's date in New York, as year, month, day. */
  stampParts: { y: number; m: number; d: number; weekday: number };
  /** Names of anything that could not be fetched this run */
  missing: string[];
  metrics: Record<string, Metric>;
  derived: Record<string, { fmt: string; value: number }>;
  coreCpiSeries: { label: string; value: number }[];
  fiveDay: { label: string; value: number }[];
  ranges: Record<string, { lo: number; hi: number }>;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

/** "2026-08-18" becomes "August 18", which keeps the no hyphen rule intact. */
export function prose(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}`;
}

/** Monthly releases are stamped by month, not by the first of the month. */
export function proseMonth(iso: string): string {
  const [, m] = iso.split("-").map(Number);
  return m ? MONTHS[m - 1] : iso;
}

const round = (n: number, d = 2) => Number(n.toFixed(d));
const money = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

/**
 * Year over year off the same calendar month a year earlier, looked up by date.
 * Monthly series do go missing, October 2025 CPI among them, so counting back
 * twelve rows would quietly compare the wrong months.
 */
function priorYear(obs: Obs[], i: number): number | null {
  const [y, m] = obs[i].date.split("-").map(Number);
  const key = `${y - 1}-${String(m).padStart(2, "0")}`;
  const hit = obs.find((o) => o.date.startsWith(key));
  return hit ? hit.value : null;
}

function yoy(obs: Obs[]): { value: number; date: string } | null {
  const i = obs.length - 1;
  const base = priorYear(obs, i);
  if (base == null) return null;
  return { value: pct(obs[i].value, base), date: obs[i].date };
}

/** Twelve months of year over year change, for the line chart. */
function yoySeries(obs: Obs[], n = 12): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = [];
  for (let i = Math.max(0, obs.length - n); i < obs.length; i++) {
    const base = priorYear(obs, i);
    if (base == null) continue;
    const [y, mm] = obs[i].date.split("-").map(Number);
    const short = MONTHS[mm - 1].slice(0, 3);
    out.push({
      // year only where it changes, so the axis stays readable
      label: out.length === 0 || mm === 1 ? `${short} ${String(y).slice(2)}` : short,
      value: round(pct(obs[i].value, base), 2),
    });
  }
  return out;
}

const settle = <T,>(p: Promise<T>) =>
  p.then((v) => ({ ok: true as const, v })).catch((e) => ({ ok: false as const, e }));

/**
 * Pulls every number the dashboard needs. A single source failing degrades that
 * factor rather than the whole run, which is what the skill asks for.
 */
export async function gatherFacts(now = new Date()): Promise<Facts> {
  const [
    dfii10, dgs10, t10yie, hyoas, dgs3mo, dff, cpiCore, cpiHead, indpro,
    spx, vix, btc, gold, dxy,
  ] = await Promise.all([
    settle(fred("DFII10")), settle(fred("DGS10")), settle(fred("T10YIE")),
    settle(fred("BAMLH0A0HYM2")), settle(fred("DGS3MO")), settle(fred("DFF")),
    settle(fred("CPILFESL", 1200)), settle(fred("CPIAUCSL", 1200)),
    settle(fred("INDPRO", 1200)),
    settle(quote("^GSPC")), settle(quote("^VIX")), settle(quote("BTC-USD")),
    settle(quote("GC=F")), settle(quote("DX-Y.NYB")),
  ]);

  const missing: string[] = [];
  const metrics: Record<string, Metric> = {};
  const derived: Record<string, { fmt: string; value: number }> = {};
  const ranges: Record<string, { lo: number; hi: number }> = {};

  const addFred = (
    key: string,
    got: { ok: boolean; v?: Obs[] },
    label: string,
    id: string,
    fmt: (n: number) => string,
    scale = 1,
  ) => {
    if (!got.ok || !got.v?.length) { missing.push(label); return null; }
    const obs = got.v;
    const last = obs[obs.length - 1];
    metrics[key] = {
      label,
      value: round(last.value * scale, 2),
      fmt: fmt(last.value * scale),
      iso: last.date,
      monthly: false,
      source: `FRED ${id}`,
      spark: obs.slice(-5).map((o) => round(o.value * scale, 2)),
    };
    return obs;
  };

  const pctFmt = (n: number) => `${n.toFixed(2)}%`;

  addFred("real10", dfii10 as never, "10 year real yield", "DFII10", pctFmt);
  addFred("nom10", dgs10 as never, "10 year nominal yield", "DGS10", pctFmt);
  addFred("be10", t10yie as never, "10 year breakeven", "T10YIE", pctFmt);
  addFred("hyoas", hyoas as never, "High yield OAS", "BAMLH0A0HYM2",
    (n) => `${Math.round(n)} bp`, 100);
  addFred("bill3m", dgs3mo as never, "3 month T bill", "DGS3MO", pctFmt);
  addFred("ffr", dff as never, "Fed funds effective", "DFF", pctFmt);

  // Inflation, converted from the index level to a year over year rate
  const coreObs = cpiCore.ok ? (cpiCore.v as Obs[]) : null;
  const headObs = cpiHead.ok ? (cpiHead.v as Obs[]) : null;
  const core = coreObs ? yoy(coreObs) : null;
  const head = headObs ? yoy(headObs) : null;
  if (core && coreObs) {
    metrics.coreCpi = {
      label: "Core CPI, year over year", value: round(core.value),
      fmt: `${core.value.toFixed(1)}%`, iso: core.date, monthly: true,
      source: "FRED CPILFESL",
      spark: yoySeries(coreObs, 5).map((p) => p.value),
    };
  } else missing.push("Core CPI");
  if (head) {
    metrics.headlineCpi = {
      label: "Headline CPI, year over year", value: round(head.value),
      fmt: `${head.value.toFixed(1)}%`, iso: head.date, monthly: true,
      source: "FRED CPIAUCSL", spark: [],
    };
  } else missing.push("Headline CPI");

  const indObs = indpro.ok ? (indpro.v as Obs[]) : null;
  const ind = indObs ? yoy(indObs) : null;
  if (ind && indObs) {
    metrics.growth = {
      label: "Industrial production, year over year", value: round(ind.value),
      fmt: `${ind.value.toFixed(1)}%`, iso: ind.date, monthly: true,
      source: "FRED INDPRO",
      spark: yoySeries(indObs, 5).map((p) => p.value),
    };
  } else missing.push("Industrial production");

  const addQuote = (
    key: string, resolved: { q: Quote; source: string } | null, label: string,
    fmt: (n: number) => string,
  ) => {
    if (!resolved) { missing.push(label); return null; }
    const { q, source } = resolved;
    metrics[key] = {
      label, value: round(q.last, 2), fmt: fmt(q.last), iso: q.asOf,
      monthly: false, source, spark: q.closes.slice(-5).map((c) => round(c, 2)),
    };
    const window = q.closes.slice(-260);
    ranges[key] = { lo: Math.min(...window), hi: Math.max(...window) };
    return q;
  };

  /**
   * Yahoo is the primary for prices, but it does block some datacentre ranges,
   * so each one has a second source. Fallbacks only run for what actually failed.
   */
  const resolve = async (
    got: { ok: boolean; v?: Quote },
    primarySource: string,
    fallback?: { load: () => Promise<Quote>; source: string },
  ): Promise<{ q: Quote; source: string } | null> => {
    if (got.ok && got.v) return { q: got.v, source: primarySource };
    if (!fallback) return null;
    const fb = await settle(fallback.load());
    return fb.ok ? { q: fb.v, source: fallback.source } : null;
  };

  const [spxR, vixR, btcR, goldR, dxyR] = await Promise.all([
    resolve(spx as never, "Yahoo Finance, ^GSPC",
      { load: () => fredAsQuote("SP500"), source: "FRED SP500" }),
    resolve(vix as never, "Yahoo Finance, ^VIX",
      { load: () => fredAsQuote("VIXCLS"), source: "FRED VIXCLS" }),
    resolve(btc as never, "Yahoo Finance, BTC USD",
      { load: () => coingeckoBtc(), source: "CoinGecko, bitcoin daily" }),
    resolve(gold as never, "Yahoo Finance, COMEX front month"),
    resolve(dxy as never, "Yahoo Finance, DX Y.NYB",
      { load: () => fredAsQuote("DTWEXBGS"), source: "FRED DTWEXBGS" }),
  ]);

  const spxQ = addQuote("spx", spxR, "S&P 500",
    (n) => n.toLocaleString("en-US", { maximumFractionDigits: 0 }));
  addQuote("vix", vixR, "VIX", (n) => n.toFixed(2));
  const btcQ = addQuote("btc", btcR, "Bitcoin", money);
  const goldQ = addQuote("gold", goldR, "Gold", money);
  const dxyQ = addQuote("dxy", dxyR, "Dollar index", (n) => n.toFixed(2));

  if (!goldQ) {
    // spot only, no history, so gold keeps a level but loses its trend factor
    const gf = await settle(goldFallback());
    if (gf.ok) {
      metrics.gold = {
        label: "Gold", value: round(gf.v.price), fmt: money(gf.v.price),
        iso: gf.v.asOf, monthly: false, source: "gold api, spot XAU", spark: [],
      };
      const i = missing.indexOf("Gold");
      if (i >= 0) missing.splice(i, 1);
    }
  }

  // Derived figures. Every one of these is shown as worked arithmetic on the page.
  if (metrics.nom10 && metrics.be10) {
    const v = metrics.nom10.value - metrics.be10.value;
    derived.real10Calc = { value: round(v), fmt: `${v.toFixed(2)} percent` };
  }
  if (metrics.bill3m && metrics.coreCpi) {
    const v = metrics.bill3m.value - metrics.coreCpi.value;
    derived.realCarryCore = { value: round(v), fmt: `${v.toFixed(2)} percent` };
  }
  if (metrics.bill3m && metrics.headlineCpi) {
    const v = metrics.bill3m.value - metrics.headlineCpi.value;
    derived.realCarryHeadline = { value: round(v), fmt: `${v.toFixed(2)} percent` };
  }

  const trendPair = (
    q: Quote | null, key: string, n: number,
    fmt: (v: number) => string = money,
  ) => {
    if (!q) return;
    const ma = sma(q.closes, n);
    if (ma == null) return;
    derived[`${key}Ma${n}`] = { value: round(ma), fmt: fmt(ma) };
    const gap = pct(q.last, ma);
    derived[`${key}Vs${n}`] = {
      value: round(gap, 1),
      fmt: `${Math.abs(gap).toFixed(1)} percent ${gap >= 0 ? "above" : "below"}`,
    };
  };
  trendPair(btcQ, "btc", 50);
  trendPair(btcQ, "btc", 100);
  trendPair(btcQ, "btc", 200);
  trendPair(goldQ, "gold", 200);
  trendPair(dxyQ, "dxy", 200, (v) => v.toFixed(2));

  if (spxQ?.fiftyTwoWeekHigh) {
    const gap = pct(spxQ.last, spxQ.fiftyTwoWeekHigh);
    derived.spxFromHigh = {
      value: round(gap, 1),
      fmt: `${Math.abs(gap).toFixed(1)} percent ${gap >= 0 ? "above" : "below"} its 52 week high`,
    };
    derived.spx52wHigh = {
      value: round(spxQ.fiftyTwoWeekHigh),
      fmt: spxQ.fiftyTwoWeekHigh.toLocaleString("en-US", { maximumFractionDigits: 0 }),
    };
  }

  // Five session percent change, one unit, for the bar chart
  const fiveDay: { label: string; value: number }[] = [];
  const push5 = (q: Quote | null, label: string) => {
    if (!q || q.closes.length < 6) return;
    const back = q.closes[q.closes.length - 6];
    fiveDay.push({ label, value: round(pct(q.last, back), 1) });
  };
  push5(spxQ, "S&P 500");
  push5(goldQ, "Gold");
  push5(btcQ, "Bitcoin");
  push5(dxyQ, "Dollar index");

  // the run's own date, read in New York because that is the market's clock
  const nyParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(now);
  const part = (t: string) => nyParts.find((x) => x.type === t)?.value ?? "";
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const stampParts = {
    y: Number(part("year")),
    m: Number(part("month")),
    d: Number(part("day")),
    weekday: Math.max(0, WEEKDAYS.indexOf(part("weekday"))),
  };

  return {
    generatedAt: now.toISOString(),
    stampParts,
    missing,
    metrics,
    derived,
    coreCpiSeries: coreObs ? yoySeries(coreObs, 12) : [],
    fiveDay,
    ranges,
  };
}
