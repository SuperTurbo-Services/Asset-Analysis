import type { Facts, Metric } from "./facts";
import type {
  BarChart, Calc, Dashboard, LineChart, MatrixRow, Tile,
} from "./types";
import type { Judgment } from "./schema";

/** Fixed order, and it is not negotiable. It is the order the framework scores in. */
export const ASSETS = ["US Stocks", "US Cash", "Gold", "Crypto"] as const;
export const EMOJI: Record<string, string> = {
  "US Stocks": "📊", "US Cash": "💵", "Gold": "🥇", "Crypto": "₿",
};

const SOURCE_URLS: Record<string, string> = {
  "FRED DFII10": "https://fred.stlouisfed.org/series/DFII10",
  "FRED DGS10": "https://fred.stlouisfed.org/series/DGS10",
  "FRED T10YIE": "https://fred.stlouisfed.org/series/T10YIE",
  "FRED BAMLH0A0HYM2": "https://fred.stlouisfed.org/series/BAMLH0A0HYM2",
  "FRED DGS3MO": "https://fred.stlouisfed.org/series/DGS3MO",
  "FRED DFF": "https://fred.stlouisfed.org/series/DFF",
  "FRED CPILFESL": "https://fred.stlouisfed.org/series/CPILFESL",
  "FRED CPIAUCSL": "https://fred.stlouisfed.org/series/CPIAUCSL",
  "FRED INDPRO": "https://fred.stlouisfed.org/series/INDPRO",
  "Yahoo Finance, ^GSPC": "https://finance.yahoo.com/quote/%5EGSPC/",
  "Yahoo Finance, ^VIX": "https://finance.yahoo.com/quote/%5EVIX/",
  "Yahoo Finance, BTC USD": "https://finance.yahoo.com/quote/BTC-USD/",
  "Yahoo Finance, COMEX front month": "https://finance.yahoo.com/quote/GC%3DF/",
  "Yahoo Finance, DX Y.NYB": "https://finance.yahoo.com/quote/DX-Y.NYB/",
  "gold api, spot XAU": "https://api.gold-api.com/price/XAU",
  "FRED SP500": "https://fred.stlouisfed.org/series/SP500",
  "FRED VIXCLS": "https://fred.stlouisfed.org/series/VIXCLS",
  "FRED DTWEXBGS": "https://fred.stlouisfed.org/series/DTWEXBGS",
  "CoinGecko, bitcoin daily": "https://www.coingecko.com/en/coins/bitcoin",
};

/** Round a span outward to something a human would draw an axis on. */
function niceStep(range: number): number {
  const raw = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))));
  for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * mag) return m * mag;
  return 10 * mag;
}

function axis(values: number[], padZero = true) {
  const lo = Math.min(...values, padZero ? 0 : Infinity);
  const hi = Math.max(...values, padZero ? 0 : -Infinity);
  const step = niceStep(hi - lo || 1);
  const min = Math.floor(lo / step) * step - (lo === 0 ? 0 : 0);
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let t = max; t >= min - 1e-9; t -= step) ticks.push(Number(t.toFixed(4)));
  return { min: Number(min.toFixed(4)), max: Number(max.toFixed(4)), ticks };
}

/** Round a meter band out to round numbers, so the endpoints read cleanly. */
function niceBand(lo: number, hi: number): [number, number] {
  if (hi < 100) return [Number(lo.toFixed(2)), Number(hi.toFixed(2))];
  const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(hi)) - 2));
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}

type TileSpec = {
  key: string; lo?: number; hi?: number; mark: number | null; markLab: string;
};

