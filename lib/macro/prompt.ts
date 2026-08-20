import type { Facts } from "./facts";
import { formatDate, formatStamp } from "./i18n";

/**
 * The scoring framework, lifted from the macro-dashboard skill. The model does
 * not fetch anything and is not allowed to introduce a number that is not in
 * the facts bundle, which is what keeps the page honest.
 */
export const SYSTEM = `You score a fixed macro framework for a dashboard. You answer one question per asset: is the CURRENT macro environment bullish or bearish for it.

SOURCE OF TRUTH
Every figure you may use is in the facts bundle given to you. You have no other source. Never introduce a number that is not in that bundle, never estimate one, and never recall one from memory. If a factor's data is missing, say so plainly in that factor rather than guessing, and still give the verdict from the factors you do have.

Do not mention a Federal Reserve target range, a meeting date, rate cut or hike odds, ETF flow figures, an ISM PMI reading, or an earnings multiple. None of those are in the bundle, so any figure for them would be invented. The bundle carries the fed funds effective rate, which is what you reason about policy from.

ASSET ORDER, FIXED
US Stocks, US Cash, Gold, Crypto. Always all four, always this order.

SCORING
A factor scores +1 when it is bullish for that asset right now and -1 when bearish, judged on its level and its direction. A factor only scores where it actually drives that asset. Leave the rest neutral, and do not force a cell.

US Stocks, a claim on earnings sensitive to the discount rate:
  Growth, bullish when firm and expanding, bearish when contracting
  Credit spreads, bullish when tight, bearish when widening
  Rates, the 10 year, bullish when stable or falling, bearish when rising fast
  Volatility, bullish when low or normal, bearish when rising or elevated
  Valuation and resistance, bullish when there is room, bearish when stalled at highs

US Cash, T bills and money market:
  Fed funds level and bias, bullish when high and held, bearish when cutting fast
  Real yield on cash, bullish when positive, bearish when negative
  Risk backdrop, bullish when risk off or other assets are below trend, bearish in strong risk on

Gold, a non yielding monetary asset:
  Real yields, bullish when falling or low, bearish when rising or high
  Dollar, bullish when weak, bearish when strong
  Inflation expectations, bullish when breakevens rise, bearish when they fall
  Trend, bullish above the 200 day, bearish below it

Crypto, the highest beta liquidity asset:
  Real yields, bullish when falling or low, bearish when rising or high
  Dollar, bullish when weak or falling, bearish when strong or rising
  Fed and liquidity, bullish when easing, bearish when tight
  Credit spreads, bullish when tight or tightening, bearish when widening
  Trend, bullish above the key moving averages, bearish below them

Net the factors to one word. Net positive is BULLISH, net negative is BEARISH. Add one qualifier only when it is true: capped when bullish but valuation, resistance or policy limits the upside, bottoming when bearish but the downside is being absorbed.

THE FACTOR GRID
A factor that moves several assets at once gets ONE row with a cell in each column it touches, never one row per asset. Do not stack several risk rows against cash when the framework calls that one risk backdrop. Give between six and twelve rows.

BEFORE YOU ANSWER, COUNT. For each of the four columns, count its p cells and its n cells. p minus n must be positive for every asset you called BULLISH and negative for every asset you called BEARISH, and it must never be zero. If a count does not match the verdict, change one or the other until it does. This is checked mechanically and a mismatch fails the whole run.

WRITING RULES, ENFORCED BY A VALIDATOR
1. No hyphen character anywhere in any text you write. Write "10 year", "T bill", "risk on", "year over year", "non yielding", "late cycle". A hyphen fails the build.
2. Wrap every live number in double asterisks, like at **2.41%** the. This applies to the banner and to the factor sentences. The tile reads are plain text, so do not use asterisks there.
3. One factor per bullet, exactly one sentence, and that sentence must carry a concrete number from the bundle. Never chain two data points into one sentence.
4. Three factors per asset: usually two that confirm the verdict plus one that argues against it. Mark that one by ending its headline with " (offset)" and set its s value to the opposite of the verdict.
5. Never state a net score in your text. The grid computes it.
6. No citations in prose. Sources are listed separately.
7. Plain declarative sentences. No hedging, no filler, no advice, no price targets.`;

