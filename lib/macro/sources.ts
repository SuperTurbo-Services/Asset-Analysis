/**
 * Every number on the dashboard comes from one of these two endpoints, both of
 * which are public and need no key. The model is never asked to look a figure
 * up, only to read the ones fetched here.
 */

export type Obs = { date: string; value: number };

const UA = "macro-dashboard (+https://vercel.com)";

async function getText(url: string, timeoutMs = 12_000): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      signal: ctl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * FRED serves any single series as CSV with no key. Asking for several ids at
 * once returns a zip instead, so this stays one request per series.
 */
export async function fred(id: string, sinceDays = 400): Promise<Obs[]> {
  const cosd = new Date(Date.now() - sinceDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const csv = await getText(
    `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}&cosd=${cosd}`,
  );
  const out: Obs[] = [];
  for (const line of csv.trim().split("\n").slice(1)) {
    const [date, raw] = line.split(",");
    const value = Number(raw);
    // FRED writes a bare dot for a missing observation, typically a holiday
    if (!date || !raw || raw.trim() === "." || !Number.isFinite(value)) continue;
    out.push({ date: date.trim(), value });
  }
  if (!out.length) throw new Error(`FRED ${id} returned no usable observations`);
  return out;
}

export type Quote = {
  symbol: string;
  last: number;
  prevClose: number;
  closes: number[];
  dates: string[];
  fiftyTwoWeekHigh: number | null;
  asOf: string;
};

/** Yahoo's chart endpoint, used for anything FRED does not carry daily and free. */
export async function quote(symbol: string, range = "1y"): Promise<Quote> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?range=${range}&interval=1d`;
  const json = JSON.parse(await getText(url));
  const r = json?.chart?.result?.[0];
  if (!r) throw new Error(`Yahoo returned no result for ${symbol}`);

  const rawCloses: (number | null)[] = r.indicators?.quote?.[0]?.close ?? [];
  const stamps: number[] = r.timestamp ?? [];
  const closes: number[] = [];
  const dates: string[] = [];
  rawCloses.forEach((c, i) => {
    if (typeof c === "number" && Number.isFinite(c)) {
      closes.push(c);
      dates.push(new Date(stamps[i] * 1000).toISOString().slice(0, 10));
    }
  });
  if (closes.length < 2) throw new Error(`Yahoo returned no closes for ${symbol}`);

  const last = Number.isFinite(r.meta?.regularMarketPrice)
    ? r.meta.regularMarketPrice
    : closes[closes.length - 1];

  return {
    symbol,
    last,
    prevClose: closes[closes.length - 2],
    closes,
    dates,
    fiftyTwoWeekHigh: Number.isFinite(r.meta?.fiftyTwoWeekHigh)
      ? r.meta.fiftyTwoWeekHigh
      : null,
    asOf: r.meta?.regularMarketTime
      ? new Date(r.meta.regularMarketTime * 1000).toISOString().slice(0, 10)
      : dates[dates.length - 1],
  };
}

/** Spot gold, used only if the Yahoo gold future is unavailable. */
export async function goldFallback(): Promise<{ price: number; asOf: string }> {
  const j = JSON.parse(await getText("https://api.gold-api.com/price/XAU"));
  if (!Number.isFinite(j?.price)) throw new Error("gold-api returned no price");
  return { price: j.price, asOf: String(j.updatedAt ?? "").slice(0, 10) };
}

/** Mean of the last n closes. Returns null when there is not enough history. */
export function sma(closes: number[], n: number): number | null {
  if (closes.length < n) return null;
  const tail = closes.slice(-n);
  return tail.reduce((a, b) => a + b, 0) / n;
}

export const pct = (a: number, b: number) => ((a - b) / b) * 100;

/** A FRED series dressed up as a quote, used when Yahoo is unreachable. */
export async function fredAsQuote(id: string, sinceDays = 400): Promise<Quote> {
  const obs = await fred(id, sinceDays);
  const closes = obs.map((o) => o.value);
  const dates = obs.map((o) => o.date);
  return {
    symbol: `FRED ${id}`,
    last: closes[closes.length - 1],
    prevClose: closes[closes.length - 2] ?? closes[closes.length - 1],
    closes,
    dates,
    fiftyTwoWeekHigh: Math.max(...closes.slice(-260)),
    asOf: dates[dates.length - 1],
  };
}

/** Daily bitcoin closes, used when Yahoo is unreachable. */
export async function coingeckoBtc(): Promise<Quote> {
  const j = JSON.parse(
    await getText(
      "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart" +
        "?vs_currency=usd&days=365&interval=daily",
      20_000,
    ),
  );
  const prices: [number, number][] = j?.prices ?? [];
  if (prices.length < 2) throw new Error("CoinGecko returned no prices");
  const closes = prices.map((p) => p[1]);
  const dates = prices.map((p) => new Date(p[0]).toISOString().slice(0, 10));
  return {
    symbol: "BTC USD",
    last: closes[closes.length - 1],
    prevClose: closes[closes.length - 2],
    closes,
    dates,
    fiftyTwoWeekHigh: Math.max(...closes),
    asOf: dates[dates.length - 1],
  };
}
