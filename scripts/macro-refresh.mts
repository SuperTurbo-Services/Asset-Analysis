import { mkdir, writeFile } from "node:fs/promises";
import { loadEnv } from "./env.mts";

loadEnv();

const { generateDashboard, MODEL } = await import("../lib/macro/generate");
const { writeDashboard } = await import("../lib/macro/store");
const { templateParts, embedPayload } = await import("../lib/macro/template");

if (!process.env.AI_GATEWAY_API_KEY) {
  console.error("AI_GATEWAY_API_KEY is not set. Put it in .env.local first.");
  process.exit(1);
}

const t0 = Date.now();
console.log(`  ..    pulling data and scoring with ${MODEL}`);

const { dashboard, attempts, warnings } = await generateDashboard();

for (const w of warnings) console.log(`  WARN  ${w}`);
await writeDashboard(dashboard);

// a standalone copy, so the page can be opened or screenshotted without Next
const { css, body, script } = await templateParts();
await mkdir(".cache", { recursive: true });
const html = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${dashboard.title}</title>
<style>${css}</style></head>
<body>${body}
<script id="payload" type="application/json">${embedPayload(dashboard)}</script>
<script>${script}</script>
</body></html>`;
await writeFile(".cache/macro-preview.html", html);

console.log(`  OK    ${attempts} attempt(s), ${Math.round((Date.now() - t0) / 1000)}s`);
console.log("  net   " + dashboard.assets.map((a) => `${a.name} ${a.verdict}${a.cap ? ` (${a.cap})` : ""}`).join(", "));
console.log("  wrote .cache/macro-dashboard.json and .cache/macro-preview.html");