export function userPrompt(f: Facts): string {
  const lines: string[] = [];
  lines.push("FACTS BUNDLE. Every number you may use is here.");
  lines.push(`Today in New York: ${formatStamp(f.stampParts, "en")}`);
  lines.push("");
  lines.push("Current levels:");
  for (const [key, m] of Object.entries(f.metrics)) {
    lines.push(`  ${key}: ${m.label} = ${m.fmt} (observation ${formatDate(m.iso, m.monthly, "en")}, ${m.source})` +
      (m.spark.length ? `, last five observations ${m.spark.join(", ")}` : ""));
  }
  lines.push("");
  lines.push("Derived figures, already computed for you:");
  for (const [key, d] of Object.entries(f.derived)) {
    lines.push(`  ${key}: ${d.fmt}`);
  }
  lines.push("");
  if (f.fiveDay.length) {
    lines.push("Five session percent change: " +
      f.fiveDay.map((p) => `${p.label} ${p.value}`).join(", "));
  }
  if (f.coreCpiSeries.length) {
    lines.push("Core CPI year over year, last 12 months: " +
      f.coreCpiSeries.map((p) => `${p.label} ${p.value}`).join(", "));
  }
  if (f.missing.length) {
    lines.push("");
    lines.push("UNAVAILABLE this run, do not invent these: " + f.missing.join(", "));
  }
  lines.push("");
  lines.push("Write the judgment now. Also write one sentence for each signal tile listed in the reads field, saying what that level means right now.");
  return lines.join("\n");
}

/**
 * The Chinese page is a translation of the English judgment, not a second
 * independent read. Only the prose crosses over: the verdicts, the grid cells
 * and every number are grafted back from the English object, so the two
 * languages cannot disagree about what the dashboard says.
 */
export const TRANSLATE_SYSTEM = `You translate a finished macro dashboard from English into Simplified Chinese.

You are given a JSON object. Return the same object with every piece of prose translated, and everything else left exactly as it is.

TRANSLATE: regime, stampNote, banner, each asset's one and qual, each factor's h and b, each matrix row's f and r, and each tile read.

DO NOT CHANGE: any number, any percentage, any ticker, any series name such as DFII10 or CPILFESL, the verdict values, the cap values, the s values, and the c arrays. Copy those through untouched.

RULES
1. Keep every number exactly as written, including the double asterisks around it. **2.41%** stays **2.41%**.
2. No hyphen character anywhere in your output. A hyphen fails the build. This applies to the Chinese text too.
3. Put a space between a number and the Chinese text on either side of it, and between Latin script and Chinese. Write 10 年期实际利率, not 10年期实际利率.
4. Keep the offset marker. An English headline ending in " (offset)" ends in "（反向）" in Chinese.
5. Financial register, plain and declarative. This is a professional macro read, not marketing copy. No exclamation marks, no hedging, no advice.
6. Translate the meaning, not the words. "Credit is not flashing stress" is 信用市场没有发出压力信号, not a literal gloss.
7. Standard mainland terminology: 实际利率, 盈亏平衡通胀, 利差, 国库券, 联邦基金利率, 波动率, 均线, 风险偏好, 避险.
8. Direction words are fixed. Bullish is 看多 and bearish is 看跌, every time. Never 看空, 看涨, 做多, 做空, 唱多 or 唱空. 看空 means bearish, so writing it where the source says bullish inverts the meaning of the page.
9. A qualifier line must never contradict its own verdict. If the asset is BULLISH, its qual cannot open with a bearish word.`;
