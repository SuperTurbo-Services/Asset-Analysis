import type { Note, NoteAnalysis, Suggestion } from './types';

const CELLS = [
  'fanAlgo', 'fanBlog', 'fanFix',
  'covAlgo', 'covBlog', 'covFix',
  'conAlgo', 'conBlog', 'conFix',
] as const;

const DIMS = [
  { pre: 'fan', score: 'fanS' },
  { pre: 'cov', score: 'covS' },
  { pre: 'con', score: 'conS' },
] as const;

export interface Issue {
  where: string;
  what: string;
}

/** 两段文字的字符二元组重叠度，用来抓「算法视角和博主视角说的是同一件事」 */
function bigramOverlap(a: string, b: string): number {
  const grams = (s: string) => {
    const t = s.replace(/[\s，。、；：？！「」（）%0-9.]/g, '');
    const g = new Set<string>();
    for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2));
    return g;
  };
  const A = grams(a), B = grams(b);
  if (A.size < 4 || B.size < 4) return 0;
  let hit = 0;
  A.forEach((g) => { if (B.has(g)) hit++; });
  return hit / Math.min(A.size, B.size);
}

/**
 * 机械校验。便宜模型能不能用，全靠这一层 —— 失败就重试，
 * 重试三次的成本仍远低于一次顶配模型。
 */
/** 只校验一批笔记的诊断，供分批调用使用 */
export function validateNotes(
  analysis: Record<string, NoteAnalysis>,
  batch: Note[],
): Issue[] {
  const issues: Issue[] = [];
  const byTitle = new Map(batch.map((n) => [n.title, n]));

  if (!analysis || typeof analysis !== 'object') return [{ where: '整体', what: '不是对象' }];

  for (const n of batch) {
    if (!analysis[n.title]) issues.push({ where: n.title, what: '缺少这篇的诊断' });
  }
  for (const t of Object.keys(analysis)) {
    if (!byTitle.has(t)) issues.push({ where: t, what: '多出了这一批里没有的标题' });
  }

  for (const [title, o] of Object.entries(analysis)) {
    const n = byTitle.get(title);
    if (!n || !o) continue;
    const cell = o as NoteAnalysis;

    for (const k of CELLS) {
      const arr = (cell as unknown as Record<string, unknown>)[k];
      if (!Array.isArray(arr)) { issues.push({ where: `${title}.${k}`, what: '缺字段或不是数组' }); continue; }
      if (arr.length < 1 || arr.length > 3) issues.push({ where: `${title}.${k}`, what: `条数 ${arr.length}，应为 1–3` });
      for (const b of arr) {
        if (typeof b !== 'string' || !b.trim()) { issues.push({ where: `${title}.${k}`, what: '空条目' }); continue; }
        if ([...b].length > 75) issues.push({ where: `${title}.${k}`, what: `过长 ${[...b].length} 字` });
      }
    }

    for (const d of DIMS) {
      const s = n[d.score];
      const fix = (cell as unknown as Record<string, string[]>)[`${d.pre}Fix`];
      const algo = (cell as unknown as Record<string, string[]>)[`${d.pre}Algo`];
      const blog = (cell as unknown as Record<string, string[]>)[`${d.pre}Blog`];

      if (Array.isArray(fix) && fix.length) {
        const want = s >= 40 ? '保持：' : '修改：';
        if (!fix[0].startsWith(want)) {
          issues.push({ where: `${title}.${d.pre}Fix`, what: `分数 ${s}，首条应以「${want}」开头` });
        }
        if (s < 40 && fix.some((b) => b.startsWith('保持：'))) {
          issues.push({ where: `${title}.${d.pre}Fix`, what: `分数 ${s} < 40，不应出现「保持：」` });
        }
        for (const b of fix) {
          if (!b.startsWith('保持：') && !b.startsWith('修改：')) {
            issues.push({ where: `${title}.${d.pre}Fix`, what: '每条都必须以「保持：」或「修改：」开头' });
          }
        }
      }

      // 前缀只属于 *Fix，出现在诊断格里说明模型串了格式
      for (const [kind, arr] of [['Algo', algo], ['Blog', blog]] as const) {
        if (!Array.isArray(arr)) continue;
        for (const b of arr) {
          if (b.startsWith('保持：') || b.startsWith('修改：')) {
            issues.push({ where: `${title}.${d.pre}${kind}`, what: '「保持：」「修改：」只能用在综合建议格，诊断格不要带前缀' });
          }
        }
      }

      // 我们既没有封面图也没有正文，任何断言它们「现在是什么样」的话都是编造
      for (const [kind, arr] of [['Algo', algo], ['Blog', blog], ['Fix', fix]] as const) {
        if (!Array.isArray(arr)) continue;
        for (const b of arr) {
          const m = /(封面|正文|首图)(使用|采用|是|为|用了|做成了|已经)/.exec(b);
          if (m) {
            issues.push({ where: `${title}.${d.pre}${kind}`, what: `不要断言${m[1]}现在是什么样（看不到图和正文），只能说该改成什么样` });
          }
        }
      }

      // *Algo 整格必须有真实数字（样本不足的除外）
      if (Array.isArray(algo)) {
        const joined = algo.join('');
        if (!joined.includes('样本量不足') && !/\d/.test(joined)) {
          issues.push({ where: `${title}.${d.pre}Algo`, what: '整格没有任何数字' });
        }
      }

      // 两个视角不能说同一件事
      if (Array.isArray(algo) && Array.isArray(blog) && algo.length && blog.length) {
        const ov = bigramOverlap(algo.join(''), blog.join(''));
        if (ov > 0.55) {
          issues.push({ where: `${title}.${d.pre}`, what: `算法视角与博主视角重叠度 ${(ov * 100).toFixed(0)}%，说的是同一件事` });
        }
      }
    }
  }

  return issues;
}

