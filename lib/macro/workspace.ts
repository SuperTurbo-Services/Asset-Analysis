export const SHOCK_IDS = [
  "growth_pp",
  "inflation_bps",
  "policy_rate_bps",
  "real_yield_bps",
  "credit_spread_bps",
  "dollar_pct",
  "oil_pct",
  "vix_points",
] as const;

export type ShockId = (typeof SHOCK_IDS)[number];
export type ShockSet = Partial<Record<ShockId, number>>;

export type ShockDefinition = {
  id: ShockId;
  label: string;
  labelZh: string;
  unit: "pp" | "bps" | "pct" | "points";
  min: number;
  max: number;
  largeAt: number;
};

export const SHOCKS: readonly ShockDefinition[] = [
  { id: "growth_pp", label: "Growth", labelZh: "经济增长", unit: "pp", min: -5, max: 5, largeAt: 1.5 },
  { id: "inflation_bps", label: "Inflation", labelZh: "通胀", unit: "bps", min: -300, max: 300, largeAt: 75 },
  { id: "policy_rate_bps", label: "Policy rate", labelZh: "政策利率", unit: "bps", min: -300, max: 300, largeAt: 75 },
  { id: "real_yield_bps", label: "Real yield", labelZh: "实际利率", unit: "bps", min: -300, max: 300, largeAt: 60 },
  { id: "credit_spread_bps", label: "Credit spreads", labelZh: "信用利差", unit: "bps", min: -500, max: 1000, largeAt: 150 },
  { id: "dollar_pct", label: "US dollar", labelZh: "美元", unit: "pct", min: -20, max: 20, largeAt: 5 },
  { id: "oil_pct", label: "Crude oil", labelZh: "原油", unit: "pct", min: -50, max: 100, largeAt: 20 },
  { id: "vix_points", label: "VIX", labelZh: "VIX 波动率", unit: "points", min: -20, max: 80, largeAt: 10 },
] as const;

export type Sensitivities = Partial<Record<ShockId, -2 | -1 | 0 | 1 | 2>>;

export type AtlasAsset = {
  symbol: string;
  name: string;
  nameZh: string;
  group: string;
  emoji: string;
  sensitivities: Sensitivities;
};

/**
 * Directional macro sensitivities, not forecasts or expected returns.
 * Positive means the asset usually benefits when that shock rises.
 */
export const ATLAS_ASSETS: readonly AtlasAsset[] = [
  {
    symbol: "SPY", name: "US equities", nameZh: "美国股票", group: "Equity", emoji: "📊",
    sensitivities: { growth_pp: 2, inflation_bps: -1, policy_rate_bps: -1, real_yield_bps: -1, credit_spread_bps: -2, dollar_pct: -1, oil_pct: -1, vix_points: -2 },
  },
  {
    symbol: "QQQ", name: "Growth equities", nameZh: "成长型股票", group: "Equity", emoji: "💻",
    sensitivities: { growth_pp: 2, inflation_bps: -1, policy_rate_bps: -2, real_yield_bps: -2, credit_spread_bps: -2, dollar_pct: -1, oil_pct: -1, vix_points: -2 },
  },
  {
    symbol: "TLT", name: "Long Treasuries", nameZh: "长期美国国债", group: "Rates", emoji: "🏛",
    sensitivities: { growth_pp: -1, inflation_bps: -2, policy_rate_bps: -1, real_yield_bps: -2, credit_spread_bps: 1, dollar_pct: 1, oil_pct: -1, vix_points: 1 },
  },
  {
    symbol: "CASH", name: "US cash", nameZh: "美元现金", group: "Cash", emoji: "💵",
    sensitivities: { growth_pp: -1, inflation_bps: -1, policy_rate_bps: 2, real_yield_bps: 1, credit_spread_bps: 1, dollar_pct: 1, oil_pct: 0, vix_points: 1 },
  },
  {
    symbol: "DXY", name: "US dollar", nameZh: "美元指数", group: "FX", emoji: "＄",
    sensitivities: { growth_pp: 0, inflation_bps: 1, policy_rate_bps: 2, real_yield_bps: 2, credit_spread_bps: 1, dollar_pct: 2, oil_pct: -1, vix_points: 1 },
  },
  {
    symbol: "XAU", name: "Gold", nameZh: "黄金", group: "Commodity", emoji: "🥇",
    sensitivities: { growth_pp: -1, inflation_bps: 2, policy_rate_bps: -1, real_yield_bps: -2, credit_spread_bps: 1, dollar_pct: -2, oil_pct: 1, vix_points: 1 },
  },
  {
    symbol: "WTI", name: "Crude oil", nameZh: "原油", group: "Commodity", emoji: "🛢",
    sensitivities: { growth_pp: 2, inflation_bps: 1, policy_rate_bps: -1, real_yield_bps: -1, credit_spread_bps: -1, dollar_pct: -1, oil_pct: 2, vix_points: -1 },
  },
  {
    symbol: "BTC-USD", name: "Bitcoin", nameZh: "比特币", group: "Crypto", emoji: "₿",
    sensitivities: { growth_pp: 1, inflation_bps: 0, policy_rate_bps: -2, real_yield_bps: -2, credit_spread_bps: -2, dollar_pct: -2, oil_pct: 0, vix_points: -2 },
  },
] as const;

