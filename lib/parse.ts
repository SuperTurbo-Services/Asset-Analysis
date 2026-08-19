import * as XLSX from 'xlsx';
import type { AccountTrend, TrendPoint } from './types';
import type { RawNote } from './metrics';
import { parseCnDate } from './metrics';

/**
 * 解析全部在浏览器里完成 —— 用户上传的原始导出表从不离开他们的设备，
 * 只有算好的指标（不含原始文件）才会发到服务端做 AI 解读。
 */

const NOTE_COLS = [
  'title', 'dt', 'fmt', 'imp', 'views', 'ctr',
  'like', 'cmt', 'save', 'fol', 'shr', 'dwell', 'danmu',
] as const;

const num = (v: unknown): number => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

export class ParseError extends Error {}

/** 解析「笔记列表明细表.xlsx」 */
export function parseNotes(buf: ArrayBuffer): RawNote[] {
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new ParseError('这个文件里没有工作表，确认是不是从创作者中心导出的原表。');

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });

  // 导出表首行是说明文字，第二行才是表头
  const head = rows.findIndex((r) => Array.isArray(r) && String(r[0] ?? '').trim() === '笔记标题');
  if (head < 0) {
    throw new ParseError(
      '没找到「笔记标题」表头。请确认上传的是创作者中心 → 数据中心 → 笔记数据导出的「笔记列表明细表」，不要改动表头。',
    );
  }

  const out: RawNote[] = [];
  for (const r of rows.slice(head + 1)) {
    if (!Array.isArray(r) || r.every((x) => x === null || x === '')) continue;
    const d: Record<string, unknown> = {};
    NOTE_COLS.forEach((k, i) => (d[k] = r[i]));
    if (!parseCnDate(String(d.dt ?? ''))) continue;
    out.push({
      title: String(d.title ?? '').trim(),
      dt: String(d.dt ?? ''),
      fmt: String(d.fmt ?? '图文').trim(),
      imp: num(d.imp), views: num(d.views), ctr: num(d.ctr),
      like: num(d.like), cmt: num(d.cmt), save: num(d.save),
      fol: num(d.fol), shr: num(d.shr), dwell: num(d.dwell),
    });
  }
  if (!out.length) throw new ParseError('表里没有可解析的笔记行。');
  return out;
}

/** 解析「近30日观看数据.xlsx」（可选，用于账号级日趋势） */
export function parseAccountTrend(buf: ArrayBuffer): AccountTrend {
  const wb = XLSX.read(buf, { type: 'array' });

  const readPairs = (name: string): Map<string, number> => {
    const ws = wb.Sheets[name];
    const m = new Map<string, number>();
    if (!ws) return m;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
    for (const r of rows.slice(1)) {
      if (!Array.isArray(r) || r[0] == null) continue;
      m.set(String(r[0]), num(r[1]));
    }
    return m;
  };

  const totalsRaw = readPairs('账号总体观看数据');
  const totals: Record<string, number> = {};
  totalsRaw.forEach((v, k) => (totals[k] = v));

  const imp = readPairs('曝光趋势');
  const views = readPairs('观看趋势');
  const ctr = readPairs('封面点击率趋势');
  const dwell = readPairs('平均观看时长趋势');
  const finish = readPairs('视频完播率趋势');

  const daily: TrendPoint[] = [];
  for (const key of imp.keys()) {
    const d = parseCnDate(key);
    if (!d) continue;
    daily.push({
      date: d.date,
      imp: imp.get(key) ?? 0,
      views: views.get(key) ?? 0,
      ctr: ctr.get(key) ?? 0,
      dwell: dwell.get(key) ?? 0,
      finish: finish.get(key) ?? 0,
    });
  }
  daily.sort((a, b) => a.date.localeCompare(b.date));

  // 导出前一天的日数据尚未结算 —— 观看/曝光 会异常偏高，画图时要虚化
  const unsettledDate = daily.length ? daily[daily.length - 1].date : null;

  return { totals, daily, unsettledDate };
}

/** 从笔记表推断导出日期：取最新一篇的发布日与今天里较晚的那个 */
export function inferExportDate(raws: RawNote[]): string {
  const today = new Date().toISOString().slice(0, 10);
  let latest = '';
  for (const r of raws) {
    const d = parseCnDate(r.dt);
    if (d && d.date > latest) latest = d.date;
  }
  return latest && latest > today ? latest : today;
}
