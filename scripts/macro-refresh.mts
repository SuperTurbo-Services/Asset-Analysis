/**
 * 真跑一次：抓数据、打分、翻译、校验，然后把结果写进 data/macro-dashboard.json。
 *
 * 这是更新看板内容的唯一入口。定时 GitHub Action 会生成、校验、提交，
 * Cloudflare Builds 随后从仓库 main 分支部署。CLOUDFLARE_API_TOKEN 只从环境读取。
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { loadEnv } from './env.mts';

loadEnv();

const key = process.env.CLOUDFLARE_API_TOKEN ?? '';

// 占位符不是有效凭证；不要把凭证或其前缀写入日志。
if (!key || key.startsWith('[') || key.length < 20) {
  console.error(key ? 'CLOUDFLARE_API_TOKEN looks like a placeholder, not a key.' : 'CLOUDFLARE_API_TOKEN is not set.');
  console.error('');
  console.error('Set a valid key privately in .env.local before running this script.');
  process.exit(1);
}

const { generateDashboard, MODEL } = await import('../lib/macro/generate');
const { writeDashboard } = await import('../lib/macro/store');
const { templateParts, embedPayload } = await import('../lib/macro/template');
const { localizeTemplate } = await import('../lib/macro/i18n');

const t0 = Date.now();
console.log(`  ..    pulling data and scoring with ${MODEL}`);

const { bundle, attempts, warnings } = await generateDashboard();
for (const w of warnings) console.log(`  WARN  ${w}`);

const where = await writeDashboard(bundle);

// 顺手写两份可以直接打开的预览，不需要起 Next
const parts = await templateParts();
await mkdir('.cache', { recursive: true });
for (const lang of ['en', 'zh'] as const) {
  const p = localizeTemplate(parts, lang);
  const d = bundle[lang];
  await writeFile(`.cache/macro-preview-${lang}.html`, `<!DOCTYPE html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}" data-theme="light">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${d.title}</title>
<style>${p.css}</style></head>
<body>${p.body}
<script id="payload" type="application/json">${embedPayload(d)}</script>
<script>${p.script}</script>
</body></html>`);
}

console.log(`  OK    ${attempts} model call(s), ${Math.round((Date.now() - t0) / 1000)}s`);
console.log('  read  ' + bundle.en.assets
  .map((a) => `${a.name} ${a.verdict}${a.cap ? ` (${a.cap})` : ''}`).join(', '));
console.log(`  wrote ${where}`);
console.log('  wrote .cache/macro-preview-en.html and .cache/macro-preview-zh.html');
console.log('');
console.log('  Next: review data/macro-dashboard.json; a push to main deploys the approved Worker configuration');
