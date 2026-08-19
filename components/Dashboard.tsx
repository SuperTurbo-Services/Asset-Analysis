'use client';

import { useMemo, useState } from 'react';
import type { Analysis, Band, Note, Report, StructKind } from '@/lib/types';

const nf = (n: number) => n.toLocaleString('en-US');
const BAND: Record<Band, string> = { good: '良好', mid: '中等', weak: '较弱' };

/** 比值轴的分段刻度：让正常区间（0.85–1.35）占中间 35% */
function pos(r: number): number {
  if (r < 0.85) return Math.max(0, (r - 0.6) / 0.25) * 30;
  if (r <= 1.35) return 30 + ((r - 0.85) / 0.5) * 35;
  return 65 + Math.min(1, (r - 1.35) / 2.65) * 35;
}

const DIMS = [
  {
    id: 'fan', name: '粉丝转化率', s: 'fanS', b: 'fanBc',
    boxes: (n: Note) => [
      ['涨粉', String(n.fol)], ['曝光', nf(n.imp)], ['观看', nf(n.views)],
      ['涨粉/曝光', `${n.fanR}%`], ['得分', `${n.fanS}/100`],
    ],
  },
  {
    id: 'cov', name: '标题封面吸引力', s: 'covS', b: 'covBc',
    boxes: (n: Note) => [
      ['平台点击率', `${n.covR}%`], ['曝光', nf(n.imp)], ['观看', nf(n.views)],
      ['流量结构', n.ratio.toFixed(2)], ['得分', `${n.covS}/100`],
    ],
  },
  {
    id: 'con', name: '内容吸引力', s: 'conS', b: 'conBc',
    boxes: (n: Note) => [
      ['涨粉/观看', `${n.conR}%`], ['人均观看', `${n.dwell} 秒`], ['点赞', String(n.like)],
      ['评论', String(n.cmt)], ['分享', String(n.shr)], ['得分', `${n.conS}/100`],
    ],
  },
] as const;

const COLS = [
  { k: 'title', label: '笔记', cls: '' },
  { k: 'date', label: '日期', cls: 'r hide-sm' },
  { k: 'fol', label: '涨粉量', cls: 'r' },
  { k: 'fanS', label: '粉丝转化率', cls: 'r' },
  { k: 'covS', label: '标题封面', cls: 'r hide-sm' },
  { k: 'conS', label: '内容吸引力', cls: 'r hide-sm' },
] as const;

