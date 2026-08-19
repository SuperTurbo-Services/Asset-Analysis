import { gateway } from "@ai-sdk/gateway";
import { generateObject } from "ai";
import { gatherFacts, type Facts } from "./facts";
import { assemble } from "./payload";
import { SYSTEM, userPrompt } from "./prompt";
import { judgmentSchema, type Judgment, type RawJudgment } from "./schema";
import { validate } from "./validate";
import type { Dashboard } from "./types";

/**
 * Routed through the Vercel AI Gateway, so the only credential this app needs
 * is AI_GATEWAY_API_KEY. Run `npm run models` to see what your gateway exposes.
 */
export const MODEL = process.env.AI_GATEWAY_MODEL || "anthropic/claude-sonnet-5";

function keyReads(raw: RawJudgment): Judgment {
  const reads: Record<string, string> = {};
  for (const r of raw.reads) reads[r.key] = r.text;
  return { ...raw, reads };
}

export type GenerateResult = {
  dashboard: Dashboard;
  facts: Facts;
  attempts: number;
  warnings: string[];
};

/**
 * One pass of: pull the data, score it, assemble the page, validate. A failed
 * validation is handed back to the model once with the exact errors, which is
 * cheaper and more reliable than trying to repair the text in code.
 */
export async function generateDashboard(
  opts: { facts?: Facts; maxAttempts?: number } = {},
): Promise<GenerateResult> {
  const facts = opts.facts ?? (await gatherFacts());
  const maxAttempts = opts.maxAttempts ?? 2;
  const base = userPrompt(facts);
  let prompt = base;
  let lastErrors: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { object } = await generateObject({
      model: gateway(MODEL),
      schema: judgmentSchema,
      system: SYSTEM,
      prompt,
      maxOutputTokens: 8000,
      // No temperature or top_p on purpose. Current Claude models reject
      // sampling parameters outright.
    });

    const dashboard = assemble(facts, keyReads(object), MODEL);
    const { errors, warnings } = validate(dashboard, facts);
    if (errors.length === 0) {
      return { dashboard, facts, attempts: attempt, warnings };
    }

    lastErrors = errors;
    prompt =
      `${base}\n\nYour previous attempt failed validation. Fix every one of these and return the whole object again:\n` +
      errors.map((e) => `  ${e}`).join("\n");
  }

  throw new Error(
    `Validation failed after ${maxAttempts} attempts:\n${lastErrors.join("\n")}`,
  );
}