export type ScenarioContribution = {
  factor: ShockId;
  shock: number;
  sensitivity: number;
  contribution: number;
};

export type ScenarioResult = {
  symbol: string;
  score: number;
  contributions: ScenarioContribution[];
};

const shockMap = new Map(SHOCKS.map((s) => [s.id, s]));

export function normalizeShocks(input: Record<string, unknown>): ShockSet {
  const out: ShockSet = {};
  for (const def of SHOCKS) {
    const raw = input[def.id];
    if (raw == null || raw === "") continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${def.id} must be a finite number`);
    if (value < def.min || value > def.max) {
      throw new Error(`${def.id} must be between ${def.min} and ${def.max}`);
    }
    if (value !== 0) out[def.id] = value;
  }
  return out;
}

export function scoreProfile(
  symbol: string,
  sensitivities: Sensitivities,
  shocks: ShockSet,
): ScenarioResult {
  const contributions: ScenarioContribution[] = [];
  for (const id of SHOCK_IDS) {
    const shock = shocks[id] ?? 0;
    const sensitivity = sensitivities[id] ?? 0;
    if (!shock || !sensitivity) continue;
    const def = shockMap.get(id)!;
    const magnitude = Math.abs(shock) >= def.largeAt ? 2 : 1;
    contributions.push({
      factor: id,
      shock,
      sensitivity,
      contribution: Math.sign(shock) * magnitude * sensitivity,
    });
  }
  const raw = contributions.reduce((sum, item) => sum + item.contribution, 0);
  return { symbol, score: Math.max(-5, Math.min(5, raw)), contributions };
}

export function scoreAtlas(shocks: ShockSet): ScenarioResult[] {
  return ATLAS_ASSETS.map((asset) => scoreProfile(asset.symbol, asset.sensitivities, shocks));
}

export type LensExposure = {
  factor: ShockId;
  sensitivity: -2 | -1 | 0 | 1 | 2;
  rationale: string;
  evidence_ids: string[];
};

export type AssetLens = {
  symbol: string;
  summary: string;
  exposures: LensExposure[];
};

export function validateAssetLens(
  input: unknown,
  availableEvidenceIds: Iterable<string>,
): AssetLens {
  if (!input || typeof input !== "object") throw new Error("asset lens must be an object");
  const raw = input as Record<string, unknown>;
  const symbol = normalizeSymbol(raw.symbol);
  const summary = String(raw.summary ?? "").trim();
  if (!summary || summary.length > 320) throw new Error("summary must contain 1 to 320 characters");
  if (!Array.isArray(raw.exposures) || raw.exposures.length < 3 || raw.exposures.length > 8) {
    throw new Error("exposures must contain 3 to 8 entries");
  }
  const allowedEvidence = new Set(availableEvidenceIds);
  const used = new Set<string>();
  const exposures: LensExposure[] = raw.exposures.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`exposures[${index}] must be an object`);
    const row = item as Record<string, unknown>;
    const factor = String(row.factor) as ShockId;
    if (!SHOCK_IDS.includes(factor)) throw new Error(`exposures[${index}] has an unknown factor`);
    if (used.has(factor)) throw new Error(`factor ${factor} is duplicated`);
    used.add(factor);
    const sensitivity = Number(row.sensitivity);
    if (![-2, -1, 0, 1, 2].includes(sensitivity)) {
      throw new Error(`exposures[${index}] sensitivity must be an integer from -2 to 2`);
    }
    const rationale = String(row.rationale ?? "").trim();
    if (!rationale || rationale.length > 240) {
      throw new Error(`exposures[${index}] rationale must contain 1 to 240 characters`);
    }
    const evidenceIds = Array.isArray(row.evidence_ids)
      ? row.evidence_ids.map(String)
      : [];
    if (!evidenceIds.length || evidenceIds.some((id) => !allowedEvidence.has(id))) {
      throw new Error(`exposures[${index}] must cite available evidence ids`);
    }
    return { factor, sensitivity: sensitivity as LensExposure["sensitivity"], rationale, evidence_ids: evidenceIds };
  });
  return { symbol, summary, exposures };
}

export type PortfolioPosition = { symbol: string; weight_pct: number };

export function validatePortfolio(input: unknown): PortfolioPosition[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 12) {
    throw new Error("portfolio must contain 1 to 12 positions");
  }
  const seen = new Set<string>();
  const positions = input.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`positions[${index}] must be an object`);
    const raw = item as Record<string, unknown>;
    const symbol = normalizeSymbol(raw.symbol);
    if (seen.has(symbol)) throw new Error(`duplicate portfolio symbol ${symbol}`);
    seen.add(symbol);
    const weight = Number(raw.weight_pct);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
      throw new Error(`positions[${index}] weight_pct must be above 0 and at most 100`);
    }
    return { symbol, weight_pct: Number(weight.toFixed(2)) };
  });
  const total = positions.reduce((sum, item) => sum + item.weight_pct, 0);
  if (Math.abs(total - 100) > 0.01) throw new Error(`portfolio weights must total 100, got ${total}`);
  return positions;
}

export function normalizeSymbol(value: unknown): string {
  const symbol = String(value ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9.^=_-]{1,20}$/.test(symbol)) throw new Error("invalid symbol");
  return symbol;
}

export const WORKSPACE_CONFIG = {
  shocks: SHOCKS,
  assets: ATLAS_ASSETS,
};
