'use client';

import { useRef, useState } from 'react';
import Dashboard from '@/components/Dashboard';
import { buildReport } from '@/lib/metrics';
import { ParseError, inferExportDate, parseAccountTrend, parseNotes } from '@/lib/parse';
import type { AccountTrend, Analysis, Report } from '@/lib/types';

type Stage = 'upload' | 'report';

export default function Page() {
  const [stage, setStage] = useState<Stage>('upload');
  const [notesFile, setNotesFile] = useState<File | null>(null);
  const [trendFile, setTrendFile] = useState<File | null>(null);
  const [windowDays, setWindowDays] = useState(30);
  const [exportDate, setExportDate] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [aiMeta, setAiMeta] = useState<{ covered: number; total: number; partial: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const notesInput = useRef<HTMLInputElement>(null);
  const trendInput = useRef<HTMLInputElement>(null);

  async function pickNotes(f: File | null) {
    setNotesFile(f);
    setErr(null);
    if (!f) { setExportDate(''); return; }
    try {
      setExportDate(inferExportDate(await f.arrayBuffer(), f.lastModified));
    } catch {
      setExportDate(new Date().toISOString().slice(0, 10));
    }
  }

  async function build() {
    setErr(null);
    if (!notesFile) return;
    try {
      const raws = parseNotes(await notesFile.arrayBuffer());
      let trend: AccountTrend | null = null;
      if (trendFile) {
        try {
          trend = parseAccountTrend(await trendFile.arrayBuffer());
        } catch {
          // 趋势文件是可选的，解析失败不该阻断主流程
          trend = null;
        }
      }
      const r = buildReport(raws, { exportDate, windowDays }, trend);
      if (!r.notes.length) {
        setErr(`最近 ${windowDays} 天里没有笔记。把统计窗口放宽再试。`);
        return;
      }
      if (r.meta.nScored === 0) {
        setErr('窗口内的笔记都还没结算完（发布不足 3 天）。过几天再导出，或放宽统计窗口。');
        return;
      }
      setReport(r);
      setAnalysis(null);
      setAiErr(null);
      setStage('report');
      window.scrollTo(0, 0);
    } catch (e) {
      setErr(e instanceof ParseError ? e.message : '解析失败，确认上传的是未经改动的 .xlsx 导出文件。');
    }
  }

  async function runAi() {
    if (!report) return;
    setAiBusy(true);
    setAiErr(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiErr(data?.error || `请求失败（${res.status}）`);
      } else {
        setAnalysis(data as Analysis);
        setAiMeta({ covered: data.covered ?? 0, total: data.total ?? 0, partial: !!data.partial });
      }
    } catch {
      setAiErr('网络请求失败，稍后再试。基础报告不受影响。');
    } finally {
      setAiBusy(false);
    }
  }

  const Drop = ({
    file, onPick, inputRef, must, title, desc,
  }: {
    file: File | null;
    onPick: (f: File | null) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    must: boolean;
    title: string;
    desc: string;
  }) => (
    <div
      className={`drop${file ? ' ok' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over'); }}
      onDragLeave={(e) => e.currentTarget.classList.remove('over')}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('over');
        const f = e.dataTransfer.files?.[0];
        if (f) onPick(f);
      }}
    >
      <span className={`req ${must ? 'must' : 'opt'}`}>{must ? '必传' : '选传'}</span>
      <div className="dt">{file ? file.name : title}</div>
      <div className="dd">{file ? '点击可更换' : desc}</div>
      <input
        ref={inputRef} type="file" accept=".xlsx" hidden
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );

  return (
    <>
      <div className="top">
        <div className="top-in">
          <div className="mark">书</div>
          <div className="top-name">笔记涨粉诊断台</div>
          <div className="top-meta mono">
            {report ? `导出于 ${report.meta.exportDate} · ${report.meta.nScored} 篇计分` : 'superturbo.app'}
          </div>
        </div>
      </div>

      <div className="wrap">
        {stage === 'upload' ? (
          <>
            <header className="hero">
              <h1>为什么不涨粉，是可以定位到具体环节的</h1>
              <p className="lead">
                上传创作者中心导出的表，得到三项百分制评分、四段漏斗、逐篇的流量结构分类和诊断。
                评分、分类、全部图表都在你的浏览器里算完，秒出。
              </p>
            </header>

            <div className="drops">
              <Drop
                file={notesFile} onPick={pickNotes} inputRef={notesInput} must
                title="笔记列表明细表.xlsx"
                desc="创作者中心 → 数据中心 → 笔记数据 → 导出。点击选择或拖进来。"
              />
              <Drop
                file={trendFile} onPick={setTrendFile} inputRef={trendInput} must={false}
                title="近30日观看数据.xlsx"
                desc="有的话可以补上账号级日趋势，没有也能出完整报告。"
              />
            </div>

            <div className="controls">
              <div className="field">
                <label htmlFor="win">统计窗口</label>
                <select id="win" value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))}>
                  <option value={14}>最近 14 天</option>
                  <option value={30}>最近 30 天</option>
                  <option value={60}>最近 60 天</option>
                  <option value={90}>最近 90 天</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="exp">导出日期</label>
                <input
                  id="exp" type="date" value={exportDate} max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setExportDate(e.target.value)}
                />
              </div>
              <button className="go" onClick={build} disabled={!notesFile || !exportDate}>
                生成报告
              </button>
            </div>

            {notesFile && (
              <p className="privacy" style={{ marginTop: 14 }}>
                <b>导出日期已自动读出，如果不对请改。</b>
                它决定每篇笔记的「龄」——曝光的结算比观看慢，发布不足 3
                天的笔记数据还没落定，会被放进观察区不打分。填成今天会让旧导出里的新笔记被误判为已成熟。
              </p>
            )}
            {err && <div className="err">{err}</div>}

            <p className="privacy">
              <b>关于你的数据：</b>xlsx 的解析和全部指标计算都在浏览器本地完成，
              <b>原始导出文件不会上传到任何服务器</b>。只有当你主动点「生成 AI 解读」时，
              才会把已经算好的聚合指标（标题、曝光、观看、涨粉这类数字）发到服务端调用模型，
              导出文件本身始终留在你的设备上。
            </p>
          </>
        ) : (
          report && (
            <>
              <div className="aibar">
                <div className="txt">
                  {analysis ? (
                    aiMeta?.partial ? (
                      <>
                        <b>AI 解读已生成 {aiMeta.covered} / {aiMeta.total} 篇。</b>
                        其余 {aiMeta.total - aiMeta.covered} 篇没通过质量校验（编造看不到的封面正文、
                        条数超限、两个视角雷同等），宁可留白也不给不合规范的诊断——
                        那几篇的诊断格会显示「需要 AI 解读」。再点一次通常能补上一部分。
                      </>
                    ) : (
                      <>
                        <b>AI 解读已生成，{aiMeta?.covered ?? 0} 篇全部通过校验。</b>
                        逐篇分析的三个维度标签和综合建议已经填好。
                      </>
                    )
                  ) : (
                    <>
                      <b>下面的数字、评分和分类都算好了，不需要模型。</b>
                      逐篇的算法/博主双视角诊断和综合建议需要 AI 解读，大约 30–90 秒。
                    </>
                  )}
                </div>
                {(!analysis || aiMeta?.partial) && (
                  <button className="go" onClick={runAi} disabled={aiBusy}>
                    {aiBusy ? <><span className="spin" />生成中…</> : analysis ? '补齐剩余篇目' : '生成 AI 解读'}
                  </button>
                )}
                <button
                  className="ghost"
                  onClick={() => { setStage('upload'); setReport(null); setAnalysis(null); }}
                  disabled={aiBusy}
                >
                  换一份数据
                </button>
              </div>
              {aiErr && <div className="err">{aiErr}</div>}
              <Dashboard report={report} analysis={analysis} />
            </>
          )
        )}
      </div>
    </>
  );
}
