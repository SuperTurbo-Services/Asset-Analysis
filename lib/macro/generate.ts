import { gateway } from '@ai-sdk/gateway';
import { NoObjectGeneratedError, generateObject } from 'ai';
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
  for (const r of raw.reads ?? []) reads[r.key] = r.text;
  return {
    ...raw,
    stampNote: raw.stampNote ?? '',
    assets: raw.assets.map((a) => ({ ...a, cap: a.cap ?? '' })),
    reads,
  };
}

/**
 * Thinking tokens count against the output budget, so a tight cap truncates the
 * JSON and surfaces as a schema mismatch rather than as a length error.
 */
const MAX_OUTPUT_TOKENS = 32_000;

/**
 * A schema mismatch throws instead of returning an object, which would end the
 * run with nothing to retry on. This turns it into a normal failed attempt and
 * keeps the detail worth having: why it stopped, and what it actually wrote.
 */
async function tryObject(args: Parameters<typeof generateObject>[0]) {
  try {
    const { object } = await generateObject(args);
    return { ok: true as const, object };
  } catch (err) {
    if (!NoObjectGeneratedError.isInstance(err)) throw err;
    const finish = err.finishReason ?? 'unknown';
    const wrote = err.text ? `${err.text.length} characters` : 'nothing';
    const detail =
      `the model returned an object that did not match the schema. ` +
      `Finish reason ${finish}, it wrote ${wrote}` +
      (err.usage?.outputTokens ? `, ${err.usage.outputTokens} output tokens` : '') +
      '.';
    console.error('macro generate: no object', {
      finishReason: finish,
      usage: err.usage,
      textTail: err.text?.slice(-400),
    });
    return { ok: false as const, detail };
  }
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
    const got = await tryObject({
      model: gateway(MODEL),
      schema: judgmentSchema,
      system: SYSTEM,
      prompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      // No temperature or top_p on purpose. Current Claude models reject
      // sampling parameters outright.
    });
    if (!got.ok) {
      lastErrors = [got.detail];
      prompt = `${base}\n\nYour previous attempt failed: ${got.detail} Return the whole object again, complete and matching the schema.`;
      continue;
    }

    const judgment = keyReads(got.object as RawJudgment);
    const dashboard = assemble(facts, judgment, MODEL, 'en');
    const { errors, warnings } = validate(dashboard, facts);
    if (errors.length === 0) return { judgment, dashboard, attempts: attempt, warnings };

    lastErrors = errors;
    prompt =
      `${base}\n\nYour previous attempt failed validation. Fix every one of these and return the whole object again:\n` +
      errors.map((e) => `  ${e}`).join('\n');
  }

  throw new Error(`Scoring failed after ${maxAttempts} attempts:\n${lastErrors.join('\n')}`);
}

/**
 * Only prose crosses over from the translation. Verdicts, grid cells, factor
 * directions and every number are grafted back from the English judgment, so
 * the two languages cannot disagree about what the dashboard says.
 */
function graft(en: Judgment, zh: RawJudgment): Judgment {
  const zhReads: Record<string, string> = {};
  for (const r of zh.reads ?? []) zhReads[r.key] = r.text;

  return {
    regime: zh.regime || en.regime,
    stampNote: zh.stampNote ?? en.stampNote ?? '',
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
    const got = await tryObject({
      model: gateway(MODEL),
      schema: judgmentSchema,
      system: TRANSLATE_SYSTEM,
      prompt: `Translate this object into Simplified Chinese.\n\n${payload}${extra}`,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });
    if (!got.ok) {
      lastErrors = [got.detail];
      extra = `\n\nYour previous attempt failed: ${got.detail} Return the whole object again, complete and matching the schema.`;
      continue;
    }

    const dashboard = assemble(facts, graft(en, got.object as RawJudgment), MODEL, 'zh');
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
