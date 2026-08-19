/**
 * 真跑一次：抓数据、打分、翻译、校验，然后把结果写进 data/macro-dashboard.json。
 *
 * 这是更新看板内容的唯一入口。跑完 commit push，Vercel 重新构建，页面就是新的。
 * 需要 AI_GATEWAY_API_KEY，放在 .env.local 里（vercel env pull 可以拉下来）。
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { loadEnv } from './env.mts';

loadEnv();

const key = process.env.AI_GATEWAY_API_KEY ?? '';

// `vercel env pull` 对标了 Sensitive 的变量只会写一个占位符 [SENSITIVE]，
// 它是有值的，所以光判断存在会过，然后在网关那边报一个看不懂的未认证错误
if (!key || key.startsWith('[') || key.length < 20) {
  console.error(
    key
      ? `AI_GATEWAY_API_KEY looks like a placeholder, not a key (${JSON.stringify(key.slice(0, 12))}).`
      : 'AI_GATEWAY_API_KEY is not set.',
  );
  console.error('');
  console.error('The key in Vercel is marked Sensitive, so `vercel env pull` cannot');
  console.error('return it, it writes [SENSITIVE] instead. Put a real key in .env.local:');
  console.error('  vercel.com/dashboard/ai-gateway/api-keys');
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
console.log('  Next: git add data/macro-dashboard.json && git commit && git push');
