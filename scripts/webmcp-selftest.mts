import assert from "node:assert/strict";
import { renderPage } from "../lib/macro/page";
import {
  ATLAS_ASSETS,
  normalizeShocks,
  scoreAtlas,
  validateAssetLens,
  validatePortfolio,
} from "../lib/macro/workspace";

assert.equal(ATLAS_ASSETS.length, 8, "the atlas must keep eight cross-asset proxies");

const softLanding = normalizeShocks({
  growth_pp: 0.8,
  inflation_bps: -35,
  policy_rate_bps: -50,
  credit_spread_bps: -25,
  vix_points: -5,
});
const scores = scoreAtlas(softLanding);
assert.equal(scores.length, 8);
assert.ok(scores.every((item) => item.score >= -5 && item.score <= 5));
assert.ok(scores.find((item) => item.symbol === "SPY")!.score > 0);

assert.throws(() => normalizeShocks({ vix_points: 200 }), /between/);
assert.throws(() => validatePortfolio([{ symbol: "SPY", weight_pct: 99 }]), /total 100/);
assert.deepEqual(validatePortfolio([
  { symbol: "SPY", weight_pct: 60 },
  { symbol: "TLT", weight_pct: 40 },
]), [
  { symbol: "SPY", weight_pct: 60 },
  { symbol: "TLT", weight_pct: 40 },
]);

const evidence = ["price:yahoo", "fundamental:sec:revenue", "news:gdelt:1"];
const lens = validateAssetLens({
  symbol: "NVDA",
  summary: "A cited directional lens for scenario analysis.",
  exposures: [
    { factor: "growth_pp", sensitivity: 2, rationale: "Revenue exposure links demand to growth.", evidence_ids: [evidence[1]] },
    { factor: "real_yield_bps", sensitivity: -2, rationale: "Long-duration valuation is rate-sensitive.", evidence_ids: [evidence[0]] },
    { factor: "vix_points", sensitivity: -1, rationale: "Risk-off volatility can pressure the asset.", evidence_ids: [evidence[2]] },
  ],
}, evidence);
assert.equal(lens.symbol, "NVDA");
assert.throws(() => validateAssetLens({ ...lens, exposures: lens.exposures.map((row) => ({ ...row, evidence_ids: ["made-up"] })) }, evidence), /available evidence/);

for (const lang of ["en", "zh"] as const) {
  const response = await renderPage(lang);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /document\.modelContext\?\.registerTool/);
  assert.equal((html.match(/name: "[a-z_]+"/g) ?? []).filter((item) => [
    "get_macro_snapshot", "apply_macro_scenario", "reset_macro_workspace", "search_assets",
    "get_asset_context", "render_asset_lens", "set_portfolio",
  ].some((name) => item.includes(name))).length, 7);
  assert.doesNotMatch(html, /toolname=|toolautosubmit=/i, "declarative WebMCP is intentionally unsupported");
  assert.doesNotMatch(html, /<iframe/i, "site tools must live in the top-level document");
  assert.match(html, /additionalProperties: false/);
  assert.match(html, /Not financial advice|不构成投资建议/);
}

console.log("  OK    scenario bounds, lenses, portfolios, bilingual page, and 7 imperative site tools");
