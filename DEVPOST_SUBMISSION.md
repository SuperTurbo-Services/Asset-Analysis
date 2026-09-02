# Devpost Submission · Asset Analysis

This file is paste-ready source material for the WebMCP Challenge submission form. Replace the video placeholder after recording and uploading the public YouTube demo.

## Project name

Asset Analysis

## Tagline

One live macro workspace where people and agents can stress every major asset class, research any ticker, and map a private portfolio together.

## Links

- Live project: https://superturbo.app/asset-analysis
- Chinese interface: https://superturbo.app/asset-analysis/zh
- Public source: https://github.com/SuperTurbo-Services/xiaohongshu-growth-dashboard
- Demo video: **TODO — add a public YouTube URL before submission**

## Short description

Asset Analysis is a WebMCP-powered research surface for self-directed investors. Its daily fixed-factor report explains the current regime across US stocks, cash, gold, and crypto. The new shared workspace lets a person or agent apply bounded macro shocks across eight asset proxies, collect keyless public evidence for an arbitrary ticker, render an evidence-cited Asset Lens, and calculate a local-only Portfolio Weather Map. The same validated functions power both the visible controls and seven top-level WebMCP tools.

The experience is informational and deterministic: it does not place trades, publish target prices, or produce personalized financial advice.

## Inspiration

Cross-asset macro research is usually fragmented. A person changes assumptions in one tool, reads company facts in another, then copies a portfolio into a third. An agent often has to scrape visual cards and return its work outside the page, leaving the user unable to inspect the exact state or evidence.

WebMCP makes the dashboard itself the collaboration surface. The agent can operate the site's real functions while the user watches the same page update and reviews every cited source.

## What it does

- **Macro Shock Atlas:** applies growth, inflation, policy-rate, real-yield, credit-spread, dollar, oil, and VIX shocks across SPY, QQQ, TLT, cash, DXY, gold, WTI, and Bitcoin.
- **Arbitrary-ticker Asset Lens:** searches Yahoo-compatible symbols and aggregates price data, SEC Companyfacts for covered US issuers, and recent GDELT coverage with a Yahoo news fallback.
- **Evidence-cited agent analysis:** an agent can render 3–8 unique macro exposures only after citing evidence IDs returned by the site.
- **Portfolio Weather Map:** validates 1–12 long-only positions whose weights total exactly 100% and computes weighted scenario impact. Portfolio holdings stay in `localStorage` and are not sent to the server.
- **Bilingual collaboration:** the same workspace and tools work on the English and Chinese routes.

## Why WebMCP is a strong fit

The task is stateful and visual. A useful result is not just a paragraph of analysis; it is a scenario, a cited asset model, and a portfolio view that both the user and agent can inspect and refine. WebMCP gives the agent narrow operations over that shared state without a separate MCP installation or an invisible server-side session.

This improves the experience in four ways:

1. Agents read structured dashboard state instead of scraping charts.
2. Every mutation updates the visible human interface immediately.
3. The site validates ranges, portfolio totals, factor uniqueness, and evidence citations before accepting work.
4. The user keeps sensitive portfolio composition local while still getting scenario analysis.

## How WebMCP was implemented

The top-level document imperatively registers seven tools with `document.modelContext.registerTool`:

- `get_macro_snapshot`
- `apply_macro_scenario`
- `reset_macro_workspace`
- `search_assets`
- `get_asset_context`
- `render_asset_lens`
- `set_portfolio`

Every tool uses a narrow JSON Schema with `additionalProperties: false`; read operations use `readOnlyHint`, and open-web results use `untrustedContentHint`. The page does not use declarative WebMCP or iframe registration. Tool handlers reuse the same scenario, data-loading, validation, rendering, and persistence functions as the visible interface.

## Meaningful extension during the submission period

The repository existed before the August 25, 2026 submission-period start. Before the challenge, its macro feature was a read-only daily report covering four asset verdicts.

Challenge work added on September 1, 2026 in commit `490540e`:

- the eight-asset deterministic scenario engine and bounded shock definitions;
- arbitrary-ticker search and public-source context APIs;
- SEC fundamental normalization and partial-source coverage states;
- GDELT news retrieval with a keyless Yahoo fallback;
- the three visible collaborative workspaces and shared `localStorage` state;
- all seven imperative WebMCP tools and their schemas/annotations;
- evidence validation, untrusted-content handling, portfolio privacy controls;
- bilingual workspace content, automated tests, MIT license, and challenge documentation.

The pre-existing daily report remains intact. The submission should be evaluated on the WebMCP workspace and data/validation layer listed above.

## Challenges

- Public data sources fail independently, especially from serverless IP ranges. The context route uses bounded timeouts, source-specific caching, explicit coverage states, and best-effort fallbacks instead of fabricating missing evidence.
- A model-generated sensitivity lens could cite nonexistent evidence. The renderer rejects unknown IDs and requires every factor to include at least one ID from the loaded context.
- A WebMCP tool can appear safe while hiding a separate implementation path. Here, the tool and human interfaces call the same page functions and update the same state.
- Financial tools can drift into recommendations. Outputs are limited to directional sensitivity, include clear disclaimers, and exclude trades, target prices, and personalized advice.

## Accomplishments

- Seven non-trivial site tools work in the ChatGPT/Codex built-in browser.
- A single sequence can search an asset, load keyless evidence, render a cited lens, and immediately include that lens in a private portfolio calculation.
- Invalid VIX shocks, fabricated evidence IDs, duplicate factors, duplicate holdings, and portfolios not totaling 100% are rejected by both schema and runtime validation.
- The original macro data pipeline still retrieves all expected metrics and passes its bilingual validation suite.

## What we learned

WebMCP works best when a site exposes cohesive domain operations rather than low-level clicks. The most valuable tools in this project return enough structured evidence to support the agent's next step while keeping the visible page as the user's source of truth.

## What's next

- Add more primary issuer and economic sources while preserving keyless access and partial coverage.
- Let users save named local scenarios and compare them side by side.
- Add an exportable research packet containing the scenario, factor lens, evidence links, and portfolio coverage gaps.

## Testing instructions for judges

1. Open https://superturbo.app/asset-analysis in the ChatGPT desktop built-in browser or a WebMCP-enabled Chrome build.
2. Open the browser's Site tools panel and confirm that seven tools are available.
3. Ask: “Apply an inflation flare scenario and tell me which atlas assets are most exposed.”
4. Ask: “Search AAPL, load its public context, and render a macro lens using only evidence IDs the site returned.”
5. Ask: “Set a portfolio of 50% SPY, 25% TLT, 15% XAU, and 10% AAPL.”
6. Confirm that the visible Portfolio Weather Map reaches 100% covered weight after the AAPL lens is rendered.
7. Negative test: ask for `vix_points: 200` or a portfolio totaling 90%; the tool must reject it.

No account, credentials, API key, purchase, or private data is required.

## Video plan · 2 minutes 20 seconds

- **0:00–0:15:** problem and daily four-asset dashboard.
- **0:15–0:45:** invoke `apply_macro_scenario`; show the eight atlas cards changing on-page.
- **0:45–1:25:** search AAPL, load Yahoo/SEC/news evidence, then render a three-factor cited lens.
- **1:25–1:55:** set the four-position portfolio and show covered weight and weighted impact.
- **1:55–2:10:** run one rejected input to demonstrate validation and safety.
- **2:10–2:20:** show the seven tools, bilingual route, public repository, and MIT license.

Record with spoken English audio, no copyrighted music, and upload publicly to YouTube. Keep the final cut below three minutes.

## Final submission checklist

- [ ] Push commits to the public repository.
- [ ] Confirm GitHub detects the root MIT `LICENSE` in the repository header.
- [ ] Confirm the public Vercel URL serves the new build without authentication.
- [ ] Repeat the judge workflow against production in the built-in browser.
- [ ] Record and upload the public YouTube demo with English audio, under three minutes.
- [ ] Replace the video placeholder above.
- [ ] Join the hackathon and complete every required Devpost field.
- [ ] Submit before September 3, 2026 at 1:00 PM Pacific Time.
