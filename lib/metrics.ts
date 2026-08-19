import type { Acc, Band, Dropped, Note, Report, StructKind, AccountTrend } from './types';

/* ── 三档基准线，依据见 references/scoring.md ───────────────
   标题封面吸引力用平台「封面点击率」口径：10% / 20% / 30%
   内容吸引力（涨粉÷观看）：0.5% / 1.5% / 3.0%
   粉丝转化率（涨粉÷曝光）：0.05% / 0.30% / 0.90%（由前两者相乘推导）   */
const TH = {
  cov: [10, 20, 30] as const,
  con: [0.5, 1.5, 3.0] as const,
  fan: [0.05, 0.3, 0.9] as const,
};

/** 分段线性映射：0→中等线 = 0–40 分，中等→良好 = 40–70，良好→优秀 = 70–100（封顶） */
export function score(v: number, [mid, good, exc]: readonly [number, number, number]): number {
  if (v < mid) return Math.max(0, (v / mid) * 40);
  if (v < good) return 40 + ((v - mid) / (good - mid)) * 30;
  return Math.min(100, 70 + ((v - good) / (exc - good)) * 30);
}

export function band(s: number): [string, Band] {
  if (s >= 70) return ['良好', 'good'];
  if (s >= 40) return ['中等', 'mid'];
  return ['较弱', 'weak'];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** 「2026年08月14日06时56分55秒」→ { date, hour } */
export function parseCnDate(raw: string): { date: string; hour: number } | null {
  const m = /(\d{4})年(\d{1,2})月(\d{1,2})日(?:(\d{1,2})时)?/.exec(String(raw ?? ''));
  if (!m) return null;
  const [, y, mo, d, h] = m;
  const pad = (x: string) => x.padStart(2, '0');
  return { date: `${y}-${pad(mo)}-${pad(d)}`, hour: h ? parseInt(h, 10) : 0 };
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

/** 笔记列表明细表的一行原始值 */
export interface RawNote {
  title: string;
  dt: string;
  fmt: string;
  imp: number;
  views: number;
  ctr: number;   // 导出表里是小数，如 0.145
  like: number;
  cmt: number;
  save: number;
  fol: number;
  shr: number;
  dwell: number;
}

export interface BuildOptions {
  exportDate: string;   // YYYY-MM-DD
  windowDays: number;   // 统计窗口，默认 30
  /** 发布不足这么多天的笔记进观察区，不打分不排名 */
  maturityDays?: number;
}

/**
 * 把导出表算成看板需要的全部指标。纯确定性计算，不产生任何文字结论。
 *
 * 三条闸门（见 README「口径」一节）：
 *  1. 成熟度  —— 龄 < maturityDays 进观察区，因为曝光结算比观看慢
 *  2. 低曝光  —— 曝光 < 600 且比值正常的，标样本不足，不判类型
 *  3. 空标题  —— 无法定位到具体笔记，整体剔除
 */
export function buildReport(
  raws: RawNote[],
  opts: BuildOptions,
  trend: AccountTrend | null = null,
): Report {
  const { exportDate, windowDays } = opts;
  const maturity = opts.maturityDays ?? 3;
  const startMs = Date.parse(exportDate + 'T00:00:00Z') - windowDays * 86400000;
  const start = new Date(startMs).toISOString().slice(0, 10);

  const notes: Note[] = [];
  const dropped: Dropped[] = [];

  for (const r of raws) {
    const d = parseCnDate(r.dt);
    if (!d) continue;
    if (d.date < start || d.date > exportDate) continue;

    const title = (r.title ?? '').trim();
    const imp = Number(r.imp) || 0;
    const views = Number(r.views) || 0;
    const fol = Number(r.fol) || 0;

    if (!title) {
      dropped.push({ date: d.date, imp: Math.round(imp), fol: Math.round(fol) });
      continue;
    }

    const covR = (Number(r.ctr) || 0) * 100;
    const linkR = imp ? (views / imp) * 100 : 0;
    const conR = views ? (fol / views) * 100 : 0;
    const fanR = imp ? (fol / imp) * 100 : 0;
    const ratio = covR ? linkR / covR : 0;
    const clicks = Math.round((covR / 100) * imp);
    const gap = Math.round(views - clicks);
    const age = daysBetween(d.date, exportDate);

    let structK: StructKind;
    if (age < maturity) structK = 'pending';
    else if (ratio > 1.35) structK = 'ext';
    else if (ratio < 0.85) structK = 'leak';
    else if (imp < 600) structK = 'thin';
    else structK = 'core';

    const NAMES: Record<StructKind, string> = {
      core: '推荐依赖型', leak: '点击流失型', ext: '搜索分享型',
      thin: '样本不足', pending: '未结算',
    };
    const fmtN = (n: number) => Math.round(n).toLocaleString('en-US');
    const READS: Record<StructKind, string> = {
      pending: `发布仅 ${age} 天，曝光还没结算完，比值现在不可用`,
      core: `观看 ${fmtN(views)} 次 ≈ 点击 ${fmtN(clicks)} 次，这篇的人基本全是从推荐页来的`,
      leak: `点击了 ${fmtN(clicks)} 次，只有 ${fmtN(views)} 次变成观看——${
        clicks ? Math.round((Math.abs(gap) / clicks) * 100) : 0
      }% 的人点了封面没等到内容就退了`,
      ext: `观看 ${fmtN(views)} 次是点击 ${fmtN(clicks)} 次的 ${ratio.toFixed(1)} 倍，约 ${fmtN(
        Math.max(0, gap),
      )} 次观看来自推荐页之外：搜索、个人主页或被人转发`,
      thin: `曝光只有 ${fmtN(imp)}，比值 ${ratio.toFixed(2)} 看着正常但样本太小，不作判定`,
    };

    const covS = Math.round(score(covR, TH.cov));
    const conS = Math.round(score(conR, TH.con));
    const fanS = Math.round(score(fanR, TH.fan));

    notes.push({
      title, date: d.date, hour: d.hour, fmt: r.fmt || '图文', age,
      imp: Math.round(imp), views: Math.round(views), fol: Math.round(fol),
      like: Math.round(Number(r.like) || 0), cmt: Math.round(Number(r.cmt) || 0),
      save: Math.round(Number(r.save) || 0), shr: Math.round(Number(r.shr) || 0),
      dwell: Math.round(Number(r.dwell) || 0),
      clicks, gap,
      covR: r1(covR), linkR: r1(linkR), conR: r3(conR), fanR: r3(fanR), ratio: r2(ratio),
      structK, struct: NAMES[structK], structRead: READS[structK],
      covS, conS, fanS,
      covBc: band(covS)[1], conBc: band(conS)[1], fanBc: band(fanS)[1],
    });
  }

  notes.sort((a, b) => (b.date + String(b.hour).padStart(2, '0')).localeCompare(a.date + String(a.hour).padStart(2, '0')));

  // 账号级只统计成熟笔记，观察区不参与
  const M = notes.filter((n) => n.structK !== 'pending');
  const sum = (f: (n: Note) => number) => M.reduce((s, n) => s + f(n), 0);
  const I = sum((n) => n.imp), V = sum((n) => n.views), F = sum((n) => n.fol), CL = sum((n) => n.clicks);

  const covR = I ? (CL / I) * 100 : 0;
  const linkR = I ? (V / I) * 100 : 0;
  const conR = V ? (F / V) * 100 : 0;
  const fanR = I ? (F / I) * 100 : 0;
  const covS = Math.round(score(covR, TH.cov));
  const conS = Math.round(score(conR, TH.con));
  const fanS = Math.round(score(fanR, TH.fan));

  const acc: Acc = {
    imp: I, clicks: CL, views: V, fol: F,
    covR: r1(covR), linkR: r1(linkR), conR: r3(conR), fanR: r3(fanR),
    ratio: CL ? r2(V / CL) : 0,
    covS, conS, fanS,
    covB: band(covS)[0], conB: band(conS)[0], fanB: band(fanS)[0],
    covBc: band(covS)[1], conBc: band(conS)[1], fanBc: band(fanS)[1],
    identity: r3((r1(linkR) * r3(conR)) / 100),
    viewPerFol: F ? Math.round(V / F) : 0,
  };

  const agg: Record<string, number> = {};
  for (const n of M) agg[n.structK] = (agg[n.structK] || 0) + 1;

  return {
    meta: {
      exportDate, start, end: exportDate,
      nScored: M.length,
      nPending: notes.length - M.length,
      nDropped: dropped.length,
      droppedImp: dropped.reduce((s, d) => s + d.imp, 0),
      droppedFol: dropped.reduce((s, d) => s + d.fol, 0),
      hasAccountTrend: !!trend,
    },
    acc, notes, dropped, agg, trend,
  };
}
