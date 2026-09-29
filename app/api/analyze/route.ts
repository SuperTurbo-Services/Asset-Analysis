import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  SYSTEM_NOTES, SYSTEM_SUGGESTIONS, buildNotesPrompt, buildSuggestionsPrompt,
} from '@/lib/prompt';
import {
  extractJson, normalizeSpacing, repairFixPrefixes, validateNotes, validateSuggestions, type Issue,
} from '@/lib/validate';
import type { Note, NoteAnalysis, Report, Suggestion } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** The Worker binding authenticates to Workers AI and routes through our Cloudflare AI Gateway. */
const MODEL = '@cf/zai-org/glm-5.3';
const GATEWAY_ID = 'superturbo-app';

/** Each request covers two notes so the model has room for complete JSON. */
const BATCH = 2;
const MAX_ATTEMPTS = 3;
const MAX_NOTES = 60;
const MAX_TOKENS = 7500;

interface ChatResponse {
  response?: unknown;
  choices?: { message?: { content?: unknown }; finish_reason?: string }[];
}

type Msg = { role: string; content: string };

async function callModel(messages: Msg[], signal: AbortSignal): Promise<string> {
  const env = getCloudflareContext().env as {
    AI?: { run: (model: string, input: object, options: object) => Promise<unknown> };
  };
  if (!env.AI) throw new Error('MISSING_BINDING');
  signal.throwIfAborted();
  const json = await new Promise<ChatResponse>((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new Error('ABORTED'));
    signal.addEventListener('abort', abort, { once: true });
    env.AI!.run(
      MODEL,
      { messages, reasoning_effort: 'low', temperature: 0.6, max_tokens: MAX_TOKENS },
      { gateway: { id: GATEWAY_ID, skipCache: true } },
    ).then(
      (result) => resolve(result as ChatResponse),
      (error) => reject(error),
    ).finally(() => signal.removeEventListener('abort', abort));
  });
  const choice = json.choices?.[0];
  const output = json.response ?? choice?.message?.content ?? '';
  const text = typeof output === 'string' ? output : JSON.stringify(output);
  if (!text) throw new Error('EMPTY_RESPONSE');
  if (choice?.finish_reason === 'length') throw new Error('TRUNCATED');
  return text;
}

/** 生成一次并校验，不过就把问题喂回去让它自己修，最多 MAX_ATTEMPTS 次 */
async function generate<T>(
  system: string,
  user: string,
  pick: (parsed: unknown) => T,
  check: (v: T) => Issue[],
  signal: AbortSignal,
): Promise<{ value: T } | { failed: string[] }> {
  const messages: Msg[] = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
  let last: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let value: T;
    let raw: unknown;
    try {
      const text = await callModel(messages, signal);
      raw = normalizeSpacing(extractJson(text));
      value = pick(raw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'UNKNOWN';
      if (msg === 'MISSING_BINDING') throw e;
      last = [`生成失败：${msg}`];
      if (attempt === MAX_ATTEMPTS) return { failed: last };
      continue;
    }

    const issues = check(value);
    if (!issues.length) return { value };

    last = issues.slice(0, 20).map((i) => `${i.where}：${i.what}`);
    if (attempt === MAX_ATTEMPTS) return { failed: last };

    messages.push({ role: 'assistant', content: JSON.stringify(raw) });
    messages.push({
      role: 'user',
      content: `上面的输出没有通过格式校验，问题如下：\n${last.join('\n')}\n\n请只修正这些问题，其余内容保持不变，重新输出完整的 JSON。`,
    });
  }
  return { failed: last };
}

/**
 * 模型常常不听话地多套一层（{"analysis": {...}} 或 {"notes": {...}}），
 * 与其重试不如直接解开。判据是：顶层只有一个键，且它的值是对象，
 * 而这个键不像笔记标题（笔记标题一定在本批的名单里）。
 */
