import { gateway } from '@ai-sdk/gateway';
import { generateObject } from 'ai';
import { gatherFacts, type Facts } from './facts';
import type { Lang } from './i18n';
import { assemble } from './payload';
import { SYSTEM, TRANSLATE_SYSTEM, userPrompt } from './prompt';
import { judgmentSchema, type Judgment, type RawJudgment } from './schema';
import { validate } from './validate';
import type { Dashboard } from './types';

/**
 * Routed through the Vercel AI Gateway, so the only credential this app needs is
 * AI_GATEWAY_API_KEY. Run `npm run macro:models` to see what your gateway has.
 */
export const MODEL = process.env.AI_GATEWAY_MODEL || 'anthropic/claude-sonnet-5';

function keyReads(raw: RawJudgment): Judgment {
  const reads: Record<string, string> = {};
  for (const r of raw.reads) reads[r.key] = r.text;
  return { ...raw, reads };
}

export type Bundle = { en: Dashboard; zh: Dashboard };

export type GenerateResult = {
  bundle: Bundle;
  facts: Facts;
  attempts: number;
  warnings: string[];
};

async function score(facts: Facts, maxAttempts: number) {
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

    const judgment = keyReads(object);
    const dashboard = assemble(facts, judgment, MODEL, 'en');
    const { errors, warnings } = validate(dashboard, facts);
    if (errors.length === 0) return { judgment, dashboard, attempts: attempt, warnings };

    lastErrors = errors;
    prompt =
      `${base}\n\nYour previous attempt failed validation. Fix every one of these and return the whole object again:\n` +
      errors.map((e) => `  ${e}`).join('\n');
  }

  throw new Error(`Validation failed after ${maxAttempts} attempts:\n${lastErrors.join('\n')}`);
}

/**
 * Only prose crosses over from the translation. Verdicts, grid cells, factor
 * directions and every number are grafted back from the English judgment, so
 * the two languages cannot disagree about what the dashboard says.
 */
function graft(en: Judgment, zh: RawJudgment): Judgment {
  const zhReads: Record<string, string> = {};
  for (const r of zh.reads) zhReads[r.key] = r.text;

  return {
    regime: zh.regime || en.regime,
    stampNote: zh.stampNote ?? '',
    banner: zh.banner || en.banner,
    assets: en.assets.map((a, i) => {
      const t = zh.assets[i];
      return {
        name: a.name,
        verdict: a.verdict,
        cap: a.cap,
        one: t?.one || a.one,
        qual: t?.qual || a.qual,
        factors: a.factors.map((f, k) => ({
          s: f.s,
          h: t?.factors?.[k]?.h || f.h,
          b: t?.factors?.[k]?.b || f.b,
        })),
      };
    }),
    matrix: en.matrix.map((r, i) => ({
      f: zh.matrix[i]?.f || r.f,
      r: zh.matrix[i]?.r || r.r,
      c: r.c,
    })),
    reads: Object.fromEntries(
      Object.entries(en.reads).map(([k, v]) => [k, zhReads[k] || v]),
    ),
  };
}

async function translate(facts: Facts, en: Judgment, maxAttempts: number) {
  const payload = JSON.stringify(
    {
      regime: en.regime, stampNote: en.stampNote, banner: en.banner,
      assets: en.assets, matrix: en.matrix,
      reads: Object.entries(en.reads).map(([key, text]) => ({ key, text })),
    },
    null,
    1,
  );
  let extra = '';
  let lastErrors: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { object } = await generateObject({
      model: gateway(MODEL),
      schema: judgmentSchema,
      system: TRANSLATE_SYSTEM,
      prompt: `Translate this object into Simplified Chinese.\n\n${payload}${extra}`,
      maxOutputTokens: 8000,
    });

    const dashboard = assemble(facts, graft(en, object), MODEL, 'zh');
    const { errors, warnings } = validate(dashboard, facts);
    if (errors.length === 0) return { dashboard, attempts: attempt, warnings };

    lastErrors = errors;
    extra =
      '\n\nYour previous translation failed validation. Fix every one of these and return the whole object again:\n' +
      errors.map((e) => `  ${e}`).join('\n');
  }

  throw new Error(`Translation failed after ${maxAttempts} attempts:\n${lastErrors.join('\n')}`);
}

/**
 * One pass of: pull the data, score it, translate it, assemble both pages,
 * validate each. A failed validation goes back to the model once with the exact
 * errors, which is cheaper and more reliable than repairing text in code.
 */
export async function generateDashboard(
  opts: { facts?: Facts; maxAttempts?: number } = {},
): Promise<GenerateResult> {
  const facts = opts.facts ?? (await gatherFacts());
  const maxAttempts = opts.maxAttempts ?? 2;

  const scored = await score(facts, maxAttempts);
  const translated = await translate(facts, scored.judgment, maxAttempts);

  return {
    bundle: { en: scored.dashboard, zh: translated.dashboard },
    facts,
    attempts: scored.attempts + translated.attempts,
    warnings: [
      ...scored.warnings,
      ...translated.warnings.map((w) => `zh: ${w}`),
    ],
  };
}
