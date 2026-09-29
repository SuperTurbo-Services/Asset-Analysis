import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync('data/macro-dashboard.json', 'utf8'));
const en = report.en?.meta?.generatedAt;
const zh = report.zh?.meta?.generatedAt;
const time = Date.parse(en);
const age = Date.now() - time;

if (!en || en !== zh || !Number.isFinite(time) || age < 0 || age > 2 * 60 * 60 * 1000) {
  throw new Error('Bilingual dashboard generation timestamp is missing, inconsistent, or stale');
}

if (!Array.isArray(report.en?.assets) || report.en.assets.length !== 4 ||
    !Array.isArray(report.zh?.assets) || report.zh.assets.length !== 4) {
  throw new Error('The dashboard must contain four assets in each language');
}

if (!Array.isArray(report.en.meta?.missing) || !Array.isArray(report.zh.meta?.missing) ||
    report.en.meta.missing.length || report.zh.meta.missing.length) {
  throw new Error('The new report has missing source facts; keep serving the previous version');
}

console.log(`Validated fresh bilingual report generated at ${en}`);