/** 只校验总建议 */
export function validateSuggestions(sg: unknown): Issue[] {
  const issues: Issue[] = [];
  if (!Array.isArray(sg)) return [{ where: 'suggestions', what: '缺少或不是数组' }];
  if (sg.length < 3 || sg.length > 5) issues.push({ where: 'suggestions', what: `${sg.length} 条，应为 3–5 条` });
  sg.forEach((s: Suggestion, i: number) => {
    const at = `suggestions[${i}]`;
    if (!s?.h || typeof s.h !== 'string') issues.push({ where: at, what: '缺 h' });
    else if (s.h.endsWith('。')) issues.push({ where: at, what: 'h 不应带句号' });
    if (!s?.t || !String(s.t).includes('<b>')) issues.push({ where: at, what: 't 缺少 <b> 加粗的关键值' });
    if (!Array.isArray(s?.p) || s.p.length < 2 || s.p.length > 4) issues.push({ where: at, what: 'p 应为 2–4 条' });
    else if (s.p.some((p) => !String(p).endsWith('。'))) issues.push({ where: at, what: 'p 每条句末要有句号' });
    if (!s?.s || !String(s.s).startsWith('算法依据：')) issues.push({ where: at, what: 's 应以「算法依据：」开头' });
    if (typeof s?.s === 'string' && /https?:\/\/|<a\s/i.test(s.s)) {
      issues.push({ where: at, what: 's 里不允许出现链接（防编造来源）' });
    }
  });
  return issues;
}

/**
 * 中文与数字之间补空格。这是确定性的排版规则，自己补比让模型重试划算得多 ——
 * 实测把它做成校验规则会为一个排版细节丢掉近一半的篇目。
 */
export function normalizeSpacing<T>(v: T): T {
  const fix = (s: string) =>
    s
      .replace(/([\u4e00-\u9fa5])(\d)/g, '$1 $2')
      .replace(/(\d(?:\.\d+)?%?)([\u4e00-\u9fa5])/g, '$1 $2')
      .replace(/第 (\d+)/g, '第$1')
      .replace(/\s+/g, ' ')
      .trim();
  const walk = (x: unknown): unknown => {
    if (typeof x === 'string') return fix(x);
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      return Object.fromEntries(Object.entries(x).map(([k, val]) => [k, walk(val)]));
    }
    return x;
  };
  return walk(v) as T;
}

/** 模型有时会用 ```json 包裹，或在 JSON 前后带解释，这里做宽容提取 */
export function extractJson(text: string): unknown {
  const t = text.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(t);
  const body = fence ? fence[1] : t;
  const s = body.indexOf('{');
  const e = body.lastIndexOf('}');
  if (s < 0 || e <= s) throw new Error('响应里找不到 JSON 对象');
  return JSON.parse(body.slice(s, e + 1));
}
