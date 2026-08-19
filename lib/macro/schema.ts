import { z } from "zod";

export const TILE_KEYS = [
  "real10", "nom10", "be10", "hyoas", "bill3m", "ffr",
  "vix", "spx", "btc", "gold", "dxy",
] as const;

const factor = z.object({
  s: z.enum(["up", "down"]).describe("up when this factor is bullish for the asset, down when bearish"),
  h: z.string().describe("Short factor headline. Append ' (offset)' on the one factor that argues against the verdict."),
  b: z.string().describe("Exactly one sentence carrying one concrete number from the facts, with the number wrapped in double asterisks."),
});

const asset = z.object({
  name: z.enum(["US Stocks", "US Cash", "Gold", "Crypto"]),
  verdict: z.enum(["BULLISH", "BEARISH"]),
  cap: z.enum(["", "capped", "bottoming"])
    .describe("capped when bullish but limited by valuation, resistance or policy. bottoming when bearish but the downside is being absorbed. Empty when neither is true."),
  one: z.string().describe("One or two short sentences for the scoreboard card."),
  qual: z.string().describe("Longer qualifier line, e.g. 'capped, valuation leaves no room for an earnings miss'."),
  factors: z.array(factor).length(3),
});

export const judgmentSchema = z.object({
  regime: z.string().describe("Two or three words naming the current regime, e.g. 'late cycle repression'."),
  stampNote: z.string().describe("One short clause on what set today's tone, or an empty string."),
  banner: z.string().describe("One short paragraph on the single thing driving the tape, numbers wrapped in double asterisks."),
  assets: z.array(asset).length(4),
  matrix: z.array(z.object({
    f: z.string().describe("Factor name, e.g. 'Real yields'."),
    r: z.string().describe("The current reading, quoting the figure from the facts."),
    c: z.array(z.enum(["p", "n", "z"])).length(4)
      .describe("One cell per asset in the order US Stocks, US Cash, Gold, Crypto. p bullish, n bearish, z not a driver of that asset."),
  })).min(6).max(14),
  reads: z.array(z.object({
    key: z.enum(TILE_KEYS),
    text: z.string().describe("One sentence on what this level means right now."),
  })).describe("One entry per signal tile."),
});

export type RawJudgment = z.infer<typeof judgmentSchema>;

/** The same object once the tile reads have been keyed for the tile builder. */
export type Judgment = Omit<RawJudgment, "reads"> & {
  reads: Record<string, string>;
};
