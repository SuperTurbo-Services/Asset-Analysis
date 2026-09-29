import { zodSchema } from 'ai';
import { gatherFacts, type Facts } from './facts';
import type { Lang } from './i18n';
import { assemble } from './payload';
import { SYSTEM, TRANSLATE_SYSTEM, userPrompt } from './prompt';
import { judgmentSchema, type Judgment, type RawJudgment } from './schema';
import { validate } from './validate';
import type { Dashboard } from './types';

/** Scheduled generation runs outside Workers, using the Cloudflare AI REST API. */
export const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const ACCOUNT_ID = '836cf1f9172ac577ef07b67206a768fe';
const GATEWAY_ID = 'superturbo-app';

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

const MAX_OUTPUT_TOKENS = 12_000;

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

type AiResult = {
  response?: unknown;
  choices?: { message?: { content?: unknown }; finish_reason?: string }[];
  usage?: { completion_tokens?: number };
};

async function callCloudflare(system: string, prompt: string): Promise<AiResult> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN is not set');
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'cf-aig-gateway-id': GATEWAY_ID,
      },
      body: JSON.stringify({
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.4,
      }),
    },
  );
  if (!response.ok) throw new Error(`Cloudflare AI returned HTTP ${response.status}`);
  const payload = await response.json() as { success?: boolean; result?: AiResult };
  if (!payload.success || !payload.result) throw new Error('Cloudflare AI returned no result');
  return payload.result;
}

async function tryObject(args: { system: string; prompt: string }) {
  const res = await callCloudflare(`${args.system}\n${JSON_RULES}`, args.prompt);
  const output = res.response ?? res.choices?.[0]?.message?.content ?? '';
  const content = typeof output === 'string' ? output : JSON.stringify(output);
  const finishReason = res.choices?.[0]?.finish_reason ?? 'unknown';

  const raw = extractJson(content);
  if (!raw) {
    return {
      ok: false as const,
      detail: `no JSON object found in the response. Finish reason ${finishReason}, ${res.usage?.completion_tokens ?? 0} output tokens.`,
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false as const,
      detail: `the JSON did not parse: ${(err as Error).message}. Finish reason ${finishReason}.`,
    };
  }

  const check = judgmentSchema.safeParse(parsedJson);
  if (!check.success) {
    const issues = check.error.issues
      .slice(0, 12)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    console.error('macro generate: schema mismatch', {
      finishReason,
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
