import type { NextRequest } from 'next/server';
import { generateDashboard, type Bundle } from '@/lib/macro/generate';
import { S, localizeTemplate, type Lang } from '@/lib/macro/i18n';
import { readDashboard, writeDashboard } from '@/lib/macro/store';
import { embedPayload, templateParts } from '@/lib/macro/template';

/**
 * 这个路由返回一整份 HTML 文档，而不是一个 React 页面。
 *
 * 原因是站点的 globals.css 里有 .wrap / .card / .tabs / .panel 这些类名，
 * 和 skill 模板用的是同一批名字，其中 .panel 还是两栏 grid，挂在同一个
 * 文档里会把看板挤成两列。独立文档就没有这个问题，模板也保持原样。
 *
 * 中英文各是一份完整文档，右上角切换。?lang=zh 出中文。
 */
export const dynamic = 'force-dynamic';

async function currentBundle(): Promise<{ bundle: Bundle } | { problem: string }> {
  const stored = await readDashboard();
  if (stored) return { bundle: stored };

  if (!process.env.AI_GATEWAY_API_KEY) {
    return { problem: 'AI_GATEWAY_API_KEY is not set, so nothing can be built.' };
  }
  try {
    const { bundle } = await generateDashboard();
    await writeDashboard(bundle);
    return { bundle };
  } catch (err) {
    console.error('on demand generation failed', err);
    return { problem: err instanceof Error ? err.message : 'Generation failed.' };
  }
}

const DESC = {
  en: 'Is the current macro environment bullish or bearish for US stocks, cash, gold and crypto. Rebuilt every day from primary data.',
  zh: '当下的宏观环境，对美股、现金、黄金和加密资产是看多还是看跌。每天用原始数据重建一次。',
};

function shell(lang: Lang, title: string, css: string, inner: string) {
  const url = lang === 'zh'
    ? 'https://superturbo.app/macro-dashboard?lang=zh'
    : 'https://superturbo.app/macro-dashboard';
  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${DESC[lang]}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${DESC[lang]}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<link rel="alternate" hreflang="en" href="https://superturbo.app/macro-dashboard">
<link rel="alternate" hreflang="zh-Hans" href="https://superturbo.app/macro-dashboard?lang=zh">
<style>${css}</style>
</head>
<body>${inner}</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const lang: Lang = req.nextUrl.searchParams.get('lang') === 'zh' ? 'zh' : 'en';
  const { css, body, script } = localizeTemplate(await templateParts(), lang);
  const result = await currentBundle();

  if ('problem' in result) {
    return new Response(
      shell(
        lang,
        `${S.title[lang]} · SuperTurbo`,
        css,
        `<div class="wrap"><header class="top"><div><h1>${S.title[lang]}</h1>
         <p class="stamp">${S.waiting[lang]}</p></div></header>
         <section class="card" style="padding:18px 20px"><p>${result.problem}</p></section></div>`,
      ),
      { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }

  const dashboard = result.bundle[lang];
  const html = shell(
    lang,
    `${dashboard.title} · SuperTurbo`,
    css,
    `${body}
<script id="payload" type="application/json">${embedPayload(dashboard)}</script>
<script>${script}</script>`,
  );

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // 边缘缓存一分钟，每日任务跑完最多一分钟就能看到新的一版
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=86400',
      vary: 'Accept-Language',
    },
  });
}