function unwrap(raw: unknown, titles: string[]): Record<string, NoteAnalysis> {
  const out = unwrapLayer(raw, titles);
  // 模型会照抄提示词里的装饰形式，把《书名号》一起当成键，也会在中英之间补空格。
  // 键对不上就整篇作废，所以剥掉装饰再匹配一次。
  const key = (t: string) =>
    t.replace(/[《》「」『』"'“”‘’\s]/g, '').toLowerCase();
  const canon = new Map(titles.map((t) => [key(t), t]));
  const remapped: Record<string, NoteAnalysis> = {};
  for (const [k, v] of Object.entries(out)) {
    remapped[canon.get(key(k)) ?? k] = v as NoteAnalysis;
  }
  return remapped;
}

function unwrapLayer(raw: unknown, titles: string[]): Record<string, NoteAnalysis> {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  if (titles.some((t) => t in obj)) return obj as Record<string, NoteAnalysis>;
  for (const k of ['analysis', 'notes', 'data', 'result', '诊断']) {
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, NoteAnalysis>;
  }
  const keys = Object.keys(obj);
  if (keys.length === 1) {
    const v = obj[keys[0]];
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, NoteAnalysis>;
  }
  return obj as Record<string, NoteAnalysis>;
}

/**
 * 逐篇诊断。关键在于 **通过的篇目立刻锁定，只把没过的重新问一遍** ——
 * 之前整批全有或全无，一批 4 篇里 1 篇有问题就把另外 3 篇的好内容一起丢掉，
 * 实测四批各因不同原因失败时覆盖率会掉到 0。
 */
async function generateNotes(
  report: Report,
  batch: Note[],
  signal: AbortSignal,
): Promise<{ good: Record<string, NoteAnalysis>; failed: string[]; reason: string[] }> {
  const good: Record<string, NoteAnalysis> = {};
  let pending = [...batch];
  let lastIssues: string[] = [];
  const messages: Msg[] = [{ role: 'system', content: SYSTEM_NOTES }];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && pending.length; attempt++) {
    messages.push({
      role: 'user',
      content:
        attempt === 1
          ? buildNotesPrompt(report, pending)
          : `这些还没通过校验，请重写这 ${pending.length} 篇（其余已通过的不用再写）：\n${lastIssues.join('\n')}\n\n${buildNotesPrompt(report, pending)}`,
    });

    let parsed: Record<string, NoteAnalysis>;
    try {
      const text = await callModel(messages, signal);
      if (attempt === MAX_ATTEMPTS) console.error(`[analyze] 末次响应开头：${text.slice(0, 200)}`);
      parsed = repairFixPrefixes(
        unwrap(normalizeSpacing(extractJson(text)), pending.map((n) => n.title)),
        pending,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'UNKNOWN';
      if (msg === 'MISSING_BINDING') throw e;
      lastIssues = [`生成失败：${msg}`];
      console.error(`[analyze] 批次失败 attempt=${attempt} reason=${msg} notes=${pending.map((n) => n.title).join(',').slice(0, 120)}`);
      messages.pop();
      continue;
    }

    const stillBad: Note[] = [];
    lastIssues = [];
    for (const n of pending) {
      const cell = parsed[n.title];
      const iss = cell ? validateNotes({ [n.title]: cell }, [n]) : [{ where: n.title, what: '这一篇没写' }];
      if (cell && !iss.length) good[n.title] = cell;
      else {
        stillBad.push(n);
        lastIssues.push(...iss.slice(0, 4).map((i) => `${i.where}：${i.what}`));
      }
    }
    pending = stillBad;
    if (!pending.length) break;

    messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
  }

  if (pending.length) {
    console.error(`[analyze] 放弃 ${pending.length} 篇：${lastIssues.slice(0, 6).join(' ｜ ')}`);
  }
  return { good, failed: pending.map((n) => n.title), reason: lastIssues.slice(0, 6) };
}

export async function POST(req: NextRequest) {
  let report: Report;
  try {
    report = (await req.json()) as Report;
  } catch {
    return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const missing = (['acc', 'meta', 'agg'] as const).filter((k) => !report?.[k]);
  if (!Array.isArray(report?.notes) || missing.length) {
    return NextResponse.json(
      { error: `请求体不是完整的报告对象（缺少 ${missing.join('、') || 'notes'}）` },
      { status: 400 },
    );
  }

  const scored = report.notes.filter((n) => n?.structK !== 'pending');
  if (!scored.length) return NextResponse.json({ error: '没有可分析的笔记' }, { status: 400 });
  if (scored.length > MAX_NOTES) {
    return NextResponse.json(
      { error: `单次最多分析 ${MAX_NOTES} 篇，当前 ${scored.length} 篇。请缩短统计窗口。` },
      { status: 413 },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 270_000);

  try {
    const batches: Note[][] = [];
    for (let i = 0; i < scored.length; i += BATCH) batches.push(scored.slice(i, i + BATCH));

    // 各批与总建议全部并行，墙钟时间只等最慢的一路
    const jobs = [
      ...batches.map((b) =>
        generateNotes(report, b, controller.signal).then((r) => ({ kind: 'notes' as const, r })),
      ),
      generate(
        SYSTEM_SUGGESTIONS,
        buildSuggestionsPrompt(report),
        (p) => {
          const o = p as Record<string, unknown>;
          const v = o?.suggestions ?? o?.建议 ?? (Array.isArray(p) ? p : []);
          return (Array.isArray(v) ? v : []).map((item) => {
            const suggestion = item as Suggestion;
            return {
              ...suggestion,
              p: Array.isArray(suggestion.p)
                ? suggestion.p.map((step) => typeof step === 'string' && step.trim() && !step.trim().endsWith('。')
                  ? `${step.trim()}。`
                  : step)
                : suggestion.p,
            };
          }) as Suggestion[];
        },
        validateSuggestions,
        controller.signal,
      ).then((r) => ({ kind: 'sugs' as const, r })),
    ];

    const results = await Promise.all(jobs);

    const analysis: Record<string, NoteAnalysis> = {};
    let suggestions: Suggestion[] = [];
    const failures: string[] = [];

    for (const res of results) {
      if (res.kind === 'notes') {
        Object.assign(analysis, res.r.good);
        if (res.r.failed.length) {
          failures.push(...res.r.failed.map((t) => `${t}：未生成`), ...res.r.reason);
        }
      } else if ('failed' in res.r) {
        failures.push(...res.r.failed);
      } else {
        suggestions = res.r.value;
      }
    }

    // 只要拿到一部分就返回一部分 —— 缺的格子界面上显示「需要 AI 解读」，
    // 比整份失败对用户有用得多
    if (!Object.keys(analysis).length && !suggestions.length) {
      return NextResponse.json(
        { error: '生成结果多次未通过格式校验，已放弃以免给出不合规范的诊断。', issues: failures.slice(0, 20) },
        { status: 422 },
      );
    }

    if (failures.length) {
      console.error(`[analyze] 部分失败 ${Object.keys(analysis).length}/${scored.length}：${failures.slice(0, 30).join(' ｜ ')}`);
    }

    return NextResponse.json({
      analysis,
      suggestions,
      partial: failures.length > 0,
      covered: Object.keys(analysis).length,
      total: scored.length,
      issues: failures.slice(0, 30),
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'MISSING_BINDING') {
      return NextResponse.json({ error: 'AI 解读暂不可用：服务端未配置模型服务。' }, { status: 503 });
    }
    return NextResponse.json({ error: 'AI 解读遇到内部错误，基础报告不受影响。' }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }
}
