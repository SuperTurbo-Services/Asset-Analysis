import { S, localizeTemplate, type Lang } from './i18n';
import { readDashboard } from './store';
import { embedPayload, templateParts } from './template';
import { WORKSPACE_CONFIG } from './workspace';
import { workspaceBody, workspaceCss, workspaceScript, workspaceText } from './workspace-ui';

/**
 * 整份 HTML 文档，不是 React 页面。
 *
 * 站点的 globals.css 里有 .wrap / .card / .tabs / .panel 这些类名，和 skill
 * 模板撞在一起，其中 .panel 是两栏 grid，挂在同一个文档里会把看板挤成两列。
 * 独立文档避开了样式冲突，模板也保持原样。
 */
const DESC = {
  en: 'Is the current macro environment bullish or bearish for US stocks, cash, gold and crypto. A fixed factor framework, scored on primary data.',
  zh: '当下的宏观环境，对美股、现金、黄金和加密资产是看多还是看跌。一套固定的因子框架，用原始数据打分。',
};

const CANONICAL = {
  en: 'https://superturbo.app/asset-analysis',
  zh: 'https://superturbo.app/asset-analysis/zh',
};

function shell(lang: Lang, title: string, css: string, inner: string) {
  return `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${DESC[lang]}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${DESC[lang]}">
<meta property="og:url" content="${CANONICAL[lang]}">
<meta property="og:type" content="website">
<link rel="canonical" href="${CANONICAL[lang]}">
<link rel="alternate" hreflang="en" href="${CANONICAL.en}">
<link rel="alternate" hreflang="zh-Hans" href="${CANONICAL.zh}">
<style>${css}</style>
</head>
<body>${inner}</body>
</html>`;
}

/** 纯读取，不碰请求，所以这个路由可以是静态的。 */
export async function renderPage(lang: Lang): Promise<Response> {
  const { css, body, script } = localizeTemplate(await templateParts(), lang);
  const bundle = await readDashboard();

  if (!bundle) {
    return new Response(
      shell(
        lang,
        `${S.title[lang]} · SuperTurbo`,
        css + workspaceCss(),
        `<div class="wrap"><header class="top"><div><h1>${S.title[lang]}</h1>
         <p class="stamp">${S.waiting[lang]}</p></div></header></div>`,
      ),
      { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  }

  const dashboard = bundle[lang];
  return new Response(
    shell(
      lang,
      `${dashboard.title} · SuperTurbo`,
      css + workspaceCss(),
      `${body.replace('<section class="legal">', `${workspaceBody(lang)}<section class="legal">`)}
<script id="payload" type="application/json">${embedPayload(dashboard)}</script>
<script id="workspace-config" type="application/json">${embedPayload(WORKSPACE_CONFIG)}</script>
<script id="workspace-text" type="application/json">${embedPayload(workspaceText(lang))}</script>
<script>${script}\n${workspaceScript()}</script>`,
    ),
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}
