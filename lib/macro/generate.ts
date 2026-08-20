import { gateway } from '@ai-sdk/gateway';
import { generateText, zodSchema } from 'ai';
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
/**
 * zai/glm-4.7, not glm-5.3.
 *
 * Turbo asked for glm-5.3 and it cannot do this job. It always reasons, the
 * gateway exposes no way to cap that (`thinking: {type:'disabled'}` is refused
 * with "this model always engages in thinking", and neither a bare level nor
 * reasoning_effort is accepted), and on a prompt this long it spends every
 * available output token thinking: 16000 tokens and 278 seconds produced an
 * empty text field. glm-5.2-fast behaves the same way.
 *
 * glm-4.7 returns the whole object in about 7 seconds. Override with
 * AI_GATEWAY_MODEL if the provider ever fixes the reasoning cap.
 */
export const MODEL = process.env.AI_GATEWAY_MODEL || 'zai/glm-4.7';

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
 * Reasoning tokens count against the output budget on models that think, so a
 * tight cap truncates the JSON and surfaces as a schema mismatch rather than as
 * a length error. Providers cap this differently, so it is overridable: if the
 * gateway rejects the request outright, lower it.
 */
const MAX_OUTPUT_TOKENS = Number(process.env.AI_GATEWAY_MAX_TOKENS) || 12_000;

/** The exact shape the model has to return, so the prompt cannot drift from the schema. */
const SHAPE = JSON.stringify(zodSchema(judgmentSchema).jsonSchema);

const JSON_RULES = `
OUTPUT FORMAT
Return one JSON object and nothing else. No prose before or after it, no markdown fences, no explanation. It must validate against this JSON Schema:

${SHAPE}`;

/** First balanced brace span, so leading prose or a stray fence cannot break parsing. */
function extractJson(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\') { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

/**
 * Deliberately not generateObject.
 *
 * Structured output through the gateway is provider dependent, and the model
 * Turbo picked fails it outright: a three field schema returned
 * NoObjectGeneratedError after 36 seconds, while the same model returns clean
 * JSON as plain text in 2. So the JSON Schema goes in the prompt, and parsing
 * and validation happen here, where a failure is a retryable attempt carrying
 * the exact reason rather than an exception with nothing to act on.
 */
async function tryObject(args: { system: string; prompt: string }) {
  const res = await generateText({
    model: gateway(MODEL),
    system: `${args.system}\n${JSON_RULES}`,
    prompt: args.prompt,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    // one gateway level retry, not three, or a slow model turns a bad run into
    // a ten minute one
    maxRetries: 1,
  });

  const raw = extractJson(res.text);
  if (!raw) {
    return {
      ok: false as const,
      detail: `no JSON object found in the response. Finish reason ${res.finishReason}, ${res.usage?.outputTokens ?? 0} output tokens.`,
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false as const,
      detail: `the JSON did not parse: ${(err as Error).message}. Finish reason ${res.finishReason}.`,
    };
  }

  const check = judgmentSchema.safeParse(parsedJson);
  if (!check.success) {
    const issues = check.error.issues
      .slice(0, 12)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    console.error('macro generate: schema mismatch', {
      finishReason: res.finishReason,
      usage: res.usage,
      issues,
    });
    return {
      ok: false as const,
      detail: `the JSON did not match the schema: ${issues.join('; ')}.`,
    };
  }

  return { ok: true as const, object: check.data };
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
    const got = await tryObject({ system: SYSTEM, prompt });
    if (!got.ok) {
      lastErrors = [got.detail];
      prompt = `${base}\n\nYour previous attempt failed: ${got.detail} Return the whole object again, complete and matching the schema.`;
      continue;
    }

    const judgment = keyReads(got.object);
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
      system: TRANSLATE_SYSTEM,
      prompt: `Translate this object into Simplified Chinese.\n\n${payload}${extra}`,
    });
    if (!got.ok) {
      lastErrors = [got.detail];
      extra = `\n\nYour previous attempt failed: ${got.detail} Return the whole object again, complete and matching the schema.`;
      continue;
    }

    const dashboard = assemble(facts, graft(en, got.object), MODEL, 'zh');
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
  // 三次而不是两次：模型偶尔会把网格和结论算不一致，重试带着具体错误
  // 回去通常第二三次就对了
  const maxAttempts = opts.maxAttempts ?? (Number(process.env.AI_MAX_ATTEMPTS) || 3);

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
