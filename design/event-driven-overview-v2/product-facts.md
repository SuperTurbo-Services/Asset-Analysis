# Event driven Market Overview — product facts

Verified against the shipped SuperTurbo dashboard code and the user's revision request on 2026-09-01.

## Existing product facts

- The production page is `https://superturbo.app/macro-dashboard`, with a Chinese route at `/macro-dashboard/zh`.
- The overview has four core assets: US Stocks, US Cash, Gold, and Crypto.
- The shared scenario model has eight bounded inputs: growth, inflation, policy rate, real yield, credit spreads, US dollar, crude oil, and VIX.
- UI actions and WebMCP agent actions share the same deterministic scenario state.
- Scenario results describe directional sensitivity, not return forecasts.

## Revision facts from the user

- Replace the abstract `What If Engine / Shock Atlas` framing with a plain `Current setting` and understandable future-event options.
- Required examples include a hike at the next FOMC and a decline in interest rates.
- Remove the compact ticker score strip such as `SPY +5` and `CASH -4`.
- Make the four large asset cards respond to the selected event and to manual slider changes.
- Rename `Reset workspace` to a reset action scoped to the current scenario.
- The central job is: ask Codex about a future event, then read the impact on four assets immediately.

## Scenario vocabulary explored in all drafts

- Current setting
- Next FOMC hike
- Interest rates decline
- Inflation returns
- Growth shock

## Benchmark evidence already verified for the approved Total View direction

- Aleta presents one intuitive total-wealth picture backed by deeper reporting and identifies an API, MCP, and data layer for agents: https://aleta.io/
- Etops presents an award-winning interface for turning complex portfolio information into clear, customizable reporting: https://www.etops.com/products/etops-wealth-reporting/

## Non-goals

- No price targets, probability claims, or expected-return forecasts.
- No trading or broker actions.
- No changes to Asset Analysis or Portfolio in this visual selection round.
- No production code changes before the user selects one of the three drafts.
