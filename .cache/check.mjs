import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage({ viewport: { width: 1180, height: 1400 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

await page.goto('http://localhost:3101/', { waitUntil: 'networkidle' });
await page.screenshot({ path: '.cache/shot-landing.png', fullPage: true });
const tools = await page.$$eval('.tool h3', els => els.map(e => e.textContent));

// navigate the way a visitor would, by clicking the card
await page.click('a[href="/macro-dashboard"]');
await page.waitForTimeout(1500);
const url = page.url();
const cards = await page.$$eval('.bcard', els => els.map(e => e.innerText.split('\n').slice(0,2).join(' ')));
const tiles = await page.$$eval('.tile', els => els.length);
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
await page.screenshot({ path: '.cache/shot-macro.png', fullPage: true });
await page.click('#tab-s'); await page.waitForTimeout(400);
await page.screenshot({ path: '.cache/shot-macro-signals.png', fullPage: true });
await page.click('#themebtn'); await page.waitForTimeout(400);
const theme = await page.evaluate(() => document.documentElement.dataset.theme);
const text = await page.evaluate(() => document.body.innerText);
const hyphens = [...new Set(text.split('\n'))].filter(l => l.includes('-'));
await page.screenshot({ path: '.cache/shot-macro-dark.png', fullPage: true });

// and back to the hub, to be sure the injected stylesheet does not leak
await page.goto('http://localhost:3101/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const hubBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
await page.screenshot({ path: '.cache/shot-landing-after.png', fullPage: true });

console.log(JSON.stringify({ tools, url, cards, tiles, macroBodyBg: bg, hubBodyBg: hubBg, themeAfterToggle: theme, hyphens, errs }, null, 1));
await browser.close();
