# SuperTurbo Macro Workspace — product facts

Verified on 2026-09-01. These facts constrain all three UI directions.

## Product and audience

- Product: the public `Macro Impact Dashboard` at https://superturbo.app/macro-dashboard, with a Chinese route at `/macro-dashboard/zh`.
- Primary job: understand the same macro regime across assets, inspect one asset's factor sensitivities, and test a local-only portfolio against the same scenario.
- Audience: self-directed macro researchers and investors. The interface must remain research commentary, not personalized investment advice.
- Existing page language: English and Chinese. The rebuild must preserve both.

## Verified dashboard content

- Current top-level asset verdicts: US stocks, US cash, gold, and crypto.
- Existing evidence layers: master signals, factor grid, derived calculations, source table, short-horizon cross-asset change chart, and inflation history.
- Current source families include FRED for macro series and Yahoo Finance for market prices; the asset research flow can also cite SEC filings and news context.
- The current public page displays observation dates and source links. Freshness and provenance must stay visible in the new overview.
- The existing dashboard contains a prominent not-financial-advice disclaimer that must remain discoverable.

## WebMCP workspace facts from the shipped code

- The workspace exposes eight shared shocks: growth, inflation, policy rate, real yield, credit spreads, US dollar, crude oil, and VIX.
- The deterministic atlas covers eight curated assets: SPY, QQQ, TLT, CASH, DXY, XAU, WTI, and BTC-USD.
- Scenario scores range from -5 to +5 and are directional macro sensitivities, not return forecasts.
- Portfolio state is local-only, long-only, supports 1–12 unique symbols, and must total exactly 100%.
- The seven existing browser tools are: `get_macro_snapshot`, `apply_macro_scenario`, `reset_macro_workspace`, `search_assets`, `get_asset_context`, `render_asset_lens`, and `set_portfolio`.
- UI actions and agent actions must update the same state so a user can continue an agent-created scenario manually and vice versa.

## User-approved information architecture to explore

1. Market Overview: cross-asset verdicts, surrounding macro context, and Shock Atlas with range sliders.
2. Asset Analysis: compare how each asset is affected by each macro factor, then drill into a selected or searched asset.
3. Portfolio Builder: choose an asset category, search within it, add holdings, adjust horizontal weight sliders, and receive scenario analysis.

## External benchmark evidence

- Aleta describes a single intuitive `total wealth` picture backed by deep investment reporting, and publicly identifies the product as award-winning. It also explicitly describes an API, MCP, and data layer for AI agents. Source: https://aleta.io/
- Etops describes an award-winning interface for turning complex portfolio information into clear, customizable reporting. Source: https://www.etops.com/products/etops-wealth-reporting/
- These are benchmark principles only. No visual assets, proprietary marks, or interface copies will be used.

## Non-goals for the prototype gate

- No trading, order entry, broker connection, or server-side portfolio persistence.
- No claim that a scenario score predicts return magnitude.
- No replacement of the already-working WebMCP contracts before a visual direction is approved.