function buildTiles(f: Facts, reads: Record<string, string>): Tile[] {
  const m = f.metrics;
  const core = m.coreCpi?.value ?? 2;

  const specs: TileSpec[] = [
    { key: "real10", lo: 0, hi: 3.5, mark: 2, markLab: "2.00" },
    { key: "nom10", lo: 3, hi: 6, mark: 4.5, markLab: "4.50" },
    { key: "be10", lo: 1.5, hi: 3, mark: 2, markLab: "target" },
    { key: "hyoas", lo: 250, hi: 600, mark: 400, markLab: "400 bp" },
    { key: "bill3m", lo: 0, hi: 6, mark: core, markLab: "core CPI" },
    { key: "ffr", lo: 0, hi: 6, mark: core, markLab: "core CPI" },
    { key: "vix", lo: 10, hi: 40, mark: 20, markLab: "20" },
    { key: "spx", mark: f.derived.spx52wHigh?.value ?? null, markLab: "52 week high" },
    { key: "btc", mark: f.derived.btcMa200?.value ?? null, markLab: "200d" },
    { key: "gold", mark: f.derived.goldMa200?.value ?? null, markLab: "200d" },
    { key: "dxy", mark: f.derived.dxyMa200?.value ?? null, markLab: "200d" },
  ];

  const tiles: Tile[] = [];
  for (const s of specs) {
    const met: Metric | undefined = m[s.key];
    if (!met) continue;
    const range = f.ranges[s.key];
    let lo = s.lo ?? (range ? range.lo : met.value * 0.8);
    let hi = s.hi ?? (range ? range.hi : met.value * 1.2);
    // the meter clamps, so make sure the value and the tick both sit inside
    const marks = [met.value, s.mark].filter((n): n is number => n != null);
    lo = Math.min(lo, ...marks);
    hi = Math.max(hi, ...marks);
    if (lo >= hi) hi = lo + 1;
    const [blo, bhi] = niceBand(lo, hi);
    tiles.push({
      lab: met.label,
      val: met.fmt,
      src: `${met.source}, ${met.date}`,
      lo: blo, hi: bhi, v: met.value,
      mark: s.mark ?? Number(((blo + bhi) / 2).toFixed(2)),
      markLab: s.markLab,
      spark: met.spark,
      read: reads[s.key] ?? "",
    });
  }
  return tiles;
}

function buildCalcs(f: Facts): Calc[] {
  const m = f.metrics, d = f.derived, out: Calc[] = [];

  if (m.nom10 && m.be10 && d.real10Calc) {
    const gap = Math.abs(d.real10Calc.value - (m.real10?.value ?? d.real10Calc.value));
    out.push({
      lab: "10 year real yield, from the nominal and the breakeven",
      left: m.nom10.value.toFixed(2), op: "minus", right: m.be10.value.toFixed(2),
      res: d.real10Calc.fmt,
      note: !m.real10
        ? "FRED DFII10 was unavailable this run, so there is no cross check."
        : Math.round(gap * 100) === 0
          ? `Matches FRED DFII10, which prints the same yield at ${m.real10.value.toFixed(2)} percent.`
          : `Cross checks against FRED DFII10 at ${m.real10.value.toFixed(2)} percent, a gap of ${Math.round(gap * 100)} basis points from the different observation dates.`,
    });
  }
  if (m.bill3m && m.coreCpi && d.realCarryCore) {
    out.push({
      lab: "Real carry on cash, against core CPI",
      left: m.bill3m.value.toFixed(2), op: "minus", right: m.coreCpi.value.toFixed(1),
      res: d.realCarryCore.fmt,
      note: `What a 3 month T bill pays after core inflation, for taking no duration and no credit risk. Core CPI is the ${m.coreCpi.date} print.`,
    });
  }
  if (m.bill3m && m.headlineCpi && d.realCarryHeadline) {
    out.push({
      lab: "Real carry on cash, against headline CPI",
      left: m.bill3m.value.toFixed(2), op: "minus", right: m.headlineCpi.value.toFixed(1),
      res: d.realCarryHeadline.fmt,
      note: "Headline includes food and energy, so this is the number a household actually feels.",
    });
  }
  if (m.btc && d.btcMa200 && d.btcVs200) {
    out.push({
      lab: "Bitcoin against its 200 day average",
      left: m.btc.fmt, op: "against", right: d.btcMa200.fmt,
      res: d.btcVs200.fmt,
      note: "The 200 day line is the trend filter the framework uses for crypto.",
    });
  }
  if (m.gold && d.goldMa200 && d.goldVs200) {
    out.push({
      lab: "Gold against its 200 day average",
      left: m.gold.fmt, op: "against", right: d.goldMa200.fmt,
      res: d.goldVs200.fmt,
      note: "Gold rejecting or reclaiming this line has capped every advance this cycle.",
    });
  }
  return out;
}

