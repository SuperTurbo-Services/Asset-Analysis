import type { Metadata } from 'next';
import Script from 'next/script';
import { generateDashboard } from '@/lib/macro/generate';
import { readDashboard, writeDashboard } from '@/lib/macro/store';
import { embedPayload, templateParts } from '@/lib/macro/template';
import type { Dashboard } from '@/lib/macro/types';

export const metadata: Metadata = {
  title: 'Macro Impact Dashboard · SuperTurbo',
  description:
    'Is the current macro environment bullish or bearish for US stocks, cash, gold and crypto. Rebuilt every day from primary data.',
};

// 短窗口，让每日任务跑完后很快就能看到新的一版。任务本身也会 revalidate。
export const revalidate = 60;

async function currentDashboard(): Promise<
  { dashboard: Dashboard } | { problem: string }
> {
  const stored = await readDashboard();
  if (stored) return { dashboard: stored };

  // 构建阶段不花模型调用，这里为空只说明每日任务还没跑过
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return { problem: 'The first daily build has not run yet.' };
  }
  if (!process.env.AI_GATEWAY_API_KEY) {
    return { problem: 'AI_GATEWAY_API_KEY is not set, so nothing can be built.' };
  }

  try {
    const { dashboard } = await generateDashboard();
    await writeDashboard(dashboard);
    return { dashboard };
  } catch (err) {
    console.error('on demand generation failed', err);
    return { problem: err instanceof Error ? err.message : 'Generation failed.' };
  }
}

function Waiting({ problem }: { problem: string }) {
  return (
    <div className="wrap" lang="en">
      <header className="hero">
        <h1>Macro Impact Dashboard</h1>
        <p className="lead">Nothing to show yet. This page rebuilds itself once a day.</p>
      </header>
      <p>{problem}</p>
    </div>
  );
}

export default async function MacroDashboardPage() {
  const { css, body, script } = await templateParts();
  const result = await currentDashboard();

  if ('problem' in result) return <Waiting problem={result.problem} />;

  return (
    // 这一段样式来自 skill 的模板，只在本路由挂载，覆盖站点 globals.css
    <div lang="en">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <script
        id="payload"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: embedPayload(result.dashboard) }}
      />
      <Script
        id="macro-dashboard-render"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: script }}
      />
    </div>
  );
}
