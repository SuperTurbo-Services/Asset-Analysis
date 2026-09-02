# Asset Analysis · WebMCP Challenge

Submission URL: https://superturbo.app/asset-analysis

Paste-ready Devpost copy, testing instructions, prior-vs-new documentation, and the sub-three-minute video plan are in [`DEVPOST_SUBMISSION.md`](./DEVPOST_SUBMISSION.md).

Asset Analysis turns a daily, fixed-factor macro report into a shared human-and-agent research surface. A visitor can see the current four-asset verdict grid, then use three connected workspaces:

1. **Shock Atlas** — apply bounded growth, inflation, rates, credit, dollar, oil, and volatility shocks across SPY, QQQ, TLT, cash, DXY, gold, WTI, and Bitcoin.
2. **Asset Lens** — search any Yahoo-compatible ticker, retrieve keyless public evidence, and let an agent render a cited directional sensitivity lens into the page.
3. **Portfolio Weather** — enter up to 12 long-only positions and see their weighted directional scenario impact. Holdings remain in `localStorage` and are never sent to the server.

## Why WebMCP matters here

Asset research normally forces an agent to scrape visual cards, guess which controls changed, and return analysis somewhere outside the dashboard. The site tools expose the dashboard's real state and validated operations. The user can watch the same page change and inspect every evidence ID used by an agent-created lens.

No separate MCP server, account, API key, or trading connection is required.

## Imperative site tools

All tools are registered from the top-level page with `document.modelContext.registerTool`. Declarative tools and iframe registration are intentionally not used.

| Tool | Effect |
|---|---|
| `get_macro_snapshot` | Reads the current generated report and shared workspace state. |
| `apply_macro_scenario` | Validates and applies bounded macro shocks, updating the visible atlas. |
| `reset_macro_workspace` | Resets local scenario, lenses, contexts, and demo portfolio. |
| `search_assets` | Searches Yahoo's public symbol directory. |
| `get_asset_context` | Loads price, SEC facts when covered, and recent GDELT articles. |
| `render_asset_lens` | Validates citations and renders an agent-authored sensitivity lens. |
| `set_portfolio` | Replaces the local-only long portfolio after exact 100% validation. |

Read tools use `readOnlyHint`. Open-web results are marked with `openWorldHint` and `untrustedContentHint`. Every input schema is narrow and rejects additional properties.

## Evidence and safety model

- **Yahoo Finance**: symbol discovery and one-year daily chart metadata, cached for 15 minutes.
- **SEC Companyfacts**: normalized revenue, net income, assets, and equity for mapped US issuers, cached for 24 hours.
- **GDELT DOC API**: recent coverage, cached for 30 minutes, with Yahoo's public news search as a keyless fallback when GDELT is unavailable.
- Sources fail independently. Partial coverage is visible; missing data is never invented.
- External titles are inserted with `textContent`, never as HTML, and are explicitly labeled untrusted data rather than instructions.
- Asset lenses require 3–8 unique factors, bounded sensitivities from -2 to +2, short rationales, and evidence IDs that exist in the loaded context.
- Portfolio data stays in the browser. The product does not place trades, provide target prices, or personalize financial advice.

## Suggested 90-second demo

1. Open the English dashboard and show the daily verdict grid and source links.
2. Ask Codex: “Apply an inflation flare scenario and tell me which atlas assets are most exposed.”
3. Ask: “Search NVDA, load its public context, and render a cited macro lens using only available evidence IDs.”
4. Ask: “Set a 50% SPY, 25% TLT, 15% XAU, 10% NVDA portfolio and show its weather map.”
5. Point out that NVDA changes from “lens needed” to covered after the agent renders the lens, while the holdings remain local.
6. Open the Chinese route and show the same site-tool workspace in Chinese.

## Work added during the challenge window

This is a meaningful WebMCP extension of a pre-existing read-only macro report. The original report covered four daily verdicts. Commit `490540e`, dated September 1, 2026, added the Shock Atlas, arbitrary-ticker data layer and Asset Lens, local Portfolio Weather Map, seven imperative tools, shared state, validation and safety controls, bilingual workspace, tests, MIT license, and challenge documentation. The full prior-vs-new breakdown is included in [`DEVPOST_SUBMISSION.md`](./DEVPOST_SUBMISSION.md).

## Test prompts

- “Read the macro snapshot without changing the page.”
- “Apply growth +1 pp, policy rate -50 bps, and VIX -5 points.”
- “Try VIX +200.” (Expected: rejected by schema and runtime validation.)
- “Search for Apple and load AAPL context.”
- “Render a lens with a nonexistent evidence ID.” (Expected: rejected.)
- “Set SPY 60% and TLT 30%.” (Expected: rejected because weights do not total 100%.)
- “Reset the workspace.”

## Local verification

```bash
npm install
npm run webmcp:selftest
npm run macro:selftest
npm run build
npm run dev
```

Open `http://localhost:3000/asset-analysis` or `/asset-analysis/zh`. In a browser without WebMCP, the full human interface continues to work. In the ChatGPT desktop built-in browser, use the address-bar Site tools panel to inspect the seven tools.

## License

MIT. See `LICENSE`.