export default function Dashboard({
  report,
  analysis,
}: {
  report: Report;
  analysis: Analysis | null;
}) {
  const { acc, meta, agg } = report;
  const scored = useMemo(() => report.notes.filter((n) => n.structK !== 'pending'), [report]);
  const pending = useMemo(() => report.notes.filter((n) => n.structK === 'pending'), [report]);
  const withFol = scored.filter((n) => n.fol > 0).length;

  const [tab, setTab] = useState<'all' | 'fan' | 'cov' | 'con'>('all');
  const [sortKey, setSortKey] = useState<string>('fol');
  const [sortDir, setSortDir] = useState<-1 | 1>(-1);
  const [detDir, setDetDir] = useState<-1 | 1>(1);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const overviewList = useMemo(() => {
    const l = [...scored];
    l.sort((a, b) => {
      const A = (a as unknown as Record<string, string | number>)[sortKey];
      const B = (b as unknown as Record<string, string | number>)[sortKey];
      if (typeof A === 'string') return sortDir * String(A).localeCompare(String(B));
      return sortDir * ((A as number) - (B as number)) || b.covR - a.covR;
    });
    return l;
  }, [scored, sortKey, sortDir]);

  const clickHead = (k: string) => {
    if (k === sortKey) setSortDir((d) => (d === -1 ? 1 : -1));
    else { setSortKey(k); setSortDir(k === 'title' || k === 'date' ? 1 : -1); }
  };

  const gate = (name: string, sc: number, bandTxt: string, bc: Band, raw: string) => (
    <div className="gate">
      <div className="gname">{name}</div>
      <div className="grate mono" style={{ color: `var(--${bc})` }}>{raw}</div>
      <span className={`chip ${bc}`}>{bandTxt} {sc}</span>
    </div>
  );

  return (
    <>
      <header>
        <ul className="intro">
          <li>
            <b>算法专家诊断：</b>依据小红书 2026 年现行分发机制建模：CES 综合评分（关注 8 分、评论 4 分、点赞与收藏各 1
            分）、流量池分层晋级与冷启动门槛、封面点击率闸门、停留时长与完读率权重、搜索流量占比 50%+ 下的关键词五位布局。
          </li>
          <li>
            <b>专业博主诊断：</b>综合 2026 年公开实操复盘，覆盖体量从 1,000 粉到 12 万粉的博主与运营者，含 300+
            篇爆款拆解、封面与标题实测、转粉率提升与笔记重发等一线经验。
          </li>
        </ul>
        <h1>
          <span className="kicker">算法专家 + 专业博主诊断</span>
          {acc.conS < 40 && acc.covS >= 70
            ? '曝光够、点击够，人到了门口就走了'
            : '这段时间的涨粉，卡在哪一段'}
        </h1>
        <p className="sub">
          统计窗口内被推了 {nf(acc.imp)} 次，{nf(acc.clicks)} 人点开了封面，{nf(acc.views)}{' '}
          人真的看了内容——最后留下 {nf(acc.fol)} 个关注。
        </p>
        <div className="scope">
          <span className="tag">统计口径 <b className="mono">{meta.start} → {meta.end}</b></span>
          <span className="tag">计分 <b className="mono">{meta.nScored}</b> 篇</span>
          <span className="tag">观察区 <b className="mono">{meta.nPending}</b> 篇</span>
          {meta.nDropped > 0 && (
            <span className="tag">剔除无标题 <b className="mono">{meta.nDropped}</b> 篇</span>
          )}
          <span className="tag">点击率口径 <b>平台封面点击率</b></span>
        </div>
      </header>

      {/* ── 漏斗与评分 ─────────────────────── */}
      <section>
        <div className="sec-head"><span className="eyebrow">Funnel</span><h2>漏斗与评分</h2></div>
        <p className="sec-note">
          先看这段时间到底涨了多少粉，再看粉是在哪一段漏掉的。两个灰色关卡各打一次分，中间那个不打分，只显示流量来源。下面三张卡是三项百分制的完整口径。
        </p>
        <div className="rig">
          <div className="headline">
            <span className="hl">绝对涨粉量<b>该时段新增关注</b></span>
            <span className="hn mono">{nf(acc.fol)}</span>
            <span className="hd">
              共 {scored.length} 篇计分笔记<br />
              其中 {withFol} 篇涨到过粉，{scored.length - withFol} 篇为 0
            </span>
          </div>
          <div className="funnel">
            <div className="stn">
              <div className="lab">曝光</div>
              <div className="num mono">{nf(acc.imp)}</div>
              <div className="fine">笔记被推到人眼前</div>
            </div>
            {gate('封面点击率', acc.covS, acc.covB, acc.covBc, `${acc.covR}%`)}
            <div className="stn">
              <div className="lab">点击</div>
              <div className="num mono">{nf(acc.clicks)}</div>
              <div className="fine">封面骗到了这么多人</div>
            </div>
            <div className="gate">
              <div className="gname">流量结构</div>
              <div className="grate mono">{acc.ratio.toFixed(2)}</div>
              <span className="chip flat">{agg.core || 0} / {scored.length} 推荐依赖</span>
            </div>
            <div className="stn">
              <div className="lab">观看</div>
              <div className="num mono">{nf(acc.views)}</div>
              <div className="fine">真的看了内容</div>
            </div>
            {gate('转粉率', acc.conS, acc.conB, acc.conBc, `${acc.conR}%`)}
            <div className="stn terminal">
              <div className="lab">涨粉</div>
              <div className="num mono">{nf(acc.fol)}</div>
              <div className="fine">
                {acc.viewPerFol ? `每 ${nf(acc.viewPerFol)} 次观看换 1 个关注` : '窗口内没有涨粉'}
              </div>
            </div>
          </div>
        </div>

        <div className="cards">
          {[
            { h: '粉丝转化率', s: acc.fanS, b: acc.fanB, c: acc.fanBc, raw: `涨粉 ÷ 曝光 = ${acc.fanR}%`,
              def: '全程总分。中等线 0.05%、良好线 0.30%、优秀线 0.90%，由下面两段相乘推导。' },
            { h: '标题封面吸引力', s: acc.covS, b: acc.covB, c: acc.covBc, raw: `平台封面点击率 = ${acc.covR}%`,
              def: '漏斗前半段：有没有骗到点击。中等 10%、良好 20%、优秀 30%，来自平台均值 11% 与优秀线 25%。' },
            { h: '内容吸引力', s: acc.conS, b: acc.conB, c: acc.conBc, raw: `涨粉 ÷ 观看 = ${acc.conR}%`,
              def: '漏斗后半段：点进来的人愿不愿意关注。中等 0.5%、良好 1.5%、优秀 3.0%。' },
          ].map((d) => (
            <div className="card" key={d.h}>
              <div className="ttl"><h3>{d.h}</h3><span className={`chip ${d.c}`}>{d.b}</span></div>
              <div className="val">
                <span className="score mono" style={{ color: `var(--${d.c})` }}>{d.s}</span>
                <span className="of">/ 100</span>
              </div>
              <div className="raw mono">{d.raw}</div>
              <div className="meter"><i className={d.c} style={{ width: `${d.s}%` }} /></div>
              <div className="def">{d.def}</div>
            </div>
          ))}
        </div>

        <div className="ident">
          <span><b>恒等式校验</b></span>
          <span className="mono">观看/曝光 {acc.linkR}% × 转粉率 {acc.conR}% = {acc.identity}%</span>
          <span className="mono">≈ 粉丝转化率 {acc.fanR}%</span>
          <span style={{ color: 'var(--muted)' }}>
            总分严格等于前后两段相乘，所以 {acc.fanS} 分这个结果，完全发生在
            {acc.covS >= acc.conS ? '后半段' : '前半段'}。
          </span>
        </div>
      </section>

      {/* ── 流量结构 ───────────────────────── */}
      <section>
        <div className="sec-head">
          <span className="eyebrow">Traffic type</span>
          <h2>流量结构：这篇的人是从哪来的</h2>
        </div>
        <p className="sec-note">
          平台报的「封面点击率」只数发现页上的封面点击，而「观看量」把搜索、个人主页、被转发出去产生的观看都算进来。所以拿观看数去比点击数，就能看出一篇笔记的人到底从哪来。轴上每一竖线是一篇笔记。
        </p>
        <div className="axis-box">
          <div className="axis-top">
            <div><div className="h">← 观看比点击少</div><div className="d">点了封面却没变成观看，人在门口跑了</div></div>
            <div className="c"><div className="h">观看 ≈ 点击</div><div className="d">来的人全是推荐页给的</div></div>
            <div className="rgt"><div className="h">观看比点击多 →</div><div className="d">推荐之外还有人从别处找来</div></div>
          </div>
          <div className="axis">
            <div className="zones">
              <span className="z-leak" style={{ width: '30%' }} />
              <span className="z-core" style={{ width: '35%' }} />
              <span className="z-ext" style={{ width: '35%' }} />
            </div>
            <div className="center" style={{ left: `${pos(1)}%` }} />
            {([[0.6, '0.6'], [0.85, '0.85'], [1, '1.00'], [1.35, '1.35'], [4, '4.0×']] as [number, string][]).map(
              ([v, l]) => <div key={l} className="axis-lab mono" style={{ left: `${pos(v)}%` }}>{l}</div>,
            )}
            {scored.map((n) => (
              <div
                key={n.title + n.date}
                className={`tick ${n.structK}`}
                style={{ left: `${pos(n.ratio)}%` }}
                title={`${n.title} · ${n.struct} · 比值 ${n.ratio.toFixed(2)}`}
              />
            ))}
          </div>
          <div className="axis-legend">
            {(['leak', 'core', 'ext', 'thin'] as StructKind[]).map((k) => {
              const label = { leak: '点击流失型', core: '推荐依赖型', ext: '搜索分享型', thin: '样本不足' }[k as 'leak'];
              const color = { leak: 'var(--weak)', core: 'var(--accent)', ext: 'var(--mid)', thin: 'var(--muted)' }[k as 'leak'];
              return (
                <div key={k}>
                  <i className="dot" style={{ background: color, opacity: k === 'thin' ? 0.45 : 1 }} />
                  {label} <span className="mono">{agg[k] || 0} 篇</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 综合建议 ───────────────────────── */}
      <section>
        <div className="sec-head"><span className="eyebrow">Actions</span><h2>综合建议</h2></div>
        <p className="sec-note">
          按杠杆从大到小排序，不是按发现顺序。每条都是可以今天就动手的动作，附触发它的看板数字和依据。
        </p>
        {analysis?.suggestions?.length ? (
          <div className="sugs">
            {analysis.suggestions.map((s, i) => (
              <div className="sug" key={i}>
                <div><span className="rank">{i + 1}</span></div>
                <div>
                  <h3>{s.h}</h3>
                  <p className="trig" dangerouslySetInnerHTML={{ __html: s.t }} />
                  <ol>{s.p.map((p, j) => <li key={j}>{p}</li>)}</ol>
                  <p className="basis">{s.s}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="watch">
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>
              这一节需要 AI 解读。上面的所有数字、评分和分类都是本地算出来的，不依赖模型。
            </p>
          </div>
        )}
      </section>

      {/* ── 逐篇分析 ───────────────────────── */}
      <section>
        <div className="sec-head"><span className="eyebrow">Per note</span><h2>逐篇分析</h2></div>
        <p className="sec-note">
          涨粉总览的六个表头都可以点，同一表头再点一次反向排序，默认按涨粉量降序；点任意一行展开看流量结构与互动明细。后面三个标签默认按该维度分数从高到低，标签上方的按钮可以切换成从低到高，同分时按点击率、再按停留时长。
        </p>
        <div className="tabs" role="tablist">
          {([['all', '涨粉总览'], ['fan', '粉丝转化率'], ['cov', '标题封面吸引力'], ['con', '内容吸引力']] as const).map(
            ([id, name]) => (
              <button
                key={id} type="button" role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
              >
                {name}<span className="n mono">{scored.length}</span>
              </button>
            ),
          )}
        </div>

        {tab === 'all' ? (
          <div className="tbl">
            <div className="thead">
              {COLS.map((c) => (
                <div className={c.cls} key={c.k}>
                  <button
                    type="button"
                    aria-sort={c.k === sortKey ? (sortDir < 0 ? 'descending' : 'ascending') : undefined}
                    onClick={() => clickHead(c.k)}
                  >
                    {c.label}
                    <span className="ar">{c.k === sortKey ? (sortDir < 0 ? '▼' : '▲') : '⇅'}</span>
                  </button>
                </div>
              ))}
              <div />
            </div>
            <div>
              {overviewList.map((n) => {
                const key = n.title + n.date;
                const isOpen = !!open[key];
                const max = Math.max(n.imp, 1);
                const w = (v: number) => `${((v / max) * 100).toFixed(2)}%`;
                return (
                  <div key={key}>
                    <button
                      type="button" className="trow" aria-expanded={isOpen}
                      onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
                    >
                      <span className="t-title">
                        <span>{n.title}</span>
                        <small>
                          <span>{n.fmt}</span>
                          <span className={`chip ${n.structK}`}>{n.struct}</span>
                          <span className="mono">曝光 {nf(n.imp)} · 观看 {nf(n.views)}</span>
                        </small>
                      </span>
                      <span className="num-cell mono hide-sm">{n.date.slice(5)}</span>
                      <span className="num-cell mono" style={{ fontWeight: 600 }}>{n.fol}</span>
                      <span className={`sc mono ${n.fanBc}`}>{n.fanS}<em>{n.fanR}%</em></span>
                      <span className={`sc mono ${n.covBc} hide-sm`}>{n.covS}<em>{n.covR}%</em></span>
                      <span className={`sc mono ${n.conBc} hide-sm`}>{n.conS}<em>{n.conR}%</em></span>
                      <span className="caret">▶</span>
                    </button>
                    {isOpen && (
                      <div className="panel">
                        <div>
                          <h5>曝光 → 点击 → 观看</h5>
                          <div className="flowbars">
                            <div className="fb"><span className="fl">曝光</span>
                              <span className="bar"><i className="b1" style={{ width: '100%' }} /></span>
                              <span className="fv mono">{nf(n.imp)}</span></div>
                            <div className="fb"><span className="fl">点击</span>
                              <span className="bar"><i className="b2" style={{ width: w(n.clicks) }} /></span>
                              <span className="fv mono">{nf(n.clicks)}</span></div>
                            <div className="fb"><span className="fl">观看</span>
                              <span className="bar">
                                <i className="b3" style={{ width: w(Math.min(n.views, n.clicks)) }} />
                                {n.gap > 0 && (
                                  <i className="over" style={{ left: w(n.clicks), width: w(n.gap) }} />
                                )}
                              </span>
                              <span className="fv mono">{nf(n.views)}</span></div>
                          </div>
                          <div className="gapline">
                            <span className={`chip ${n.structK}`}>{n.struct}</span>
                            <span className="mono">比值 {n.ratio.toFixed(2)}</span>
                            <span className="mono">
                              观看−点击 <b className={n.gap >= 0 ? 'pos' : 'neg'}>
                                {n.gap >= 0 ? '+' : ''}{nf(n.gap)}
                              </b>
                            </span>
                          </div>
                          <p className="read">{n.structRead}</p>
                        </div>
                        <div>
                          <h5>互动</h5>
                          <dl className="kv">
                            <dt>点赞 / 收藏</dt><dd className="mono">{n.like} / {n.save}</dd>
                            <dt>评论 / 分享</dt><dd className="mono">{n.cmt} / {n.shr}</dd>
                            <dt>人均观看时长</dt><dd className="mono">{n.dwell} 秒</dd>
                            <dt>三项得分</dt><dd className="mono">{n.covS} · {n.conS} · {n.fanS}</dd>
                            <dt>发布</dt><dd className="mono">{n.date} · {n.fmt} · 龄 {n.age} 天</dd>
                          </dl>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          (() => {
            const d = DIMS.find((x) => x.id === tab)!;
            const list = [...scored].sort(
              (a, b) =>
                detDir *
                  ((b as unknown as Record<string, number>)[d.s] -
                    (a as unknown as Record<string, number>)[d.s]) ||
                b.covR - a.covR || b.dwell - a.dwell,
            );
            return (
              <>
                <div className="sortbar">
                  <button type="button" className="ctl" onClick={() => setDetDir((x) => (x === 1 ? -1 : 1))}>
                    按{d.name}得分 {detDir > 0 ? '从高到低 ▼' : '从低到高 ▲'}
                  </button>
                </div>
                <div className="diag">
                  {list.map((n, i) => {
                    const o = analysis?.analysis?.[n.title];
                    const sc = (n as unknown as Record<string, number>)[d.s];
                    const bc = (n as unknown as Record<string, Band>)[d.b];
                    const why = sc >= 40 ? '为什么高' : '为什么低';
                    const cell = (h: string, arr: string[] | undefined, fix = false) => (
                      <div className={`dcell${fix ? ' fix' : ''}`}>
                        <h6>{h}</h6>
                        {arr?.length ? (
                          <ul>{arr.map((x, j) => <li key={j}>{x}</li>)}</ul>
                        ) : (
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>需要 AI 解读</p>
                        )}
                      </div>
                    );
                    return (
                      <div className="dcard" key={n.title + n.date}>
                        <div className="dhead">
                          <div className="dt">
                            <h4><span className="rank">{i + 1}</span>{n.title}</h4>
                            <small>
                              <span className="mono">{n.date}</span>
                              <span>{n.fmt}</span>
                              <span className={`chip ${n.structK}`}>{n.struct}</span>
                            </small>
                          </div>
                          <div className="ds">
                            <b className={bc}>{sc}</b>
                            <span className="of">/ 100</span>
                            <span className={`chip ${bc}`}>{BAND[bc]}</span>
                          </div>
                        </div>
                        <div className="dgrid">
                          {d.boxes(n).map(([k, v]) => (
                            <div className="dbox" key={k}><div className="k">{k}</div><div className="v">{v}</div></div>
                          ))}
                        </div>
                        <div className="dbody">
                          {cell(`算法专家诊断 · ${why}`, o?.[`${d.id}Algo` as keyof typeof o] as string[])}
                          {cell(`专业博主诊断 · ${why}`, o?.[`${d.id}Blog` as keyof typeof o] as string[])}
                          {cell('综合建议', o?.[`${d.id}Fix` as keyof typeof o] as string[], true)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()
        )}
      </section>

      {/* ── 观察区 ─────────────────────────── */}
      {pending.length > 0 && (
        <section>
          <div className="sec-head"><span className="eyebrow">Watchlist</span><h2>观察区</h2></div>
          <p className="sec-note">
            曝光的结算比观看慢。同一篇笔记在发布第 1 天和第 5 天的「观看 ÷
            曝光」能差 60%，而平台点击率只差 10% 上下。发布不足 3 天的笔记只列原始数字，不打分、不排名、不判类型、不写诊断。
          </p>
          <div className="watch">
            <ul>
              {pending.map((n) => (
                <li key={n.title + n.date}>
                  <b>{n.title}</b>
                  <span className="chip pending">龄 {n.age} 天</span>
                  <span className="w-meta mono">
                    曝光 {nf(n.imp)} · 观看 {nf(n.views)} · 涨粉 {n.fol} · 平台点击率 {n.covR}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <footer>
        <dl>
          <dt>口径。</dt>
          <dd>
            标题封面吸引力 = 平台「封面点击率」（发现页封面点击 ÷ 发现页曝光），与 5% / 11% / 25%
            这套公开基准线同源。内容吸引力 = 涨粉 ÷ 观看。粉丝转化率 = 涨粉 ÷ 曝光。
          </dd>
          <dt>百分制怎么来的。</dt>
          <dd>
            三档基准全部锚定外部数据，不用账号内排名。分段线性映射：0 到中等线映射到 0 至 40 分，中等线到良好线映射到 40 至 70
            分，良好线到优秀线映射到 70 至 100 分。
          </dd>
          <dt>恒等式。</dt>
          <dd>
            恒等式那一行用链路口径「观看 ÷
            曝光」而不是平台点击率——只有这个口径能让 粉丝转化率 = 前半段 × 后半段 严格成立。两个口径在成熟笔记上差约 1 个百分点。
          </dd>
          <dt>流量类型。</dt>
          <dd>
            比值 = （观看 ÷ 曝光）÷ 平台点击率。低于 0.85 判为点击流失型，高于 1.35 判为搜索分享型，其余为推荐依赖型；曝光低于
            600 且比值落在正常区间的标为样本不足，不判类型。「点了没进来」是从数字缺口推断的机制，平台未公开定义，仅作参考。
          </dd>
          <dt>成熟度。</dt>
          <dd>
            发布不足 3 天的笔记曝光尚未结算，全部进观察区。实测同一批笔记在第 3 到 5 天收敛，曝光超过 3000
            的笔记两个口径几乎完全吻合。
          </dd>
          {meta.nDropped > 0 && (
            <>
              <dt>剔除项。</dt>
              <dd>
                窗口内有 {meta.nDropped} 篇标题为空，无法定位到具体笔记，已从全部统计与排名中剔除（合计曝光{' '}
                {nf(meta.droppedImp)}、涨粉 {meta.droppedFol}）。建议去后台把真实标题补回。
              </dd>
            </>
          )}
          <dt>日期。</dt>
          <dd>用导出表的首次发布时间，是北京时间，所以部分笔记可能比你记忆中的发布日晚一天。</dd>
          <dt>数据缺口。</dt>
          <dd>
            没有拿到封面图和正文，封面相关诊断全部由点击率反推，正文结构问题只能从停留时长和收藏率间接判断。观看量低于 100
            的笔记，其内容吸引力与粉丝转化率的算法视角一律写「样本量不足」。
          </dd>
          <dt>数据来源。</dt>
          <dd>笔记列表明细表.xlsx，导出于 {meta.exportDate}。解析全部在你的浏览器里完成，原始文件没有上传。</dd>
        </dl>
      </footer>
    </>
  );
}
