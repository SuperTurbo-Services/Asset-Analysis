import { gateway } from "@ai-sdk/gateway";
import { loadEnv } from "./env.mts";

loadEnv();

if (!process.env.AI_GATEWAY_API_KEY) {
  console.error("AI_GATEWAY_API_KEY is not set. Put it in .env.local first.");
  process.exit(1);
}

const arg = (process.argv[2] ?? "").toLowerCase();
const { models } = await gateway.getAvailableModels();

const rows = models
  .filter((m) => m.modelType === "language")
  .filter((m) => !arg || m.id.toLowerCase().includes(arg))
  .sort((a, b) => a.id.localeCompare(b.id));

console.log(`${rows.length} language models${arg ? ` matching "${arg}"` : ""}:\n`);
for (const m of rows) console.log(`  ${m.id.padEnd(46)} ${m.name ?? ""}`);
console.log(`\nSet AI_GATEWAY_MODEL to one of these. Current default: ${process.env.AI_GATEWAY_MODEL || "zai/glm-4.7"}`);