function buildCharts(f: Facts): { barChart?: BarChart; lineChart?: LineChart } {
  const out: { barChart?: BarChart; lineChart?: LineChart } = {};

  if (f.fiveDay.length) {
    const a = axis(f.fiveDay.map((p) => p.value));
    const yieldNote = f.metrics.nom10
      ? `The 10 year nominal yield sits at ${f.metrics.nom10.fmt} over the same window.`
      : "";
    out.barChart = {
      title: "Five session change, by asset",
      sub: "Percent change over the last five sessions. The zero line separates what is working from what is not.",
      unit: "", ...a,
      note: yieldNote,
      itemHeader: "Asset", valueHeader: "Change, percent",
      data: f.fiveDay,
    };
  }

  if (f.coreCpiSeries.length >= 6) {
    const vals = f.coreCpiSeries.map((p) => p.value);
    const lo = Math.floor(Math.min(...vals, 2) * 2) / 2;
    const hi = Math.ceil(Math.max(...vals, 2) * 2) / 2;
    const ticks: number[] = [];
    for (let t = lo; t <= hi + 1e-9; t += 0.5) ticks.push(Number(t.toFixed(1)));
    const last = f.coreCpiSeries[f.coreCpiSeries.length - 1];
    out.lineChart = {
      title: "Core CPI, year over year, last 12 months",
      sub: `The latest print is ${last.value.toFixed(1)} percent. The line at 2 is the Federal Reserve's target.`,
      seriesName: "Core CPI, year over year",
      min: lo, max: hi, ticks, refLine: 2, refLabel: "2, the target",
      itemHeader: "Month", valueHeader: "Percent",
      data: f.coreCpiSeries,
    };
  }
  return out;
}

function buildSources(f: Facts): [string, string][] {
  const names = new Set<string>();
  for (const m of Object.values(f.metrics)) names.add(m.source);
  return [...names]
    .filter((n) => SOURCE_URLS[n])
    .map((n) => [n, SOURCE_URLS[n]] as [string, string]);
}

/**
 * Deterministic scaffolding plus the model's judgment, assembled into the
 * payload the template renders. Everything numeric here comes from `facts`.
 */
export function assemble(f: Facts, j: Judgment, model: string): Dashboard {
  const order = new Map(j.assets.map((a) => [a.name, a]));
  const assets = ASSETS.map((name) => {
    const a = order.get(name)!;
    return {
      emoji: EMOJI[name],
      name,
      verdict: a.verdict,
      // derived, never stated by the model, so the two can never disagree
      dir: (a.verdict === "BULLISH" ? "bull" : "bear") as "bull" | "bear",
      cap: a.cap ?? "",
      one: a.one,
      qual: a.qual,
      factors: a.factors,
    };
  });

  const matrix: MatrixRow[] = j.matrix.map((r) => ({ f: r.f, r: r.r, c: r.c }));
  const stamp = j.stampNote
    ? `As of ${f.stampDate}. ${j.stampNote}`
    : `As of ${f.stampDate}.`;

  return {
    title: "Macro Impact Dashboard",
    stamp,
    regime: j.regime,
    banner: j.banner,
    assets,
    matrix,
    tiles: buildTiles(f, j.reads),
    calcs: buildCalcs(f),
    ...buildCharts(f),
    sources: buildSources(f),
    meta: { generatedAt: f.generatedAt, model, missing: f.missing },
  };
}
