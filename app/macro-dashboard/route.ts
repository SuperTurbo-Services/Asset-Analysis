import { generateDashboard } from '@/lib/macro/generate';
import { readDashboard, writeDashboard } from '@/lib/macro/store';
import { embedPayload, templateParts } from '@/lib/macro/template';
import type { Dashboard } from '@/lib/macro/types';

/**
 * 这个路由返回一整份 HTML 文档，而不是一个 React 页面。
 *
 * 原因是站点的 globals.css 里有 .wrap / .card / .tabs / .panel 这些类名，
 * 和 skill 模板用的是同一批名字，其中 .panel 还是两栏 grid，挂在同一个
 * 文档里会把看板挤成两列。独立文档就没有这个问题，模板也保持原样，
 * 顺便省掉了客户端二次进入时脚本不重跑的麻烦。
 */
export const dynamic = 'force-dynamic';

async function currentDashboard(): Promise<
  { dashboard: Dashboard } | { problem: string }
> {
  const stored = await readDashboard();
  if (stored) return { dashboard: stored };

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

const DESCRIPTION =
  'Is the current macro environment bullish or bearish for US stocks, cash, gold and crypto. Rebuilt every day from primary data.';

function shell(title: string, css: string, inner: string) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${DESCRIPTION}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${DESCRIPTION}">
<meta property="og:url" content="https://superturbo.app/macro-dashboard">
<meta property="og:type" content="website">
<style>${css}</style>
</head>
<body>${inner}</body>
</html>`;
}

export async function GET() {
  const { css, body, script } = await templateParts();
  const result = await currentDashboard();

  if ('problem' in result) {
    return new Response(
      shell(
        'Macro Impact Dashboard · SuperTurbo',
        css,
        `<div class="wrap"><header class="top"><div><h1>Macro Impact Dashboard</h1>
         <p class="stamp">Nothing to show yet. This page rebuilds itself once a day.</p></div></header>
         <section class="card" style="padding:18px 20px"><p>${result.problem}</p></section></div>`,
      ),
      { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }

  const html = shell(
    `${result.dashboard.title} · SuperTurbo`,
    css,
    `${body}
<script id="payload" type="application/json">${embedPayload(result.dashboard)}</script>
<script>${script}</script>`,
  );

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // 边缘缓存一分钟，每日任务跑完最多一分钟就能看到新的一版
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=86400',
    },
  });
}
